import fs from 'node:fs';
import path from 'node:path';
import type { GroupPlanRecord, MonthlyPlan, ProcessedData, ReceivableRecord, SalesRecord } from './types';

const processedDir = path.join(process.cwd(), 'data/processed');

function readJson<T>(fileName: string, empty: T): T {
  const filePath = path.join(processedDir, fileName);
  if (!fs.existsSync(filePath)) return empty;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function readDashboardData(): ProcessedData {
  const meta = readJson<{ updatedAt?: string | null }>('meta.json', {});
  return {
    updatedAt: meta.updatedAt ?? '',
    sales: readJson<SalesRecord[]>('sales.json', []),
    groupPlans: readJson<GroupPlanRecord[]>('group-plan.json', []),
    receivables: readJson<ReceivableRecord[]>('receivables.json', []),
    monthlyPlans: readJson<MonthlyPlan[]>('monthly-plans.json', [])
  };
}
