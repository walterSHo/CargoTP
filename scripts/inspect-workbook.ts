import { parseWorkbook } from '../lib/excel';

const filePath = process.argv[2] ?? 'data/raw/Олексієнко.xlsx';
const parsed = parseWorkbook(filePath);
console.log(JSON.stringify(parsed.meta, null, 2));
console.log({ sales: parsed.sales.length, groupPlans: parsed.groupPlans.length, receivables: parsed.receivables.length });
