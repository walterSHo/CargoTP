'use client';

import type { ReactNode } from 'react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from '@tanstack/react-table';

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
  const table = useReactTable({
    data,
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

  function toggleExpanded(rowId: string) {
    setExpandedRows((current) => ({ ...current, [rowId]: !current[rowId] }));
  }

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

  const filteredOptions = useMemo(() => {
    if (!openFilterColumn) return [];
    const options = filterOptions?.[openFilterColumn] ?? [];
    const query = filterQuery.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [filterOptions, filterQuery, openFilterColumn]);

  function toggleFilter(columnId: string, value: string) {
    if (!onFilterChange) return;
    const current = new Set(activeFilters?.[columnId] ?? []);
    if (current.has(value)) current.delete(value);
    else current.add(value);
    onFilterChange(columnId, [...current]);
  }

  return (
    <div className={`overflow-auto rounded-[24px] border border-line bg-[linear-gradient(180deg,rgba(12,20,36,0.96),rgba(9,16,30,0.96))] shadow-[0_20px_48px_rgba(0,0,0,0.24)] ${maxHeightClassName ?? ''}`}>
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-[1] bg-[rgba(16,28,51,0.95)]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const columnId = header.column.id;
                const hasFilter = Boolean(filterOptions?.[columnId]?.length);
                const selectedCount = activeFilters?.[columnId]?.length ?? 0;

                return (
                  <th className="relative whitespace-nowrap border-b border-line px-4 py-3 text-left font-semibold text-[var(--ink)]" key={header.id}>
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
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold transition ${
                                selectedCount
                                  ? 'border-[rgba(78,161,255,0.44)] bg-[rgba(78,161,255,0.16)] text-white'
                                  : 'border-line bg-[rgba(8,15,28,0.72)] text-[var(--muted)] hover:text-white'
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
                              <div className="absolute right-0 top-[calc(100%+0.65rem)] z-20 w-72 rounded-2xl border border-line bg-[rgba(8,15,28,0.98)] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Вибір значень</div>
                                  <button
                                    className="text-xs font-semibold text-[var(--muted)] transition hover:text-white"
                                    onClick={() => onFilterChange?.(columnId, [])}
                                    type="button"
                                  >
                                    Очистити
                                  </button>
                                </div>
                                <input
                                  className="mt-3 w-full rounded-xl border border-line bg-[rgba(12,20,36,0.95)] px-3 py-2 text-sm text-white outline-none"
                                  onChange={(event) => setFilterQuery(event.target.value)}
                                  placeholder="Пошук значення..."
                                  value={filterQuery}
                                />
                                <div className="mt-3 max-h-64 space-y-1 overflow-auto pr-1">
                                  {filteredOptions.length ? filteredOptions.map((option) => {
                                    const checked = activeFilters?.[columnId]?.includes(option) ?? false;
                                    return (
                                      <label className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 text-sm text-[var(--ink)] transition hover:bg-[rgba(78,161,255,0.08)]" key={option}>
                                        <input
                                          checked={checked}
                                          className="mt-0.5"
                                          onChange={() => toggleFilter(columnId, option)}
                                          type="checkbox"
                                        />
                                        <span className="min-w-0 break-words whitespace-normal">{option || '—'}</span>
                                      </label>
                                    );
                                  }) : (
                                    <div className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-xs text-[var(--muted)]">Немає значень за цим пошуком.</div>
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
                  className={`border-t border-line/80 ${expandedContent ? 'cursor-pointer transition hover:bg-[rgba(78,161,255,0.06)]' : ''}`}
                  onClick={expandedContent ? () => toggleExpanded(row.id) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--ink)]" key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {expandedContent && isExpanded ? (
                  <tr className="border-t border-line bg-[rgba(78,161,255,0.05)]">
                    <td className="px-4 py-4 text-[var(--ink)]" colSpan={row.getVisibleCells().length}>
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
  );
}
