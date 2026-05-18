# Trade Rep Dashboard

Дашборд торгового представителя с реальным Excel source of truth: продажи, план групп, дебиторка, шины и ручной валовый план. Новый production flow больше не требует локального `npm run process:data` на рабочем ПК: Excel загружается через приватный веб-интерфейс или приватный endpoint, дальше GitHub Actions сам обновляет `data/processed/*.json`, а Cloudflare Pages автоматически выкатывает свежий статический дашборд.

## Новая схема

1. Dashboard хостится на Cloudflare Pages.
2. Публично раздается только `dist/`, а не весь корень репозитория.
3. Приватная загрузка идет через Cloudflare Pages Function `POST /api/upload`.
4. Upload flow кладет Excel в GitHub как `data/raw/Олексієнко.xlsx`.
5. После загрузки Function отправляет `repository_dispatch` событие `excel-uploaded`.
6. GitHub Actions запускает `npm run process:data`, `npm run audit:data`, `npm run verify:source`.
7. Workflow коммитит обновленные `data/raw` и `data/processed`.
8. Новый commit автоматически триггерит деплой Cloudflare Pages.

Важно:

- production source of truth только реальный Excel;
- mock/demo/fallback data запрещены;
- default month строится только из дат в sales rows;
- шины остаются отдельной аналитикой;
- шины не входят в KPI валового плана.

## Production flow без локального запуска

Пользовательский сценарий теперь такой:

1. Открыть приватную страницу `https://<your-pages-domain>/upload.html`.
2. Ввести пароль и выбрать `.xlsx` или `.xls`.
3. Нажать кнопку загрузки.
4. Дождаться ответа страницы о запуске pipeline.
5. Через 1–2 минуты открыть дашборд: Cloudflare Pages уже отдаст свежие `data/processed/*.json`.

CLI-вариант тоже есть:

```bash
curl -X POST "https://<your-pages-domain>/api/upload" \
  -F "password=<UPLOAD_PASSWORD>" \
  -F "file=@/path/to/Олексієнко.xlsx"
```

## Что теперь делает Cloudflare

- `upload.html` дает удобный приватный UI для загрузки.
- `functions/api/upload.js` принимает `multipart/form-data`.
- Endpoint проверяет секрет и optional IP allowlist.
- Endpoint загружает новый Excel в GitHub path `data/raw/Олексієнко.xlsx`.
- Endpoint триггерит GitHub Actions через `repository_dispatch`.

Cloudflare не парсит Excel. Тяжелая обработка остается в GitHub Actions, что безопаснее и проще поддерживать.

## Что теперь делает GitHub Actions

Workflow `.github/workflows/process-data.yml` запускается:

- по `repository_dispatch` типа `excel-uploaded`;
- вручную через `workflow_dispatch`;
- по push в processing code (`scripts/process-data.ts`, `scripts/audit-processed-data.mjs`, `scripts/verify-source-data.mjs`, `lib/**`).

Workflow:

1. checkout репозиторий;
2. устанавливает Node 22 и зависимости;
3. запускает `npm run process:data`;
4. запускает `npm run audit:data`;
5. запускает `npm run verify:source`;
6. коммитит и пушит `data/raw` и `data/processed`, если они изменились.

## Cloudflare Pages setup

### 1. Подключить репозиторий

В Cloudflare Dashboard:

1. `Workers & Pages` -> `Create application` -> `Pages`.
2. Подключить GitHub репозиторий `walterSHo/CargoTP`.
3. Build command: `npm run build:pages`
4. Build output directory: `dist`

Сборка `dist/` делается скриптом `scripts/build-static.mjs`. Это важно: raw Excel из `data/raw` не должен публиковаться как статический файл.

### 2. Добавить Pages Functions secrets / vars

В Cloudflare Pages project settings -> `Environment variables`:

- `UPLOAD_PASSWORD`
  Значение для web form или `curl`.
- `UPLOAD_BEARER_TOKEN`
  Необязательно. Можно использовать вместо пароля для header `Authorization: Bearer ...`.
- `UPLOAD_IP_ALLOWLIST`
  Необязательно. Список IP через запятую. Если задан, кроме секрета нужен еще allowlist match.
- `GITHUB_UPLOAD_TOKEN`
  Fine-grained GitHub token с правами `Contents: Read and write`.
- `GITHUB_REPO`
  Значение вида `walterSHo/CargoTP`.
- `DEFAULT_BRANCH`
  Обычно `main`.
- `UPLOAD_RAW_PATH`
  По умолчанию `data/raw/Олексієнко.xlsx`, обычно менять не нужно.

