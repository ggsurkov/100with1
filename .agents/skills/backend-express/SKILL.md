---
name: backend-express
description: Стандарты Express+Mongoose+TypeScript для server/ — валидация ObjectId, обработка ошибок в async-роутах, экономия ресурсов MongoDB Atlas M0 на частом поллинге, проекции вместо populate, индексы, безопасность обновлений. Читай перед правкой server/src/routes/api.ts или любой модели.
---

# Backend: Express + Mongoose в server/

Весь API живёт в одном файле `server/src/routes/api.ts` (376 строк). Слоя контроллеров нет —
новые роуты добавляй туда же, рядом с логически близкой группой, но соблюдай правила ниже.

## 1. Валидация ObjectId — до любого обращения к Mongoose

Любой `:id` из параметров или id из тела запроса обязан пройти `mongoose.isValidObjectId()`
**до** `findById` / `findByIdAndUpdate` / `populate`. Иначе — необработанный `CastError`
и падение запроса.

Сейчас в коде три разных стиля проверки: `isValidObjectId`, `id === 'undefined'` и
`try/catch` вокруг `findById`. Целевой — один:

```ts
// добавить в server/src/middleware/validate.ts и повесить на все :id-роуты
export const validateObjectId = (param = 'id') => (req: any, res: any, next: any) => {
  if (!mongoose.isValidObjectId(req.params[param])) {
    return res.status(400).json({ message: 'Invalid ID provided' });
  }
  next();
};
```

Роуты **без** проверки на текущий момент (чинить при первом касании):
`GET/PUT/DELETE /teams/:id`, `PUT/DELETE /games/:id`, `GET /games/:id` (там `try/catch` вместо проверки).

## 2. Не найдено — это 404, а не 200 с `null`

`GET /teams/:id` и `GET /games/:id` сейчас отвечают `200 null`, если документа нет,
и клиент падает уже на рендере. Правило:

```ts
const game = await Game.findById(id);
if (!game) return res.status(404).json({ message: 'Game not found' });
res.json(game);
```

## 3. Каждый async-роут обёрнут в обработку ошибок

Express 4 не ловит reject из async-хендлера — падает весь процесс. Часть роутов
(`/login`, `GET /teams`, `POST /teams`, `GET /users`) сейчас без `try/catch`.

Не размазывай `try/catch` по каждому хендлеру — заведи один хелпер и общий error-middleware:

```ts
// utils/asyncHandler.ts
export const asyncHandler = (fn: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// index.ts, ПОСЛЕ app.use('/api', apiRoutes)
app.use((err, _req, res, _next) => {
  console.error('[API]', err);
  res.status(500).json({ message: 'Internal server error' });
});
```

## 4. Экономия MongoDB Atlas M0 — главный ограничитель проекта

Бесплатный кластер M0 жёстко ограничен по соединениям и throughput. В игре одновременно
поллят: экран ведущего (`RoundCheck`, раз в 3 с) и **каждый** телефон капитана
(`CaptainPlayPage`, раз в 3 с). 8 команд → ~180 запросов в минуту.

**Обязательные правила для часто дёргаемых роутов:**

- Точечный `.select(...)` — только те поля, которые реально отдаются в ответе.
- **Никакого `populate` в поллинг-роутах.** Это критично: `GET /launches/:id/state`
  сейчас делает `.populate('gameId')` и на каждый опрос каждого телефона тянет
  **весь документ игры** — все раунды, вопросы и ответы — чтобы вернуть заголовок
  одного вопроса. Это самая дорогая операция в проекте.
  Правильно — вытащить только нужный вопрос проекцией, либо кэшировать игру в памяти
  процесса на время запуска, либо денормализовать текущий вопрос (`currentQuestionTitle`,
  `currentQuestionImageUrl`) в `Launch` при переключении вопроса ведущим.
- `.lean()` для read-only ответов — документы Mongoose не нужны, если результат сразу идёт в `res.json`.
- Списки — с лимитом. Публичный `GET /launches` отдаёт **все** завершённые игры разом
  с `populate('gameId')`; нужен `.limit()` / пагинация.
