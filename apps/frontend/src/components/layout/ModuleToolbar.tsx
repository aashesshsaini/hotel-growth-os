'use client';

import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import { debounce } from '@/utils/format';

interface ModuleToolbarProps {
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  filters?: ReactNode;
  actions?: ReactNode;
}

export function ModuleToolbar({
  searchPlaceholder = 'Search...',
  onSearch,
  filters,
  actions,
}: ModuleToolbarProps) {
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
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {onSearch && (
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="input-field pl-9"
            />
          </div>
        )}
        {actions && <div className="flex flex-wrap items-center gap-2 lg:ml-auto">{actions}</div>}
      </div>
      {filters}
    </div>
  );
}