Для локальной Pages-разработки можно использовать `.dev.vars` по образцу из `.dev.vars.example`. Сам файл `.dev.vars` уже игнорируется Git.

### 3. Настроить доступ

Минимальный безопасный вариант:

- задать `UPLOAD_PASSWORD`;
- держать `upload.html` вне публичной навигации;
- при необходимости добавить `UPLOAD_IP_ALLOWLIST`.

Если нужен server-to-server flow, используйте `UPLOAD_BEARER_TOKEN` и `POST /api/upload` с заголовком `Authorization: Bearer <token>`.

## GitHub setup

### 1. GitHub token для Cloudflare

Нужен fine-grained PAT:

1. GitHub -> `Settings` -> `Developer settings` -> `Personal access tokens` -> `Fine-grained tokens`.
2. Дать доступ только к этому репозиторию.
3. Разрешение: `Contents` -> `Read and write`.
4. Сохранить token только в Cloudflare Pages env как `GITHUB_UPLOAD_TOKEN`.

`repository_dispatch` и `create/update file contents` поддерживаются через GitHub REST API. По GitHub Docs для dispatch нужен write-доступ к repository contents, а для create/update contents нужен `Contents: write`.

### 2. GitHub Actions

Workflow уже находится в репозитории. Никакой локальный запуск импорт-скрипта не нужен.

После каждого upload flow будет:

- commit с новым `data/raw/Олексієнко.xlsx`;
- dispatch `excel-uploaded`;
- Actions parsing;
- commit processed JSON;
- автоматический Cloudflare Pages deploy.

## Production source of truth

Эталонный production source:

- `data/raw/Олексієнко.xlsx`
- или архивный файл `data/raw/Олексієнко_DD.MM-DD.MM.xlsx`, который получается после обработки

`scripts/process-data.ts` читает только этот источник и:

1. распознает листы продаж, плана групп и дебиторки;
2. нормализует даты в `YYYY-MM-DD`;
3. дедуплицирует пересечения;
4. пишет:
   `data/processed/sales.json`
   `data/processed/group-plan.json`
   `data/processed/receivables.json`
   `data/processed/meta.json`
   `data/processed/dashboard.json`
5. архивирует raw Excel по периоду.

Если Excel не найден, sales rows пусты или даты невалидны, скрипт падает. Demo данные в UI не подставляются.

## Важные бизнес-правила

### Month selection

- default month берется только из дат parsed sales rows;
- `monthly-plans.json` не добавляет месяцы в selector сам по себе.

### Валовый план

Ручной валовый план хранится в `data/processed/monthly-plans.json`.

Формула:

```text
Выполнение валового плана = оборот без шин / ручной валовый план месяца * 100
```

### Шины

Шины:

- показываются в общей аналитике;
- имеют отдельную аналитику `/tires`;
- не входят в KPI валового плана.

Распознавание идет через `normalizeProductGroup()` и `isTireGroup()`. Поддерживаются варианты вроде `Автомобільна Шина`, `Автомобильная Шина`, `Шина`, `Шины`, `шин...`, `tire`, `tyre`.

## Проверки против demo/fake данных

`npm run audit:data`:

- показывает counts, months и samples;
- падает, если в processed JSON найдены известные demo values вроде `Авто Плюс`, `Brand A`, `U-100`.

`npm run verify:source`:

- проверяет наличие `data/raw/Олексієнко.xlsx` или архивного workbook;
- проверяет, что processed JSON построен из допустимого source.

## Локальная разработка

### Дашборд

Чтобы посмотреть статическую версию локально:

```bash
python3 -m http.server 8000
```

Открыть:

```text
http://localhost:8000
```

Если нужен Cloudflare Pages bundle:

```bash
npm run build:pages
```

После этого статические production assets лежат в `dist/`.

### Next.js версия

Next.js код в `app/`, `components/`, `lib/` остается расширяемой версией интерфейса:

```bash
npm install
npm run dev
```

### Ручной локальный import

Локальный `npm run process:data` остается только как fallback для разработки или отладки. Для обычного ежемесячного обновления production дашборда он больше не нужен.

## Структура проекта

```text
app/                         # Next.js pages and API routes
components/                  # UI, charts, tables and page client components
data/raw/                    # raw Excel source, not publicly deployed
data/processed/              # generated JSON for dashboard
dist/                        # Cloudflare Pages deploy artifact
functions/                   # Cloudflare Pages Functions
lib/                         # types, Excel parsing, normalization, analytics
scripts/                     # process-data, audit, verify, static build
index.html                   # static dashboard source
upload.html                  # private upload UI source
```
