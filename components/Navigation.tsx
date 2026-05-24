'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChartIcon, CircleAlertIcon, GaugeIcon, GridIcon, KanbanIcon, LayersIcon, WalletIcon } from '@/components/UiIcons';

const links = [
  ['/', 'Огляд', 'Контроль місяця', GridIcon],
  ['/sales', 'Продажі', 'Фільтри і ризики', BarChartIcon],
  ['/todo', 'Todo', 'Класичний список', KanbanIcon],
  ['/group-plan', 'План груп', 'Темп та дельта', LayersIcon],
  ['/receivables', 'Дебіторка', 'Тиск оплат', WalletIcon],
  ['/tires', 'Шини', 'Окремий сегмент', GaugeIcon],
  ['/settings', 'Налаштування', 'Параметри системи', CircleAlertIcon]
] as const;

export function Navigation() {
  const pathname = usePathname();

  return (
    <>
      <header className="nav-shell sticky top-0 z-40 border-b border-line px-3 py-3 backdrop-blur-xl md:hidden">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <div>
            <div className="nav-section-label">CargoTP</div>
            <div className="mt-1 text-sm font-semibold text-white">Sales control system</div>
          </div>
          <div className="signal-chip">
            <strong>Live</strong>
            <span>Ops</span>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1 text-sm font-medium">
          {links.map(([href, label, meta, Icon]) => {
            const active = pathname === href;
            return (
              <Link
                className={`interactive-lift shrink-0 rounded-[13px] border px-2.5 py-2 transition ${
                  active
                    ? 'nav-link-active border-[rgba(78,161,255,0.42)] bg-[rgba(78,161,255,0.16)] text-white'
                    : 'border-line bg-[rgba(18,24,34,0.92)] text-muted hover:border-[rgba(148,163,184,0.28)] hover:text-white'
                }`}
                href={href}
                key={href}
              >
                <span className="flex items-center gap-3">
                  <span className="nav-icon"><Icon className="h-4 w-4" /></span>
                  <span className="nav-link-copy">
                    <span className="nav-link-title">{label}</span>
                    <span className="nav-link-meta">{meta}</span>
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
      </header>

      <aside className="nav-shell hidden border-r border-line md:sticky md:top-0 md:flex md:h-screen md:flex-col md:px-3.5 md:py-5">
        <div className="rounded-[18px] border border-line bg-[rgba(18,24,34,0.8)] p-3.5">
          <div className="nav-section-label">CargoTP</div>
          <div className="mt-2 text-lg font-black tracking-tight text-white">Operational cockpit</div>
          <div className="mt-2 text-sm leading-6 text-muted">Щоденний ритм плану, продажів, дебіторки та задач в одному контурі.</div>
        </div>
        <nav className="mt-3 flex flex-1 flex-col gap-1.5 text-sm font-medium">
          {links.map(([href, label, meta, Icon]) => {
            const active = pathname === href;
            return (
              <Link
                className={`interactive-lift group flex items-center justify-between rounded-[15px] border px-3 py-2.5 transition ${
                  active
                    ? 'nav-link-active border-[rgba(78,161,255,0.42)] bg-[rgba(78,161,255,0.16)] text-white'
                    : 'border-line bg-[rgba(18,24,34,0.88)] text-muted hover:border-[rgba(148,163,184,0.28)] hover:text-white'
                }`}
                href={href}
                key={href}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="nav-icon"><Icon className="h-4.5 w-4.5" /></span>
                  <span className="nav-link-copy">
                    <span className="nav-link-title">{label}</span>
                    <span className="nav-link-meta">{meta}</span>
                  </span>
                </span>
                <span className={`text-xs transition ${active ? 'text-white' : 'text-[rgba(141,162,199,0.72)] group-hover:text-white'}`}>›</span>
              </Link>
            );
          })}
        </nav>
        <div className="rounded-[18px] border border-line bg-[rgba(18,24,34,0.72)] p-3.5">
          <div className="nav-section-label">Logic</div>
          <div className="mt-2 text-sm font-semibold text-white">Three questions</div>
          <div className="mt-2 space-y-2 text-sm leading-6 text-muted">
            <div>Where are we behind?</div>
            <div>Why is it happening?</div>
            <div>What should be done next?</div>
          </div>
        </div>
      </aside>
    </>
  );
}
