'use client';

import { useState } from 'react';
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from '@tanstack/react-table';

export function DataTable<T>({ columns, data, initialSorting = [] }: { columns: ColumnDef<T>[]; data: T[]; initialSorting?: SortingState }) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
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

  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold" key={header.id}>
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <button className="inline-flex items-center gap-2 text-left" onClick={header.column.getToggleSortingHandler()} type="button">
                      <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                      <span className="text-xs text-slate-400">{sortLabel(header.column.getIsSorted())}</span>
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
          {table.getRowModel().rows.map((row) => (
            <tr className="border-t" key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td className="whitespace-nowrap px-4 py-3" key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
