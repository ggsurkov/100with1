---
name: frontend-react
description: Стандарты React+TypeScript для client/ — переиспользование компонентов и хуков, реестр уже существующих переиспользуемых сущностей, список подтверждённых дублей и куда их выносить, типизация вместо any. Читай перед созданием или правкой любого компонента/страницы в client/src.
---

# Frontend: React + TS в client/

## Правило №0 — сначала переиспользуй, потом пиши

Перед созданием любого компонента, хука или утилиты сверься с реестром ниже.
**Запрещено** копировать блок JSX/логики из соседней страницы «чтобы быстрее».
Если один и тот же код нужен во второй раз — выноси в `components/`, `hooks/` или `utils/`
**в том же изменении**, а не «потом».

## Реестр существующих переиспользуемых сущностей

Используй их, не пиши аналоги:

| Что | Где | Назначение |
|---|---|---|
| `api` | `services/api.ts` | axios с JWT-интерсептором и 401→`/auth`. **Все** авторизованные запросы |
| `publicApi` | `services/publicApi.ts` | axios без JWT. **Только** экраны капитана (`join`/`state`/`answers`) |
| `useAuth()` | `context/AuthContext.tsx` | `user`, `hasPermission('EDIT')`, `isAdmin()`, `canManageUsers()` |
| `ConfirmModal` | `components/ConfirmModal.tsx` | Любое подтверждение опасного действия |
| `FinishGameButton` | `components/FinishGameButton.tsx` | Кнопка «Завершить игру» (сама проверяет роль, сама рендерит `null`) |
| `ScoreboardModal` | `components/ScoreboardModal.tsx` | Модалка с итоговой таблицей |
| `InAppQrScanner` | `components/InAppQrScanner.tsx` | Сканер QR внутри PWA |
| `optimizeCloudinaryUrl(url)` | `utils/image.ts` | **Обязательно** для каждого `<img src>` с картинкой вопроса |
| `utils/audio.ts` | `utils/audio.ts` | `playRevealSound`, `startTimerMusic`/`stopTimerMusic`, `isMuted`/`toggleMute`, `forceMute` |
| `themeClassFor(gameType)` | `styles/themes.ts` | Класс темы на корневой div экрана ведущего |
| `pagesStyles.module.scss` | `pages/` | `card`, `title`, `form`, `row`, `input`, `button`, `table`, `editBtn`, `deleteBtn` для админки |

## Подтверждённые дубли и куда их выносить

Это не гипотезы — код совпадает построчно. Правь их, когда касаешься соответствующего файла;
не оставляй третью копию.

1. **Загрузка game/launch** — идентичный `useEffect` в `RoundStart.tsx`, `RoundCheck.tsx`, `GameRounds.tsx`
   (`launchId ? GET /launches/:id` + `setGame(data.gameId)` : `GET /games/:id`).
   → `hooks/useLaunchOrGame.ts`, возвращает `{ game, launch, setLaunch, loading }`.

2. **`backPath`** — `launchId ? '/launch/:launchId/rounds' : '/game/:id/rounds'` в `RoundStart` и `RoundCheck`.
   → в тот же хук или `utils/routes.ts` (`roundsPath`, `roundPath(mode)`).

3. **Поиск раунда** — `game?.rounds?.find((r, idx) => r._id === roundId || idx.toString() === roundId)`
   в `RoundStart` и `RoundCheck`. → `utils/game.ts`, функция `findRound(game, roundId)`.

4. **Панель звука ведущего** — блок `FinishGameButton` + «Проверить звук» + mute-кнопка
   продублирован в `RoundStart.tsx` и `RoundCheck.tsx`. → `components/HostAudioBar.tsx` с пропом `launchId`.

5. **Поллинг раз в 3 с** — одинаковый паттерн (флаг `cancelled` + `setInterval` + очистка)
   в `RoundCheck` (ответы капитанов) и `CaptainPlayPage` (состояние запуска).
   → `hooks/usePolling(fetchFn, intervalMs, deps)`. Про цену поллинга — скилл `backend-express`.

6. **Оверлей + модалка** — своя разметка и свои классы `.overlay`/`.modal` в **шести** местах:
   `ConfirmModal`, `ScoreboardModal`, `LaunchModal`, `TeamChoosePage` (PIN), `GameRounds` (QR),
   `CaptainPlayPage` (выход). → `components/Modal.tsx` — оболочка с закрытием по клику на фон,
   `stopPropagation` внутри и обработкой Escape; остальные модалки строятся на ней.

7. **Лайтбокс картинки** — `GameEdit` (превью вопроса) и `CaptainPlayPage`. → `components/Lightbox.tsx`.

