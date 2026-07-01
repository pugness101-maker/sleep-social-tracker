import type { Friend } from '../types';

export type FriendArchiveFilter = 'active' | 'archived' | 'all';

export function isFriendArchived(friend: Friend): boolean {
  return friend.isArchived === true;
}

export function filterFriendsByArchiveFilter(
  friends: Friend[],
  filter: FriendArchiveFilter
): Friend[] {
  switch (filter) {
    case 'active':
      return friends.filter((f) => !isFriendArchived(f));
    case 'archived':
      return friends.filter((f) => isFriendArchived(f));
    case 'all':
      return friends;
    default:
      return friends;
  }
}

/** Friends shown in default lists and pickers (active only). */
export function filterActiveFriends(friends: Friend[]): Friend[] {
  return filterFriendsByArchiveFilter(friends, 'active');
}

/**
 * Pool for friend picker: hide archived unless toggled, but keep already-selected archived visible.
 */
export function filterFriendsForPickerPool(
  friends: Friend[],
  includeArchived: boolean,
  selectedIds: string[]
): Friend[] {
  if (includeArchived) return friends;
  const selectedSet = new Set(selectedIds);
  return friends.filter((f) => !isFriendArchived(f) || selectedSet.has(f.id));
}

export function countActiveFriends(friends: Friend[]): number {
  return filterActiveFriends(friends).length;
}
