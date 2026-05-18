import fs from 'node:fs';
import path from 'node:path';
import { parseWorkbook } from '../lib/excel';
import type { GroupPlanRecord, MonthlyPlan, ProcessedData, ReceivableRecord, SalesRecord } from '../lib/types';

const root = process.cwd();
const rawDir = path.join(root, 'data/raw');
const processedDir = path.join(root, 'data/processed');
const monthlyPlansPath = path.join(processedDir, 'monthly-plans.json');
const canonicalSource = path.join(rawDir, 'Олексієнко.xlsx');
const expectedSourceFile = process.env.RAW_EXCEL_FILE ?? canonicalSource;

type Meta = {
  updatedAt: string;
  status: 'ok';
  sourceFiles: string[];
  sheets: Array<{ sourceFile: string; name: string; rows: number; detectedAs: string; headerRow?: number; columns?: string[] }>;
  counts: { sales: number; groupPlans: number; receivables: number };
  dateRange: { from: string; to: string } | null;
  months: string[];
  unique: { clients: number; clientCodes: number; unifiedClientCodes: number; brands: number; productGroups: number };
  samples: { sales: SalesRecord[]; receivables: ReceivableRecord[]; groupPlans: GroupPlanRecord[] };
};

function sourceFile() {
  if (!fs.existsSync(rawDir)) throw new Error(`Папка raw не найдена: ${rawDir}`);
  const explicit = path.isAbsolute(expectedSourceFile) ? expectedSourceFile : path.join(root, expectedSourceFile);
  if (fs.existsSync(explicit)) return explicit;

  const candidates = fs.readdirSync(rawDir)
    .filter((file) => /^Олексієнко.*\.xlsx?$/i.test(file))
    .map((file) => path.join(rawDir, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (candidates[0]) return candidates[0];

  const present = fs.readdirSync(rawDir).filter((file) => /\.xlsx?$/i.test(file));
  throw new Error(`Источник правды не найден: data/raw/Олексієнко.xlsx. В data/raw сейчас: ${present.join(', ') || 'нет Excel-файлов'}. Dashboard не будет использовать demo данные.`);
}

function readMonthlyPlans(): MonthlyPlan[] {
  if (!fs.existsSync(monthlyPlansPath)) return [];
  return JSON.parse(fs.readFileSync(monthlyPlansPath, 'utf8')) as MonthlyPlan[];
}

function dedupe<T>(rows: T[], key: (row: T) => string) {
  const map = new Map<string, T>();
  rows.forEach((row) => map.set(key(row), row));
  return [...map.values()];
}

function salesKey(row: SalesRecord) {
  return [row.date, row.unifiedClientCode, row.clientCode, row.clientName, row.productGroup, row.brand, row.productCode, row.amountEur].join('|');
}

function groupPlanKey(row: GroupPlanRecord) {
  return [row.productGroup, row.planAmount, row.factAmount].join('|');
}

function receivableKey(row: ReceivableRecord) {
  return [row.unifiedClientCode, row.clientCode, row.clientName, row.totalDebt, row.overdueDebt].join('|');
}

function uniq(values: string[]) {
  return new Set(values.filter(Boolean)).size;
}

function periodName(dates: string[]) {
  const from = dates[0];
  const to = dates.at(-1);
  if (!from || !to) return '';
  return `${from.slice(8, 10)}.${from.slice(5, 7)}-${to.slice(8, 10)}.${to.slice(5, 7)}`;
}

function archiveSource(filePath: string, dates: string[]) {
  const period = periodName(dates);
  if (!period) return filePath;
  const ext = path.extname(filePath) || '.xlsx';
  const archived = path.join(rawDir, `Олексієнко_${period}${ext}`);
  if (path.resolve(filePath) === path.resolve(archived)) return filePath;
  if (fs.existsSync(archived)) fs.unlinkSync(archived);
  fs.renameSync(filePath, archived);
  return archived;
}

let source = sourceFile();
const parsed = parseWorkbook(source);
const sales = dedupe(parsed.sales, salesKey).sort((a, b) => a.date.localeCompare(b.date));
const groupPlans = dedupe(parsed.groupPlans, groupPlanKey);
const receivables = dedupe(parsed.receivables, receivableKey);
const dates = sales.map((row) => row.date).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
const months = [...new Set(dates.map((date) => date.slice(0, 7)))].sort();

if (!sales.length && !receivables.length && !groupPlans.length) {
  throw new Error('Excel разобран, но не извлечено ни одной строки sales/receivables/group-plan. Проверьте листы и обязательные колонки.');
}
if (!sales.length) throw new Error('Не извлечены sales rows из Excel. Dashboard не будет подставлять demo data.');
if (!months.length) throw new Error('В sales rows не найдено ни одной валидной даты YYYY-MM-DD. Month selector строится только из Excel-дат.');

source = archiveSource(source, dates);
const sourceRelative = path.relative(root, source);
const meta: Meta = {
  updatedAt: new Date().toISOString(),
  status: 'ok',
  sourceFiles: [sourceRelative],
  sheets: parsed.meta.sheets.map((sheet) => ({ ...sheet, sourceFile: sourceRelative })),
  counts: { sales: sales.length, groupPlans: groupPlans.length, receivables: receivables.length },
  dateRange: dates.length ? { from: dates[0], to: dates.at(-1)! } : null,
  months,
  unique: {
    clients: uniq([...sales.map((row) => row.clientName), ...receivables.map((row) => row.clientName)]),
    clientCodes: uniq([...sales.map((row) => row.clientCode), ...receivables.map((row) => row.clientCode)]),
    unifiedClientCodes: uniq([...sales.map((row) => row.unifiedClientCode), ...receivables.map((row) => row.unifiedClientCode)]),
    brands: uniq(sales.map((row) => row.brand)),
    productGroups: uniq([...sales.map((row) => row.productGroup), ...groupPlans.map((row) => row.productGroup)])
  },
  samples: { sales: sales.slice(0, 20), receivables: receivables.slice(0, 20), groupPlans: groupPlans.slice(0, 20) }
};
const data: ProcessedData & { status: 'ok'; meta: Meta } = { status: 'ok', meta, updatedAt: meta.updatedAt, sales, groupPlans, receivables, monthlyPlans: readMonthlyPlans() };

fs.mkdirSync(processedDir, { recursive: true });
fs.writeFileSync(path.join(processedDir, 'sales.json'), `${JSON.stringify(sales, null, 2)}\n`);
fs.writeFileSync(path.join(processedDir, 'group-plan.json'), `${JSON.stringify(groupPlans, null, 2)}\n`);
fs.writeFileSync(path.join(processedDir, 'receivables.json'), `${JSON.stringify(receivables, null, 2)}\n`);
fs.writeFileSync(path.join(processedDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
fs.writeFileSync(path.join(processedDir, 'dashboard.json'), `${JSON.stringify(data, null, 2)}\n`);
console.log(JSON.stringify(meta, null, 2));
