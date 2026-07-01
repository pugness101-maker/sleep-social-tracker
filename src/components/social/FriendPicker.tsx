import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import {
  filterFriendsForPicker,
  formatSelectedCount,
  toggleFriendSelection,
  type FriendPickerQuickFilter,
} from '../../lib/friend-picker';

interface FriendPickerProps {
  selected: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  allowClear?: boolean;
  /** Return false to prevent toggling (e.g. segment-only friend prompt). */
  onBeforeSelect?: (friendId: string, willSelect: boolean) => boolean;
}

const QUICK_FILTERS: { id: FriendPickerQuickFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'recent', label: 'Recent' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'family', label: 'Family' },
  { id: 'no_recent', label: 'No recent hangout' },
];

export function FriendPicker({
  selected,
  onChange,
  label = 'Friends',
  allowClear = true,
  onBeforeSelect,
}: FriendPickerProps) {
  const { data, updateSettings } = useApp();
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<FriendPickerQuickFilter>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const showSelectedFirst = data.settings.friendPickerShowSelectedFirst;

  const visibleFriends = useMemo(
    () =>
      filterFriendsForPicker(data.friends, {
        search,
        quickFilter,
        tagFilter,
        hangouts: data.hangouts,
        selectedIds: selected,
        showSelectedFirst,
      }),
    [data.friends, data.hangouts, search, quickFilter, tagFilter, selected, showSelectedFirst]
  );

  const selectedFriends = useMemo(
    () =>
      selected
        .map((id) => data.friends.find((f) => f.id === id))
        .filter((f): f is NonNullable<typeof f> => !!f)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [selected, data.friends]
  );

  const tagOptions = useMemo(() => {
    const tags = new Set<string>();
    data.friendTags.forEach((t) => tags.add(t));
    data.friends.forEach((f) => f.tags.forEach((t) => tags.add(t)));
    return [...tags].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [data.friendTags, data.friends]);

  useEffect(() => {
    setFocusedIndex(-1);
    buttonRefs.current = [];
  }, [visibleFriends.length, search, quickFilter, tagFilter]);

  const handleToggle = useCallback(
    (friendId: string) => {
      const willSelect = !selected.includes(friendId);
      if (onBeforeSelect && !onBeforeSelect(friendId, willSelect)) return;
      onChange(toggleFriendSelection(selected, friendId));
    },
    [onBeforeSelect, onChange, selected]
  );

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (visibleFriends.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = focusedIndex < visibleFriends.length - 1 ? focusedIndex + 1 : 0;
      setFocusedIndex(next);
      buttonRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = focusedIndex > 0 ? focusedIndex - 1 : visibleFriends.length - 1;
      setFocusedIndex(next);
      buttonRefs.current[next]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (focusedIndex >= 0 && focusedIndex < visibleFriends.length) {
        e.preventDefault();
        handleToggle(visibleFriends[focusedIndex].id);
      }
    }
  };

  if (data.friends.length === 0) {
    return (
      <div>
        <span className="block text-sm font-medium mb-2 text-left" style={{ color: 'var(--text-heading)' }}>
          {label}
        </span>
        <p className="text-sm opacity-70 text-left">Add friends first in the Friends tab.</p>
      </div>
    );
  }

  return (
    <div className="text-left">
      <span className="block text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>
        {label}
      </span>

      {selected.length > 0 && (
        <div className="mb-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs opacity-70">{formatSelectedCount(selected.length)}</span>
            {allowClear && (
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => onChange([])}
                className="text-xs px-2 py-0.5 h-auto min-h-0"
              >
                Clear selected
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedFriends.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => handleToggle(f.id)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border bg-primary text-white border-primary"
              >
                {f.name}
                <span aria-hidden className="opacity-80">×</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: 'var(--border)' }}
        onKeyDown={handleListKeyDown}
      >
        <div
          className="sticky top-0 z-10 p-2 space-y-2 border-b"
          style={{ background: 'var(--card-bg, var(--bg))', borderColor: 'var(--border)' }}
        >
          <input
            ref={searchRef}
            type="search"
            placeholder="Search friends…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && visibleFriends.length > 0) {
                e.preventDefault();
                setFocusedIndex(0);
                buttonRefs.current[0]?.focus();
              }
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
            aria-label="Search friends"
          />

          <div className="flex flex-wrap gap-1.5">
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setQuickFilter(f.id)}
                className={`px-2 py-1 rounded-md text-xs border transition-colors ${
                  quickFilter === f.id ? 'bg-primary text-white border-primary' : ''
                }`}
                style={quickFilter !== f.id ? { borderColor: 'var(--border)' } : undefined}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tagOptions.length > 0 && (
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/30 flex-1 min-w-[120px]"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                aria-label="Filter by tag"
              >
                <option value="">Tags: All</option>
                {tagOptions.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            )}
            <label className="flex items-center gap-2 cursor-pointer text-xs whitespace-nowrap ml-auto">
              <input
                type="checkbox"
                checked={showSelectedFirst}
                onChange={(e) => updateSettings({ friendPickerShowSelectedFirst: e.target.checked })}
                className="rounded"
              />
              Show selected first
            </label>
          </div>
        </div>

        <div className="max-h-52 overflow-y-auto p-2" role="listbox" aria-multiselectable aria-label={label}>
          {visibleFriends.length === 0 ? (
            <p className="text-sm opacity-70 py-3 text-center">No friends match your filters.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {visibleFriends.map((f, index) => {
                const isSelected = selected.includes(f.id);
                return (
                  <button
                    key={f.id}
                    ref={(el) => {
                      buttonRefs.current[index] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={focusedIndex === index ? 0 : -1}
                    onClick={() => handleToggle(f.id)}
                    onFocus={() => setFocusedIndex(index)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      isSelected ? 'bg-primary text-white border-primary' : ''
                    }`}
                    style={!isSelected ? { borderColor: 'var(--border)' } : undefined}
                  >
                    {f.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
