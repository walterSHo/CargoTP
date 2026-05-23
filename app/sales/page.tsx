import { SalesClient } from '@/components/SalesClient';
import { PageHeader } from '@/components/PageHeader';
import { readDashboardData } from '@/lib/data';

export default function SalesPage() {
  const data = readDashboardData();
  return (
    <div className="space-y-6">
      <PageHeader description="Робочий продажний екран: KPI, динаміка, ризики, можливості для росту і локальний todo-лист з тегами в одному місці." title="Продажі" />
      <SalesClient data={data} />
    </div>
  );
}
