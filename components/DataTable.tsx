'use client';

import type { ReactNode } from 'react';
import { Fragment, useState } from 'react';
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from '@tanstack/react-table';

export function DataTable<T>({
  columns,
  data,
  initialSorting = [],
  maxHeightClassName,
  renderExpandedRow
}: {
  columns: ColumnDef<T>[];
  data: T[];
  initialSorting?: SortingState;
  maxHeightClassName?: string;
  renderExpandedRow?: (row: T) => ReactNode;
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
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

  return (
    <div className={`overflow-auto rounded-[24px] border border-line bg-[linear-gradient(180deg,rgba(12,20,36,0.96),rgba(9,16,30,0.96))] shadow-[0_20px_48px_rgba(0,0,0,0.24)] ${maxHeightClassName ?? ''}`}>
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-[1] bg-[rgba(16,28,51,0.95)]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th className="whitespace-nowrap border-b border-line px-4 py-3 text-left font-semibold text-[var(--ink)]" key={header.id}>
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <button className="inline-flex items-center gap-2 text-left text-[var(--ink)] transition hover:text-white" onClick={header.column.getToggleSortingHandler()} type="button">
                      <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                      <span className="text-xs text-[var(--muted)]">{sortLabel(header.column.getIsSorted())}</span>
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </th>
              ))}
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
