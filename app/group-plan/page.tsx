import { GroupPlanClient } from '@/components/GroupPlanClient';
import { PageHeader } from '@/components/PageHeader';
import { groupPlanAudit } from '@/lib/analytics';
import { readDashboardData } from '@/lib/data';

export default function GroupPlanPage() {
  const data = readDashboardData();
  const rows = groupPlanAudit(data.groupPlans, data.sales);
  return (
    <div className="space-y-6">
      <PageHeader description="Тут видно, які товарні групи дають планову долю валового обороту і де факт уже починає відставати." title="План груп" />
      <GroupPlanClient rows={rows} />
    </div>
  );
}
