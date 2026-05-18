import { EXCLUDED_GROSS_PLAN_GROUP } from './constants';
import { isTireGroup, normalizeProductGroup } from './product-groups';
import type { GroupPlanRecord, MonthlyPlan, ReceivableRecord, SalesRecord } from './types';

export type TopClientRow = {
  unifiedClientCode: string;
  clientCode: string;
  clientName: string;
  turnover: number;
  sharePercent: number;
  salesCount: number;
  brands: number;
  productGroups: number;
};

export type DailySalesPoint = {
  date: string;
  label: string;
  turnover: number;
  grossPlanTurnover: number;
  tireTurnover: number;
  clients: number;
};

export type ClientGroupGapRow = {
  unifiedClientCode: string;
  clientCode: string;
  clientName: string;
  turnover: number;
  coveredPlanAmount: number;
  missingPlanAmount: number;
  coveredPlanShare: number;
  missingPlanShare: number;
  coveredGroups: number;
  missingGroups: number;
  missingGroupNames: string[];
};

export function monthOf(date: string) {
  return date.slice(0, 7);
}

export function sum(values: number[]) {
  return values.reduce((acc, value) => acc + value, 0);
}

export function avg(values: number[]) {
  return values.length ? sum(values) / values.length : 0;
}


export function availableMonths(sales: SalesRecord[]) {
  return [...new Set(sales.map((row) => monthOf(row.date)).filter((month) => /^\d{4}-\d{2}$/.test(month)))].sort();
}

export function latestDataMonth(sales: SalesRecord[]) {
  return availableMonths(sales).at(-1) ?? '';
}

export function salesForMonth(sales: SalesRecord[], month: string) {
  return sales.filter((row) => monthOf(row.date) === month);
}

export function grossPlanTurnover(sales: SalesRecord[]) {
  return sum(sales.filter((row) => normalizeProductGroup(row.productGroup) !== normalizeProductGroup(EXCLUDED_GROSS_PLAN_GROUP) && !isTireGroup(row.productGroup)).map((row) => row.amountEur));
}

function clientKey(row: Pick<SalesRecord, 'unifiedClientCode' | 'clientCode' | 'clientName'>) {
  return row.clientCode || row.unifiedClientCode || row.clientName;
}

function planRelevantGroup(group: string) {
  return normalizeProductGroup(group) !== normalizeProductGroup(EXCLUDED_GROSS_PLAN_GROUP) && !isTireGroup(group);
}

export function dashboardKpis(sales: SalesRecord[], receivables: ReceivableRecord[], plans: MonthlyPlan[], month: string) {
  const monthSales = salesForMonth(sales, month);
  const totalTurnover = sum(monthSales.map((row) => row.amountEur));
  const planTurnover = grossPlanTurnover(monthSales);
  const grossPlan = plans.find((plan) => plan.month === month)?.grossPlan ?? 0;
  return {
    totalTurnover,
    planTurnover,
    grossPlan,
    grossPlanCompletion: grossPlan > 0 ? (planTurnover / grossPlan) * 100 : 0,
    avgNetMargin: avg(monthSales.map((row) => row.netMargin)),
    avgDiscount: avg(monthSales.map((row) => row.discountPercent)),
    overdueDebt: sum(receivables.map((row) => row.overdueDebt)),
    currentDebt: sum(receivables.map((row) => row.currentDebt))
  };
}

export function topClientsByTurnover(sales: SalesRecord[], limit = 10): TopClientRow[] {
  const totalTurnover = sum(sales.map((row) => row.amountEur));
  const map = new Map<string, { unifiedClientCode: string; clientCode: string; clientName: string; turnover: number; salesCount: number; brands: Set<string>; productGroups: Set<string> }>();

  sales.forEach((row) => {
    const key = clientKey(row);
    const entry = map.get(key) ?? {
      unifiedClientCode: row.unifiedClientCode,
      clientCode: row.clientCode,
      clientName: row.clientName,
      turnover: 0,
      salesCount: 0,
      brands: new Set<string>(),
      productGroups: new Set<string>()
    };

    entry.turnover += row.amountEur;
    entry.salesCount += 1;
    if (row.brand) entry.brands.add(row.brand);
    if (row.productGroup) entry.productGroups.add(row.productGroup);
    map.set(key, entry);
  });

  return [...map.values()]
    .map((row) => ({
      unifiedClientCode: row.unifiedClientCode,
      clientCode: row.clientCode,
      clientName: row.clientName,
      turnover: row.turnover,
      sharePercent: totalTurnover > 0 ? (row.turnover / totalTurnover) * 100 : 0,
      salesCount: row.salesCount,
      brands: row.brands.size,
      productGroups: row.productGroups.size
    }))
    .sort((a, b) => b.turnover - a.turnover || a.clientCode.localeCompare(b.clientCode) || a.clientName.localeCompare(b.clientName))
    .slice(0, limit);
}

export function dailySalesSeries(sales: SalesRecord[]): DailySalesPoint[] {
  const map = new Map<string, { turnover: number; grossPlanTurnover: number; tireTurnover: number; clients: Set<string> }>();

  sales.forEach((row) => {
    const entry = map.get(row.date) ?? { turnover: 0, grossPlanTurnover: 0, tireTurnover: 0, clients: new Set<string>() };
    entry.turnover += row.amountEur;
    if (isTireGroup(row.productGroup)) entry.tireTurnover += row.amountEur;
    else if (normalizeProductGroup(row.productGroup) !== normalizeProductGroup(EXCLUDED_GROSS_PLAN_GROUP)) entry.grossPlanTurnover += row.amountEur;
    entry.clients.add(clientKey(row));
    map.set(row.date, entry);
  });

  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({
      date,
      label: date.slice(8, 10),
      turnover: value.turnover,
      grossPlanTurnover: value.grossPlanTurnover,
      tireTurnover: value.tireTurnover,
      clients: value.clients.size
    }));
}

