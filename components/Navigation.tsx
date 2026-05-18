import Link from 'next/link';

const links = [
  ['/', 'Огляд'],
  ['/sales', 'Продажі'],
  ['/group-plan', 'План груп'],
  ['/receivables', 'Дебіторка'],
  ['/tires', 'Шини'],
  ['/settings', 'Налаштування']
];

export function Navigation() {
  return (
    <header className="border-b bg-white">
      <nav className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 text-sm font-medium sm:px-6 lg:px-8">
        <span className="mr-4 text-lg font-bold">CargoTP</span>
        {links.map(([href, label]) => (
          <Link className="rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950" href={href} key={href}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
