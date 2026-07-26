# 100with1 — Agent Entry Point

Это манифест верхнего уровня для Claude CLI. Прочитай его целиком перед любой
задачей в этом репозитории. Подробные правила вынесены в `.agents/` —
переходи по ссылкам ниже за деталями, здесь только сводка.

## Стек

- **Монорепо**: `server/` (Express API) + `client/` (React SPA), запускаются
  вместе через корневой `npm start` (`concurrently`).
- **Backend**: Node.js, Express 4, TypeScript, Mongoose 6 → MongoDB Atlas
  (бесплатный M0-кластер). Аутентификация — JWT (`jsonwebtoken`), без
  refresh-токенов.
- **Frontend**: React 19, TypeScript, Vite, React Router 7, Axios,
  react-hot-toast.
- **Стилизация — важное расхождение с типовым стеком**: в проекте **нет
  TailwindCSS**. Каждая страница/компонент стилизуется через co-located
  CSS Modules (`Component.module.scss`, sass). Если когда-нибудь понадобится
  Tailwind — заводить как осознанное решение, а не по умолчанию; см.
  [`.agents/skills/frontend-react.md`](.agents/skills/frontend-react.md).
- **Файлы/изображения**: Cloudinary (SDK + multer), см.
  [`.agents/tools/cloudinary.md`](.agents/tools/cloudinary.md).
- **Деплой**: Render (сервер, эфемерная ФС) + MongoDB Atlas free tier.

## Guardrails (сводка — не сокращай эти правила без ведома пользователя)

1. **Никакого локального хранения файлов на сервере.** Render использует
   эфемерную файловую систему — всё, что записано на диск (`/uploads` и
   т.п.), исчезает при рестарте/редеплое инстанса. Любые загружаемые
   изображения идут только через Cloudinary. Подробности:
   [`.agents/tools/cloudinary.md`](.agents/tools/cloudinary.md).
2. **Всегда проверяй ObjectId перед обращением к Mongoose.** Любой
   `:id`-параметр или id в теле запроса должен пройти
   `mongoose.isValidObjectId()` до `findById`/`findByIdAndUpdate`/`populate`.
   Иначе — необработанный `CastError` и падение запроса. Подробности:
   [`.agents/skills/backend-express.md`](.agents/skills/backend-express.md).
3. **Экономь поллинг MongoDB Atlas free tier.** Free-кластер (M0) имеет
   жёсткие лимиты на соединения и throughput. Любой роут, который дергают
   часто (статусы, синхронизация хода игры), обязан быть лёгким: точечный
   `.select(...)`, без `populate`. Подробности:
   [`.agents/skills/backend-express.md`](.agents/skills/backend-express.md).
4. **Обратная совместимость типов.** В базе уже лежат сыгранные игры без
   новых полей. Любое новое поле в `Game`/`Round`/`Question`/`Team`/`Launch`
   — строго опциональное (`field?: type`), с безопасным fallback на клиенте.
   Подробности:
   [`.agents/harness/code-safety.md`](.agents/harness/code-safety.md).
5. **Никаких редиректов сразу после сохранения в Check Round.** Ведущий
   должен увидеть подтверждение (`✓ Saved`) прежде чем уйти со страницы;
   навигация — только по явному действию (Next/End/Back). Подробности:
   [`.agents/harness/code-safety.md`](.agents/harness/code-safety.md).

## Карта `.agents/`

| Файл | Что внутри |
|---|---|
| [`architecture.md`](.agents/architecture.md) | Модель данных (`Game→Round→Question→Answer`, `Team`, `Launch`) и жизненный цикл игры от запуска до подсчёта очков |
| [`skills/backend-express.md`](.agents/skills/backend-express.md) | Стандарты контроллеров Express+TS, валидация ObjectId, лёгкий поллинг |
| [`skills/frontend-react.md`](.agents/skills/frontend-react.md) | Стандарты React+TS+SCSS Modules, UI-паттерны планшета ведущего, roadmap мобильных капитанов |
| [`tools/cloudinary.md`](.agents/tools/cloudinary.md) | Работа с изображениями: Cloudinary SDK + multer, запрет `/uploads` |
| [`harness/code-safety.md`](.agents/harness/code-safety.md) | Защитный вольер: редиректы, совместимость типов, переменные окружения деплоя |

## Быстрый старт для агента

```bash
npm start                     # корень: поднимает server (5050) + client (5173) параллельно
cd server && npx tsc --noEmit # проверка типов бэкенда
cd client && npx tsc --noEmit # проверка типов фронтенда (2 deprecation-warning в tsconfig — не баг)
```

Дефолтный сид-админ: `admin` / `admin` (см. `server/src/seeder.ts`) — пароль
хранится **не хэшированным** (`passwordHash` = plain text). Известный долг,
не исправлять втихую в рамках несвязанной задачи — см.
[`.agents/harness/code-safety.md`](.agents/harness/code-safety.md).
