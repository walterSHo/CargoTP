import { OverviewClient } from '@/components/OverviewClient';
import { readDashboardData } from '@/lib/data';

export default function DashboardPage() {
  return <OverviewClient data={readDashboardData()} />;
}
