export type FileType = 'sales' | 'groupPlan' | 'receivables';

export type SalesRecord = {
  date: string;
  unifiedClientCode: string;
  clientCode: string;
  clientName: string;
  brand: string;
  productGroup: string;
  productCode: string;
  amountEur: number;
  netMargin: number;
  discountPercent: number;
};

export type GroupPlanRecord = {
  productGroup: string;
  planPercent: number;
  planAmount: number;
  tempoAmount: number;
  factAmount: number;
  completionPercent: number;
  netPercent: number;
};

export type ReceivableRecord = {
  unifiedClientCode: string;
  clientCode: string;
  clientName: string;
  totalDebt: number;
  currentDebt: number;
  overdueDebt: number;
  bucket0To10: number;
  bucket11To20: number;
  bucket21To30: number;
  bucket31Plus: number;
};

export type MonthlyPlan = {
  month: string;
  grossPlan: number;
};

export type ProcessedData = {
  updatedAt: string;
  sales: SalesRecord[];
  groupPlans: GroupPlanRecord[];
  receivables: ReceivableRecord[];
  monthlyPlans: MonthlyPlan[];
};
