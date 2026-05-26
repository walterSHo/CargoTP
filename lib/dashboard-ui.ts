export type DashboardSearchMode = 'code' | 'client' | 'brand' | 'group';

export type DashboardKpiTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'secondary';

export type DashboardIconKey = 'bar-chart' | 'alert' | 'gauge' | 'grid' | 'kanban' | 'layers' | 'network' | 'percent' | 'wallet';

export type DashboardNavItem = {
  href: string;
  label: string;
  meta: string;
  icon: DashboardIconKey;
};

export const DASHBOARD_SEARCH_MODES: Array<{ value: DashboardSearchMode; label: string }> = [
  { value: 'code', label: 'Код' },
  { value: 'client', label: 'Клієнт' },
  { value: 'brand', label: 'Бренд' },
  { value: 'group', label: 'Група' }
];

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { href: '/', label: 'Огляд', meta: 'Контроль місяця', icon: 'grid' },
  { href: '/sales', label: 'Продажі', meta: 'Фільтри і ризики', icon: 'bar-chart' },
  { href: '/todo', label: 'Todo', meta: 'Класичний список', icon: 'kanban' },
  { href: '/group-plan', label: 'План груп', meta: 'Темп та дельта', icon: 'layers' },
  { href: '/receivables', label: 'Дебіторка', meta: 'Тиск оплат', icon: 'wallet' },
  { href: '/tires', label: 'Шини', meta: 'Окремий сегмент', icon: 'gauge' },
  { href: '/settings', label: 'Налаштування', meta: 'Параметри системи', icon: 'alert' }
];

export function resolveKpiIconKey(title: string): DashboardIconKey {
  const normalized = title.toLowerCase();
  if (normalized.includes('дебітор')) return 'wallet';
  if (normalized.includes('profit') || normalized.includes('маржа')) return 'percent';
  if (normalized.includes('темп') || normalized.includes('день')) return 'gauge';
  if (normalized.includes('клієнт') || normalized.includes('cross-sell')) return 'network';
  if (normalized.includes('план')) return 'alert';
  return 'bar-chart';
}

export function resolveFilterPopoverSide(columnIndex: number, totalColumns: number) {
  if (columnIndex <= 1) return 'left';
  if (columnIndex >= totalColumns - 2) return 'right';
  return 'right';
}
