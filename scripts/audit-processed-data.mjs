import fs from 'node:fs';

const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const data = read('data/processed/dashboard.json');
const sales = Array.isArray(data.sales) ? data.sales : [];
const receivables = Array.isArray(data.receivables) ? data.receivables : [];
const groupPlans = Array.isArray(data.groupPlans) ? data.groupPlans : [];
const months = [...new Set(sales.map((row) => String(row.date ?? '').slice(0, 7)).filter((month) => /^\d{4}-\d{2}$/.test(month)))].sort();
const unique = (rows, field) => [...new Set(rows.map((row) => row[field]).filter(Boolean))].sort();
const forbidden = ['Авто Плюс', 'Авто Плюс Склад', 'Трак Сервис', 'Логистик Груп', 'Brand A', 'Brand B', 'Brand C', 'U-100', 'C-100-A'];
const serialized = JSON.stringify(data);
const foundForbidden = forbidden.filter((value) => serialized.includes(value));

const report = {
  status: data.status ?? 'unknown',
  updatedAt: data.updatedAt ?? null,
  defaultMonthFromSales: months.at(-1) ?? null,
  months,
  counts: { sales: sales.length, receivables: receivables.length, groupPlans: groupPlans.length },
  unique: {
    clients: unique([...sales, ...receivables], 'clientName').length,
    clientCodes: unique([...sales, ...receivables], 'clientCode').length,
    unifiedClientCodes: unique([...sales, ...receivables], 'unifiedClientCode').length,
    brands: unique(sales, 'brand').length,
    productGroups: unique([...sales, ...groupPlans], 'productGroup').length
  },
  samples: { sales: sales.slice(0, 20), receivables: receivables.slice(0, 20), groupPlans: groupPlans.slice(0, 20) },
  foundForbiddenDemoValues: foundForbidden
};

console.log(JSON.stringify(report, null, 2));
if (foundForbidden.length) {
  console.error(`Forbidden demo values found in processed data: ${foundForbidden.join(', ')}`);
  process.exit(1);
}
if (sales.length && !months.length) {
  console.error('Sales rows exist, but no valid YYYY-MM months were derived from parsed dates.');
  process.exit(1);
}
