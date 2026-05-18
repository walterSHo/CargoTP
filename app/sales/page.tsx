import { SalesClient } from '@/components/SalesClient';
import { PageHeader } from '@/components/PageHeader';
import { readDashboardData } from '@/lib/data';

export default function SalesPage() {
  const { sales } = readDashboardData();
  return (
    <div className="space-y-6">
      <PageHeader description="Розділ для перегляду структури продажів, брендів і товарних груп з компактними фільтрами прямо в заголовках таблиці." title="Продажі" />
      <SalesClient sales={sales} />
    </div>
  );
}
