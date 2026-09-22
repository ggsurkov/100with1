---
name: project-map
description: Карта репозитория 100with1 — где что лежит, какие файлы читать под конкретную задачу, какие маршруты и модели существуют. Читай ПЕРВОЙ в начале любой задачи по этому репо, до поиска файлов через grep/glob, чтобы не сканировать проект вслепую.
---

# Карта проекта 100with1 (PintaGames)

Монорепо: `server/` (Express+TS+Mongoose) + `client/` (React 19 + Vite + TS + SCSS Modules).
Запуск: `npm start` в корне (server :5050, client :5173, Vite проксирует `/api` → 5050).

**Не запускай Git-команды** (правило AGENTS.md). Версионированием занимается человек.

## Полный инвентарь исходников

Проект маленький — это весь код. Не ищи «где-то ещё», здесь всё.

### server/src (~760 строк)
| Файл | Строк | Содержимое |
|---|---|---|
| `routes/api.ts` | 376 | **ВСЕ** роуты: login, users, teams, upload, games, launches, captain-эндпоинты. Контроллеров/сервисов нет. |
| `models/Game.ts` | 71 | `IGame → IRound → IQuestion → IAnswer` (вложенные схемы, не отдельные коллекции) |
| `models/Launch.ts` | 53 | сессия игры: `teamGameInfo[]`, `questionScores`, `currentRoundId/QuestionId`, `isTimerActive`, QR |
| `models/TeamAnswer.ts` | 31 | ответы капитанов: `{launchId, gameId, teamId, answers[]}` |
| `models/Team.ts` / `User.ts` | 26 / 39 | команда с 4-значным `pin`; пользователь с `role` + `permissions` |
| `middleware/auth.ts` | 32 | `authMiddleware`, `requireRole`, `requirePermission` |
| `middleware/upload.ts` + `config/cloudinary.ts` | 22 + 18 | multer → Cloudinary (диск не используется) |
| `utils/url.ts` | 28 | `getClientBaseUrl` для ссылок в QR |
| `seeder.ts` | 37 | сид админа + бэкфилл PIN команд |
| `index.ts` | 28 | bootstrap |

### client/src (~3200 строк TSX/TS + ~3400 строк SCSS)
Группы страниц (важно понимать, к какой группе относится задача):

**A. Админка** (`/admin/*`, лэйаут `layouts/AdminLayout.tsx`, общие стили `pages/pagesStyles.module.scss`)
`TeamsAdmin` · `TeamEdit` · `GamesAdmin` · `GameEdit` (481 строка, самый большой файл) · `UsersManagement`

**B. Экран ведущего / планшет** (`/games`, `/game/:id/...`, `/launch/:launchId/...`)
`GamesList` → `LaunchModal` → `GameRounds` (213) → `RoundStart` (173) / `RoundCheck` (385)
Общее: `components/FinishGameButton`, `utils/audio`, `styles/themes`

**C. Телефон капитана** (публичное, без JWT, `services/publicApi.ts`)
`PwaAppPage` (`/app`) → `TeamChoosePage` (`/launch/:id/join`) → `CaptainPlayPage` (`/launch/:id/play`, 304)
Общее: `components/InAppQrScanner`, `localStorage` ключи `pinta_launch_id` / `pinta_team_id` / `pinta_team_title`

**D. Публичное**: `LandingPage` (`/`), `ResultsPage` (`/results`) + `components/ScoreboardModal`, `Login` (`/auth`)

**Инфраструктура клиента**: `services/api.ts` (JWT + 401-редирект) · `services/publicApi.ts` (без JWT) ·
`context/AuthContext.tsx` (`useAuth`, `hasPermission`) · `types/{auth,game,launch}.ts` ·
`utils/{audio,image}.ts` · `styles/themes.{ts,module.scss}`

## Что читать под задачу (не читай лишнего)

| Задача | Читай только |
|---|---|
| Новый/изменённый API-эндпоинт | `routes/api.ts` (нужный участок через `sed -n`), нужную модель |
| Изменение схемы данных | нужная модель в `server/src/models/` + зеркальный тип в `client/src/types/` |
| Экран ведущего | одна страница из группы B + её `.module.scss` |
| Экран капитана | `CaptainPlayPage` / `TeamChoosePage` + `publicApi.ts` |
| Права/роли | `middleware/auth.ts` + `models/User.ts` + `context/AuthContext.tsx` + `types/auth.ts` |
| Цвета/тема | `styles/themes.module.scss` + `index.scss` (CSS-переменные) |
| Звук | `utils/audio.ts` |
| Картинки вопросов | `utils/image.ts` + `middleware/upload.ts` |

## Жизненный цикл игры (нужен, чтобы не сломать логику)

1. Админ создаёт `Game` с `rounds[].questions[].answers[]` (`GameEdit`).
2. Ведущий в `GamesList` → `LaunchModal` выбирает команды → `POST /launches` создаёт `Launch`
   со снапшотом `teamGameInfo[]` и двумя QR (`qrCodeApp` — установка PWA, `qrCodeLaunch` — вход в игру).
3. Капитан сканирует QR → `TeamChoosePage` (выбор команды + PIN) → `POST /launches/:id/join`
   → `capitanActive = true`, создаётся пустой `TeamAnswer`.
4. `GameRounds` — выбор раунда, кнопки Start/Check, обновляет `currentRoundId`.
5. `RoundStart` — таймер вопроса; пушит `currentQuestionId` и `isTimerActive` в `Launch`.
   Телефоны капитанов опрашивают `GET /launches/:id/state` каждые 3 с и открывают/закрывают ввод.
6. `RoundCheck` — ведущий вскрывает ответы табло, сопоставляет ответы капитанов с официальными,
   «Calculate & Save» пишет `questionScores[questionId]` и пересчитывает `teamPoints` (идемпотентно).
7. `FinishGameButton` → `status: 'finished'` + `finishedAt` → игра видна на публичном `/results`.

## Фактические расхождения с AGENTS.md (проверено по коду)

- **`.agents/` не существует** — каталог в `.gitignore`. Все ссылки из AGENTS.md на `.agents/**` битые.
  Актуальные правила — в этих скиллах (`.Codex/skills/`).
- **Сид-админ — `admin@admin.com` / `admin`**, пароль **хешируется bcrypt** (`server/src/seeder.ts`),
  логин идёт по `email`, а не по `username`. Утверждение AGENTS.md про plain-text `passwordHash` устарело.

## Проверка работы (единственный допустимый «тест»)

```bash
cd server && npx tsc --noEmit    # типы бэкенда
cd client && npx tsc --noEmit    # типы фронтенда (2 deprecation-warning в tsconfig — не баг)
```
Автотестов и линтера в проекте нет. Не выдумывай `npm test`.
