import * as XLSX from 'xlsx';
import { z } from 'zod';
import type { FileType, GroupPlanRecord, ReceivableRecord, SalesRecord } from './types';

const aliases: Record<string, string[]> = {
  date: ['дата', 'date', 'період', 'период'],
  unifiedClientCode: ['единый код клиента', 'єдиний код клієнта', 'единый код', 'єдиний код'],
  clientCode: ['код клиента', 'код клієнта'],
  clientName: ['имя клиента', 'клиент', 'клієнт', 'назва клієнта', 'имя клієнта'],
  brand: ['название бренда товара', 'бренд', 'бренд товару'],
  productGroup: ['группа товара', 'група товару', 'группа', 'група'],
  productCode: ['код товара', 'код товару', 'артикул'],
  amountEur: ['сумма в евро', 'сума в євро', 'сумма eur', 'сума eur', 'amount eur'],
  netMargin: ['нетто маржа', 'net margin', 'маржа net'],
  discountPercent: ['процент скидки', '% скидки', 'відсоток знижки', '% знижки'],
  planPercent: ['план группы в %', 'план групи в %', 'план %'],
  planAmount: ['план группы в деньгах', 'план групи в грошах', 'план сумма', 'план сума'],
  factAmount: ['факт', 'факт сумма', 'факт сума'],
  completionPercent: ['% выполнения', '% виконання', 'выполнение %', 'виконання %'],
  netPercent: ['процент net', 'відсоток net', '% net'],
  totalDebt: ['общая задолженность', 'загальна заборгованість', 'всего долг'],
  currentDebt: ['непросроченная', 'непрострочена', 'непросроченная задолженность'],
  overdueDebt: ['просроченная', 'прострочена', 'просроченная задолженность'],
  bucket0To10: ['0-10', '0–10 дней', '0-10 дней'],
  bucket11To20: ['11-20', '11–20 дней', '11-20 дней'],
  bucket21To30: ['21-30', '21–30 дней', '21-30 дней'],
  bucket31Plus: ['31+', '31+ дней']
};

const required: Record<FileType, string[]> = {
  sales: ['unifiedClientCode', 'clientCode', 'clientName', 'brand', 'productGroup', 'productCode', 'amountEur', 'netMargin', 'discountPercent'],
  groupPlan: ['productGroup', 'planPercent', 'planAmount', 'factAmount', 'completionPercent', 'netPercent'],
  receivables: ['unifiedClientCode', 'clientCode', 'clientName', 'totalDebt', 'currentDebt', 'overdueDebt']
};

const salesSchema = z.object({ date: z.string(), unifiedClientCode: z.string(), clientCode: z.string(), clientName: z.string(), brand: z.string(), productGroup: z.string(), productCode: z.string(), amountEur: z.number(), netMargin: z.number(), discountPercent: z.number() });
const groupPlanSchema = z.object({ productGroup: z.string(), planPercent: z.number(), planAmount: z.number(), factAmount: z.number(), completionPercent: z.number(), netPercent: z.number() });
const receivableSchema = z.object({ unifiedClientCode: z.string(), clientCode: z.string(), clientName: z.string(), totalDebt: z.number(), currentDebt: z.number(), overdueDebt: z.number(), bucket0To10: z.number(), bucket11To20: z.number(), bucket21To30: z.number(), bucket31Plus: z.number() });

function normalizeHeader(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');
}

function numberValue(value: unknown) {
  if (typeof value === 'number') return value;
  const parsed = Number(String(value ?? '0').replace(/\s/g, '').replace(',', '.').replace('%', ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringValue(value: unknown) {
  return String(value ?? '').trim();
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

function rowsFromWorkbook(filePath: string) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames.find((name) => workbook.Sheets[name]?.['!ref']) ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
}

function parseRows(filePath: string, fileType: FileType) {
  const [headers, ...rows] = rowsFromWorkbook(filePath);
  const headerMap = mapHeaders(headers ?? []);
  const missing = required[fileType].filter((field) => !headerMap.has(field));
  if (missing.length) throw new Error(`Не найдены обязательные колонки для ${fileType}: ${missing.join(', ')}`);
  return rows.filter((row) => row.some(Boolean)).map((row) => ({ row, headerMap }));
}

export function parseSales(filePath: string): SalesRecord[] {
  return parseRows(filePath, 'sales').map(({ row, headerMap }) => salesSchema.parse({
    date: stringValue(row[headerMap.get('date') ?? -1]) || new Date().toISOString().slice(0, 10),
    unifiedClientCode: stringValue(row[headerMap.get('unifiedClientCode')!]),
    clientCode: stringValue(row[headerMap.get('clientCode')!]),
    clientName: stringValue(row[headerMap.get('clientName')!]),
    brand: stringValue(row[headerMap.get('brand')!]),
    productGroup: stringValue(row[headerMap.get('productGroup')!]),
    productCode: stringValue(row[headerMap.get('productCode')!]),
    amountEur: numberValue(row[headerMap.get('amountEur')!]),
    netMargin: numberValue(row[headerMap.get('netMargin')!]),
    discountPercent: numberValue(row[headerMap.get('discountPercent')!])
  }));
}

export function parseGroupPlan(filePath: string): GroupPlanRecord[] {
  return parseRows(filePath, 'groupPlan').map(({ row, headerMap }) => groupPlanSchema.parse({
    productGroup: stringValue(row[headerMap.get('productGroup')!]),
    planPercent: numberValue(row[headerMap.get('planPercent')!]),
    planAmount: numberValue(row[headerMap.get('planAmount')!]),
    factAmount: numberValue(row[headerMap.get('factAmount')!]),
    completionPercent: numberValue(row[headerMap.get('completionPercent')!]),
    netPercent: numberValue(row[headerMap.get('netPercent')!])
  }));
}

export function parseReceivables(filePath: string): ReceivableRecord[] {
  return parseRows(filePath, 'receivables').map(({ row, headerMap }) => receivableSchema.parse({
    unifiedClientCode: stringValue(row[headerMap.get('unifiedClientCode')!]),
    clientCode: stringValue(row[headerMap.get('clientCode')!]),
    clientName: stringValue(row[headerMap.get('clientName')!]),
    totalDebt: numberValue(row[headerMap.get('totalDebt')!]),
    currentDebt: numberValue(row[headerMap.get('currentDebt')!]),
    overdueDebt: numberValue(row[headerMap.get('overdueDebt')!]),
    bucket0To10: numberValue(row[headerMap.get('bucket0To10') ?? -1]),
    bucket11To20: numberValue(row[headerMap.get('bucket11To20') ?? -1]),
    bucket21To30: numberValue(row[headerMap.get('bucket21To30') ?? -1]),
    bucket31Plus: numberValue(row[headerMap.get('bucket31Plus') ?? -1])
  }));
}
