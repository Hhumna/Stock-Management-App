import React from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

/**
 * Reusable Table component with sorting & pagination.
 * 
 * @param {Array} columns - e.g. [{ key: 'sku', header: 'SKU', sortable: true, render: (row) => ... }]
 * @param {Array} data - Table rows
 */
export default function Table({ 
  columns, 
  data = [], 
  sortBy = '', 
  sortOrder = 'asc', 
  onSort,
  page = 1,
  totalPages = 1,
  onPageChange
}) {
  const handleSort = (column) => {
    if (column.sortable && onSort) {
      const order = sortBy === column.key && sortOrder === 'asc' ? 'desc' : 'asc';
      onSort(column.key, order);
    }
  };

  return (
    <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden shadow-card">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-brand-border">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col)}
                  className={`px-6 py-3.5 text-left text-xs font-semibold text-brand-textMuted uppercase tracking-wider ${
                    col.sortable ? 'cursor-pointer select-none hover:text-brand-textMain transition-colors' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <ArrowUpDown size={14} className="text-brand-textLight" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border bg-white">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center text-sm text-brand-textMuted">
                  No records found.
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4 text-sm text-brand-textMain whitespace-nowrap">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && onPageChange && (
        <div className="bg-slate-50 border-t border-brand-border px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-brand-textMuted">
            Page <span className="font-semibold text-brand-textMain">{page}</span> of{' '}
            <span className="font-semibold text-brand-textMain">{totalPages}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="py-1 px-3"
            >
              <ChevronLeft size={16} />
              <span>Prev</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="py-1 px-3"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
