import fs from 'node:fs';
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
  sales: ['date', 'clientName', 'productGroup', 'amountEur'],
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

function percentValue(value: unknown) {
  const numeric = numberValue(value);
  return Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
}

function ratioPercentValue(value: unknown) {
  return numberValue(value) * 100;
}

function dateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && value > 20000) return XLSX.SSF.format('yyyy-mm-dd', value);
  const text = stringValue(value);
  if (isIsoDate(text)) return text;
  const match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (match) {
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }
  return text;
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

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parsePivotSales(rows: unknown[][]): SalesRecord[] | null {
  const headerRow = rows[1];
  const dateRow = rows[2];
  if (!headerRow || !dateRow) return null;

  const normalizedHeaderRow = headerRow.map(normalizeHeader);
  if (
    normalizedHeaderRow[0] !== normalizeHeader('Клиенты/Клиенты.Клиент Единый код') ||
    normalizedHeaderRow[2] !== normalizeHeader('Клиенты/Клиенты.Клиент Имя') ||
    !normalizedHeaderRow.includes(normalizeHeader('Сумма с НДС'))
  ) {
    return null;
  }

  const measuresByDate = new Map<string, { amountIndex?: number; marginIndex?: number; discountIndex?: number }>();
  for (let index = 0; index < headerRow.length; index += 1) {
    const measure = stringValue(headerRow[index]);
    const date = dateValue(dateRow[index]);
    if (!isIsoDate(date)) continue;

    const entry = measuresByDate.get(date) ?? {};
    const normalizedMeasure = normalizeHeader(measure);
    if (normalizedMeasure === normalizeHeader('Сумма с НДС')) entry.amountIndex = index;
    if (normalizedMeasure === normalizeHeader('Процент нетто маржа')) entry.marginIndex = index;
    if (normalizedMeasure === normalizeHeader('Скидка %')) entry.discountIndex = index;
    measuresByDate.set(date, entry);
  }

  const sales: SalesRecord[] = [];
  rows.slice(3).filter((row) => row.some(Boolean)).forEach((row) => {
    const unifiedClientCode = stringValue(row[0]);
    const clientCode = stringValue(row[1]);
    const clientName = stringValue(row[2]);
    const brand = stringValue(row[3]);
    const productGroup = stringValue(row[4]);
    const productCode = stringValue(row[5]);
    if (!clientName || !productGroup || !productCode) return;

    measuresByDate.forEach((indexes, date) => {
      const amount = numberValue(indexes.amountIndex === undefined ? undefined : row[indexes.amountIndex]);
      const margin = percentValue(indexes.marginIndex === undefined ? undefined : row[indexes.marginIndex]);
      const discount = percentValue(indexes.discountIndex === undefined ? undefined : row[indexes.discountIndex]);
      if (amount === 0 && margin === 0 && discount === 0) return;

      sales.push(salesSchema.parse({
        date,
        unifiedClientCode,
        clientCode,
        clientName,
        brand,
        productGroup,
        productCode,
        amountEur: amount,
        netMargin: margin,
        discountPercent: discount
      }));
    });
  });

  return sales;
}

function parsePivotGroupPlan(rows: unknown[][]): GroupPlanRecord[] | null {
  const topHeaderRow = rows[3];
  const measureRow = rows[4];
  if (!topHeaderRow || !measureRow) return null;

  if (
    stringValue(topHeaderRow[1]) !== 'Товары/Товарная группа' ||
    stringValue(measureRow[3]) !== 'План група' ||
    stringValue(measureRow[4]) !== 'План група_план_місяць' ||
    stringValue(measureRow[6]) !== 'Сумма с НДС'
  ) {
    return null;
  }

  return rows.slice(5)
    .filter((row) => row.some(Boolean))
    .map((row) => {
      const productGroup = stringValue(row[2] || row[1]);
      if (!productGroup) return null;
      return groupPlanSchema.parse({
        productGroup,
        planPercent: ratioPercentValue(row[3]),
        planAmount: numberValue(row[4]),
        factAmount: numberValue(row[6]),
        completionPercent: ratioPercentValue(row[7]),
        netPercent: ratioPercentValue(row[8])
      });
    })
    .filter((row): row is GroupPlanRecord => Boolean(row));
}

function parsePivotReceivables(rows: unknown[][]): ReceivableRecord[] | null {
  const headerRow = rows[1];
  const bucketRow = rows[4];
  const measureRow = rows[5];
  if (!headerRow || !bucketRow || !measureRow) return null;

  if (
    stringValue(headerRow[1]) !== 'Клиент Имя' ||
    stringValue(bucketRow[8]) !== '0-10 дней' ||
    stringValue(bucketRow[10]) !== '11-20 дней' ||
    stringValue(measureRow[3]) !== 'Сумма Дебит LOC'
  ) {
    return null;
  }

  return rows.slice(6)
    .filter((row) => row.some(Boolean))
    .map((row) => {
      const clientCode = stringValue(row[0]);
      const clientName = stringValue(row[1]);
      if (!clientCode || !clientName) return null;
      return receivableSchema.parse({
        unifiedClientCode: clientCode,
        clientCode,
        clientName,
        totalDebt: numberValue(row[3]),
        currentDebt: numberValue(row[5]),
        overdueDebt: numberValue(row[7]),
        bucket0To10: numberValue(row[9]),
        bucket11To20: numberValue(row[11]),
        bucket21To30: 0,
        bucket31Plus: numberValue(row[13])
      });
    })
    .filter((row): row is ReceivableRecord => Boolean(row));
}

function workbookRows(filePath: string) {
  const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer', cellDates: true });
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
    const pivotSales = parsePivotSales(rows);
    if (pivotSales) {
      sales.push(...pivotSales);
      return { name, rows: rows.length, detectedAs: 'sales' as const, headerRow: 2, columns: rows[1]?.map(stringValue).filter(Boolean) };
    }

    const pivotGroupPlans = parsePivotGroupPlan(rows);
    if (pivotGroupPlans) {
      groupPlans.push(...pivotGroupPlans);
      return { name, rows: rows.length, detectedAs: 'groupPlan' as const, headerRow: 5, columns: rows[4]?.map(stringValue).filter(Boolean) };
    }

    const pivotReceivables = parsePivotReceivables(rows);
    if (pivotReceivables) {
      receivables.push(...pivotReceivables);
      return { name, rows: rows.length, detectedAs: 'receivables' as const, headerRow: 6, columns: rows[5]?.map(stringValue).filter(Boolean) };
    }

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
        netMargin: percentValue(cell(row, detected.headerMap, 'netMargin')),
        discountPercent: percentValue(cell(row, detected.headerMap, 'discountPercent'))
      }));
      if (detected.type === 'groupPlan') groupPlans.push(groupPlanSchema.parse({
        productGroup: stringValue(cell(row, detected.headerMap, 'productGroup')),
        planPercent: percentValue(cell(row, detected.headerMap, 'planPercent')),
        planAmount: numberValue(cell(row, detected.headerMap, 'planAmount')),
        factAmount: numberValue(cell(row, detected.headerMap, 'factAmount')),
        completionPercent: percentValue(cell(row, detected.headerMap, 'completionPercent')),
        netPercent: percentValue(cell(row, detected.headerMap, 'netPercent'))
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
