import { SettingsClient } from '@/components/SettingsClient';
import { PageHeader } from '@/components/PageHeader';
import { readDashboardData } from '@/lib/data';

export default function SettingsPage() {
  const { monthlyPlans } = readDashboardData();
  return (
    <div className="space-y-6">
      <PageHeader description="Тут зберігається ручний валовий план по місяцях, який потім використовується у всьому дашборді." kicker="Системні вхідні дані" title="Налаштування / Вхідні дані" />
      <form className="filter-bar grid gap-4 md:grid-cols-3" action="/api/settings/monthly-plan" method="post">
        <label className="grid gap-2">
          <span className="filter-label">Місяць</span>
          <input className="filter-input" name="month" placeholder="YYYY-MM" required />
        </label>
        <label className="grid gap-2">
          <span className="filter-label">Валовий план</span>
          <input className="filter-input" min="0" name="grossPlan" required type="number" />
        </label>
        <button className="self-end border border-[rgba(59,130,246,0.38)] bg-[rgba(59,130,246,0.14)] px-4 py-3 font-semibold text-white transition hover:border-[rgba(59,130,246,0.54)]" type="submit">Зберегти</button>
      </form>
      <SettingsClient monthlyPlans={monthlyPlans} />
      <p className="text-sm text-muted">Форма зберігає план у data/processed/monthly-plans.json; після деплою за потреби можна додати автокоміт через scripts/git-auto-commit.ts.</p>
    </div>
  );
}
