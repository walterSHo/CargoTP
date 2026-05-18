import fs from 'node:fs';
import path from 'node:path';
import { redirect } from 'next/navigation';
import type { MonthlyPlan, ProcessedData } from '@/lib/types';

const processedDir = path.join(process.cwd(), 'data/processed');
const monthlyPlansPath = path.join(processedDir, 'monthly-plans.json');
const dashboardPath = path.join(processedDir, 'dashboard.json');

export async function POST(request: Request) {
  const form = await request.formData();
  const month = String(form.get('month') ?? '').trim();
  const grossPlan = Number(form.get('grossPlan'));
  if (!/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(grossPlan) || grossPlan < 0) {
    throw new Error('Некорректный месяц или валовый план.');
  }

  fs.mkdirSync(processedDir, { recursive: true });
  const plans: MonthlyPlan[] = fs.existsSync(monthlyPlansPath)
    ? JSON.parse(fs.readFileSync(monthlyPlansPath, 'utf8'))
    : [];
  const nextPlans = [...plans.filter((plan) => plan.month !== month), { month, grossPlan }].sort((a, b) => a.month.localeCompare(b.month));
  fs.writeFileSync(monthlyPlansPath, `${JSON.stringify(nextPlans, null, 2)}\n`);

  if (fs.existsSync(dashboardPath)) {
    const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8')) as ProcessedData;
    dashboard.monthlyPlans = nextPlans;
    fs.writeFileSync(dashboardPath, `${JSON.stringify(dashboard, null, 2)}\n`);
  }

  redirect('/settings');
}
