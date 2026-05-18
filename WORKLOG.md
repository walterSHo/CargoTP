# Worklog

Рабочий журнал проекта `CargoTP`. Этот файл фиксирует текущее состояние, важные решения и протокол работы, чтобы следующие изменения не начинались с нуля.

## Текущее состояние

- Дата первичного обзора: 2026-05-18.
- Основная ветка: `main`.
- Remote: `origin` -> `https://github.com/walterSHo/CargoTP.git`.
- Продукт: дашборд торгового представителя для продаж, плана групп, дебиторки, шин и ручного валового плана.
- Production-деплой теперь рассчитан на Cloudflare Pages: public artifact собирается в `dist/`.
- Next.js-приложение в `app/`, `components/`, `lib/` оставлено как расширяемая версия интерфейса.
- Единственный production source of truth для Excel: `data/raw/Олексієнко.xlsx` или архивный файл формата `data/raw/Олексієнко_DD.MM-DD.MM.xlsx`.
- На момент обзора raw workbook присутствует, но `data/processed/dashboard.json` имеет статус `no_excel_processed`, а массивы `sales`, `groupPlans`, `receivables` пустые.

## Архитектура

- `index.html` содержит автономный статический UI: вкладки Overview, Sales, Group Plan, Receivables, Tires.
- `upload.html` дает приватный web UI для загрузки нового Excel source.
- `functions/api/upload.js` принимает Excel, валидирует секрет и кладет raw workbook в GitHub, затем запускает `repository_dispatch`.
- `data/processed/dashboard.json` является главным JSON для статического UI.
- `scripts/build-static.mjs` собирает безопасный public bundle в `dist/` без `data/raw`.
- `scripts/process-data.ts` читает Excel, распознает листы по заголовкам, нормализует данные, пишет `data/processed/*.json` и архивирует исходный workbook по периоду.
- `lib/excel.ts` отвечает за распознавание колонок, парсинг дат, чисел и схемы `zod`.
- `lib/analytics.ts` содержит KPI, выбор месяца, исключение шин из валового плана, топы и tire analytics.
- `lib/product-groups.ts` нормализует группы товаров и определяет шинные группы.
- `.github/workflows/process-data.yml` обрабатывает Excel по `repository_dispatch excel-uploaded`, manual dispatch и по push в processing code.
- `scripts/telegram-bot.ts` принимает Excel через Telegram, сохраняет canonical workbook, запускает обработку, audit и optional push.
- `scripts/git-auto-commit.ts` коммитит и пушит только `data/raw` и `data/processed` при настроенных GitHub env.

## Команды

- Установка зависимостей: `npm install`.
- Сборка Cloudflare Pages bundle: `npm run build:pages`.
- Локальный Next.js dev server: `npm run dev`.
- Проверка TypeScript: `npm run typecheck`.
- Обработка Excel: `npm run process:data`.
- Аудит processed JSON: `npm run audit:data`.
- Проверка источника данных: `npm run verify:source`.
- Инспекция workbook: `npm run inspect:excel -- data/raw/Олексієнко.xlsx`.
- Статический просмотр GitHub Pages-версии локально: `python3 -m http.server 8000`.

## Протокол Перед Изменениями

- Начинать с `git status -sb`.
- Проверять, не появились ли чужие изменения, и не перетирать их.
- Перед изменениями данных понимать, что `npm run process:data` может переименовать raw Excel-файл в архивный файл по периоду.
- Для UI-изменений помнить, что production-поведение живет в `index.html`, `upload.html` и `functions/api/upload.js`; Next.js-страницы не заменяют Cloudflare Pages static flow автоматически.
- Для изменений аналитики синхронизировать поведение между `index.html` и `lib/analytics.ts`, если правка должна работать и в static, и в Next.js.
- Никогда не публиковать `data/raw` в public deploy output.
- Не добавлять demo/fake rows ни в `data/processed`, ни в UI fallback.

## Обязательная Проверка

- Документация: минимум `git diff --check`.
- Изменения data pipeline: `npm run process:data`, затем `npm run audit:data`, затем `npm run verify:source`.
- Изменения аналитики или типов: `npm run typecheck` и релевантные data checks.
- Изменения статического UI: открыть через локальный static server и проверить `npm run build:pages`.
- Изменения Telegram/GitHub automation: проверить env requirements, не раскрывать токены, не коммитить `.env`.

## Журнал

### 2026-05-18

- Репозиторий склонирован в `/Users/walterpng/Documents/tp/CargoTP`.
- SSH clone не прошел из-за отсутствия public key; рабочий clone выполнен через HTTPS.
- Проверен dry-run push в `origin/main`: доступ на push есть.
- Изучены README, package scripts, static UI, Next.js pages/components, data pipeline, Telegram bot и GitHub workflow.
- Созданы рабочие правила для будущих агентов в `AGENTS.md`.
- Добавлен Cloudflare Pages upload flow: `upload.html` + `functions/api/upload.js` + `repository_dispatch` workflow trigger.
- Добавлена сборка `dist/`, чтобы raw Excel не публиковался как статический asset.
