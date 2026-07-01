import { describe, expect, it } from 'vitest';
import type { Friend } from '../types';
import {
  countActiveFriends,
  filterActiveFriends,
  filterFriendsByArchiveFilter,
  filterFriendsForPickerPool,
  isFriendArchived,
} from './friend-archive';

function makeFriend(id: string, name: string, archived = false): Friend {
  return {
    id,
    name,
    tags: [],
    groups: [],
    relationshipStatus: 'None',
    birthday: '',
    contactInfo: '',
    notes: '',
    favoriteActivities: [],
    relationships: [],
    isArchived: archived,
    archivedAt: archived ? '2026-06-01T12:00:00' : undefined,
    createdAt: '2026-01-01T10:00:00',
  };
}

describe('friend-archive', () => {
  const active = makeFriend('a1', 'Active');
  const archived = makeFriend('a2', 'Archived', true);
  const friends = [active, archived];

  it('detects archived friends', () => {
    expect(isFriendArchived(active)).toBe(false);
    expect(isFriendArchived(archived)).toBe(true);
  });

  it('filters by archive status', () => {
    expect(filterFriendsByArchiveFilter(friends, 'active')).toEqual([active]);
    expect(filterFriendsByArchiveFilter(friends, 'archived')).toEqual([archived]);
    expect(filterFriendsByArchiveFilter(friends, 'all')).toEqual(friends);
  });

  it('counts active friends', () => {
    expect(countActiveFriends(friends)).toBe(1);
  });

  it('excludes archived from picker pool unless toggled or selected', () => {
    expect(filterFriendsForPickerPool(friends, false, [])).toEqual([active]);
    expect(filterFriendsForPickerPool(friends, true, [])).toEqual(friends);
    expect(filterFriendsForPickerPool(friends, false, ['a2'])).toEqual(friends);
  });
});

describe('migrateFriends archive defaults', () => {
  it('defaults isArchived to false for legacy friends', async () => {
    const { normalizeAppData } = await import('./storage');
    const data = normalizeAppData({
      friends: [
        {
          id: 'legacy',
          name: 'Legacy',
          tags: [],
          groups: [],
          relationshipStatus: 'None',
          birthday: '',
          contactInfo: '',
          notes: '',
          favoriteActivities: [],
          relationships: [],
          createdAt: '2026-01-01',
        },
      ],
    });
    expect(data.friends[0].isArchived).toBe(false);
    expect(data.friends[0].archivedAt).toBeUndefined();
  });

  it('preserves archived status on import', async () => {
    const { normalizeAppData } = await import('./storage');
    const data = normalizeAppData({
      friends: [makeFriend('x1', 'Old Friend', true)],
    });
    expect(data.friends[0].isArchived).toBe(true);
    expect(data.friends[0].archivedAt).toBe('2026-06-01T12:00:00');
  });
});

describe('filterActiveFriends', () => {
  it('returns only non-archived friends', () => {
    const friends = [makeFriend('1', 'A'), makeFriend('2', 'B', true)];
    expect(filterActiveFriends(friends)).toHaveLength(1);
    expect(filterActiveFriends(friends)[0].id).toBe('1');
  });
});
