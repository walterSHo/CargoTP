import { SalesClient } from '@/components/SalesClient';
import { PageHeader } from '@/components/PageHeader';
import { readDashboardData } from '@/lib/data';

export default function SalesPage() {
  const data = readDashboardData();
  return (
    <div className="space-y-6">
      <PageHeader description="Робочий продажний екран: KPI, темп місяця, допродаж, покриття PROFIT, ризики по маржі та повний фільтрований зріз продажів." kicker="Робочий простір продажів" title="Продажі" />
      <SalesClient data={data} />
    </div>
  );
}
