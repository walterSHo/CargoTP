import { GroupPlanClient } from '@/components/GroupPlanClient';
import { groupPlanAudit } from '@/lib/analytics';
import { readDashboardData } from '@/lib/data';

export default function GroupPlanPage() {
  const data = readDashboardData();
  const rows = groupPlanAudit(data.groupPlans, data.sales);
  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="eyebrow">Plan control</div>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white">План груп</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">Тут видно, які товарні групи дають планову долю валового обороту і де факт уже починає відставати.</p>
      </section>
      <GroupPlanClient rows={rows} />
    </div>
  );
}
