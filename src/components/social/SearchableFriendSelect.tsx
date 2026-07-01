import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { filterFriendsForSelect } from '../../lib/friend-picker';

interface SearchableFriendSelectProps {
  value: string;
  onChange: (friendId: string) => void;
  excludeFriendIds?: string[];
  label?: string;
  placeholder?: string;
}

export function SearchableFriendSelect({
  value,
  onChange,
  excludeFriendIds = [],
  label = 'Related Friend',
  placeholder = 'Search friends…',
}: SearchableFriendSelectProps) {
  const { data } = useApp();
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [listOpen, setListOpen] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedFriend = useMemo(
    () => data.friends.find((f) => f.id === value),
    [data.friends, value]
  );

  const visibleFriends = useMemo(
    () =>
      filterFriendsForSelect(data.friends, {
        search,
        excludeIds: excludeFriendIds,
        hangouts: data.hangouts,
        prioritizeRecentFavorites: !search.trim(),
        includeArchived: false,
        selectedId: value || undefined,
      }),
    [data.friends, data.hangouts, search, excludeFriendIds, value]
  );

  const showRecentSection = !search.trim() && visibleFriends.length > 0;

  useEffect(() => {
    setFocusedIndex(-1);
    optionRefs.current = [];
  }, [visibleFriends.length, search]);

  const handleSelect = useCallback(
    (friendId: string) => {
      onChange(friendId);
      setSearch('');
      setListOpen(false);
    },
    [onChange]
  );

  const handleClear = () => {
    onChange('');
    setSearch('');
    setListOpen(true);
    searchRef.current?.focus();
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (visibleFriends.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = focusedIndex < visibleFriends.length - 1 ? focusedIndex + 1 : 0;
      setFocusedIndex(next);
      optionRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = focusedIndex > 0 ? focusedIndex - 1 : visibleFriends.length - 1;
      setFocusedIndex(next);
      optionRefs.current[next]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (focusedIndex >= 0 && focusedIndex < visibleFriends.length) {
        e.preventDefault();
        handleSelect(visibleFriends[focusedIndex].id);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setListOpen(false);
    }
  };

  const availableCount = data.friends.filter((f) => !excludeFriendIds.includes(f.id)).length;

  if (availableCount === 0) {
    return (
      <div className="text-left">
        <span className="block text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>
          {label}
        </span>
        <p className="text-sm opacity-70">No other friends available to link.</p>
      </div>
    );
  }

  return (
    <div className="text-left">
      <span className="block text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>
        {label}
      </span>

      {selectedFriend && (
        <div className="mb-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm border bg-primary text-white border-primary"
          >
            {selectedFriend.name}
            <button
              type="button"
              onClick={handleClear}
              className="opacity-80 hover:opacity-100 leading-none"
              aria-label={`Clear ${selectedFriend.name}`}
            >
              ×
            </button>
          </span>
        </div>
      )}

      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: 'var(--border)' }}
        onKeyDown={handleListKeyDown}
      >
        <div
          className="p-2 border-b"
          style={{ background: 'var(--card-bg, var(--bg))', borderColor: 'var(--border)' }}
        >
          <input
            ref={searchRef}
            type="search"
            placeholder={placeholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setListOpen(true);
            }}
            onFocus={() => setListOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && visibleFriends.length > 0) {
                e.preventDefault();
                setListOpen(true);
                setFocusedIndex(0);
                optionRefs.current[0]?.focus();
              }
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
            aria-label={placeholder}
            aria-expanded={listOpen}
            aria-controls="searchable-friend-select-list"
            role="combobox"
            aria-autocomplete="list"
          />
        </div>

        {listOpen && (
          <div
            id="searchable-friend-select-list"
            className="max-h-48 overflow-y-auto"
            role="listbox"
            aria-label={label}
          >
            {visibleFriends.length === 0 ? (
              <p className="text-sm opacity-70 py-3 px-3 text-center">No friends match your search.</p>
            ) : (
              <ul className="py-1">
                {showRecentSection && (
                  <li className="px-3 py-1 text-xs opacity-60 uppercase tracking-wide">
                    Recent & favorites first
                  </li>
                )}
                {visibleFriends.map((friend, index) => {
                  const isSelected = value === friend.id;
                  return (
                    <li key={friend.id}>
                      <button
                        ref={(el) => {
                          optionRefs.current[index] = el;
                        }}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={focusedIndex === index ? 0 : -1}
                        onClick={() => handleSelect(friend.id)}
                        onFocus={() => setFocusedIndex(index)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-black/5 ${
                          isSelected ? 'bg-primary/10 font-medium' : ''
                        }`}
                        style={{ color: 'var(--text-heading)' }}
                      >
                        <span>{friend.name}</span>
                        {(friend.tags.length > 0 || (friend.groups ?? []).length > 0) && (
                          <span className="block text-xs opacity-60 truncate mt-0.5">
                            {[...friend.tags, ...(friend.groups ?? [])].slice(0, 4).join(' · ')}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {!listOpen && visibleFriends.length > 0 && (
        <button
          type="button"
          className="text-xs opacity-70 mt-1 hover:opacity-100"
          onClick={() => {
            setListOpen(true);
            searchRef.current?.focus();
          }}
        >
          Show friend list
        </button>
      )}
    </div>
  );
}
