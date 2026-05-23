'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DailySalesChart, SimpleBarChart, SimplePieChart } from './Charts';
import { DataTable } from './DataTable';
import { KpiCard } from './KpiCard';
import { AGGREGATE_PLAN_GROUP, PROFIT_GROUP_NAME, PROFIT_PLAN_PERCENT } from '@/lib/constants';
import { availableMonths, avg, byTop, clientGroupShareGaps, dailySalesSeries, dashboardKpis, groupPlanAudit, salesForMonth, topClientsByTurnover, type ClientGroupGapRow } from '@/lib/analytics';
import { money, percent } from '@/lib/format';
import { normalizeProductGroup } from '@/lib/product-groups';
import type { ProcessedData, ReceivableRecord, SalesRecord } from '@/lib/types';

type SearchMode = 'code' | 'client' | 'brand' | 'group';
type TodoPriority = 'high' | 'medium' | 'low';
type TodoStatus = 'todo' | 'doing' | 'done';

type SalesTodo = {
  id: string;
  title: string;
  clientName: string;
  tags: string[];
  priority: TodoPriority;
  status: TodoStatus;
  createdAt: string;
};

type TodoDraft = {
  title: string;
  clientName: string;
  tags: string;
  priority: TodoPriority;
};

type SuggestedTodo = {
  title: string;
  clientName: string;
  tags: string[];
  priority: TodoPriority;
};

type ActionSignal = {
  title: string;
  value: string;
  tone: 'success' | 'warning' | 'danger' | 'teal';
  description: string;
};

const TODO_STORAGE_KEY = 'cargotp-sales-todos-v1';

const searchModes: Array<{ value: SearchMode; label: string }> = [
  { value: 'code', label: 'Код' },
  { value: 'client', label: 'Клієнт' },
  { value: 'brand', label: 'Бренд' },
  { value: 'group', label: 'Група' }
];

const priorityOptions: Array<{ value: TodoPriority; label: string }> = [
  { value: 'high', label: 'Високий' },
  { value: 'medium', label: 'Середній' },
  { value: 'low', label: 'Низький' }
];

const statusOptions: Array<{ value: TodoStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Усі' },
  { value: 'todo', label: 'До роботи' },
  { value: 'doing', label: 'В процесі' },
  { value: 'done', label: 'Готово' }
];

const statusLabels: Record<TodoStatus, string> = {
  todo: 'До роботи',
  doing: 'В процесі',
  done: 'Готово'
};

const priorityLabels: Record<TodoPriority, string> = {
  high: 'Високий',
  medium: 'Середній',
  low: 'Низький'
};

const salesColumns: ColumnDef<SalesRecord>[] = [
  { accessorKey: 'date', header: 'Дата' },
  { accessorKey: 'unifiedClientCode', header: 'Єдиний код' },
  { accessorKey: 'clientCode', header: 'Код клієнта' },
  { accessorKey: 'clientName', header: 'Клієнт' },
  { accessorKey: 'brand', header: 'Бренд' },
  { accessorKey: 'productGroup', header: 'Група' },
  { accessorKey: 'productCode', header: 'Товар' },
  { accessorKey: 'amountEur', header: 'Сума', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'netMargin', header: 'Нетто-маржа', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'discountPercent', header: 'Знижка', cell: (info) => percent(Number(info.getValue())) }
];

const opportunityColumns: ColumnDef<ClientGroupGapRow>[] = [
  { accessorKey: 'clientCode', header: 'Код клієнта' },
  { accessorKey: 'clientName', header: 'Клієнт' },
  { accessorKey: 'turnover', header: 'Оборот', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'missingPlanShare', header: 'Втрачена частка плану', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'missingGroups', header: 'Немає груп' },
  {
    accessorFn: (row) => row.missingGroupNames.join(', '),
    id: 'missingGroupNames',
    header: 'Що відкрити',
    cell: (info) => {
      const value = String(info.getValue() ?? '');
      const preview = value.length > 52 ? `${value.slice(0, 49)}...` : value;
      return <span title={value}>{preview || 'Усі групи закриті'}</span>;
    }
  }
];

const riskColumns: ColumnDef<SalesRecord>[] = [
  { accessorKey: 'date', header: 'Дата' },
  { accessorKey: 'clientName', header: 'Клієнт' },
  { accessorKey: 'brand', header: 'Бренд' },
  { accessorKey: 'productGroup', header: 'Група' },
  { accessorKey: 'amountEur', header: 'Оборот', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'netMargin', header: 'Маржа', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'discountPercent', header: 'Знижка', cell: (info) => percent(Number(info.getValue())) }
];

