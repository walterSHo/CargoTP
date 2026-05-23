import { AGGREGATE_PLAN_GROUP, EXCLUDED_GROSS_PLAN_GROUP, HIGHLIGHT_GROUP_GAP_BRANDS, PROFIT_GROUP_NAME, PROFIT_PLAN_PERCENT } from './constants';
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
  coveredGroupNames: string[];
  coveredBrandNames: string[];
  missingGroupNames: string[];
  coveredGroupStats: Array<{ name: string; amount: number; turnoverShare: number; planShare: number }>;
  coveredBrandStats: Array<{ name: string; amount: number; turnoverShare: number }>;
  missingGroupStats: Array<{ name: string; planShare: number }>;
};

export type GroupPlanAuditRow = GroupPlanRecord & {
  factFromSales: number;
  variance: number;
  shareOfGrossPlan: number;
};

export type MonthPaceSnapshot = {
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  elapsedShare: number;
  actualTurnover: number;
  expectedTurnoverToDate: number;
  varianceToTempo: number;
  requiredPerDay: number;
  projectedTurnover: number;
  projectedCompletionPercent: number;
};

export type GroupTempoRow = GroupPlanAuditRow & {
  tempoDelta: number;
  tempoCompletionPercent: number;
  requiredPerDay: number;
  projectedCompletionPercent: number;
};

export type ProfitClientPenetrationRow = {
  unifiedClientCode: string;
  clientCode: string;
  clientName: string;
  turnover: number;
  profitTurnover: number;
  profitShare: number;
  productGroups: number;
  hasProfit: boolean;
};

export type ProfitGroupPenetrationRow = {
  productGroup: string;
  turnover: number;
  clients: number;
  clientsWithProfit: number;
  penetrationPercent: number;
  potentialTurnover: number;
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

function monthProgress(month: string, referenceDate = new Date().toISOString().slice(0, 10)) {
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) {
    return { totalDays: 0, elapsedDays: 0, remainingDays: 0, elapsedShare: 0 };
  }

  const totalDays = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const referenceMonth = referenceDate.slice(0, 7);
  const referenceDay = Number(referenceDate.slice(8, 10)) || 0;
  const elapsedDays = referenceMonth < month
    ? 0
    : referenceMonth > month
      ? totalDays
      : Math.min(Math.max(referenceDay, 0), totalDays);
  const remainingDays = Math.max(totalDays - elapsedDays, 0);

  return {
    totalDays,
    elapsedDays,
    remainingDays,
    elapsedShare: totalDays > 0 ? elapsedDays / totalDays : 0
  };
}

function clientKey(row: Pick<SalesRecord, 'unifiedClientCode' | 'clientCode' | 'clientName'>) {
  return row.clientCode || row.unifiedClientCode || row.clientName;
}

function planRelevantGroup(group: string) {
  const normalized = normalizeProductGroup(group);
  return normalized !== normalizeProductGroup(EXCLUDED_GROSS_PLAN_GROUP)
    && normalized !== normalizeProductGroup(AGGREGATE_PLAN_GROUP)
    && !isTireGroup(group);
}

function isProfitBrand(value: string) {
  return normalizeProductGroup(value) === normalizeProductGroup(PROFIT_GROUP_NAME);
}

function groupPlanBaseAmount(groupPlans: GroupPlanRecord[]) {
  const aggregatePlan = groupPlans.find((row) => normalizeProductGroup(row.productGroup) === normalizeProductGroup(AGGREGATE_PLAN_GROUP));
  if (aggregatePlan?.planAmount) return aggregatePlan.planAmount;
  return sum(groupPlans.filter((row) => planRelevantGroup(row.productGroup)).map((row) => row.planAmount));
}

function profitPlanRecord(groupPlans: GroupPlanRecord[]): GroupPlanRecord | null {
  const basePlanAmount = groupPlanBaseAmount(groupPlans);
  if (basePlanAmount <= 0) return null;
  return {
    productGroup: PROFIT_GROUP_NAME,
    planPercent: PROFIT_PLAN_PERCENT,
    planAmount: (basePlanAmount * PROFIT_PLAN_PERCENT) / 100,
    tempoAmount: 0,
    factAmount: 0,
    completionPercent: 0,
    netPercent: 0
  };
}

