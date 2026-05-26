'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardSearchMode } from '@/lib/dashboard-ui';
import { DASHBOARD_SEARCH_MODES } from '@/lib/dashboard-ui';

export function DashboardFilterBar({
  months,
  month,
  onMonthChange,
  searchMode,
  onSearchModeChange,
  query,
  onQueryChange,
  suggestions,
  suggestionGridClassName
}: {
  months: string[];
  month: string;
  onMonthChange: (value: string) => void;
  searchMode: DashboardSearchMode;
  onSearchModeChange: (value: DashboardSearchMode) => void;
  query: string;
  onQueryChange: (value: string) => void;
  suggestions: string[];
  suggestionGridClassName: string;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (searchRef.current?.contains(event.target as Node)) return;
      setSearchOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const searchLabel = DASHBOARD_SEARCH_MODES.find((item) => item.value === searchMode)?.label.toLowerCase() ?? 'пошук';
  const normalizedQuery = query.trim().toLowerCase();
  const visibleSuggestions = useMemo(
    () => normalizedQuery ? suggestions.filter((item) => item.toLowerCase().includes(normalizedQuery)) : suggestions,
    [normalizedQuery, suggestions]
  );

  return (
    <section className="filter-bar motion-fade-up">
      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_auto]">
        <label className="grid gap-2">
          <span className="filter-label">Місяць</span>
          <select className="filter-select" onChange={(event) => onMonthChange(event.target.value)} value={month}>
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
                onQueryChange(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder={`Фільтр за полем: ${searchLabel}`}
              spellCheck={false}
              value={query}
            />
            {searchOpen && visibleSuggestions.length ? (
              <div className="search-suggestion-popover">
                <div className={`search-suggestion-grid ${suggestionGridClassName}`}>
                  {visibleSuggestions.map((item) => (
                    <button
                      className="search-suggestion-option"
                      key={item}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        onQueryChange(item);
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
            {DASHBOARD_SEARCH_MODES.map((item) => (
              <button
                className={`filter-pill ${searchMode === item.value ? 'filter-pill-active' : ''}`}
                key={item.value}
                onClick={() => {
                  onSearchModeChange(item.value);
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
  );
}
