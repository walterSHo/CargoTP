import { SettingsClient } from '@/components/SettingsClient';
import { readDashboardData } from '@/lib/data';

export default function SettingsPage() {
  const { monthlyPlans } = readDashboardData();
  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="eyebrow">Manual inputs</div>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Налаштування / Вхідні дані</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">Тут зберігається ручний валовий план по місяцях, який потім використовується у всьому дашборді.</p>
      </section>
      <form className="filter-bar grid gap-4 md:grid-cols-3" action="/api/settings/monthly-plan" method="post">
        <label className="grid gap-2">
          <span className="filter-label">Місяць</span>
          <input className="filter-input" name="month" placeholder="YYYY-MM" required />
        </label>
        <label className="grid gap-2">
          <span className="filter-label">Валовий план</span>
          <input className="filter-input" min="0" name="grossPlan" required type="number" />
        </label>
        <button className="self-end rounded-2xl border border-[rgba(78,161,255,0.38)] bg-[linear-gradient(135deg,rgba(78,161,255,0.3),rgba(45,212,191,0.18))] px-4 py-3 font-semibold text-white shadow-[0_18px_36px_rgba(78,161,255,0.18)] transition hover:-translate-y-0.5" type="submit">Зберегти</button>
      </form>
      <SettingsClient monthlyPlans={monthlyPlans} />
      <p className="text-sm text-muted">Форма зберігає план у data/processed/monthly-plans.json; після деплою за потреби можна додати автокоміт через scripts/git-auto-commit.ts.</p>
    </div>
  );
}
