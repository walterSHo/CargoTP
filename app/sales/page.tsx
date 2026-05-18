import { SalesClient } from '@/components/SalesClient';
import { readDashboardData } from '@/lib/data';

export default function SalesPage() {
  const { sales } = readDashboardData();
  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="eyebrow">Sales radar</div>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Продажі</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">Розділ для перегляду структури продажів, брендів і товарних груп у тёмному режимі з акцентом на читабельність.</p>
      </section>
      <SalesClient sales={sales} />
    </div>
  );
}
