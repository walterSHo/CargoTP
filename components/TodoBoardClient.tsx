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

function toggleDone(status: TodoStatus): TodoStatus {
  return status === 'done' ? 'todo' : 'done';
}

function priorityBadgeClassName(priority: TodoPriority) {
  if (priority === 'high') return 'border-[rgba(201,107,93,0.42)] bg-[rgba(201,107,93,0.12)] text-[var(--danger)]';
  if (priority === 'low') return 'border-line bg-[var(--panel)] text-muted';
  return 'border-[rgba(192,139,62,0.42)] bg-[rgba(192,139,62,0.12)] text-[var(--warning)]';
}

function statusBadgeClassName(status: TodoStatus) {
  if (status === 'done') return 'border-[rgba(120,166,106,0.42)] bg-[rgba(120,166,106,0.12)] text-[var(--success)]';
  if (status === 'doing') return 'border-[rgba(192,139,62,0.42)] bg-[rgba(192,139,62,0.14)] text-[var(--warning)]';
  return 'border-[rgba(199,181,138,0.42)] bg-[rgba(199,181,138,0.14)] text-white';
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
  const completedCount = todos.filter((todo) => todo.status === 'done').length;

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

  function setTodoStatus(id: string, status: TodoStatus) {
    setTodos((current) => current.map((todo) => todo.id === id ? { ...todo, status } : todo));
  }

  function removeTodo(id: string) {
    setTodos((current) => current.filter((todo) => todo.id !== id));
  }

  if (!month) {
    return <div className="border border-line bg-[var(--panel)] p-6 text-sm text-muted">Немає оброблених Excel-даних для класичного todo-списку.</div>;
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

      <section className="metric-strip motion-fade-up">
        <div className="metric-strip-item">
          <div className="metric-strip-label">Активні задачі</div>
          <div className="metric-strip-value">{todos.length - completedCount}</div>
          <div className="metric-strip-copy">У роботі або в черзі</div>
        </div>
        <div className="metric-strip-item">
          <div className="metric-strip-label">Підказки</div>
          <div className="metric-strip-value">{suggestedTodos.length}</div>
          <div className="metric-strip-copy">Автоматичні задачі з аналітики</div>
        </div>
        <div className="metric-strip-item">
          <div className="metric-strip-label">PROFIT gap</div>
          <div className="metric-strip-value">{percent(profitGap)}</div>
          <div className="metric-strip-copy">До цільових {percent(PROFIT_PLAN_PERCENT)}</div>
        </div>
      </section>

      <section className="todo-shell">
        <div className="todo-main">
          <div className="panel-card p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Швидке додавання</div>
                <div className="mt-1 text-xs text-muted">Короткий класичний ввід: задача, клієнт, теги і пріоритет.</div>
              </div>
              <span className="text-xs font-semibold text-muted">PROFIT: <span className="text-white">{percent(profitShare)}</span></span>
            </div>
            <div className="todo-quick-grid mt-3">
              <input className="filter-input" onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Назва задачі" value={draft.title} />
              <input className="filter-input" onChange={(event) => setDraft((current) => ({ ...current, clientName: event.target.value }))} placeholder="Клієнт або сегмент" value={draft.clientName} />
              <input className="filter-input md:col-span-2" onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="Теги через кому: profit, дебіторка, cross-sell" value={draft.tags} />
            </div>
            <div className="mt-3 flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
              <label className="grid gap-2 md:min-w-[220px]">
                <span className="filter-label">Пріоритет</span>
                <select className="filter-select" onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as TodoPriority }))} value={draft.priority}>
                  {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <button className="border border-[rgba(199,181,138,0.42)] bg-[rgba(199,181,138,0.14)] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-[rgba(199,181,138,0.56)] hover:bg-[rgba(199,181,138,0.2)]" onClick={submitTodo} type="button">
                Додати задачу
              </button>
            </div>
          </div>

          <div className="todo-list-shell">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Список задач</div>
                <div className="mt-1 text-xs text-muted">Компактні секції по статусах і короткі дії прямо в рядку.</div>
              </div>
              <span className="text-xs text-muted">Показано: {filteredTodos.length}</span>
            </div>
            <div className="mt-4 grid gap-4">
              {lanes.map((status) => {
                const laneRows = filteredTodos.filter((todo) => todo.status === status);
                return (
                  <section className="todo-section" key={status}>
                    <div className="todo-section-header">
                      <div>
                        <div className="todo-section-title">{statusLabels[status]}</div>
                        <div className="todo-section-meta">Задач: {laneRows.length}</div>
                      </div>
                      <span className={`border px-2 py-1 text-[11px] font-semibold ${statusBadgeClassName(status)}`}>{statusLabels[status]}</span>
                    </div>
                    {laneRows.length ? laneRows.map((todo) => (
                      <article className="todo-row" key={todo.id}>
                        <div className="todo-row-main">
                          <button
                            aria-label={todo.status === 'done' ? 'Повернути в роботу' : 'Позначити як готово'}
                            className={`todo-row-check ${todo.status === 'done' ? 'todo-row-check-done' : ''}`}
                            onClick={() => setTodoStatus(todo.id, toggleDone(todo.status))}
                            type="button"
                          >
                            {todo.status === 'done' ? '✓' : '○'}
                          </button>
                          <div className="todo-row-copy">
                            <div className="todo-row-title">{todo.title}</div>
                            <div className="todo-row-note">
                              {todo.clientName ? `${todo.clientName} · ` : ''}
                              Створено {new Date(todo.createdAt).toLocaleString('uk-UA')}
                            </div>
                            <div className="todo-row-meta">
                              <span className={`border px-2 py-1 text-[11px] font-semibold ${priorityBadgeClassName(todo.priority)}`}>{priorityLabels[todo.priority]}</span>
                              {todo.tags.map((tag) => (
                                <button className={`border px-2 py-1 text-[11px] transition ${tagFilter === tag ? 'border-[rgba(199,181,138,0.42)] bg-[rgba(199,181,138,0.14)] text-white' : 'border-line bg-[rgba(20,19,16,0.9)] text-muted hover:text-white'}`} key={`${todo.id}-${tag}`} onClick={() => setTagFilter((current) => current === tag ? 'all' : tag)} type="button">
                                  {tag}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="todo-row-actions">
                          {todo.status !== 'todo' ? (
                            <button className="todo-action-button border-line bg-[rgba(20,19,16,0.9)] text-muted hover:text-white" onClick={() => setTodoStatus(todo.id, 'todo')} type="button">
                              До роботи
                            </button>
                          ) : null}
                          {todo.status !== 'doing' ? (
                            <button className="todo-action-button border-[rgba(192,139,62,0.28)] bg-[rgba(192,139,62,0.1)] text-[var(--warning)] hover:border-[rgba(192,139,62,0.44)]" onClick={() => setTodoStatus(todo.id, 'doing')} type="button">
                              В процес
                            </button>
                          ) : null}
                          {todo.status !== 'done' ? (
                            <button className="todo-action-button border-[rgba(120,166,106,0.32)] bg-[rgba(120,166,106,0.1)] text-[var(--success)] hover:border-[rgba(120,166,106,0.48)]" onClick={() => setTodoStatus(todo.id, 'done')} type="button">
                              Готово
                            </button>
                          ) : null}
                          <button className="todo-action-button border-[rgba(201,107,93,0.32)] bg-[rgba(201,107,93,0.12)] text-[var(--danger)] hover:border-[rgba(201,107,93,0.5)]" onClick={() => removeTodo(todo.id)} type="button">
                            Видалити
                          </button>
                        </div>
                      </article>
                    )) : (
                      <div className="todo-empty">У цій секції немає задач за активними фільтрами.</div>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="todo-sidebar">
          <div className="panel-card p-3.5">
            <div className="text-sm font-semibold text-white">Швидкі задачі з аналітики</div>
            <div className="mt-1 text-xs text-muted">Додаються одним кліком без ручного набору.</div>
            <div className="mt-3 grid gap-2">
              {suggestedTodos.length ? suggestedTodos.map((todo) => (
                <button className="border border-line bg-[rgba(20,19,16,0.9)] p-3 text-left transition hover:border-[rgba(199,181,138,0.38)] hover:bg-[rgba(199,181,138,0.1)]" key={`${todo.title}-${todo.clientName}`} onClick={() => addTodo(todo)} type="button">
                  <div className="text-sm font-semibold text-white">{todo.title}</div>
                  <div className="mt-1 text-xs text-muted">{todo.clientName || 'Загальна задача'} · {priorityLabels[todo.priority]}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {todo.tags.map((tag) => (
                      <span className="border border-line px-2 py-1 text-[11px] text-muted" key={`${todo.title}-${tag}`}>{tag}</span>
                    ))}
                  </div>
                </button>
              )) : (
                <div className="todo-empty">Немає автоматичних задач для цього зрізу. Можна створити власну задачу вручну.</div>
              )}
            </div>
          </div>

          <div className="todo-list-shell">
            <div className="text-sm font-semibold text-white">Короткий підсумок</div>
            <div className="todo-summary-list mt-3">
              <div className="soft-panel p-3">
                <div className="text-[11px] uppercase tracking-[0.08em] text-muted">Всього задач</div>
                <div className="mt-1 text-lg font-black text-white">{todos.length}</div>
              </div>
              <div className="soft-panel p-3">
                <div className="text-[11px] uppercase tracking-[0.08em] text-muted">Завершено</div>
                <div className="mt-1 text-lg font-black text-white">{completedCount}</div>
              </div>
              <div className="soft-panel p-3">
                <div className="text-[11px] uppercase tracking-[0.08em] text-muted">Cross-sell клієнти</div>
                <div className="mt-1 text-lg font-black text-white">{deficitClients.length}</div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