- `GET /launches/:id/answers` (поллится ведущим) — `populate('teamId', 'title')` терпим,
  но лучше отдавать только ответы на текущий вопрос, а не всю историю запуска.

Эталон правильного поллинг-роута уже есть в коде — `GET /launches/:id/teams`:
`.select('teamGameInfo gameId status')` + узкий `populate('gameId', 'title')` + ручной маппинг
только нужных полей. Ориентируйся на него.

## 5. Индексы

Добавляй индекс под каждый повторяющийся запрос по не-`_id` полям:

- `TeamAnswer`: составной `{ launchId: 1, teamId: 1 }` — читается и пишется на каждый
  ответ капитана и на каждый опрос ведущего. Сейчас индекса нет.
- `Launch`: `{ status: 1, finishedAt: -1 }` — под публичный `/results`.
- `User.email` уже уникальный (`unique: true`), дополнительный индекс не нужен.

## 6. Обновления: только явные поля

`PUT /launches/:id` принимает произвольное тело и льёт его в `findByIdAndUpdate` —
клиент может перезаписать что угодно. Плюс `RoundCheck` шлёт туда весь объект launch целиком
(`{ ...launch, teamGameInfo }`), включая **populated** `gameId` — объект вместо ObjectId.

Правило: собирай `update` из белого списка полей.

```ts
const ALLOWED = ['status', 'currentRoundId', 'currentQuestionId', 'isTimerActive', 'teamGameInfo'] as const;
const update = Object.fromEntries(Object.entries(req.body).filter(([k]) => ALLOWED.includes(k as any)));
```

И на клиенте шли только изменившееся поле, а не весь документ.

## 7. Скоринг остаётся идемпотентным

`teamPoints` — всегда сумма значений `questionScores` (ledger `questionId → баллы`).
Пересохранение вопроса **перезаписывает** его запись и пересчитывает сумму заново,
никогда не прибавляет к `teamPoints`. Любая правка логики очков обязана это сохранить,
иначе повторное нажатие «Calculate & Save» удвоит очки.

## 8. Права доступа

- `authMiddleware` → `requireRole([...])` → `requirePermission('CREATE'|'EDIT'|'VIEW')` — в этом порядке.
- Роли `admin` и `master` обходят проверку прав (см. `middleware/auth.ts`) — не дублируй эту логику в роутах.
- Публичные роуты (капитаны, `/results`) сознательно вне `authMiddleware`. Добавляя такой роут,
  оставь комментарий, **почему** он публичный, и отдавай минимум данных: никаких очков других команд,
  никаких правильных ответов, никаких PIN.
- Никогда не возвращай `passwordHash` — используй `.select('-passwordHash')` или деструктуризацию.

## 9. Файлы и картинки

- **Никакого локального хранения на диске.** Render — эфемерная ФС, `/uploads` исчезает при рестарте.
  Все изображения — только через Cloudinary (`middleware/upload.ts` → `CloudinaryStorage`).
- Лимит 5 МБ и белый список форматов уже настроены — не ослабляй их.
- Трансформации `quality: auto` / `fetch_format: auto` задаются при загрузке, а на клиенте
  дополнительно применяется `optimizeCloudinaryUrl` — оба слоя нужны, не удаляй ни один.

## 10. Модели

- Схема `Game` вложенная: `Game → rounds[] → questions[] → answers[]`. Отдельных коллекций нет,
  `_id` подсхем генерируются Mongoose и используются клиентом как ключи — не отключай их.
- Новое поле — **строго опциональное** с `default`, потому что в базе лежат сыгранные игры без него.
- Изменил интерфейс в `server/src/models/*` — сразу зеркаль в `client/src/types/*` (см. `frontend-react`).

## Проверка

```bash
cd server && npx tsc --noEmit
```
Автотестов нет. Ручная проверка — `curl` к `http://localhost:5050/api/...`.
