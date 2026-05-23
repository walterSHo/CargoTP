'use client';

import { useEffect, useMemo, useState } from 'react';
import { PROFIT_PLAN_PERCENT } from '@/lib/constants';
import { byTop, clientGroupShareGaps, profitClientPenetration, salesForMonth } from '@/lib/analytics';
import { percent } from '@/lib/format';
import { normalizeProductGroup } from '@/lib/product-groups';
import type { ProcessedData, ReceivableRecord, SalesRecord } from '@/lib/types';

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

type SuggestedTodo = {
  title: string;
  clientName: string;
  tags: string[];
  priority: TodoPriority;
};

const TODO_STORAGE_KEY = 'cargotp-sales-todos-v1';

const priorityOptions: Array<{ value: TodoPriority; label: string }> = [
  { value: 'high', label: 'Високий' },
  { value: 'medium', label: 'Середній' },
  { value: 'low', label: 'Низький' }
];

const priorityLabels: Record<TodoPriority, string> = {
  high: 'Високий',
  medium: 'Середній',
  low: 'Низький'
};

const statusLabels: Record<TodoStatus, string> = {
  todo: 'До роботи',
  doing: 'В процесі',
  done: 'Готово'
};

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

function loadTodos(): SalesTodo[] {
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

function priorityBadgeClassName(priority: TodoPriority) {
  if (priority === 'high') return 'border-[rgba(251,113,133,0.4)] bg-[rgba(251,113,133,0.14)] text-[var(--danger)]';
  if (priority === 'low') return 'border-line bg-[rgba(8,15,28,0.72)] text-muted';
  return 'border-[rgba(45,212,191,0.4)] bg-[rgba(45,212,191,0.14)] text-[var(--accent-2)]';
}

function statusBadgeClassName(status: TodoStatus) {
  if (status === 'done') return 'border-[rgba(52,211,153,0.4)] bg-[rgba(52,211,153,0.14)] text-[var(--success)]';
  if (status === 'doing') return 'border-[rgba(245,158,11,0.42)] bg-[rgba(245,158,11,0.14)] text-[var(--warning)]';
  return 'border-[rgba(78,161,255,0.42)] bg-[rgba(78,161,255,0.16)] text-white';
}

function matchesReceivables(row: ReceivableRecord, clientKeys: Set<string>) {
  return clientKeys.has(row.clientCode || row.unifiedClientCode || row.clientName);
}

function isProfitSale(row: SalesRecord) {
  return normalizeProductGroup(row.brand) === normalizeProductGroup('profit');
}

export function TodoBoardClient({ data }: { data: ProcessedData }) {
  const months = useMemo(() => [...new Set(data.sales.map((row) => row.date.slice(0, 7)))].sort().reverse(), [data.sales]);
  const [month, setMonth] = useState(months[0] ?? '');
  const [todos, setTodos] = useState<SalesTodo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState({ title: '', clientName: '', tags: '', priority: 'medium' as TodoPriority });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TodoStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TodoPriority | 'all'>('all');
  const [tagFilter, setTagFilter] = useState('all');

  useEffect(() => {
    setTodos(loadTodos());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || typeof window === 'undefined') return;
    window.localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
  }, [loaded, todos]);

  const monthSales = useMemo(() => salesForMonth(data.sales, month), [data.sales, month]);
  const clientKeys = useMemo(() => new Set(monthSales.map((row) => row.clientCode || row.unifiedClientCode || row.clientName)), [monthSales]);
  const receivables = useMemo(() => data.receivables.filter((row) => matchesReceivables(row, clientKeys)), [clientKeys, data.receivables]);
  const deficitClients = useMemo(() => clientGroupShareGaps(data.groupPlans, monthSales).filter((row) => row.missingGroups > 0), [data.groupPlans, monthSales]);
  const profitClients = useMemo(() => profitClientPenetration(monthSales, 12), [monthSales]);
  const topOverdueClients = useMemo(() => byTop(receivables.filter((row) => row.overdueDebt > 0), (row) => row.clientName, (row) => row.overdueDebt, 8), [receivables]);
  const profitTurnover = useMemo(() => monthSales.filter(isProfitSale).reduce((sum, row) => sum + row.amountEur, 0), [monthSales]);
  const totalTurnover = useMemo(() => monthSales.reduce((sum, row) => sum + row.amountEur, 0), [monthSales]);
  const profitShare = totalTurnover > 0 ? (profitTurnover / totalTurnover) * 100 : 0;
  const profitGap = Math.max(PROFIT_PLAN_PERCENT - profitShare, 0);

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

    const noProfitClient = profitClients.find((row) => !row.hasProfit);
    if (noProfitClient) {
      items.push({
        title: `Запустити PROFIT у ${noProfitClient.clientName}`,
        clientName: noProfitClient.clientName,
        tags: ['profit', 'penetration'],
        priority: 'high'
      });
    }

    if (topOverdueClients[0]) {
      items.push({
        title: `Закрити прострочку по ${topOverdueClients[0].name}`,
        clientName: topOverdueClients[0].name,
        tags: ['дебіторка', 'контроль оплат'],
        priority: 'medium'
      });
    }

    return items;
  }, [deficitClients, profitClients, profitGap, topOverdueClients]);

  const allTags = useMemo(
    () => [...new Set(todos.flatMap((todo) => todo.tags))].sort((a, b) => a.localeCompare(b, 'uk', { sensitivity: 'base' })),
    [todos]
  );

  const filteredTodos = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return todos
      .filter((todo) => statusFilter === 'all' || todo.status === statusFilter)
      .filter((todo) => priorityFilter === 'all' || todo.priority === priorityFilter)
      .filter((todo) => tagFilter === 'all' || todo.tags.includes(tagFilter))
      .filter((todo) => !normalized || [todo.title, todo.clientName, todo.tags.join(' ')].join(' ').toLowerCase().includes(normalized));
  }, [priorityFilter, search, statusFilter, tagFilter, todos]);

  const lanes: TodoStatus[] = ['todo', 'doing', 'done'];

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
    if (!draft.title.trim()) return;
    addTodo({
      title: draft.title,
      clientName: draft.clientName,
      tags: parseTags(draft.tags),
      priority: draft.priority
    });
    setDraft({ title: '', clientName: '', tags: '', priority: 'medium' });
  }

  function updateTodoStatus(id: string) {
    setTodos((current) => current.map((todo) => todo.id === id ? { ...todo, status: nextStatus(todo.status) } : todo));
  }

  function removeTodo(id: string) {
    setTodos((current) => current.filter((todo) => todo.id !== id));
  }

  if (!month) {
    return <div className="rounded-[18px] border border-line bg-[rgba(10,18,33,0.94)] p-6 text-sm text-muted">Немає оброблених Excel-даних для todo-дошки.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="filter-bar">
        <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_220px_220px_220px]">
          <label className="grid gap-2">
            <span className="filter-label">Місяць</span>
            <select className="filter-select" onChange={(event) => setMonth(event.target.value)} value={month}>
              {months.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="filter-label">Пошук</span>
            <input className="filter-input" onChange={(event) => setSearch(event.target.value)} placeholder="Пошук по задачах, клієнту або тегах" value={search} />
          </label>
          <label className="grid gap-2">
            <span className="filter-label">Пріоритет</span>
            <select className="filter-select" onChange={(event) => setPriorityFilter(event.target.value as TodoPriority | 'all')} value={priorityFilter}>
              <option value="all">Усі пріоритети</option>
              {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="filter-label">Статус</span>
            <select className="filter-select" onChange={(event) => setStatusFilter(event.target.value as TodoStatus | 'all')} value={statusFilter}>
              <option value="all">Усі статуси</option>
              <option value="todo">До роботи</option>
              <option value="doing">В процесі</option>
              <option value="done">Готово</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="filter-label">Тег</span>
            <select className="filter-select" onChange={(event) => setTagFilter(event.target.value)} value={tagFilter}>
              <option value="all">Усі теги</option>
              {allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="page-hero motion-fade-up">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="signal-chip">
              <strong>Action board</strong>
              <span>To do / In progress / Done</span>
            </div>
            <h2 className="hero-title">Todo став окремим operational workspace, де аналітичні сигнали можна відразу перевести в задачі для команди.</h2>
            <p className="hero-note">
              Тут зібрані quick add, теги, пріоритети, пошук і задачі з аналітики по PROFIT, cross-sell та дебіторці.
              Візуальна логіка та поверхні синхронізовані з основним dashboard.
            </p>
            <div className="hero-chip-row">
              <span className="signal-chip"><strong>{suggestedTodos.length}</strong><span>підказок з аналітики</span></span>
              <span className="signal-chip"><strong>{todos.length}</strong><span>усього задач</span></span>
              <span className="signal-chip"><strong>{percent(profitShare)}</strong><span>поточна частка PROFIT</span></span>
            </div>
          </div>
          <div className="hero-side">
            <div className="metric-card metric-card-compact">
              <div className="metric-card-label">PROFIT gap</div>
              <div className="metric-card-value">{percent(profitGap)}</div>
              <div className="metric-card-copy">Скільки ще бракує до цільових {percent(PROFIT_PLAN_PERCENT)} у вибраному місяці.</div>
            </div>
            <div className="metric-card metric-card-compact">
              <div className="metric-card-label">Cross-sell клієнти</div>
              <div className="metric-card-value">{deficitClients.length}</div>
              <div className="metric-card-copy">Клієнтів з незакритою матрицею, які можна одразу перетворити в наступні кроки.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="panel-card p-4">
          <div className="text-sm font-semibold text-white">Швидке додавання</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input className="filter-input" onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Назва задачі" value={draft.title} />
            <input className="filter-input" onChange={(event) => setDraft((current) => ({ ...current, clientName: event.target.value }))} placeholder="Клієнт або сегмент" value={draft.clientName} />
            <input className="filter-input md:col-span-2" onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="Теги через кому: profit, дебіторка, cross-sell" value={draft.tags} />
          </div>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="grid gap-2 md:min-w-[220px]">
              <span className="filter-label">Пріоритет</span>
              <select className="filter-select" onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as TodoPriority }))} value={draft.priority}>
                {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <button className="rounded-[12px] border border-[rgba(78,161,255,0.42)] bg-[rgba(78,161,255,0.16)] px-4 py-3 text-sm font-semibold text-white transition hover:border-[rgba(78,161,255,0.56)] hover:bg-[rgba(78,161,255,0.22)]" onClick={submitTodo} type="button">
              Додати задачу
            </button>
          </div>
        </div>

        <div className="panel-card p-4">
          <div className="text-sm font-semibold text-white">Швидкі задачі з аналітики</div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {suggestedTodos.length ? suggestedTodos.map((todo) => (
              <button className="rounded-[12px] border border-line bg-[rgba(8,15,28,0.72)] p-3 text-left transition hover:border-[rgba(78,161,255,0.38)] hover:bg-[rgba(78,161,255,0.1)]" key={`${todo.title}-${todo.clientName}`} onClick={() => addTodo(todo)} type="button">
                <div className="text-sm font-semibold text-white">{todo.title}</div>
                <div className="mt-1 text-xs text-muted">{todo.clientName || 'Загальна задача'} · {priorityLabels[todo.priority]}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {todo.tags.map((tag) => (
                    <span className="rounded-[999px] border border-line px-2 py-1 text-[11px] text-muted" key={`${todo.title}-${tag}`}>{tag}</span>
                  ))}
                </div>
              </button>
            )) : (
              <div className="rounded-[18px] border border-dashed border-line bg-[rgba(10,18,33,0.88)] p-5 text-sm text-muted md:col-span-2">
                Немає автоматичних задач для цього зрізу. Можна створити власну задачу вручну.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="todo-board-grid">
        {lanes.map((status) => {
          const laneRows = filteredTodos.filter((todo) => todo.status === status);
          return (
            <div className="todo-lane" key={status}>
              <div className="todo-lane-header">
                <div>
                  <div className="text-sm font-semibold text-white">{statusLabels[status]}</div>
                  <div className="text-xs text-muted">Задач: {laneRows.length}</div>
                </div>
                <span className={`rounded-[999px] border px-2 py-1 text-[11px] font-semibold ${statusBadgeClassName(status)}`}>{statusLabels[status]}</span>
              </div>
              <div className="todo-lane-list">
                {laneRows.length ? laneRows.map((todo) => (
                  <div className="soft-panel p-4" key={todo.id}>
                    <div className="flex flex-col gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{todo.title}</div>
                        <div className="mt-1 text-xs text-muted">
                          {todo.clientName ? `${todo.clientName} · ` : ''}
                          Створено {new Date(todo.createdAt).toLocaleString('uk-UA')}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-[999px] border px-2 py-1 text-[11px] font-semibold ${priorityBadgeClassName(todo.priority)}`}>{priorityLabels[todo.priority]}</span>
                        {todo.tags.map((tag) => (
                          <button className={`rounded-[999px] border px-2 py-1 text-[11px] transition ${tagFilter === tag ? 'border-[rgba(78,161,255,0.42)] bg-[rgba(78,161,255,0.16)] text-white' : 'border-line bg-[rgba(8,15,28,0.72)] text-muted hover:text-white'}`} key={`${todo.id}-${tag}`} onClick={() => setTagFilter((current) => current === tag ? 'all' : tag)} type="button">
                            {tag}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-[10px] border border-[rgba(78,161,255,0.42)] bg-[rgba(78,161,255,0.16)] px-3 py-2 text-xs font-semibold text-white transition hover:border-[rgba(78,161,255,0.56)]" onClick={() => updateTodoStatus(todo.id)} type="button">
                          Перемкнути: {statusLabels[nextStatus(todo.status)]}
                        </button>
                        <button className="rounded-[10px] border border-[rgba(251,113,133,0.32)] bg-[rgba(251,113,133,0.12)] px-3 py-2 text-xs font-semibold text-[var(--danger)] transition hover:border-[rgba(251,113,133,0.5)]" onClick={() => removeTodo(todo.id)} type="button">
                          Видалити
                        </button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="todo-lane-empty">Немає задач у цій колонці за активними фільтрами.</div>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
