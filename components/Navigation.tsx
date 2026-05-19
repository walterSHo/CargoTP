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
        <nav className="flex gap-2 overflow-x-auto pb-1 text-sm font-medium">
          {links.map(([href, label]) => (
            <Link
              className={`interactive-lift shrink-0 rounded-[12px] border px-4 py-2 transition ${
                pathname === href
                  ? 'border-[rgba(78,161,255,0.42)] bg-[rgba(78,161,255,0.16)] text-white'
                  : 'border-line bg-[rgba(10,18,33,0.72)] text-muted hover:border-[rgba(148,163,184,0.28)] hover:text-white'
              }`}
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <aside className="hidden border-r border-line bg-[rgba(6,12,24,0.78)] md:sticky md:top-0 md:flex md:h-screen md:flex-col md:px-4 md:py-6">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Меню</div>
        <nav className="mt-3 flex flex-1 flex-col gap-2 text-sm font-medium">
          {links.map(([href, label]) => (
            <Link
              className={`interactive-lift group flex items-center justify-between rounded-[12px] border px-3 py-3 transition ${
                pathname === href
                  ? 'border-[rgba(78,161,255,0.42)] bg-[rgba(78,161,255,0.16)] text-white'
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
