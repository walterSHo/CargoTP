import fs from 'node:fs';
import path from 'node:path';

const expected = 'data/raw/Олексієнко.xlsx';
const sourcePattern = /^data\/raw\/Олексієнко(?:_\d{2}\.\d{2}-\d{2}\.\d{2})?\.xlsx?$/;
const dashboardPath = 'data/processed/dashboard.json';
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const exists = fs.existsSync(expected) || fs.readdirSync('data/raw').some((file) => /^Олексієнко(?:_\d{2}\.\d{2}-\d{2}\.\d{2})?\.xlsx?$/i.test(file));
const dashboard = fs.existsSync(dashboardPath) ? readJson(dashboardPath) : null;
const sales = Array.isArray(dashboard?.sales) ? dashboard.sales : [];
const months = [...new Set(sales.map((row) => String(row.date ?? '').slice(0, 7)).filter((month) => /^\d{4}-\d{2}$/.test(month)))].sort();
const forbidden = ['Авто Плюс', 'Авто Плюс Склад', 'Трак Сервис', 'Логистик Груп', 'Brand A', 'Brand B', 'Brand C', 'U-100', 'C-100-A'];
const foundForbidden = forbidden.filter((value) => JSON.stringify(dashboard ?? {}).includes(value));
const sourceFiles = dashboard?.meta?.sourceFiles ?? [];
const okSource = dashboard?.status !== 'ok' || sourceFiles.some((file) => sourcePattern.test(file));

const report = {
  expectedSource: `${expected} or data/raw/Олексієнко_DD.MM-DD.MM.xlsx`,
  expectedSourceExists: exists,
  processedStatus: dashboard?.status ?? 'missing_dashboard',
  processedSourceFiles: sourceFiles,
  defaultMonthFromSales: months.at(-1) ?? null,
  months,
  counts: {
    sales: sales.length,
    receivables: Array.isArray(dashboard?.receivables) ? dashboard.receivables.length : 0,
    groupPlans: Array.isArray(dashboard?.groupPlans) ? dashboard.groupPlans.length : 0
  },
  foundForbiddenDemoValues: foundForbidden
};

console.log(JSON.stringify(report, null, 2));
if (!exists) {
  console.error(`Missing required source file: ${expected} or archived data/raw/Олексієнко_DD.MM-DD.MM.xlsx`);
  process.exit(1);
}
if (!okSource) {
  console.error(`Processed data was not generated from Олексієнко source workbook`);
  process.exit(1);
}
if (foundForbidden.length) {
  console.error(`Forbidden demo values found: ${foundForbidden.join(', ')}`);
  process.exit(1);
}
