# Trade Rep Dashboard

Отдельный веб-дашборд торгового представителя: продажи, планы групп, дебиторка, ручной валовый план и ежедневное обновление Excel через Telegram-бота.


## Как открыть дашборд

Да, теперь можно просто открыть `index.html`: это обычный статический HTML-дашборд для GitHub Pages.

### GitHub Pages

1. В настройках репозитория откройте **Settings → Pages**.
2. Source: **Deploy from a branch**.
3. Branch: `main` / folder: `/root`.
4. Откройте выданный GitHub Pages URL — загрузится `index.html`.

### Локально

Самый простой вариант — открыть `index.html` двойным кликом.

Если браузер заблокирует чтение `data/processed/dashboard.json` из-за `file://`, запустите статический сервер из корня проекта:

```bash
python3 -m http.server 8000
```

И откройте:

```text
http://localhost:8000
```

Next.js-код в `app/` оставлен как расширяемая версия, но для GitHub Pages достаточно корневого `index.html` + `data/processed/*.json`.

## Дерево проекта

```text
app/                         # Next.js pages and API routes
components/                  # UI, charts, tables and page client components
lib/                         # types, Excel parsing, normalization, analytics
scripts/                     # inspect/process Excel, Telegram bot, git push
data/raw/                    # uploaded Excel sources, e.g. Олексієнко.xlsx
data/processed/              # normalized JSON for dashboard
```

## Стек

- Next.js 14, React, TypeScript
- Tailwind CSS
- Recharts
- TanStack Table
- SheetJS/xlsx
- grammY Telegram bot


## Audit: защита от demo/fake данных

Проблема была в том, что в production JSON лежали seed/demo строки (`Авто Плюс`, `Brand A`, тестовые коды и суммы), а UI читал их как реальные. Сейчас production-поток исправлен:

- `data/processed/*.json` больше не содержит seed rows;
- если Excel не обработан, `index.html` показывает «Нет данных из Excel», а не фальшивые KPI;
- `scripts/process-data.ts` падает с ошибкой, если не найден Excel, sales rows или валидные даты;
- месяц по умолчанию строится только из дат parsed sales rows;
- `monthly-plans.json` не добавляет месяцы в month selector;
- `npm run audit:data` печатает counts, месяцы, unique clients/codes/brands/groups и первые 20 строк каждого набора, а также падает, если в processed JSON найдены известные demo-сущности.

Проверка после загрузки реального файла:

```bash
npm run process:data
npm run audit:data
npm run verify:source
```

Источник правды для production UI — только JSON, сгенерированные из `data/raw/Олексієнко.xlsx` через `npm run process:data`. Дополнительно можно выполнить `npm run verify:source`, чтобы проверить наличие файла и что processed JSON не построен из другого источника.

## Реальный Excel-файл

Эталонный файл: `data/raw/Олексієнко.xlsx`.

Production pipeline теперь по умолчанию читает только `data/raw/Олексієнко.xlsx` как единственный source of truth. Другие Excel-файлы не попадут в UI случайно. Если нужно временно проверить другой файл, можно задать `RAW_EXCEL_FILE=...`, но для production GitHub Pages используйте `Олексієнко.xlsx`. Это поддерживает два сценария внутри этого рабочего файла:

1. полный файл за период;
2. короткая дозагрузка за 1–3 дня.

Перед обработкой можно посмотреть, как распознался файл:

```bash
npm run inspect:excel -- data/raw/Олексієнко.xlsx
```

## Используемые листы и колонки

Листы ищутся не по фиксированному имени, а по заголовкам в первых 25 строках. Это сделано потому, что рабочие Excel-файлы могут иметь плавающие имена листов и служебные строки сверху.

### Продажи

Обязательные поля:

- клиент: `Клиент`, `Клієнт`, `Контрагент`, `Торгова точка`
- группа товара: `Группа товара`, `Група товару`, `Товарная группа`
- сумма: `Сумма в евро`, `Сума в євро`, `Оборот EUR`, `Сума`, `Сумма`, `Продаж`

Дополнительные поля, если есть:

- дата
- единый код клиента
- код клиента
- бренд
- код/название товара
- нетто-маржа
- % скидки

### Доли групп / план групп

Обязательные поля:

- группа товара
- план в деньгах
- факт

Дополнительные поля:

- план в %
- % выполнения
- % net

### Дебиторка

Обязательные поля:

- клиент
- общая задолженность

Дополнительные поля:

- единый код клиента
- код клиента
- непросроченная задолженность
- просроченная задолженность
- buckets `0–10`, `11–20`, `21–30`, `31+`

Если обязательные колонки не найдены, parser падает с понятной ошибкой вида: `Лист "..." похож на sales, но нет обязательных колонок: ...`.


### Автоматизация без ручного JSON

JSON руками создавать не нужно:

- локально: положить Excel в `data/raw/Олексієнко.xlsx` и выполнить `npm run process:data`;
- через Telegram: отправить Excel боту, бот сам сохранит файл, сконвертирует JSON и при наличии GitHub env сделает push;
- через GitHub: workflow `.github/workflows/process-data.yml` автоматически конвертирует Excel при push в `data/raw/`.

## Конвертация Excel → JSON

```bash
npm run process:data
```

Скрипт:

