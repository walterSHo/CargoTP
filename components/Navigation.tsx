'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  ['/', 'Огляд'],
  ['/sales', 'Продажі'],
  ['/group-plan', 'План груп'],
  ['/receivables', 'Дебіторка'],
  ['/tires', 'Шини'],
  ['/settings', 'Налаштування']
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-[rgba(6,12,24,0.78)] px-4 py-4 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-extrabold tracking-tight text-white">CargoTP</div>
            <div className="text-xs text-muted">Sales dashboard</div>
          </div>
          <nav className="flex max-w-[70vw] gap-2 overflow-x-auto pb-1 text-sm font-medium">
            {links.map(([href, label]) => (
              <Link
                className={`shrink-0 rounded-full border px-4 py-2 transition ${
                  pathname === href
                    ? 'border-[rgba(78,161,255,0.42)] bg-[linear-gradient(135deg,rgba(78,161,255,0.24),rgba(45,212,191,0.16))] text-white shadow-[0_12px_28px_rgba(78,161,255,0.16)]'
                    : 'border-line bg-[rgba(10,18,33,0.72)] text-muted hover:border-[rgba(148,163,184,0.28)] hover:text-white'
                }`}
                href={href}
                key={href}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <aside className="hidden border-r border-line bg-[rgba(6,12,24,0.78)] md:sticky md:top-0 md:flex md:h-screen md:flex-col md:px-5 md:py-6">
        <div className="rounded-[26px] border border-line bg-[linear-gradient(180deg,rgba(13,23,42,0.92),rgba(9,16,30,0.92))] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.24)]">
          <div className="text-xl font-black tracking-tight text-white">CargoTP</div>
          <div className="mt-1 text-sm text-muted">Sales dashboard</div>
        </div>
        <div className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Меню</div>
        <nav className="mt-3 flex flex-1 flex-col gap-2 text-sm font-medium">
          {links.map(([href, label]) => (
            <Link
              className={`group flex items-center justify-between rounded-2xl border px-4 py-3 transition ${
                pathname === href
                  ? 'border-[rgba(78,161,255,0.42)] bg-[linear-gradient(135deg,rgba(78,161,255,0.24),rgba(45,212,191,0.16))] text-white shadow-[0_14px_28px_rgba(78,161,255,0.16)]'
                  : 'border-line bg-[rgba(10,18,33,0.62)] text-muted hover:border-[rgba(148,163,184,0.28)] hover:text-white'
              }`}
              href={href}
              key={href}
            >
              <span>{label}</span>
              <span className={`text-xs transition ${pathname === href ? 'text-white' : 'text-[rgba(141,162,199,0.72)] group-hover:text-white'}`}>›</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
