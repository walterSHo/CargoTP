import { EXCLUDED_GROSS_PLAN_GROUP } from './constants';
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

export function salesForMonth(sales: SalesRecord[], month: string) {
  return sales.filter((row) => monthOf(row.date) === month);
}

export function grossPlanTurnover(sales: SalesRecord[]) {
  return sum(sales.filter((row) => row.productGroup !== EXCLUDED_GROSS_PLAN_GROUP).map((row) => row.amountEur));
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
    const factFromSales = sum(sales.filter((row) => row.productGroup === plan.productGroup).map((row) => row.amountEur));
    const shareOfGrossPlan = totalGrossPlan > 0 ? (plan.planAmount / totalGrossPlan) * 100 : 0;
    return {
      ...plan,
      factFromSales,
      variance: factFromSales - plan.factAmount,
      shareOfGrossPlan
    };
  });
}

export function byTop<T>(rows: T[], getKey: (row: T) => string, getValue: (row: T) => number, limit = 10) {
  const map = new Map<string, number>();
  rows.forEach((row) => map.set(getKey(row), (map.get(getKey(row)) ?? 0) + getValue(row)));
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, limit);
}
