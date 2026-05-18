# Trade Rep Dashboard

Отдельный веб-дашборд торгового представителя: продажи, выполнение планов групп, дебиторка и ежедневное обновление через Telegram-бота.


## Дерево проекта

```text
app/                         # Next.js pages and API routes
components/                  # UI, charts, table and page client components
lib/                         # types, parsing, formatting and analytics
scripts/                     # data pipeline, Telegram bot, git push
data/raw/                    # uploaded Excel sources
data/processed/              # dashboard JSON and monthly plan inputs
```

## Стек

- Next.js 14, React, TypeScript
- Tailwind CSS
- Recharts
- TanStack Table
- SheetJS/xlsx для Excel
- grammY для Telegram-бота

## Архитектура данных

```text
data/raw/                  # ежедневные исходные Excel-файлы
data/processed/            # нормализованные JSON для сайта
lib/excel.ts               # парсер Excel, алиасы колонок, валидация
lib/analytics.ts           # KPI и бизнес-правила
scripts/process-data.ts    # raw Excel -> processed JSON
scripts/telegram-bot.ts    # прием 3 файлов и запуск pipeline
scripts/git-auto-commit.ts # commit/push data changes
```

Файлы должны называться так, чтобы бот понял тип:

- `sales-YYYY-MM-DD.xlsx`
- `group-plan-YYYY-MM-DD.xlsx`
- `receivables-YYYY-MM-DD.xlsx`

## Критическое KPI-правило

Для KPI выполнения валового плана группа `Автомобільна Шина` всегда исключается из оборота. При этом общий оборот в аналитике показывает все группы.

Формула:

```text
Выполнение валового плана = оборот без "Автомобільна Шина" / ручной валовый план месяца * 100
```

## Локальный запуск

```bash
npm install
npm run dev
```

Mock-данные уже лежат в `data/processed/dashboard.json`.

## Обработка Excel

1. Положите 3 файла в `data/raw/`.
2. Проверьте префиксы: `sales`, `group-plan`, `receivables`.
3. Запустите:

```bash
npm run process:data
```

Если обязательная колонка не найдена, скрипт покажет понятную ошибку с именем поля.

## Telegram upload flow

Создайте `.env` по примеру `.env.example`:

```bash
TELEGRAM_BOT_TOKEN=...
GITHUB_TOKEN=...
GITHUB_REPO=owner/trade-rep-dashboard
ALLOWED_TELEGRAM_USER_ID=123456789
DEFAULT_BRANCH=main
```

Запуск бота:

```bash
npm run bot
```

Сценарий:

1. Пользователь отправляет `/start`.
2. Загружает 3 Excel-файла.
3. Бот проверяет, что получены sales, group-plan и receivables.
4. Файлы сохраняются в `data/raw/`.
5. Запускается `npm run process:data`.
6. Запускается `npm run commit:data`.
7. GitHub/Vercel подхватывает push и обновляет сайт.

## Ручной валовый план месяца

История планов хранится в `data/processed/monthly-plans.json`:

```json
[
  { "month": "2026-05", "grossPlan": 163000 },
  { "month": "2026-06", "grossPlan": 175000 }
]
```

Страница `/settings` содержит форму-заготовку. В production ее можно подключить к serverless API, который обновляет JSON и запускает commit/push.
