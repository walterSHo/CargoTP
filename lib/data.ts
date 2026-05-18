import fs from 'node:fs';
import path from 'node:path';
import type { GroupPlanRecord, MonthlyPlan, ProcessedData, ReceivableRecord, SalesRecord } from './types';

const processedDir = path.join(process.cwd(), 'data/processed');

function readJson<T>(fileName: string, fallback: T): T {
  const filePath = path.join(processedDir, fileName);
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function readDashboardData(): ProcessedData {
  const dashboardPath = path.join(processedDir, 'dashboard.json');
  const dashboard = fs.existsSync(dashboardPath) ? JSON.parse(fs.readFileSync(dashboardPath, 'utf8')) as ProcessedData : undefined;
  return {
    updatedAt: readJson<{ updatedAt: string }>('meta.json', { updatedAt: dashboard?.updatedAt ?? new Date(0).toISOString() }).updatedAt,
    sales: readJson<SalesRecord[]>('sales.json', dashboard?.sales ?? []),
    groupPlans: readJson<GroupPlanRecord[]>('group-plan.json', dashboard?.groupPlans ?? []),
    receivables: readJson<ReceivableRecord[]>('receivables.json', dashboard?.receivables ?? []),
    monthlyPlans: readJson<MonthlyPlan[]>('monthly-plans.json', dashboard?.monthlyPlans ?? [])
  };
}