export function clientGroupShareGaps(groupPlans: GroupPlanRecord[], sales: SalesRecord[], limit = 12): ClientGroupGapRow[] {
  const relevantPlans = groupPlans
    .filter((row) => row.planAmount > 0 && planRelevantGroup(row.productGroup))
    .map((row) => ({ ...row, normalizedGroup: normalizeProductGroup(row.productGroup) }));
  const totalPlanAmount = sum(relevantPlans.map((row) => row.planAmount));
  if (!relevantPlans.length || totalPlanAmount <= 0) return [];

  const salesByClient = new Map<string, { unifiedClientCode: string; clientCode: string; clientName: string; turnover: number; groups: Set<string> }>();
  sales
    .filter((row) => planRelevantGroup(row.productGroup))
    .forEach((row) => {
      const key = clientKey(row);
      const entry = salesByClient.get(key) ?? {
        unifiedClientCode: row.unifiedClientCode,
        clientCode: row.clientCode,
        clientName: row.clientName,
        turnover: 0,
        groups: new Set<string>()
      };
      entry.turnover += row.amountEur;
      entry.groups.add(normalizeProductGroup(row.productGroup));
      salesByClient.set(key, entry);
    });

  return [...salesByClient.values()]
    .map((client) => {
      const coveredPlans = relevantPlans.filter((plan) => client.groups.has(plan.normalizedGroup));
      const missingPlans = relevantPlans.filter((plan) => !client.groups.has(plan.normalizedGroup));
      const coveredPlanAmount = sum(coveredPlans.map((plan) => plan.planAmount));
      const missingPlanAmount = totalPlanAmount - coveredPlanAmount;

      return {
        unifiedClientCode: client.unifiedClientCode,
        clientCode: client.clientCode,
        clientName: client.clientName,
        turnover: client.turnover,
        coveredPlanAmount,
        missingPlanAmount,
        coveredPlanShare: totalPlanAmount > 0 ? (coveredPlanAmount / totalPlanAmount) * 100 : 0,
        missingPlanShare: totalPlanAmount > 0 ? (missingPlanAmount / totalPlanAmount) * 100 : 0,
        coveredGroups: coveredPlans.length,
        missingGroups: missingPlans.length,
        missingGroupNames: missingPlans.map((plan) => plan.productGroup)
      };
    })
    .filter((row) => row.turnover > 0 && row.missingGroups > 0)
    .sort((a, b) => b.missingPlanShare - a.missingPlanShare || b.turnover - a.turnover || a.clientCode.localeCompare(b.clientCode) || a.clientName.localeCompare(b.clientName))
    .slice(0, limit);
}

export function groupPlanAudit(groupPlans: GroupPlanRecord[], sales: SalesRecord[]) {
  const totalGrossPlan = sum(groupPlans.map((row) => row.planAmount));
  return groupPlans.map((plan) => {
    const factFromSales = sum(sales.filter((row) => normalizeProductGroup(row.productGroup) === normalizeProductGroup(plan.productGroup)).map((row) => row.amountEur));
    const shareOfGrossPlan = totalGrossPlan > 0 ? (plan.planAmount / totalGrossPlan) * 100 : 0;
    return { ...plan, factFromSales, variance: factFromSales - plan.factAmount, shareOfGrossPlan };
  });
}

export function byTop<T>(rows: T[], getKey: (row: T) => string, getValue: (row: T) => number, limit = 10) {
  const map = new Map<string, number>();
  rows.forEach((row) => map.set(getKey(row), (map.get(getKey(row)) ?? 0) + getValue(row)));
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, limit);
}

export function tireAnalytics(sales: SalesRecord[], receivables: ReceivableRecord[], month: string) {
  const current = salesForMonth(sales, month).filter((row) => isTireGroup(row.productGroup));
  const previous = sales.filter((row) => monthOf(row.date) < month && isTireGroup(row.productGroup));
  const currentClients = new Map(byTop(current, (row) => row.clientName, (row) => row.amountEur, 1000).map((row) => [row.name, row.value]));
  const previousClients = new Map(byTop(previous, (row) => row.clientName, (row) => row.amountEur, 1000).map((row) => [row.name, row.value]));
  const clientDynamics = [...new Set([...currentClients.keys(), ...previousClients.keys()])]
    .map((name) => ({ name, current: currentClients.get(name) ?? 0, previous: previousClients.get(name) ?? 0, delta: (currentClients.get(name) ?? 0) - (previousClients.get(name) ?? 0) }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const problematic = current
    .map((sale) => ({ sale, debt: receivables.find((row) => row.clientName === sale.clientName || row.clientCode === sale.clientCode)?.overdueDebt ?? 0 }))
    .filter((row) => row.debt > 0);

  return {
    rows: current,
    turnover: sum(current.map((row) => row.amountEur)),
    avgMargin: avg(current.map((row) => row.netMargin)),
    avgDiscount: avg(current.map((row) => row.discountPercent)),
    topClients: byTop(current, (row) => row.clientName, (row) => row.amountEur, 10),
    topBrands: byTop(current, (row) => row.brand || 'Без бренда', (row) => row.amountEur, 10),
    stoppedClients: clientDynamics.filter((row) => row.previous > 0 && row.current === 0),
    growingClients: clientDynamics.filter((row) => row.delta > 0),
    fallingClients: clientDynamics.filter((row) => row.delta < 0),
    problematicClients: byTop(problematic, (row) => row.sale.clientName, (row) => row.debt, 10)
  };
}
