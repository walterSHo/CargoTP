import fs from 'node:fs';
import path from 'node:path';
import { parseWorkbook } from '../lib/excel';
import type { GroupPlanRecord, MonthlyPlan, ProcessedData, ReceivableRecord, SalesRecord } from '../lib/types';

const root = process.cwd();
const rawDir = path.join(root, 'data/raw');
const processedDir = path.join(root, 'data/processed');
const monthlyPlansPath = path.join(processedDir, 'monthly-plans.json');

type Meta = {
  updatedAt: string;
  sourceFiles: string[];
  sheets: Array<{ sourceFile: string; name: string; rows: number; detectedAs: string; headerRow?: number; columns?: string[] }>;
  counts: { sales: number; groupPlans: number; receivables: number };
};

function rawFiles() {
  if (!fs.existsSync(rawDir)) throw new Error(`Папка raw не найдена: ${rawDir}`);
  const files = fs.readdirSync(rawDir).filter((file) => /\.xlsx?$/i.test(file)).sort();
  if (!files.length) throw new Error(`Не найден Excel-файл в ${rawDir}. Ожидается, например: data/raw/Олексієнко.xlsx`);
  return files.map((file) => path.join(rawDir, file));
}

function readMonthlyPlans(): MonthlyPlan[] {
  if (!fs.existsSync(monthlyPlansPath)) return [{ month: '2026-05', grossPlan: 163000 }];
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

const parsed = rawFiles().map(parseWorkbook);
const sales = dedupe(parsed.flatMap((file) => file.sales), salesKey).sort((a, b) => a.date.localeCompare(b.date));
const groupPlans = dedupe(parsed.flatMap((file) => file.groupPlans), groupPlanKey);
const receivables = dedupe(parsed.flatMap((file) => file.receivables), receivableKey);
const meta: Meta = {
  updatedAt: new Date().toISOString(),
  sourceFiles: parsed.map((file) => path.relative(root, file.meta.sourceFile)),
  sheets: parsed.flatMap((file) => file.meta.sheets.map((sheet) => ({ ...sheet, sourceFile: path.relative(root, file.meta.sourceFile) }))),
  counts: { sales: sales.length, groupPlans: groupPlans.length, receivables: receivables.length }
};
const data: ProcessedData = { updatedAt: meta.updatedAt, sales, groupPlans, receivables, monthlyPlans: readMonthlyPlans() };

fs.mkdirSync(processedDir, { recursive: true });
fs.writeFileSync(path.join(processedDir, 'sales.json'), `${JSON.stringify(sales, null, 2)}\n`);
fs.writeFileSync(path.join(processedDir, 'group-plan.json'), `${JSON.stringify(groupPlans, null, 2)}\n`);
fs.writeFileSync(path.join(processedDir, 'receivables.json'), `${JSON.stringify(receivables, null, 2)}\n`);
fs.writeFileSync(path.join(processedDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
fs.writeFileSync(path.join(processedDir, 'dashboard.json'), `${JSON.stringify(data, null, 2)}\n`);
console.log(`Processed ${meta.sourceFiles.length} Excel file(s):`, meta.counts);