8. **Список команд с очками, отсортированный по убыванию** — `GameRounds` (Scoring Board),
   `ScoreboardModal`, `ResultsPage`. → `components/Scoreboard.tsx` (`teams`, `variant`).

9. **Ключи `localStorage` капитана** — константы `pinta_launch_id` / `pinta_team_id` /
   `pinta_team_title` объявлены отдельно в `TeamChoosePage` и `CaptainPlayPage`.
   → `utils/captainSession.ts`: `saveCaptainSession`, `readCaptainSession`, `clearCaptainSession`.

10. **CRUD-таблица админки** — `fetch → list → delete → refetch` и одинаковая
    `<table className={common.table}>` в `TeamsAdmin`, `GamesAdmin`, `UsersManagement`.
    → `hooks/useCrudList<T>(resource)` и/или `components/AdminTable.tsx` (`columns`, `rows`, `actions`).

11. **Мёртвый импорт** — `TeamEdit.tsx` импортирует `./TeamsAdmin.module.scss`, который пуст (1 строка).
    Удали импорт и пустой файл, когда будешь трогать `TeamEdit`.

## Типизация: убрать `any`

Сейчас `any` встречается в `GameEdit` (7 мест), `RoundCheck` (15), `RoundStart`, `TeamChoosePage`,
`TeamEdit`, `UsersManagement`; плюс `types/game.ts` объявляет `rounds: any[]`.

Правило: **клиентские типы зеркалят серверные интерфейсы**.

```ts
// client/src/types/game.ts — довести до зеркала server/src/models/Game.ts
export interface Answer   { _id: string; text: string; hint: string; orderNumber: number; points: number; hide: boolean; popularity?: number; }
export interface Question { _id: string; title: string; hint: string; timer: number; orderNumber: number; imageUrl?: string; answers: Answer[]; }
export interface Round    { _id: string; orderNumber: number; type: number; hint: string; questions: Question[]; }
export interface Game     { _id: string; title: string; description: string; type?: GameTypes; rounds: Round[]; }
```

- Новое серверное поле → на клиенте **опциональное** (`field?: T`) с безопасным fallback: в базе
  лежат сыгранные игры без него (правило обратной совместимости из AGENTS.md).
- `useState<any>(null)` для game/launch → `useState<Game | null>(null)`, `useState<Launch | null>(null)`.
- `catch (error: any)` оправдан только ради `error.response?.data?.message`; лучше вынести общий
  `utils/apiError.ts` с `getApiErrorMessage(error, fallback)` — этот паттерн повторяется
  в `GameEdit`, `TeamEdit`, `UsersManagement`, `TeamChoosePage`.

## Правила компонентов

- Один компонент = один файл + co-located `Component.module.scss`. Без `index.ts`-бочек.
- Экспорт страницы/компонента: `export default function Name()`. Именованный экспорт — для хуков и утилит.
- Пропсы — явный `interface NameProps`, без `React.FC`.
- Страницы (`pages/`) держат загрузку данных и состояние; `components/` — «глупые», данные через пропсы.
  Исключение, уже существующее в коде: `FinishGameButton` сам знает про роль — не размножай такие исключения.
- Права: рендер редактирующих контролов гейти через `hasPermission('EDIT' | 'CREATE')`,
  а не через `user.role === ...` россыпью по JSX.
- Никаких inline `style={{...}}` — только классы SCSS Modules (см. скилл `scss-modules`).
  Известные нарушения к исправлению: `TeamEdit.tsx` (кнопки), loading-состояния
  `RoundStart`/`RoundCheck` (`style={{ color: 'white' }}`).

## Хуки и эффекты

- Каждый `setInterval` и `addEventListener` **обязан** сниматься в cleanup-функции — это уже
  корректно сделано в `RoundStart` (таймер), `CaptainPlayPage` (fullscreen / popstate / visibilitychange),
  `RoundCheck` (клик вне поповера). Повторяй этот паттерн, не изобретай новый.
- Не отправляй `PUT` из эффекта без гарда «данные уже загружены»: в `RoundStart`/`RoundCheck`
  синхронизация состояния запуска гейтится через `if (!launch || !launchId) return;` — сохраняй это,
  иначе на каждый маунт летит лишний запрос в Atlas.
- Не клади в зависимости эффекта целый объект `game`/`launch`, если достаточно `question?._id`.

## Навигация

- **Никаких редиректов сразу после сохранения в `RoundCheck`** — ведущий должен увидеть `✓ Saved`.
  Навигация только по явному действию (Next / End Round / Back). Это жёсткое правило продукта.
- Пути строй из хелпера, а не конкатенацией строк по месту (см. дубль №2).
