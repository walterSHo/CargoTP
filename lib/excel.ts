import * as XLSX from 'xlsx';
import { z } from 'zod';
import type { FileType, GroupPlanRecord, ReceivableRecord, SalesRecord } from './types';

export type ParsedWorkbook = {
  sales: SalesRecord[];
  groupPlans: GroupPlanRecord[];
  receivables: ReceivableRecord[];
  meta: {
    sourceFile: string;
    parsedAt: string;
    sheets: Array<{ name: string; rows: number; detectedAs: FileType | 'unknown'; headerRow?: number; columns?: string[] }>;
  };
};

type FieldMap = Record<string, string[]>;

const aliases: FieldMap = {
  date: ['дата', 'date', 'період', 'период', 'день'],
  unifiedClientCode: ['единый код клиента', 'єдиний код клієнта', 'единый код', 'єдиний код', 'код тт', 'код тп'],
  clientCode: ['код клиента', 'код клієнта', 'код', 'код контрагента'],
  clientName: ['имя клиента', 'клиент', 'клієнт', 'назва клієнта', 'имя клієнта', 'контрагент', 'торгова точка'],
  brand: ['название бренда товара', 'бренд', 'бренд товару', 'тм', 'торговая марка', 'торгова марка'],
  productGroup: ['группа товара', 'група товару', 'группа', 'група', 'товарная группа', 'товарна група', 'номенклатурная группа'],
  productCode: ['код товара', 'код товару', 'артикул', 'код номенклатуры', 'номенклатура код'],
  productName: ['товар', 'название товара', 'назва товару', 'номенклатура'],
  amountEur: ['сумма в евро', 'сума в євро', 'сумма eur', 'сума eur', 'amount eur', 'оборот eur', 'продажи eur', 'сума', 'сумма', 'продаж'],
  netMargin: ['нетто маржа', 'net margin', 'маржа net', 'маржа', 'нетто маржа %'],
  discountPercent: ['процент скидки', '% скидки', 'відсоток знижки', '% знижки', 'скидка', 'знижка'],
  planPercent: ['план группы в %', 'план групи в %', 'план %', 'доля %', 'частка %'],
  planAmount: ['план группы в деньгах', 'план групи в грошах', 'план сумма', 'план сума', 'план'],
  factAmount: ['факт', 'факт сумма', 'факт сума', 'факт продаж'],
  completionPercent: ['% выполнения', '% виконання', 'выполнение %', 'виконання %', '% вып'],
  netPercent: ['процент net', 'відсоток net', '% net', 'net %'],
  totalDebt: ['общая задолженность', 'загальна заборгованість', 'всего долг', 'заборгованість', 'задолженность', 'борг'],
  currentDebt: ['непросроченная', 'непрострочена', 'непросроченная задолженность', 'не прострочена'],
  overdueDebt: ['просроченная', 'прострочена', 'просроченная задолженность', 'прострочка'],
  bucket0To10: ['0-10', '0–10 дней', '0-10 дней', '0-10 днів'],
  bucket11To20: ['11-20', '11–20 дней', '11-20 дней', '11-20 днів'],
  bucket21To30: ['21-30', '21–30 дней', '21-30 дней', '21-30 днів'],
  bucket31Plus: ['31+', '31+ дней', '31+ днів']
};

const required: Record<FileType, string[]> = {
  sales: ['clientName', 'productGroup', 'amountEur'],
  groupPlan: ['productGroup', 'planAmount', 'factAmount'],
  receivables: ['clientName', 'totalDebt']
};

const salesSchema = z.object({ date: z.string(), unifiedClientCode: z.string(), clientCode: z.string(), clientName: z.string(), brand: z.string(), productGroup: z.string(), productCode: z.string(), amountEur: z.number(), netMargin: z.number(), discountPercent: z.number() });
const groupPlanSchema = z.object({ productGroup: z.string(), planPercent: z.number(), planAmount: z.number(), factAmount: z.number(), completionPercent: z.number(), netPercent: z.number() });
const receivableSchema = z.object({ unifiedClientCode: z.string(), clientCode: z.string(), clientName: z.string(), totalDebt: z.number(), currentDebt: z.number(), overdueDebt: z.number(), bucket0To10: z.number(), bucket11To20: z.number(), bucket21To30: z.number(), bucket31Plus: z.number() });

function normalizeHeader(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/ё/g, 'е').replace(/[ії]/g, 'и').replace(/\s+/g, ' ');
}

