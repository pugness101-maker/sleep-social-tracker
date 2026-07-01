import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  buildLocationSuggestions,
  filterLocationSuggestions,
  formatLocationDate,
  formatLocationSuggestionMeta,
  getFavoriteLocationSuggestions,
  getRecentLocationSuggestions,
  isFavoriteLocation,
  type LocationSuggestion,
} from '../../lib/location-history';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  /** Exact-match picker for filters (hides free-text hint styling). */
  filterMode?: boolean;
  showFavorites?: boolean;
  allowClear?: boolean;
}

function SuggestionRow({
  suggestion,
  isActive,
  isSelected,
  showFavorite,
  onSelect,
  onToggleFavorite,
  buttonRef,
}: {
  suggestion: LocationSuggestion;
  isActive: boolean;
  isSelected: boolean;
  showFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <div className="flex items-stretch gap-1">
      <button
        ref={buttonRef}
        type="button"
        role="option"
        aria-selected={isSelected}
        tabIndex={isActive ? 0 : -1}
        onClick={onSelect}
        className={`flex-1 text-left px-3 py-2 text-sm transition-colors hover:bg-black/5 ${
          isSelected ? 'bg-primary/10' : ''
        }`}
        style={{ color: 'var(--text-heading)' }}
      >
        <span className="font-medium">{suggestion.location}</span>
        <span className="block text-xs opacity-60 mt-0.5">
          {formatLocationSuggestionMeta(suggestion)}
        </span>
      </button>
      {showFavorite && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="px-2 text-sm opacity-70 hover:opacity-100 shrink-0"
          aria-label={suggestion.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          title={suggestion.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {suggestion.isFavorite ? '★' : '☆'}
        </button>
      )}
    </div>
  );
}

export function LocationAutocomplete({
  value,
  onChange,
  label = 'Location',
  placeholder = 'Search locations…',
  className = '',
  filterMode = false,
  showFavorites = true,
  allowClear = true,
}: LocationAutocompleteProps) {
  const { data, toggleFavoriteLocation } = useApp();
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const allSuggestions = useMemo(
    () =>
      buildLocationSuggestions(
        data.hangouts,
        data.ideas,
        data.favoriteLocations ?? []
      ),
    [data.hangouts, data.ideas, data.favoriteLocations]
  );

  const filtered = useMemo(
    () => filterLocationSuggestions(allSuggestions, value),
    [allSuggestions, value]
  );

  const favorites = useMemo(
    () => getFavoriteLocationSuggestions(filtered),
    [filtered]
  );

  const recent = useMemo(() => {
    const favoriteKeys = new Set(favorites.map((f) => f.location.toLowerCase()));
    return getRecentLocationSuggestions(filtered).filter(
      (s) => !favoriteKeys.has(s.location.toLowerCase())
    );
  }, [filtered, favorites]);

  const shownKeys = useMemo(() => {
    const keys = new Set<string>();
    favorites.forEach((s) => keys.add(s.location.toLowerCase()));
    recent.forEach((s) => keys.add(s.location.toLowerCase()));
    return keys;
  }, [favorites, recent]);

  const rest = useMemo(
    () => filtered.filter((s) => !shownKeys.has(s.location.toLowerCase())),
    [filtered, shownKeys]
  );

  const flatList = useMemo(
    () => [...favorites, ...recent, ...rest],
    [favorites, recent, rest]
  );

  useEffect(() => {
    setFocusedIndex(-1);
    optionRefs.current = [];
  }, [flatList.length, value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (location: string) => {
      onChange(location);
      setOpen(false);
      inputRef.current?.blur();
    },
    [onChange]
  );

  const handleClear = () => {
    onChange('');
    setOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (flatList.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = focusedIndex < flatList.length - 1 ? focusedIndex + 1 : 0;
      setFocusedIndex(next);
      optionRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = focusedIndex > 0 ? focusedIndex - 1 : flatList.length - 1;
      setFocusedIndex(next);
      optionRefs.current[next]?.focus();
    } else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && focusedIndex < flatList.length) {
        e.preventDefault();
        handleSelect(flatList[focusedIndex].location);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const renderSection = (
    title: string,
    items: LocationSuggestion[],
    startIndex: number
  ) => {
    if (items.length === 0) return null;
    return (
      <>
        <li className="px-3 py-1 text-xs opacity-60 uppercase tracking-wide">{title}</li>
        {items.map((suggestion, i) => {
          const index = startIndex + i;
          return (
            <li key={`${title}-${suggestion.location}`}>
              <SuggestionRow
                suggestion={{
                  ...suggestion,
                  isFavorite: isFavoriteLocation(
                    suggestion.location,
                    data.favoriteLocations ?? []
                  ),
                }}
                isActive={focusedIndex === index}
                isSelected={value.trim().toLowerCase() === suggestion.location.toLowerCase()}
                showFavorite={showFavorites && !filterMode}
                onSelect={() => handleSelect(suggestion.location)}
                onToggleFavorite={() => toggleFavoriteLocation(suggestion.location)}
                buttonRef={(el) => {
                  optionRefs.current[index] = el;
                }}
              />
            </li>
          );
        })}
      </>
    );
  };

  const favoriteStart = 0;
  const recentStart = favorites.length;
  const restStart = favorites.length + recent.length;

  return (
    <div className={`text-left ${className}`} ref={containerRef}>
      {label && (
        <span className="block text-sm font-medium mb-1" style={{ color: 'var(--text-heading)' }}>
          {label}
        </span>
      )}

      <div
        className="relative rounded-lg border"
        style={{ borderColor: 'var(--border)' }}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-1 pr-1">
          <input
            ref={inputRef}
            type="text"
            value={value}
            placeholder={filterMode && !value ? 'All locations' : placeholder}
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="flex-1 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-transparent"
            style={{ color: 'var(--text)' }}
            aria-label={label}
            aria-expanded={open}
            aria-autocomplete="list"
            role="combobox"
          />
          {allowClear && value && (
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 w-7 h-7 rounded-md text-sm opacity-60 hover:opacity-100 hover:bg-black/5"
              aria-label="Clear location"
              title="Clear location"
            >
              ×
            </button>
          )}
        </div>

        {open && (
          <div
            className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border shadow-lg max-h-64 overflow-y-auto"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            role="listbox"
          >
            {flatList.length === 0 ? (
              <p className="text-sm opacity-70 py-3 px-3 text-center">
                {value.trim()
                  ? filterMode
                    ? 'No matching locations. Type to filter or clear for all.'
                    : 'No matching locations. Press enter to use a new location.'
                  : 'No saved locations yet. Type to add one.'}
              </p>
            ) : (
              <ul className="py-1">
                {renderSection('Favorite locations', favorites, favoriteStart)}
                {renderSection('Recent locations', recent, recentStart)}
                {rest.length > 0 && (
                  <>
                    {(favorites.length > 0 || recent.length > 0) && (
                      <li className="px-3 py-1 text-xs opacity-60 uppercase tracking-wide">
                        All locations
                      </li>
                    )}
                    {rest.map((suggestion, i) => {
                      const index = restStart + i;
                      return (
                        <li key={suggestion.location}>
                          <SuggestionRow
                            suggestion={{
                              ...suggestion,
                              isFavorite: isFavoriteLocation(
                                suggestion.location,
                                data.favoriteLocations ?? []
                              ),
                            }}
                            isActive={focusedIndex === index}
                            isSelected={
                              value.trim().toLowerCase() === suggestion.location.toLowerCase()
                            }
                            showFavorite={showFavorites && !filterMode}
                            onSelect={() => handleSelect(suggestion.location)}
                            onToggleFavorite={() => toggleFavoriteLocation(suggestion.location)}
                            buttonRef={(el) => {
                              optionRefs.current[index] = el;
                            }}
                          />
                        </li>
                      );
                    })}
                  </>
                )}
              </ul>
            )}
          </div>
        )}
      </div>

      {!filterMode && value.trim() && !flatList.some(
        (s) => s.location.toLowerCase() === value.trim().toLowerCase()
      ) && (
        <p className="text-xs opacity-60 mt-1">
          New location — will be saved when you submit.
          {value.trim() && ` Last visit will appear after logging hangouts.`}
        </p>
      )}

      {filterMode && value && (
        <p className="text-xs opacity-60 mt-1">
          Filtering by &quot;{value}&quot;
          {flatList.find((s) => s.location === value)?.lastVisit &&
            ` · Last visit ${formatLocationDate(flatList.find((s) => s.location === value)!.lastVisit)}`}
        </p>
      )}
    </div>
  );
}