function matchesSales(row: SalesRecord, mode: SearchMode, query: string) {
  if (!query) return true;
  const value = query.toLowerCase();
  if (mode === 'code') return `${row.clientCode} ${row.unifiedClientCode}`.toLowerCase().includes(value);
  if (mode === 'client') return row.clientName.toLowerCase().includes(value);
  if (mode === 'brand') return row.brand.toLowerCase().includes(value);
  if (normalizeProductGroup(PROFIT_GROUP_NAME).includes(normalizeProductGroup(value)) && normalizeProductGroup(row.brand) === normalizeProductGroup(PROFIT_GROUP_NAME)) return true;
  return row.productGroup.toLowerCase().includes(value);
}

function matchesReceivables(row: ReceivableRecord, mode: SearchMode, query: string) {
  if (!query) return true;
  const value = query.toLowerCase();
  if (mode === 'code') return `${row.clientCode} ${row.unifiedClientCode}`.toLowerCase().includes(value);
  if (mode === 'client') return row.clientName.toLowerCase().includes(value);
  return false;
}

function suggestionValues(data: ProcessedData, mode: SearchMode) {
  const values = new Set<string>();
  if (mode === 'code') {
    [...data.sales, ...data.receivables].forEach((row) => {
      if (row.clientCode) values.add(row.clientCode);
      if (row.unifiedClientCode) values.add(row.unifiedClientCode);
    });
  }
  if (mode === 'client') [...data.sales, ...data.receivables].forEach((row) => row.clientName && values.add(row.clientName));
  if (mode === 'brand') data.sales.forEach((row) => row.brand && values.add(row.brand));
  if (mode === 'group') {
    data.sales.forEach((row) => {
      if (row.productGroup) values.add(row.productGroup);
      if (normalizeProductGroup(row.brand) === normalizeProductGroup(PROFIT_GROUP_NAME)) values.add(PROFIT_GROUP_NAME);
    });
  }
  return [...values].sort((a, b) => a.localeCompare(b, 'uk', { numeric: true, sensitivity: 'base' }));
}

function createTodoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `todo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseTags(value: string) {
  return [...new Set(
    value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  )];
}

function loadTodos() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(TODO_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SalesTodo[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((todo) => todo && typeof todo.title === 'string')
      .map((todo) => ({
        id: todo.id || createTodoId(),
        title: todo.title,
        clientName: todo.clientName || '',
        tags: Array.isArray(todo.tags) ? todo.tags.filter((tag) => typeof tag === 'string') : [],
        priority: todo.priority === 'high' || todo.priority === 'low' ? todo.priority : 'medium',
        status: todo.status === 'doing' || todo.status === 'done' ? todo.status : 'todo',
        createdAt: todo.createdAt || new Date().toISOString()
      }));
  } catch {
    return [];
  }
}

function nextStatus(status: TodoStatus): TodoStatus {
  if (status === 'todo') return 'doing';
  if (status === 'doing') return 'done';
  return 'todo';
}

function applyColumnFilters(rows: SalesRecord[], filters: Record<string, string[]>) {
  const keys = salesColumns
    .map((column) => typeof column.accessorKey === 'string' ? column.accessorKey : '')
    .filter(Boolean);

  return rows.filter((row) => keys.every((key) => {
    const selected = filters[key];
    if (!selected?.length) return true;
    return selected.includes(String(row[key as keyof SalesRecord] ?? ''));
  }));
}

function todoPriorityWeight(priority: TodoPriority) {
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  return 1;
}

function statusBadgeClassName(status: TodoStatus) {
  if (status === 'done') return 'border-[rgba(52,211,153,0.4)] bg-[rgba(52,211,153,0.14)] text-[var(--success)]';
  if (status === 'doing') return 'border-[rgba(245,158,11,0.42)] bg-[rgba(245,158,11,0.14)] text-[var(--warning)]';
  return 'border-[rgba(78,161,255,0.42)] bg-[rgba(78,161,255,0.16)] text-white';
}

function priorityBadgeClassName(priority: TodoPriority) {
  if (priority === 'high') return 'border-[rgba(251,113,133,0.4)] bg-[rgba(251,113,133,0.14)] text-[var(--danger)]';
  if (priority === 'low') return 'border-line bg-[rgba(8,15,28,0.72)] text-muted';
  return 'border-[rgba(45,212,191,0.4)] bg-[rgba(45,212,191,0.14)] text-[var(--accent-2)]';
}

export function SalesClient({ data }: { data: ProcessedData }) {
  const months = availableMonths(data.sales).sort().reverse();
  const [month, setMonth] = useState(months[0] ?? '');
  const [searchMode, setSearchMode] = useState<SearchMode>('code');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [todos, setTodos] = useState<SalesTodo[]>([]);
  const [todosLoaded, setTodosLoaded] = useState(false);
  const [todoDraft, setTodoDraft] = useState<TodoDraft>({
    title: '',
    clientName: '',
    tags: '',
    priority: 'medium'
  });
  const [todoStatusFilter, setTodoStatusFilter] = useState<TodoStatus | 'all'>('all');
  const [todoPriorityFilter, setTodoPriorityFilter] = useState<TodoPriority | 'all'>('all');
  const [todoTagFilter, setTodoTagFilter] = useState('all');
  const [todoSearch, setTodoSearch] = useState('');
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (searchRef.current?.contains(event.target as Node)) return;
      setSearchOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    setTodos(loadTodos());
    setTodosLoaded(true);
  }, []);

  useEffect(() => {
    if (!todosLoaded || typeof window === 'undefined') return;
    window.localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
  }, [todos, todosLoaded]);

  const suggestions = useMemo(() => suggestionValues(data, searchMode), [data, searchMode]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleSuggestions = normalizedQuery
    ? suggestions.filter((item) => item.toLowerCase().includes(normalizedQuery))
    : suggestions;
  const baseSales = useMemo(
    () => salesForMonth(data.sales, month).filter((row) => matchesSales(row, searchMode, query)),
    [data.sales, month, query, searchMode]
  );
  const visibleSales = useMemo(() => applyColumnFilters(baseSales, filters), [baseSales, filters]);
  const visibleClientKeys = useMemo(
    () => new Set(visibleSales.map((row) => row.clientCode || row.unifiedClientCode || row.clientName)),
    [visibleSales]
  );
  const receivables = useMemo(() => data.receivables.filter((row) => {
    if (searchMode === 'brand' || searchMode === 'group') {
      return !query || visibleClientKeys.has(row.clientCode || row.unifiedClientCode || row.clientName);
    }

    if (visibleClientKeys.size > 0 && (Object.keys(filters).length > 0 || query || month)) {
      return visibleClientKeys.has(row.clientCode || row.unifiedClientCode || row.clientName) && matchesReceivables(row, searchMode, query);
    }

    return matchesReceivables(row, searchMode, query);
  }), [data.receivables, filters, month, query, searchMode, visibleClientKeys]);

  const kpis = useMemo(() => dashboardKpis(visibleSales, receivables, data.monthlyPlans, month), [data.monthlyPlans, month, receivables, visibleSales]);
  const topClients = useMemo(() => topClientsByTurnover(visibleSales, 10), [visibleSales]);
  const topClientsChart = useMemo(() => topClients.slice(0, 8).map((row) => ({ name: row.clientName, value: row.turnover })), [topClients]);
  const topBrandsChart = useMemo(() => byTop(visibleSales, (row) => row.brand || 'Без бренду', (row) => row.amountEur, 8), [visibleSales]);
  const topGroupsChart = useMemo(() => byTop(visibleSales, (row) => row.productGroup || 'Без групи', (row) => row.amountEur, 8), [visibleSales]);
  const daily = useMemo(() => dailySalesSeries(visibleSales), [visibleSales]);
  const groupGaps = useMemo(() => clientGroupShareGaps(data.groupPlans, visibleSales), [data.groupPlans, visibleSales]);
  const deficitClients = useMemo(() => groupGaps.filter((row) => row.missingGroups > 0), [groupGaps]);
  const groupShareTargets = useMemo(() => groupPlanAudit(data.groupPlans, visibleSales)
    .filter((row) => row.productGroup !== AGGREGATE_PLAN_GROUP)
    .map((row) => ({
      name: row.productGroup,
      turnover: row.factFromSales,
      targetShare: row.productGroup === PROFIT_GROUP_NAME ? row.planPercent : row.shareOfGrossPlan
    }))
    .sort((a, b) => b.turnover - a.turnover || b.targetShare - a.targetShare)
    .slice(0, 6), [data.groupPlans, visibleSales]);
  const topGroupsPie = useMemo(() => groupShareTargets.map((row) => ({ name: row.name, value: row.turnover })).filter((row) => row.value > 0), [groupShareTargets]);
  const topOverdueClients = useMemo(() => byTop(receivables.filter((row) => row.overdueDebt > 0), (row) => row.clientName, (row) => row.overdueDebt, 8), [receivables]);

  const totalDebt = receivables.reduce((sum, row) => sum + row.totalDebt, 0);
  const share31Plus = receivables.length
    ? (receivables.reduce((sum, row) => sum + row.bucket31Plus, 0) / Math.max(totalDebt, 1)) * 100
    : 0;
  const profitTurnover = useMemo(
    () => visibleSales.filter((row) => normalizeProductGroup(row.brand) === normalizeProductGroup(PROFIT_GROUP_NAME)).reduce((sum, row) => sum + row.amountEur, 0),
    [visibleSales]
  );
  const profitShare = kpis.totalTurnover > 0 ? (profitTurnover / kpis.totalTurnover) * 100 : 0;
  const profitGap = Math.max(PROFIT_PLAN_PERCENT - profitShare, 0);
  const avgMargin = kpis.avgNetMargin;
  const avgDiscount = kpis.avgDiscount;
  const discountThreshold = Math.max(avgDiscount, 8);
  const marginThreshold = avgMargin > 0 ? Math.min(avgMargin, PROFIT_PLAN_PERCENT + 3) : PROFIT_PLAN_PERCENT + 3;
  const riskyRows = useMemo(() => [...visibleSales]
    .filter((row) => row.discountPercent >= discountThreshold || row.netMargin <= marginThreshold)
    .sort((left, right) => (right.discountPercent - left.discountPercent) || (left.netMargin - right.netMargin) || (right.amountEur - left.amountEur))
    .slice(0, 12), [discountThreshold, marginThreshold, visibleSales]);
  const discountPressureTurnover = riskyRows.reduce((sum, row) => sum + row.amountEur, 0);
  const concentrationShare = topClients.length
    ? (topClients.slice(0, 3).reduce((sum, row) => sum + row.turnover, 0) / Math.max(kpis.totalTurnover, 1)) * 100
    : 0;
  const actionSignals: ActionSignal[] = [
    {
      title: 'PROFIT vs ціль',
      value: `${percent(profitShare)} / ${percent(PROFIT_PLAN_PERCENT)}`,
      tone: profitGap > 0 ? 'warning' : 'success',
      description: profitGap > 0
        ? `Бракує ${percent(profitGap)} до цілі PROFIT. Варто підсилити клієнтів, де цей бренд вже присутній або відсутній у планових групах.`
        : 'Ціль PROFIT виконана. Можна втримувати частку та перенести фокус на інші групи.'
    },
    {
      title: 'Cross-sell резерв',
      value: `${deficitClients.length} клієнтів`,
      tone: deficitClients.length ? 'teal' : 'success',
      description: deficitClients.length
        ? `${deficitClients[0]?.clientName || 'Клієнт'} має найбільший дефіцит по планових групах. Це найшвидший простір для допродажу.`
        : 'У видимому зрізі всі активні клієнти вже закривають планові групи без дефіциту.'
    },
    {
      title: 'Знижка тисне на маржу',
      value: money(discountPressureTurnover),
      tone: riskyRows.length ? 'danger' : 'success',
      description: riskyRows.length
        ? `${riskyRows.length} продажів потребують уваги: висока знижка або маржа нижче робочої бази ${percent(marginThreshold)}.`
        : 'Немає рядків, де знижка або маржа зараз виглядають ризиково для цього зрізу.'
    },
    {
      title: 'Дебіторка в продажах',
      value: money(kpis.overdueDebt),
      tone: kpis.overdueDebt > 0 ? 'danger' : 'success',
      description: kpis.overdueDebt > 0
        ? `${topOverdueClients[0]?.name || 'Клієнт'} тримає найбільшу прострочку серед видимих продажів. Є сенс зв'язати продажі з оплатою.`
        : 'Серед видимих клієнтів немає простроченої дебіторки, яка блокує продажну активність.'
    }
  ];

  const suggestedTodos = useMemo(() => {
    const items: SuggestedTodo[] = [];

    if (profitGap > 0) {
      items.push({
        title: `Дотягнути PROFIT до ${percent(PROFIT_PLAN_PERCENT)}`,
        clientName: '',
        tags: ['profit', 'план'],
        priority: 'high'
      });
    }

    if (deficitClients[0]) {
      items.push({
        title: `Розширити матрицю для ${deficitClients[0].clientName}`,
        clientName: deficitClients[0].clientName,
        tags: ['cross-sell', ...deficitClients[0].missingGroupNames.slice(0, 2)],
        priority: 'high'
      });
    }

    if (topOverdueClients[0]) {
      items.push({
        title: `Закрити прострочку по ${topOverdueClients[0].name}`,
        clientName: topOverdueClients[0].name,
        tags: ['дебіторка', 'контроль оплат'],
        priority: 'high'
      });
    }

    if (riskyRows[0]) {
      items.push({
        title: `Перевірити знижку/маржу по ${riskyRows[0].clientName}`,
        clientName: riskyRows[0].clientName,
        tags: ['маржа', riskyRows[0].brand || 'знижка'],
        priority: 'medium'
      });
    }

    return items;
  }, [deficitClients, profitGap, riskyRows, topOverdueClients]);

  const allTodoTags = useMemo(
    () => [...new Set(todos.flatMap((todo) => todo.tags))].sort((a, b) => a.localeCompare(b, 'uk', { sensitivity: 'base' })),
    [todos]
  );
  const filteredTodos = useMemo(() => {
    const normalized = todoSearch.trim().toLowerCase();
    return [...todos]
      .filter((todo) => todoStatusFilter === 'all' || todo.status === todoStatusFilter)
      .filter((todo) => todoPriorityFilter === 'all' || todo.priority === todoPriorityFilter)
      .filter((todo) => todoTagFilter === 'all' || todo.tags.includes(todoTagFilter))
      .filter((todo) => {
        if (!normalized) return true;
        return [todo.title, todo.clientName, todo.tags.join(' ')].join(' ').toLowerCase().includes(normalized);
      })
      .sort((left, right) => {
        if (left.status !== right.status) {
          const leftRank = left.status === 'todo' ? 0 : left.status === 'doing' ? 1 : 2;
          const rightRank = right.status === 'todo' ? 0 : right.status === 'doing' ? 1 : 2;
          return leftRank - rightRank;
        }
        const priorityDelta = todoPriorityWeight(right.priority) - todoPriorityWeight(left.priority);
        if (priorityDelta !== 0) return priorityDelta;
        return right.createdAt.localeCompare(left.createdAt);
      });
  }, [todoPriorityFilter, todoSearch, todoStatusFilter, todoTagFilter, todos]);

  const openTodoCount = todos.filter((todo) => todo.status !== 'done').length;
  const doneTodoCount = todos.filter((todo) => todo.status === 'done').length;
  const completionTone = kpis.grossPlanCompletion >= 100 ? 'success' : kpis.grossPlanCompletion >= 85 ? 'warning' : 'danger';
  const debtTone = kpis.overdueDebt > 0 ? 'danger' : 'success';
  const profitTone = profitGap > 0 ? 'warning' : 'success';

  function handleFilterChange(columnId: string, values: string[]) {
    setFilters((current) => ({ ...current, [columnId]: values }));
  }

  function addTodo(todo: SuggestedTodo) {
    setTodos((current) => [
      {
        id: createTodoId(),
        title: todo.title.trim(),
        clientName: todo.clientName.trim(),
        tags: todo.tags.filter(Boolean),
        priority: todo.priority,
        status: 'todo',
        createdAt: new Date().toISOString()
      },
      ...current
    ]);
  }

  function submitTodo() {
    if (!todoDraft.title.trim()) return;
    addTodo({
      title: todoDraft.title,
      clientName: todoDraft.clientName,
      tags: parseTags(todoDraft.tags),
      priority: todoDraft.priority
    });
    setTodoDraft({ title: '', clientName: '', tags: '', priority: 'medium' });
  }

  function updateTodoStatus(id: string) {
    setTodos((current) => current.map((todo) => todo.id === id ? { ...todo, status: nextStatus(todo.status) } : todo));
  }

  function removeTodo(id: string) {
    setTodos((current) => current.filter((todo) => todo.id !== id));
  }

  if (!month) {
    return (
      <div className="rounded-[18px] border border-line bg-[rgba(10,18,33,0.94)] p-6 text-sm text-muted">
        Немає оброблених Excel-даних для побудови продажного dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="filter-bar">
        <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_auto]">
          <label className="grid gap-2">
            <span className="filter-label">Місяць</span>
            <select className="filter-select" onChange={(event) => setMonth(event.target.value)} value={month}>
              {months.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <div className={`search-shell grid gap-2 ${searchOpen ? 'search-shell-open' : ''}`} ref={searchRef}>
            <span className="filter-label">Пошук</span>
            <div className="relative">
              <input
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                className="filter-input"
                inputMode="search"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder={`Фільтр за полем: ${searchModes.find((item) => item.value === searchMode)?.label.toLowerCase()}`}
                spellCheck={false}
                value={query}
              />
              {searchOpen && visibleSuggestions.length ? (
                <div className="search-suggestion-popover">
                  <div className={`search-suggestion-grid ${searchMode === 'group' || searchMode === 'brand' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2'}`}>
                    {visibleSuggestions.map((item) => (
                      <button
                        className="search-suggestion-option"
                        key={item}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setQuery(item);
                          setSearchOpen(false);
                        }}
                        type="button"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="grid gap-2">
            <span className="filter-label">Режим</span>
            <div className="flex flex-wrap gap-2">
              {searchModes.map((item) => (
                <button
                  className={`filter-pill ${searchMode === item.value ? 'filter-pill-active' : ''}`}
                  key={item.value}
                  onClick={() => {
                    setSearchMode(item.value);
                    setSearchOpen(true);
                  }}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard hint={`Видимий оборот за ${month}`} title="Оборот зрізу" tone="info" value={money(kpis.totalTurnover)} />
        <KpiCard hint={`Планова база: ${money(kpis.planTurnover)} з планом ${money(kpis.grossPlan)}`} title="Валовий план" tone={completionTone} value={percent(kpis.grossPlanCompletion)} />
        <KpiCard hint={`Ціль PROFIT: ${percent(PROFIT_PLAN_PERCENT)}`} title="Частка PROFIT" tone={profitTone} value={percent(profitShare)} />
        <KpiCard hint={`Робоча база маржі в цьому зрізі`} title="Середня маржа" tone="teal" value={percent(avgMargin)} />
        <KpiCard hint={`Високі знижки починаються від ${percent(discountThreshold)}`} title="Середня знижка" tone={avgDiscount >= 8 ? 'warning' : 'success'} value={percent(avgDiscount)} />
        <KpiCard hint={`31+ днів: ${percent(share31Plus)} від дебіторки видимих клієнтів`} title="Прострочена дебіторка" tone={debtTone} value={money(kpis.overdueDebt)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DailySalesChart data={daily} title={`Щоденна динаміка продажів за ${month}`} />
        <SimpleBarChart data={topClientsChart} title="Топ клієнтів за оборотом" valueLabel="Оборот" />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <SimpleBarChart data={topBrandsChart} title="Топ брендів" valueLabel="Оборот" />
        <SimpleBarChart data={topGroupsChart} title="Топ товарних груп" valueLabel="Оборот" />
        <SimplePieChart data={topGroupsPie} title="Структура груп" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="panel-card p-4">
          <div className="mb-1 text-sm font-semibold text-white">Робочі сигнали для росту</div>
          <div className="text-xs text-muted">Тут зібрані показники, які найбільше впливають на план, cross-sell, контроль знижок і оплат.</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {actionSignals.map((signal) => (
              <div className="insight-tile" key={signal.title}>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">{signal.title}</div>
                <div className={`mt-2 text-2xl font-black ${
                  signal.tone === 'danger'
                    ? 'text-[var(--danger)]'
                    : signal.tone === 'warning'
                      ? 'text-[var(--warning)]'
                      : signal.tone === 'success'
                        ? 'text-[var(--success)]'
                        : 'text-[var(--accent-2)]'
                }`}
                >
                  {signal.value}
                </div>
                <div className="mt-2 text-sm leading-6 text-muted">{signal.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card p-4">
          <div className="mb-1 text-sm font-semibold text-white">На чому легко втратити темп</div>
          <div className="text-xs text-muted">Концентрація на кількох клієнтах, борги та агресивні знижки найчастіше з'їдають підсумковий результат ще до кінця місяця.</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="soft-panel p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">Топ-3 клієнти</div>
              <div className="mt-2 text-2xl font-black text-white">{percent(concentrationShare)}</div>
              <div className="mt-2 text-sm text-muted">Частка обороту трьох найбільших клієнтів. Чим вона вища, тим сильніше результат залежить від одного сегмента.</div>
            </div>
            <div className="soft-panel p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">Рядки під тиском</div>
              <div className="mt-2 text-2xl font-black text-white">{String(riskyRows.length)}</div>
              <div className="mt-2 text-sm text-muted">Продажі з високою знижкою або низькою маржею. Це найпростіша точка для ручного рев'ю перед закриттям місяця.</div>
            </div>
            <div className="soft-panel p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">Клієнти з дефіцитом</div>
              <div className="mt-2 text-2xl font-black text-white">{String(deficitClients.length)}</div>
              <div className="mt-2 text-sm text-muted">Кого варто вести в ширину: саме там зростає шанс підняти і оборот, і частку планових груп без пошуку нових клієнтів.</div>
            </div>
            <div className="soft-panel p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">Видима дебіторка</div>
              <div className="mt-2 text-2xl font-black text-white">{money(totalDebt)}</div>
              <div className="mt-2 text-sm text-muted">Сума всієї дебіторки по клієнтах у цьому продажному зрізі. Добре допомагає не втратити контроль між активністю і оплатами.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="panel-card p-4">
          <div className="mb-1 text-sm font-semibold text-white">Клієнти для допродажу і розширення матриці</div>
          <div className="text-xs text-muted">Найкращі кандидати, де планові групи ще не закриті. Рядок можна розгорнути, щоб побачити, що вже купують і чого бракує.</div>
          <div className="mt-4">
            <DataTable
              columns={opportunityColumns}
              data={deficitClients.slice(0, 12)}
              initialSorting={[{ id: 'missingPlanShare', desc: true }]}
              maxHeightClassName="max-h-[30rem]"
              renderExpandedRow={(row) => (
                <div className="grid gap-4 rounded-[14px] border border-line bg-[rgba(15,25,45,0.92)] p-4">
                  <div className="text-sm text-white">
                    <strong>{row.clientName}</strong> ({row.clientCode || row.unifiedClientCode || 'без коду'})
                  </div>
                  <div className="text-sm text-muted">
                    Покрита частка плану: <span className="font-semibold text-white">{percent(row.coveredPlanShare)}</span>.
                    {' '}
                    Втрачена частка: <span className="font-semibold text-white">{percent(row.missingPlanShare)}</span>.
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Вже купує</div>
                      <div className="flex flex-wrap gap-2">
                        {row.coveredGroupStats.map((item) => (
                          <span className="rounded-[10px] border border-line bg-[rgba(78,161,255,0.12)] px-3 py-2 text-xs text-white" key={`${row.clientName}-${item.name}`}>
                            {item.name}: {money(item.amount)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Що відкрити</div>
                      <div className="flex flex-wrap gap-2">
                        {row.missingGroupStats.map((item) => (
                          <span className="rounded-[10px] border border-line bg-[rgba(251,113,133,0.12)] px-3 py-2 text-xs text-white" key={`${row.clientName}-${item.name}`}>
                            {item.name}: {percent(item.planShare)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            />
          </div>
        </div>

        <div className="panel-card p-4">
          <div className="mb-1 text-sm font-semibold text-white">Продажі, де маржа або знижка потребують уваги</div>
          <div className="text-xs text-muted">Це не помилки автоматично, а короткий робочий список для перевірки домовленостей, умов і потенціалу перегляду ціни.</div>
          <div className="mt-4">
            <DataTable
              columns={riskColumns}
              data={riskyRows}
              initialSorting={[{ id: 'discountPercent', desc: true }]}
              maxHeightClassName="max-h-[30rem]"
            />
          </div>
        </div>
      </section>

      <section className="panel-card p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold text-white">Dashboard + todo-лист продажів</div>
            <div className="mt-1 text-xs leading-6 text-muted">Todo зберігається локально в браузері. Можна швидко завести задачі з аналітики, помітити їх тегами та фільтрувати за пріоритетом, статусом або клієнтом.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-[10px] border border-[rgba(78,161,255,0.42)] bg-[rgba(78,161,255,0.16)] px-3 py-2 text-xs font-semibold text-white">Активні: {openTodoCount}</span>
            <span className="rounded-[10px] border border-[rgba(52,211,153,0.42)] bg-[rgba(52,211,153,0.14)] px-3 py-2 text-xs font-semibold text-[var(--success)]">Готово: {doneTodoCount}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-4">
            <div className="soft-panel p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Швидке додавання</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input
                  className="filter-input"
                  onChange={(event) => setTodoDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Назва задачі"
                  value={todoDraft.title}
                />
                <input
                  className="filter-input"
                  onChange={(event) => setTodoDraft((current) => ({ ...current, clientName: event.target.value }))}
                  placeholder="Клієнт або сегмент"
                  value={todoDraft.clientName}
                />
                <input
                  className="filter-input md:col-span-2"
                  onChange={(event) => setTodoDraft((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="Теги через кому: profit, дебіторка, cross-sell"
                  value={todoDraft.tags}
                />
              </div>
              <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <label className="grid gap-2 md:min-w-[220px]">
                  <span className="filter-label">Пріоритет</span>
                  <select
                    className="filter-select"
                    onChange={(event) => setTodoDraft((current) => ({ ...current, priority: event.target.value as TodoPriority }))}
                    value={todoDraft.priority}
                  >
                    {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <button
                  className="rounded-[12px] border border-[rgba(78,161,255,0.42)] bg-[rgba(78,161,255,0.16)] px-4 py-3 text-sm font-semibold text-white transition hover:border-[rgba(78,161,255,0.56)] hover:bg-[rgba(78,161,255,0.22)]"
                  onClick={submitTodo}
                  type="button"
                >
                  Додати задачу
                </button>
              </div>
            </div>

            <div className="soft-panel p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Швидкі задачі з аналітики</div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {suggestedTodos.map((todo) => (
                  <button
                    className="rounded-[12px] border border-line bg-[rgba(8,15,28,0.72)] p-3 text-left transition hover:border-[rgba(78,161,255,0.38)] hover:bg-[rgba(78,161,255,0.1)]"
                    key={`${todo.title}-${todo.clientName}`}
                    onClick={() => addTodo(todo)}
                    type="button"
                  >
                    <div className="text-sm font-semibold text-white">{todo.title}</div>
                    <div className="mt-1 text-xs text-muted">{todo.clientName || 'Загальна задача'} · {priorityLabels[todo.priority]}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {todo.tags.map((tag) => (
                        <span className="rounded-[999px] border border-line px-2 py-1 text-[11px] text-muted" key={`${todo.title}-${tag}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="soft-panel p-4">
              <div className="grid gap-3">
                <input
                  className="filter-input"
                  onChange={(event) => setTodoSearch(event.target.value)}
                  placeholder="Пошук по задачах, клієнту або тегах"
                  value={todoSearch}
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <select className="filter-select" onChange={(event) => setTodoStatusFilter(event.target.value as TodoStatus | 'all')} value={todoStatusFilter}>
                    {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <select className="filter-select" onChange={(event) => setTodoPriorityFilter(event.target.value as TodoPriority | 'all')} value={todoPriorityFilter}>
                    <option value="all">Усі пріоритети</option>
                    {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <select className="filter-select" onChange={(event) => setTodoTagFilter(event.target.value)} value={todoTagFilter}>
                    <option value="all">Усі теги</option>
                    {allTodoTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {filteredTodos.length ? filteredTodos.map((todo) => (
                <div className="soft-panel p-4" key={todo.id}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">{todo.title}</div>
                      <div className="mt-1 text-xs text-muted">
                        {todo.clientName ? `${todo.clientName} · ` : ''}
                        Створено {new Date(todo.createdAt).toLocaleString('uk-UA')}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-[999px] border px-2 py-1 text-[11px] font-semibold ${statusBadgeClassName(todo.status)}`}>{statusLabels[todo.status]}</span>
                      <span className={`rounded-[999px] border px-2 py-1 text-[11px] font-semibold ${priorityBadgeClassName(todo.priority)}`}>{priorityLabels[todo.priority]}</span>
                    </div>
                  </div>
                  {todo.tags.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {todo.tags.map((tag) => (
                        <button
                          className={`rounded-[999px] border px-2 py-1 text-[11px] transition ${
                            todoTagFilter === tag
                              ? 'border-[rgba(78,161,255,0.42)] bg-[rgba(78,161,255,0.16)] text-white'
                              : 'border-line bg-[rgba(8,15,28,0.72)] text-muted hover:text-white'
                          }`}
                          key={`${todo.id}-${tag}`}
                          onClick={() => setTodoTagFilter((current) => current === tag ? 'all' : tag)}
                          type="button"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="rounded-[10px] border border-[rgba(78,161,255,0.42)] bg-[rgba(78,161,255,0.16)] px-3 py-2 text-xs font-semibold text-white transition hover:border-[rgba(78,161,255,0.56)]"
                      onClick={() => updateTodoStatus(todo.id)}
                      type="button"
                    >
                      Перемкнути: {statusLabels[nextStatus(todo.status)]}
                    </button>
                    <button
                      className="rounded-[10px] border border-[rgba(251,113,133,0.32)] bg-[rgba(251,113,133,0.12)] px-3 py-2 text-xs font-semibold text-[var(--danger)] transition hover:border-[rgba(251,113,133,0.5)]"
                      onClick={() => removeTodo(todo.id)}
                      type="button"
                    >
                      Видалити
                    </button>
                  </div>
                </div>
              )) : (
                <div className="rounded-[18px] border border-dashed border-line bg-[rgba(10,18,33,0.88)] p-5 text-sm text-muted">
                  Немає задач за активними фільтрами. Можна швидко створити задачу вручну або одним кліком з блоку вище.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="panel-card p-4">
        <div className="mb-1 text-sm font-semibold text-white">Усі продажі в активному зрізі</div>
        <div className="text-xs text-muted">Графіки, KPI і таблиця дивляться на один і той самий filtered dataset: місяць, глобальний пошук і column filters більше не розходяться.</div>
        <div className="mt-4">
          <DataTable
            activeFilters={filters}
            columns={salesColumns}
            data={baseSales}
            initialSorting={[{ id: 'clientCode', desc: false }, { id: 'date', desc: false }]}
            maxHeightClassName="max-h-[42rem]"
            onFilterChange={handleFilterChange}
          />
        </div>
      </section>
    </div>
  );
}
