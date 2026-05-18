import { SalesClient } from '@/components/SalesClient';
import { readDashboardData } from '@/lib/data';

export default function SalesPage() {
  const { sales } = readDashboardData();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Sales</h1>
      <SalesClient sales={sales} />
    </div>
  );
}
