import { isFriendArchived } from './friend-archive';
import { daysSinceDate, getFriendLastSeen } from './friend-activity';
import type { Friend, Hangout } from '../types';

export type FriendPickerQuickFilter = 'all' | 'recent' | 'favorites' | 'family' | 'no_recent';

export const FRIEND_PICKER_RECENT_DAYS = 30;

const FAVORITE_TAG_PATTERN = /^(best friend|good friend)$/i;
const FAMILY_TAG_PATTERN = /^family$/i;

export function friendMatchesSearch(friend: Friend, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    friend.name,
    friend.relationshipStatus,
    friend.notes,
    ...friend.tags,
    ...(friend.groups ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function compareFriendNames(a: Friend, b: Friend): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

export function sortFriendsForPicker(
  friends: Friend[],
  selectedIds: string[],
  showSelectedFirst: boolean
): Friend[] {
  const sorted = [...friends].sort(compareFriendNames);
  if (!showSelectedFirst) return sorted;
  const selectedSet = new Set(selectedIds);
  const selected = sorted.filter((f) => selectedSet.has(f.id));
  const unselected = sorted.filter((f) => !selectedSet.has(f.id));
  return [...selected, ...unselected];
}

export function friendHasRecentHangout(
  friendId: string,
  hangouts: Hangout[],
  days = FRIEND_PICKER_RECENT_DAYS
): boolean {
  const lastSeen = getFriendLastSeen(friendId, hangouts);
  if (!lastSeen) return false;
  const since = daysSinceDate(lastSeen);
  return since != null && since <= days;
}

export function friendMatchesQuickFilter(
  friend: Friend,
  filter: FriendPickerQuickFilter,
  hangouts: Hangout[]
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'recent':
      return friendHasRecentHangout(friend.id, hangouts);
    case 'favorites':
      return friend.tags.some((t) => FAVORITE_TAG_PATTERN.test(t.trim()));
    case 'family':
      return friend.tags.some((t) => FAMILY_TAG_PATTERN.test(t.trim()));
    case 'no_recent':
      return !friendHasRecentHangout(friend.id, hangouts);
    default:
      return true;
  }
}

export function friendMatchesTagFilter(friend: Friend, tagFilter: string): boolean {
  if (!tagFilter.trim()) return true;
  const tag = tagFilter.trim().toLowerCase();
  return friend.tags.some((t) => t.toLowerCase() === tag);
}

export function filterFriendsForPicker(
  friends: Friend[],
  options: {
    search: string;
    quickFilter: FriendPickerQuickFilter;
    tagFilter: string;
    hangouts: Hangout[];
    selectedIds: string[];
    showSelectedFirst: boolean;
  }
): Friend[] {
  const selectedSet = new Set(options.selectedIds);

  let list = friends.filter(
    (f) =>
      friendMatchesQuickFilter(f, options.quickFilter, options.hangouts) &&
      friendMatchesTagFilter(f, options.tagFilter)
  );

  if (options.search.trim()) {
    const matching = list.filter((f) => friendMatchesSearch(f, options.search));
    const matchingIds = new Set(matching.map((f) => f.id));
    const selectedOutsideSearch = friends.filter(
      (f) => selectedSet.has(f.id) && !matchingIds.has(f.id)
    );
    list = [...selectedOutsideSearch, ...matching];
  }

  return sortFriendsForPicker(list, options.selectedIds, options.showSelectedFirst);
}

export function sortFriendsWithRecentAndFavoritesFirst(
  friends: Friend[],
  hangouts: Hangout[]
): Friend[] {
  const sorted = [...friends].sort(compareFriendNames);
  const recentIds = new Set(
    sorted.filter((f) => friendHasRecentHangout(f.id, hangouts)).map((f) => f.id)
  );
  const favoriteIds = new Set(
    sorted
      .filter((f) => f.tags.some((t) => FAVORITE_TAG_PATTERN.test(t.trim())))
      .map((f) => f.id)
  );

  const recent = sorted.filter((f) => recentIds.has(f.id));
  const favoritesOnly = sorted.filter((f) => favoriteIds.has(f.id) && !recentIds.has(f.id));
  const rest = sorted.filter((f) => !recentIds.has(f.id) && !favoriteIds.has(f.id));
  return [...recent, ...favoritesOnly, ...rest];
}

export function filterFriendsForSelect(
  friends: Friend[],
  options: {
    search: string;
    excludeIds?: string[];
    hangouts: Hangout[];
    prioritizeRecentFavorites?: boolean;
    includeArchived?: boolean;
    /** Keep selected friend visible even when archived and includeArchived is false. */
    selectedId?: string;
  }
): Friend[] {
  const excludeSet = new Set(options.excludeIds ?? []);
  let list = friends.filter((f) => !excludeSet.has(f.id));

  if (!options.includeArchived) {
    list = list.filter((f) => !isFriendArchived(f) || f.id === options.selectedId);
  }

  if (options.search.trim()) {
    list = list.filter((f) => friendMatchesSearch(f, options.search));
    return list.sort(compareFriendNames);
  }

  return options.prioritizeRecentFavorites !== false
    ? sortFriendsWithRecentAndFavoritesFirst(list, options.hangouts)
    : list.sort(compareFriendNames);
}

export function toggleFriendSelection(selected: string[], friendId: string): string[] {
  return selected.includes(friendId)
    ? selected.filter((id) => id !== friendId)
    : [...selected, friendId];
}

export function formatSelectedCount(count: number): string {
  if (count === 0) return 'No friends selected';
  if (count === 1) return '1 friend selected';
  return `${count} friends selected`;
}
