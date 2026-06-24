'use client';

import { Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { debounce } from '@/utils/format';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';
import { Pagination } from './Pagination';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => any;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  error?: string | null;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  filters?: React.ReactNode;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  emptyTitle?: string;
  emptyDescription?: string;
  rowKey: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  error,
  searchPlaceholder = 'Search...',
  onSearch,
  filters,
  pagination,
  emptyTitle,
  emptyDescription,
  rowKey,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        onSearchRef.current?.(value);
      }, 400),
    []
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    debouncedSearch(value);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {(onSearch || filters) && (
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          {onSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="input-field pl-9"
              />
            </div>
          )}
          {filters}
        </div>
      )}

      {error && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {isLoading ? (
        <div className="py-16">
          <LoadingSpinner />
        </div>
      ) : data.length === 0 ? (
        <div className="p-6">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 ${col.className || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.map((row) => (
                <tr key={rowKey(row)} className="transition hover:bg-slate-50">
                  {columns.map((col) => (
                    <td key={col.key} className={`whitespace-nowrap px-4 py-3 text-sm text-slate-700 ${col.className || ''}`}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && !isLoading && data.length > 0 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}
