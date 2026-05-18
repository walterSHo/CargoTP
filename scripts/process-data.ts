import fs from 'node:fs';
import path from 'node:path';
import { parseGroupPlan, parseReceivables, parseSales } from '../lib/excel';
import type { MonthlyPlan, ProcessedData } from '../lib/types';

const root = process.cwd();
const rawDir = path.join(root, 'data/raw');
const processedDir = path.join(root, 'data/processed');
const outputPath = path.join(processedDir, 'dashboard.json');
const monthlyPlansPath = path.join(processedDir, 'monthly-plans.json');

function latestFile(prefix: string) {
  const files = fs.readdirSync(rawDir).filter((file) => file.startsWith(prefix) && /\.xlsx?$/i.test(file)).sort();
  const file = files.at(-1);
  if (!file) throw new Error(`Не найден raw файл с префиксом ${prefix} в ${rawDir}`);
  return path.join(rawDir, file);
}

function readMonthlyPlans(): MonthlyPlan[] {
  if (!fs.existsSync(monthlyPlansPath)) return [{ month: '2026-05', grossPlan: 163000 }];
  return JSON.parse(fs.readFileSync(monthlyPlansPath, 'utf8')) as MonthlyPlan[];
}

const data: ProcessedData = {
  updatedAt: new Date().toISOString(),
  sales: parseSales(latestFile('sales')),
  groupPlans: parseGroupPlan(latestFile('group-plan')),
  receivables: parseReceivables(latestFile('receivables')),
  monthlyPlans: readMonthlyPlans()
};

fs.mkdirSync(processedDir, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Processed dashboard data: ${outputPath}`);
