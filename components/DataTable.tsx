'use client';

import type { ReactNode } from 'react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from '@tanstack/react-table';

function columnIdOf<T>(column: ColumnDef<T>) {
  if (column.id) return String(column.id);
  if ('accessorKey' in column && typeof column.accessorKey === 'string') return column.accessorKey;
  return '';
}

function columnLabelOf<T>(column: ColumnDef<T>) {
  if (typeof column.header === 'string') return column.header;
  return columnIdOf(column);
}

function columnValueOf<T>(column: ColumnDef<T>, row: T, index: number) {
  if ('accessorFn' in column && typeof column.accessorFn === 'function') return column.accessorFn(row, index);
  if ('accessorKey' in column && typeof column.accessorKey === 'string') return (row as Record<string, unknown>)[column.accessorKey];
  return '';
}

export function DataTable<T>({
  columns,
  data,
  initialSorting = [],
  maxHeightClassName,
  renderExpandedRow,
  filterOptions,
  activeFilters,
  onFilterChange
}: {
  columns: ColumnDef<T>[];
  data: T[];
  initialSorting?: SortingState;
  maxHeightClassName?: string;
  renderExpandedRow?: (row: T) => ReactNode;
  filterOptions?: Record<string, string[]>;
  activeFilters?: Record<string, string[]>;
  onFilterChange?: (columnId: string, values: string[]) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [internalFilters, setInternalFilters] = useState<Record<string, string[]>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ active: boolean; startX: number; startScrollLeft: number }>({ active: false, startX: 0, startScrollLeft: 0 });

  const resolvedFilters = activeFilters ?? internalFilters;

  useEffect(() => {
    if (!openFilterColumn) return;

    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-table-filter-root="true"]')) return;
      setOpenFilterColumn(null);
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openFilterColumn]);

  const derivedFilterOptions = useMemo(() => Object.fromEntries(
    columns.map((column) => {
      const columnId = columnIdOf(column);
      if (!columnId) return ['', []];

      const values = [...new Set(data.map((row, index) => String(columnValueOf(column, row, index) ?? '')).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'uk', { numeric: true, sensitivity: 'base' }));

      return [columnId, values];
    }).filter(([columnId]) => columnId)
  ), [columns, data]);

  const resolvedFilterOptions = useMemo(() => ({ ...derivedFilterOptions, ...filterOptions }), [derivedFilterOptions, filterOptions]);

  const filteredData = useMemo(() => data.filter((row, index) => columns.every((column) => {
    const columnId = columnIdOf(column);
    const selectedValues = resolvedFilters[columnId] ?? [];
    if (!columnId || !selectedValues.length) return true;
    return selectedValues.includes(String(columnValueOf(column, row, index) ?? ''));
  })), [columns, data, resolvedFilters]);

  const activeFilterEntries = useMemo(
    () => Object.entries(resolvedFilters).flatMap(([columnId, values]) => values.map((value) => ({ columnId, value }))),
    [resolvedFilters]
  );

  const columnLabels = useMemo(
    () => Object.fromEntries(columns.map((column) => [columnIdOf(column), columnLabelOf(column)]).filter(([columnId]) => columnId)),
    [columns]
  );

  const filteredOptions = useMemo(() => {
    if (!openFilterColumn) return [];
    const options = resolvedFilterOptions[openFilterColumn] ?? [];
    const query = filterQuery.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option: string) => option.toLowerCase().includes(query));
  }, [filterQuery, openFilterColumn, resolvedFilterOptions]);

  const openFilterLabel = openFilterColumn ? (columnLabels[openFilterColumn] ?? openFilterColumn) : '';

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  function sortLabel(direction: false | 'asc' | 'desc') {
    if (direction === 'asc') return '▲';
    if (direction === 'desc') return '▼';
    return '↕';
  }

  function setFilterValues(columnId: string, values: string[]) {
    if (onFilterChange) onFilterChange(columnId, values);
    else setInternalFilters((current) => ({ ...current, [columnId]: values }));
  }

  function toggleFilter(columnId: string, value: string) {
    const current = new Set(resolvedFilters[columnId] ?? []);
    if (current.has(value)) current.delete(value);
    else current.add(value);
    setFilterValues(columnId, [...current]);
  }

  function clearAllFilters() {
    if (onFilterChange) {
      Object.keys(resolvedFilters).forEach((columnId) => onFilterChange(columnId, []));
      return;
    }
    setInternalFilters({});
  }

  function toggleExpanded(rowId: string) {
    setExpandedRows((current) => ({ ...current, [rowId]: !current[rowId] }));
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    if (!scrollRef.current || target?.closest('button, input, label, a, select, textarea')) return;
    if (scrollRef.current.scrollWidth <= scrollRef.current.clientWidth) return;

    dragStateRef.current = {
      active: true,
      startX: event.clientX,
      startScrollLeft: scrollRef.current.scrollLeft
    };
    scrollRef.current.setPointerCapture(event.pointerId);
    scrollRef.current.classList.add('is-dragging');
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragStateRef.current.active || !scrollRef.current) return;
    const delta = event.clientX - dragStateRef.current.startX;
    scrollRef.current.scrollLeft = dragStateRef.current.startScrollLeft - delta;
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!scrollRef.current) return;
    dragStateRef.current.active = false;
    scrollRef.current.releasePointerCapture(event.pointerId);
    scrollRef.current.classList.remove('is-dragging');
  }

  return (
    <div className="space-y-3">
      {activeFilterEntries.length ? (
        <div className="flex flex-col gap-3 border border-line bg-[var(--panel)] px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-white">
              Показано рядків: <strong>{filteredData.length}</strong> з {data.length}
            </div>
            <button className="self-start text-sm font-semibold text-[var(--muted)] transition hover:text-white" onClick={clearAllFilters} type="button">
              Очистити всі фільтри
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeFilterEntries.map(({ columnId, value }) => (
              <button
                className="inline-flex items-center gap-2 border border-[rgba(199,181,138,0.42)] bg-[rgba(199,181,138,0.14)] px-3 py-2 text-xs font-semibold text-white"
                key={`${columnId}:${value}`}
                onClick={() => toggleFilter(columnId, value)}
                type="button"
              >
                <span>{columnLabels[columnId] ?? columnId}</span>
                <span className="text-[rgba(243,239,229,0.72)]">{value}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className={`data-table-scroll overflow-x-auto ${maxHeightClassName ? 'overflow-y-auto' : 'overflow-y-visible'} border border-line bg-[var(--panel)] ${maxHeightClassName ?? ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        ref={scrollRef}
      >
        <table className="min-w-full text-[13px]">
          <thead className="sticky top-0 z-[1] bg-[var(--panel-alt)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const columnId = header.column.id;
                  const hasFilter = Boolean(resolvedFilterOptions[columnId]?.length);
                  const selectedCount = resolvedFilters[columnId]?.length ?? 0;

                  return (
                    <th className="relative whitespace-nowrap border-b border-line px-3 py-2.5 text-left font-semibold text-[var(--ink)]" key={header.id}>
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center justify-between gap-3">
                          {header.column.getCanSort() ? (
                            <button className="inline-flex items-center gap-2 text-left text-[var(--ink)] transition hover:text-white" onClick={header.column.getToggleSortingHandler()} type="button">
                              <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                              <span className="text-xs text-[var(--muted)]">{sortLabel(header.column.getIsSorted())}</span>
                            </button>
                          ) : (
                            <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          )}
                          {hasFilter ? (
                            <div className="relative" data-table-filter-root="true">
                              <button
                                className={`inline-flex items-center gap-1 border px-2 py-1 text-xs font-semibold transition ${
                                  selectedCount
                                    ? 'border-[rgba(199,181,138,0.44)] bg-[rgba(199,181,138,0.14)] text-white'
                                    : 'border-line bg-[var(--panel)] text-[var(--muted)] hover:text-white'
                                }`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setFilterQuery('');
                                  setOpenFilterColumn((current) => current === columnId ? null : columnId);
                                }}
                                type="button"
                              >
                                <span>Фільтр</span>
                                <span>{selectedCount ? `${selectedCount}` : '▾'}</span>
                              </button>
                              {openFilterColumn === columnId ? (
                                <div className="absolute right-0 top-[calc(100%+0.55rem)] z-20 w-[19rem] border border-line bg-[var(--panel)] p-3 shadow-2xl">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Вибір значень</div>
                                      <div className="mt-1 truncate text-sm text-white">{openFilterLabel}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        className="text-[11px] font-semibold text-[var(--muted)] transition hover:text-white"
                                        onClick={() => setFilterValues(openFilterColumn, [])}
                                        type="button"
                                      >
                                        Очистити
                                      </button>
                                      <button
                                        className="text-[11px] font-semibold text-[var(--muted)] transition hover:text-white"
                                        onClick={() => setOpenFilterColumn(null)}
                                        type="button"
                                      >
                                        Закрити
                                      </button>
                                    </div>
                                  </div>
                                  <input
                                    className="mt-3 w-full border border-line bg-[var(--panel-alt)] px-3 py-2 text-sm text-white outline-none"
                                    onChange={(event) => setFilterQuery(event.target.value)}
                                    placeholder="Пошук значення..."
                                    value={filterQuery}
                                  />
                                  <div className="mt-3 max-h-64 space-y-1 overflow-auto pr-1">
                                    {filteredOptions.length ? filteredOptions.map((option: string) => {
                                      const checked = resolvedFilters[openFilterColumn]?.includes(option) ?? false;
                                      return (
                                        <label className="flex cursor-pointer items-start gap-3 px-2 py-2 text-sm text-[var(--ink)] transition hover:bg-[rgba(199,181,138,0.08)]" key={option}>
                                          <input
                                            checked={checked}
                                            className="mt-0.5"
                                            onChange={() => toggleFilter(openFilterColumn, option)}
                                            type="checkbox"
                                          />
                                          <span className="min-w-0 break-words whitespace-normal">{option || '—'}</span>
                                        </label>
                                      );
                                    }) : (
                                      <div className="border border-dashed border-line px-3 py-4 text-center text-xs text-[var(--muted)]">Немає значень за цим пошуком.</div>
                                    )}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const expandedContent = renderExpandedRow?.(row.original);
              const isExpanded = Boolean(expandedRows[row.id]);

              return (
                <Fragment key={row.id}>
                  <tr
                    className={`border-t border-line/80 ${expandedContent ? 'cursor-pointer transition hover:bg-[rgba(199,181,138,0.06)]' : ''}`}
                    onClick={expandedContent ? () => toggleExpanded(row.id) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td className="whitespace-nowrap px-3 py-2.5 text-[13px] text-[var(--ink)]" key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {expandedContent && isExpanded ? (
                    <tr className="border-t border-line bg-[rgba(199,181,138,0.05)]">
                      <td className="px-3 py-3 text-[var(--ink)]" colSpan={row.getVisibleCells().length}>
                        {expandedContent}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
