import { SettingsClient } from '@/components/SettingsClient';
import { readDashboardData } from '@/lib/data';

export default function SettingsPage() {
  const { monthlyPlans } = readDashboardData();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Налаштування / Вхідні дані</h1>
      <form className="grid gap-4 rounded-xl border bg-white p-5 md:grid-cols-3" action="/api/settings/monthly-plan" method="post">
        <label className="text-sm font-medium">Місяць<input className="mt-1 w-full rounded-md border px-3 py-2" name="month" placeholder="YYYY-MM" required /></label>
        <label className="text-sm font-medium">Валовий план<input className="mt-1 w-full rounded-md border px-3 py-2" min="0" name="grossPlan" required type="number" /></label>
        <button className="self-end rounded-md bg-blue-600 px-4 py-2 font-semibold text-white" type="submit">Зберегти</button>
      </form>
      <SettingsClient monthlyPlans={monthlyPlans} />
      <p className="text-sm text-slate-500">Форма зберігає план у data/processed/monthly-plans.json; після деплою за потреби можна додати автокоміт через scripts/git-auto-commit.ts.</p>
    </div>
  );
}