function numberValue(value: unknown) {
  if (typeof value === 'number') return value;
  const parsed = Number(String(value ?? '0').replace(/\s/g, '').replace(',', '.').replace('%', ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringValue(value: unknown) {
  return String(value ?? '').trim();
}

function dateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && value > 20000) return XLSX.SSF.format('yyyy-mm-dd', value);
  const text = stringValue(value);
  const match = text.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (match) {
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }
  return text || new Date().toISOString().slice(0, 10);
}

function mapHeaders(headers: unknown[]) {
  const normalized = headers.map(normalizeHeader);
  const mapped = new Map<string, number>();
  for (const [field, names] of Object.entries(aliases)) {
    const index = normalized.findIndex((header) => names.includes(header));
    if (index >= 0) mapped.set(field, index);
  }
  return mapped;
}

function detectSheet(rows: unknown[][]) {
  let best: { type: FileType | 'unknown'; score: number; headerRow: number; headerMap: Map<string, number> } = { type: 'unknown', score: 0, headerRow: 0, headerMap: new Map() };
  rows.slice(0, 25).forEach((row, index) => {
    const headerMap = mapHeaders(row);
    const scores: Record<FileType, number> = {
      sales: ['clientName', 'productGroup', 'amountEur', 'brand', 'discountPercent'].filter((field) => headerMap.has(field)).length,
      groupPlan: ['productGroup', 'planPercent', 'planAmount', 'factAmount', 'completionPercent'].filter((field) => headerMap.has(field)).length,
      receivables: ['clientName', 'totalDebt', 'currentDebt', 'overdueDebt', 'bucket0To10'].filter((field) => headerMap.has(field)).length
    };
    const [type, score] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0] as [FileType, number];
    if (score > best.score) best = { type, score, headerRow: index, headerMap };
  });
  return best.score >= 2 ? best : { ...best, type: 'unknown' as const };
}

function assertRequired(fileType: FileType, headerMap: Map<string, number>, sheetName: string) {
  const missing = required[fileType].filter((field) => !headerMap.has(field));
  if (missing.length) throw new Error(`Лист "${sheetName}" похож на ${fileType}, но нет обязательных колонок: ${missing.join(', ')}`);
}

function cell(row: unknown[], headerMap: Map<string, number>, field: string) {
  const index = headerMap.get(field);
  return index === undefined ? undefined : row[index];
}

function workbookRows(filePath: string) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  return workbook.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, defval: '', raw: true })
  }));
}

export function parseWorkbook(filePath: string): ParsedWorkbook {
  const parsedAt = new Date().toISOString();
  const sales: SalesRecord[] = [];
  const groupPlans: GroupPlanRecord[] = [];
  const receivables: ReceivableRecord[] = [];
  const sheets = workbookRows(filePath).map(({ name, rows }) => {
    const detected = detectSheet(rows);
    const columns = rows[detected.headerRow]?.map(stringValue).filter(Boolean);
    if (detected.type === 'unknown') return { name, rows: rows.length, detectedAs: detected.type, headerRow: undefined, columns };

    assertRequired(detected.type, detected.headerMap, name);
    rows.slice(detected.headerRow + 1).filter((row) => row.some(Boolean)).forEach((row) => {
      if (detected.type === 'sales') sales.push(salesSchema.parse({
        date: dateValue(cell(row, detected.headerMap, 'date')),
        unifiedClientCode: stringValue(cell(row, detected.headerMap, 'unifiedClientCode')),
        clientCode: stringValue(cell(row, detected.headerMap, 'clientCode')),
        clientName: stringValue(cell(row, detected.headerMap, 'clientName')),
        brand: stringValue(cell(row, detected.headerMap, 'brand')),
        productGroup: stringValue(cell(row, detected.headerMap, 'productGroup')),
        productCode: stringValue(cell(row, detected.headerMap, 'productCode') ?? cell(row, detected.headerMap, 'productName')),
        amountEur: numberValue(cell(row, detected.headerMap, 'amountEur')),
        netMargin: numberValue(cell(row, detected.headerMap, 'netMargin')),
        discountPercent: numberValue(cell(row, detected.headerMap, 'discountPercent'))
      }));
      if (detected.type === 'groupPlan') groupPlans.push(groupPlanSchema.parse({
        productGroup: stringValue(cell(row, detected.headerMap, 'productGroup')),
        planPercent: numberValue(cell(row, detected.headerMap, 'planPercent')),
        planAmount: numberValue(cell(row, detected.headerMap, 'planAmount')),
        factAmount: numberValue(cell(row, detected.headerMap, 'factAmount')),
        completionPercent: numberValue(cell(row, detected.headerMap, 'completionPercent')),
        netPercent: numberValue(cell(row, detected.headerMap, 'netPercent'))
      }));
      if (detected.type === 'receivables') receivables.push(receivableSchema.parse({
        unifiedClientCode: stringValue(cell(row, detected.headerMap, 'unifiedClientCode')),
        clientCode: stringValue(cell(row, detected.headerMap, 'clientCode')),
        clientName: stringValue(cell(row, detected.headerMap, 'clientName')),
        totalDebt: numberValue(cell(row, detected.headerMap, 'totalDebt')),
        currentDebt: numberValue(cell(row, detected.headerMap, 'currentDebt')),
        overdueDebt: numberValue(cell(row, detected.headerMap, 'overdueDebt')),
        bucket0To10: numberValue(cell(row, detected.headerMap, 'bucket0To10')),
        bucket11To20: numberValue(cell(row, detected.headerMap, 'bucket11To20')),
        bucket21To30: numberValue(cell(row, detected.headerMap, 'bucket21To30')),
        bucket31Plus: numberValue(cell(row, detected.headerMap, 'bucket31Plus'))
      }));
    });
    return { name, rows: rows.length, detectedAs: detected.type, headerRow: detected.headerRow + 1, columns };
  });

  return { sales, groupPlans, receivables, meta: { sourceFile: filePath, parsedAt, sheets } };
}

export const parseSales = (filePath: string) => parseWorkbook(filePath).sales;
export const parseGroupPlan = (filePath: string) => parseWorkbook(filePath).groupPlans;
export const parseReceivables = (filePath: string) => parseWorkbook(filePath).receivables;