1. читает `data/raw/Олексієнко.xlsx` как единственный production source of truth;
2. распознает листы продаж, плана групп и дебиторки;
3. нормализует даты в `YYYY-MM-DD`;
4. дедуплицирует пересекающиеся строки при дозаливке;
5. пишет JSON:
   - `data/processed/sales.json`
   - `data/processed/group-plan.json`
   - `data/processed/receivables.json`
   - `data/processed/meta.json`
   - `data/processed/dashboard.json` для совместимости UI.

## Валовый план и исключение шин

Ручной валовый план хранится в `data/processed/monthly-plans.json` и редактируется на странице `/settings`.

Для KPI выполнения валового плана шины всегда исключаются:

```text
Выполнение валового плана = оборот без шин / ручной валовый план месяца * 100
```

Группа шин распознается helper-функциями:

- `normalizeProductGroup()`
- `isTireGroup()`

Учитываются варианты: `Автомобільна Шина`, `Автомобильная Шина`, `Шина`, `Шины`, похожие `шин...`, `tire`, `tyre`.

Важно: шины отображаются в общей аналитике и на отдельной странице `/tires`, но не попадают в KPI валового плана.

## Tire Analytics

Страница `/tires` показывает:

- общий оборот по шинам;
- клиентов, которые покупают шины;
- среднюю маржу и скидку;
- топ клиентов по шинам;
- топ брендов шин;
- рост/падение клиентов по шинам относительно предыдущих месяцев;
- клиентов, которые покупают шины и имеют просроченную дебиторку.

## Локальный запуск

```bash
npm install
npm run process:data
npm run dev
```

Если реального Excel-файла еще нет или pipeline не запускался, UI показывает явный статус «Нет данных» и не подставляет тестовые строки.

## Куда вводить команды

Команды вводятся в терминале, открытом в папке проекта `CargoTP`.

### Windows

1. Откройте папку `CargoTP`.
2. Кликните правой кнопкой по пустому месту в папке.
3. Выберите **Open in Terminal** / **Открыть в Терминале**.
4. Введите:

```bash
npm install
npm run bot
```

### macOS / Linux

```bash
cd /path/to/CargoTP
npm install
npm run bot
```

### GitHub Codespaces / VS Code

Откройте **Terminal → New Terminal** и выполните:

```bash
npm install
npm run bot
```

После `npm run bot` терминал должен оставаться открытым. Потом напишите боту в Telegram `/start` и отправьте Excel-файл.

## Telegram upload flow

Важно: токен бота нельзя коммитить в репозиторий. Если токен был отправлен в чат/PR, лучше перевыпустить его в BotFather.

Создайте локальный `.env` по `.env.example`. `.env` уже добавлен в `.gitignore`, поэтому токены не попадут в GitHub.

```bash
TELEGRAM_BOT_TOKEN=<ваш_новый_токен_бота>
ALLOWED_TELEGRAM_USER_ID=6327034985
GITHUB_TOKEN=<github_personal_access_token>
GITHUB_REPO=walterSHo/CargoTP
DEFAULT_BRANCH=main
```

> Токены, отправленные в чат, нельзя коммитить. Telegram token лучше перевыпустить в BotFather, а GitHub token — удалить/перевыпустить в GitHub Developer settings. Старые токены считайте скомпрометированными.

### Где взять `GITHUB_REPO`

`GITHUB_REPO` — это владелец и имя репозитория без `https://github.com/`. Для текущего репозитория: `GITHUB_REPO=walterSHo/CargoTP`.

Примеры:

- URL: `https://github.com/ivan/CargoTP` → `GITHUB_REPO=ivan/CargoTP`
- URL: `https://github.com/company/trade-dashboard` → `GITHUB_REPO=company/trade-dashboard`

Если вы сейчас работаете в этом репозитории, можно посмотреть командой:

```bash
git remote -v
```

Берите часть после `github.com/` и без `.git`.

### Где взять `GITHUB_TOKEN`

Нужен GitHub Personal Access Token, чтобы бот мог сделать `git push` обработанных JSON в репозиторий.

Рекомендуемый вариант — fine-grained token:

1. GitHub → аватар справа сверху → **Settings**.
2. **Developer settings** → **Personal access tokens** → **Fine-grained tokens**.
3. **Generate new token**.
4. Repository access: выбрать только репозиторий с дашбордом.
5. Permissions → **Contents** → **Read and write**.
6. Сгенерировать token и скопировать его **только в локальный `.env`** как `GITHUB_TOKEN=...`.

Не коммитьте `.env` и не вставляйте GitHub token в README/код. В репозиторий добавлен только `GITHUB_REPO`, сам `GITHUB_TOKEN` хранится локально.

Запуск:

```bash
npm run bot
```

Flow:

1. пользователь отправляет `/start`;
2. загружает Excel workbook;
3. бот отвечает, что файл принят, и сохраняет его как `data/raw/Олексієнко.xlsx`;
4. запускает `npm run process:data`, который конвертирует Excel → JSON и переименовывает raw-файл по периоду, например `Олексієнко_01.05-18.05.xlsx`;
5. запускает `npm run audit:data`;
6. присылает summary: источник, период, месяцы, counts;
7. если заданы `GITHUB_TOKEN` и `GITHUB_REPO`, запускает `npm run commit:data`;
8. GitHub Pages обновляет статический `index.html` после push.
