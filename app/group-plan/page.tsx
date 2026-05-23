import { GroupPlanClient } from '@/components/GroupPlanClient';
import { PageHeader } from '@/components/PageHeader';
import { groupTempoRows, latestDataMonth, salesForMonth } from '@/lib/analytics';
import { readDashboardData } from '@/lib/data';

export default function GroupPlanPage() {
  const data = readDashboardData();
  const month = latestDataMonth(data.sales);
  const monthSales = month ? salesForMonth(data.sales, month) : [];
  const rows = month ? groupTempoRows(data.groupPlans, monthSales, month) : [];
  return (
    <div className="space-y-6">
      <PageHeader description="Тут видно, які товарні групи тримають темп місяця, де факт відстає від темпу, і скільки ще потрібно добрати до плану." title="План груп" />
      <GroupPlanClient rows={rows} />
    </div>
  );
}
