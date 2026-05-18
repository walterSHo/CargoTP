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
    <header className="sticky top-0 z-40 border-b border-line bg-[rgba(6,12,24,0.72)] backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mr-4">
          <div className="eyebrow">Operations cockpit</div>
          <span className="text-lg font-extrabold tracking-tight text-white">CargoTP</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
        {links.map(([href, label]) => (
          <Link
            className={`rounded-full border px-4 py-2 transition ${
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
        </div>
      </nav>
    </header>
  );
}
