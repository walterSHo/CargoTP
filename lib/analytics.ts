import { EXCLUDED_GROSS_PLAN_GROUP } from './constants';
import { isTireGroup, normalizeProductGroup } from './product-groups';
import type { GroupPlanRecord, MonthlyPlan, ReceivableRecord, SalesRecord } from './types';

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
