import { GroupPlanClient } from '@/components/GroupPlanClient';
import { groupPlanAudit } from '@/lib/analytics';
import { readDashboardData } from '@/lib/data';

export default function GroupPlanPage() {
  const data = readDashboardData();
  const rows = groupPlanAudit(data.groupPlans, data.sales);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Group Plan</h1>
      <GroupPlanClient rows={rows} />
    </div>
  );
}
