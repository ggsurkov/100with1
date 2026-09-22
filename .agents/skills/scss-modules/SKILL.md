---
name: scss-modules
description: Правила стилизации в client/ — только SCSS Modules, запрет Tailwind и inline-стилей, CSS-переменные и темы, переиспользование общих классов вместо копирования блоков стилей. Читай перед созданием или правкой любого .module.scss или классов в JSX.
---

# Стили: только SCSS Modules

## Жёсткие запреты

1. **Tailwind CSS запрещён.** Никаких утилитарных классов в JSX, никакого `tailwind.config`,
   никаких `@tailwind`-директив. Он был подключён однажды и полностью удалён — не переоткрывай
   этот вопрос без явного запроса пользователя.
2. **Inline `style={{...}}` запрещён.** Единственное допустимое исключение — `style={{ display: 'none' }}`
   на скрытом `<input type="file">` (уже есть в `GameEdit`).
   Известные нарушения к исправлению: `TeamEdit.tsx` (кнопки Cancel/Save),
   loading-заглушки `RoundStart.tsx` / `RoundCheck.tsx` (`style={{ color: 'white' }}`).
3. **Глобальные стили — только в `src/index.scss`**, и только базовые сбросы, шрифты
   и CSS-переменные. Никаких новых глобальных классов компонентов.

## Структура

- Каждому компоненту — co-located файл `ComponentName.module.scss` рядом с `.tsx`.
- Импорт: `import styles from './ComponentName.module.scss';`
- Классы — `camelCase` (`questionTitle`, `answerPlank`), потому что обращение идёт через `styles.x`.
- Композиция классов: `className={`${styles.btn} ${isSaved ? styles.saved : ''}`}` — принятый в проекте стиль.

## Цвета — только через CSS-переменные

Палитра объявлена в `src/index.scss` на `:root`:
`--bg-primary`, `--bg-secondary`, `--text-primary`, `--text-secondary`,
`--accent`, `--accent-hover`, `--danger`, `--danger-hover`, `--success`, `--success-hover`, `--warning`.

**Не хардкодь hex в модулях.** Сейчас хуже всего с этим в `LandingPage.module.scss` (19 хардкодов),
`GameEdit.module.scss` (13), `ResultsPage.module.scss` (11) — при правке этих файлов заменяй
литералы на переменные.

## Темы игры

`styles/themes.module.scss` — класс на каждый `GameType`, который переопределяет CSS-переменные
для всего, что обёрнуто в него. Тема навешивается на корневой div экрана:

```tsx
const themeClass = themeClassFor(launch?.gameType ?? game?.type);
return <div className={`${styles.fullscreen} ${themeClass}`}>…</div>;
```

Тематические переменные (`--theme-gradient`, `--theme-glow`, `--theme-card-border`,
`--theme-plank-gradient`, `--theme-tag-bg` и т.д.) уже объявлены — используй их вместо новых хардкодов.

**Новый тип игры:** добавь класс в `themes.module.scss` → смаппь enum-значение в `styles/themes.ts`.
Больше нигде цвета трогать не нужно. Не создавай второй механизм тем.

## Переиспользование стилей

- Админские страницы берут общие классы из `pages/pagesStyles.module.scss`
  (`card`, `title`, `form`, `row`, `input`, `button`, `table`, `editBtn`, `deleteBtn`).
  Новая страница админки — сначала эти классы, свой модуль только под уникальные части
  (так сделано в `GamesAdmin` и `UsersManagement`).
- **Модалки.** Пары `.overlay` + `.modal` (fixed-фон, центрирование, затемнение) продублированы
  в `ConfirmModal`, `ScoreboardModal`, `LaunchModal`, `TeamChoosePage`, плюс похожие оверлеи
  в `GameRounds` (QR) и `CaptainPlayPage` (выход). При появлении `components/Modal.tsx`
  (см. скилл `frontend-react`) стили оверлея переезжают в его модуль, а страницы стилизуют
  только содержимое.
- `.glass-panel` в `index.scss` — единственная разрешённая глобальная утилита; для нового
  «стеклянного» блока используй её, а не копируй `backdrop-filter`-блок.

## Адаптивность

Два очень разных класса устройств — планшет ведущего (landscape, крупные шрифты, тёмный фон)
и телефон капитана (portrait, тап-таргеты, fullscreen PWA). Не пытайся стилизовать их одним набором
классов: экраны ведущего (`RoundStart`, `RoundCheck`, `GameRounds`) и капитана
(`CaptainPlayPage`, `TeamChoosePage`) держат раздельные модули — так и оставляй.

Брейкпоинты сейчас задаются по месту в семи файлах. Если добавляешь новый — придерживайся
значений, уже использованных в соседних модулях, а не изобретай своё.

## Чек-лист перед завершением правки стилей

- [ ] Ни одного класса Tailwind, ни одного inline-`style`.
- [ ] Цвета — переменные, а не hex.
- [ ] Ничего не добавлено в `index.scss`, кроме переменных/сбросов.
- [ ] Скопированный из соседнего модуля блок вынесен в общий, а не продублирован.
- [ ] Экран ведущего проверен на тёмной теме `themeGuessPopularity`.