function effectiveGroupPlans(groupPlans: GroupPlanRecord[]) {
  const relevantPlans = groupPlans.filter((row) => row.planAmount > 0 && planRelevantGroup(row.productGroup));
  const profitPlan = profitPlanRecord(groupPlans);
  return profitPlan ? [...relevantPlans, profitPlan] : relevantPlans;
}

function groupFactAmount(sales: SalesRecord[], productGroup: string) {
  if (normalizeProductGroup(productGroup) === normalizeProductGroup(PROFIT_GROUP_NAME)) {
    return sum(sales.filter((row) => isProfitBrand(row.brand)).map((row) => row.amountEur));
  }

  return sum(sales.filter((row) => normalizeProductGroup(row.productGroup) === normalizeProductGroup(productGroup)).map((row) => row.amountEur));
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

export function monthPaceSnapshot(sales: SalesRecord[], plans: MonthlyPlan[], month: string, referenceDate?: string): MonthPaceSnapshot {
  const monthSales = salesForMonth(sales, month);
  const actualTurnover = grossPlanTurnover(monthSales);
  const grossPlan = plans.find((plan) => plan.month === month)?.grossPlan ?? 0;
  const progress = monthProgress(month, referenceDate);
  const expectedTurnoverToDate = grossPlan * progress.elapsedShare;
  const projectedTurnover = progress.elapsedShare > 0 ? actualTurnover / progress.elapsedShare : 0;

  return {
    ...progress,
    actualTurnover,
    expectedTurnoverToDate,
    varianceToTempo: actualTurnover - expectedTurnoverToDate,
    requiredPerDay: progress.remainingDays > 0 ? Math.max(grossPlan - actualTurnover, 0) / progress.remainingDays : 0,
    projectedTurnover,
    projectedCompletionPercent: grossPlan > 0 ? (projectedTurnover / grossPlan) * 100 : 0
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

export function clientGroupShareGaps(groupPlans: GroupPlanRecord[], sales: SalesRecord[], limit?: number): ClientGroupGapRow[] {
  const relevantPlans = effectiveGroupPlans(groupPlans).map((row) => ({ ...row, normalizedGroup: normalizeProductGroup(row.productGroup) }));
  const totalPlanAmount = sum(relevantPlans.map((row) => row.planAmount));
  if (!relevantPlans.length || totalPlanAmount <= 0) return [];

  const highlightedBrands = new Set(HIGHLIGHT_GROUP_GAP_BRANDS.map((brand) => normalizeProductGroup(brand)));
  const salesByClient = new Map<string, {
    unifiedClientCode: string;
    clientCode: string;
    clientName: string;
    turnover: number;
    groups: Set<string>;
    brands: Set<string>;
    groupAmounts: Map<string, { name: string; amount: number }>;
    brandAmounts: Map<string, { name: string; amount: number }>;
  }>();
  sales.forEach((row) => {
    const key = clientKey(row);
    const entry = salesByClient.get(key) ?? {
      unifiedClientCode: row.unifiedClientCode,
      clientCode: row.clientCode,
      clientName: row.clientName,
      turnover: 0,
      groups: new Set<string>(),
      brands: new Set<string>(),
      groupAmounts: new Map<string, { name: string; amount: number }>(),
      brandAmounts: new Map<string, { name: string; amount: number }>()
    };
    entry.turnover += row.amountEur;
    if (planRelevantGroup(row.productGroup)) {
      const normalizedGroup = normalizeProductGroup(row.productGroup);
      const groupName = row.productGroup.trim();
      entry.groups.add(normalizedGroup);
      const currentGroup = entry.groupAmounts.get(normalizedGroup) ?? { name: groupName, amount: 0 };
      currentGroup.amount += row.amountEur;
      entry.groupAmounts.set(normalizedGroup, currentGroup);
    }
    if (row.brand && highlightedBrands.has(normalizeProductGroup(row.brand))) {
      const normalizedBrand = normalizeProductGroup(row.brand);
      const brandName = row.brand.trim();
      entry.brands.add(brandName);
      const currentBrand = entry.brandAmounts.get(normalizedBrand) ?? { name: brandName, amount: 0 };
      currentBrand.amount += row.amountEur;
      entry.brandAmounts.set(normalizedBrand, currentBrand);
    }
    if (isProfitBrand(row.brand)) {
      const normalizedProfitGroup = normalizeProductGroup(PROFIT_GROUP_NAME);
      entry.groups.add(normalizedProfitGroup);
      const currentProfit = entry.groupAmounts.get(normalizedProfitGroup) ?? { name: PROFIT_GROUP_NAME, amount: 0 };
      currentProfit.amount += row.amountEur;
      entry.groupAmounts.set(normalizedProfitGroup, currentProfit);
    }
    salesByClient.set(key, entry);
  });

  const rows = [...salesByClient.values()]
    .map((client) => {
      const coveredPlans = relevantPlans.filter((plan) => client.groups.has(plan.normalizedGroup));
      const missingPlans = relevantPlans.filter((plan) => !client.groups.has(plan.normalizedGroup));
      const coveredPlanAmount = sum(coveredPlans.map((plan) => plan.planAmount));
      const missingPlanAmount = totalPlanAmount - coveredPlanAmount;
      const coveredGroupStats = coveredPlans
        .map((plan) => {
          const fact = client.groupAmounts.get(plan.normalizedGroup);
          const amount = fact?.amount ?? 0;
          return {
            name: plan.productGroup,
            amount,
            turnoverShare: client.turnover > 0 ? (amount / client.turnover) * 100 : 0,
            planShare: normalizeProductGroup(plan.productGroup) === normalizeProductGroup(PROFIT_GROUP_NAME)
              ? PROFIT_PLAN_PERCENT
              : totalPlanAmount > 0 ? (plan.planAmount / totalPlanAmount) * 100 : 0
          };
        })
        .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'uk', { sensitivity: 'base' }));
      const coveredBrandStats = [...client.brandAmounts.values()]
        .filter((brand) => normalizeProductGroup(brand.name) !== normalizeProductGroup(PROFIT_GROUP_NAME))
        .map((brand) => ({
          name: brand.name,
          amount: brand.amount,
          turnoverShare: client.turnover > 0 ? (brand.amount / client.turnover) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'uk', { sensitivity: 'base' }));
      const missingGroupStats = missingPlans
        .map((plan) => ({
          name: plan.productGroup,
          planShare: normalizeProductGroup(plan.productGroup) === normalizeProductGroup(PROFIT_GROUP_NAME)
            ? PROFIT_PLAN_PERCENT
            : totalPlanAmount > 0 ? (plan.planAmount / totalPlanAmount) * 100 : 0
        }))
        .sort((a, b) => b.planShare - a.planShare || a.name.localeCompare(b.name, 'uk', { sensitivity: 'base' }));

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
        coveredGroupNames: coveredPlans.map((plan) => plan.productGroup),
        coveredBrandNames: coveredBrandStats.map((brand) => brand.name),
        missingGroupNames: missingPlans.map((plan) => plan.productGroup),
        coveredGroupStats,
        coveredBrandStats,
        missingGroupStats
      };
    })
    .filter((row) => row.turnover > 0)
    .sort((a, b) => b.missingPlanShare - a.missingPlanShare || b.turnover - a.turnover || a.clientCode.localeCompare(b.clientCode) || a.clientName.localeCompare(b.clientName));

  return typeof limit === 'number' ? rows.slice(0, limit) : rows;
}

export function groupPlanAudit(groupPlans: GroupPlanRecord[], sales: SalesRecord[]) {
  const relevantPlans = effectiveGroupPlans(groupPlans);
  const totalGrossPlan = sum(relevantPlans.map((row) => row.planAmount));
  return relevantPlans.map((plan): GroupPlanAuditRow => {
    const factFromSales = groupFactAmount(sales, plan.productGroup);
    const shareOfGrossPlan = totalGrossPlan > 0 ? (plan.planAmount / totalGrossPlan) * 100 : 0;
    return {
      ...plan,
      factFromSales,
      variance: factFromSales - plan.factAmount,
      completionPercent: plan.planAmount > 0 ? (factFromSales / plan.planAmount) * 100 : 0,
      shareOfGrossPlan
    };
  });
}

export function groupTempoRows(groupPlans: GroupPlanRecord[], sales: SalesRecord[], month: string, referenceDate?: string): GroupTempoRow[] {
  const progress = monthProgress(month, referenceDate);
  return groupPlanAudit(groupPlans, sales)
    .filter((row) => planRelevantGroup(row.productGroup) && normalizeProductGroup(row.productGroup) !== normalizeProductGroup(PROFIT_GROUP_NAME))
    .map((row) => ({
      ...row,
      tempoDelta: row.factFromSales - row.tempoAmount,
      tempoCompletionPercent: row.tempoAmount > 0 ? (row.factFromSales / row.tempoAmount) * 100 : 0,
      requiredPerDay: progress.remainingDays > 0 ? Math.max(row.planAmount - row.factFromSales, 0) / progress.remainingDays : 0,
      projectedCompletionPercent: row.planAmount > 0 && progress.elapsedShare > 0
        ? ((row.factFromSales / progress.elapsedShare) / row.planAmount) * 100
        : 0
    }))
    .sort((a, b) => a.tempoDelta - b.tempoDelta || b.planAmount - a.planAmount);
}

export function profitClientPenetration(sales: SalesRecord[], limit?: number): ProfitClientPenetrationRow[] {
  const map = new Map<string, {
    unifiedClientCode: string;
    clientCode: string;
    clientName: string;
    turnover: number;
    profitTurnover: number;
    productGroups: Set<string>;
  }>();

  sales.forEach((row) => {
    const key = clientKey(row);
    const entry = map.get(key) ?? {
      unifiedClientCode: row.unifiedClientCode,
      clientCode: row.clientCode,
      clientName: row.clientName,
      turnover: 0,
      profitTurnover: 0,
      productGroups: new Set<string>()
    };

    entry.turnover += row.amountEur;
    if (row.productGroup) entry.productGroups.add(normalizeProductGroup(row.productGroup));
    if (isProfitBrand(row.brand)) entry.profitTurnover += row.amountEur;
    map.set(key, entry);
  });

  const rows = [...map.values()]
    .map((row) => ({
      unifiedClientCode: row.unifiedClientCode,
      clientCode: row.clientCode,
      clientName: row.clientName,
      turnover: row.turnover,
      profitTurnover: row.profitTurnover,
      profitShare: row.turnover > 0 ? (row.profitTurnover / row.turnover) * 100 : 0,
      productGroups: row.productGroups.size,
      hasProfit: row.profitTurnover > 0
    }))
    .filter((row) => row.turnover > 0)
    .sort((a, b) => Number(a.hasProfit) - Number(b.hasProfit) || b.turnover - a.turnover || a.clientName.localeCompare(b.clientName, 'uk', { sensitivity: 'base' }));

  return typeof limit === 'number' ? rows.slice(0, limit) : rows;
}

export function profitGroupPenetration(sales: SalesRecord[], limit?: number): ProfitGroupPenetrationRow[] {
  const profitClients = new Set(
    sales
      .filter((row) => isProfitBrand(row.brand))
      .map((row) => clientKey(row))
  );
  const map = new Map<string, {
    productGroup: string;
    turnover: number;
    clients: Set<string>;
    clientsWithProfit: Set<string>;
    potentialTurnover: number;
  }>();

  sales
    .filter((row) => planRelevantGroup(row.productGroup))
    .forEach((row) => {
      const normalizedGroup = normalizeProductGroup(row.productGroup);
      const key = clientKey(row);
      const entry = map.get(normalizedGroup) ?? {
        productGroup: row.productGroup,
        turnover: 0,
        clients: new Set<string>(),
        clientsWithProfit: new Set<string>(),
        potentialTurnover: 0
      };

      entry.turnover += row.amountEur;
      entry.clients.add(key);
      if (profitClients.has(key)) entry.clientsWithProfit.add(key);
      else entry.potentialTurnover += row.amountEur;
      map.set(normalizedGroup, entry);
    });

  const rows = [...map.values()]
    .map((row) => ({
      productGroup: row.productGroup,
      turnover: row.turnover,
      clients: row.clients.size,
      clientsWithProfit: row.clientsWithProfit.size,
      penetrationPercent: row.clients.size > 0 ? (row.clientsWithProfit.size / row.clients.size) * 100 : 0,
      potentialTurnover: row.potentialTurnover
    }))
    .sort((a, b) => a.penetrationPercent - b.penetrationPercent || b.potentialTurnover - a.potentialTurnover || a.productGroup.localeCompare(b.productGroup, 'uk', { sensitivity: 'base' }));

  return typeof limit === 'number' ? rows.slice(0, limit) : rows;
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
