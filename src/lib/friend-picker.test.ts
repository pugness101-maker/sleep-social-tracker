import { describe, expect, it } from 'vitest';
import type { Friend, Hangout } from '../types';
import {
  compareFriendNames,
  filterFriendsForPicker,
  filterFriendsForSelect,
  formatSelectedCount,
  friendMatchesSearch,
  friendMatchesQuickFilter,
  sortFriendsForPicker,
  toggleFriendSelection,
} from './friend-picker';

const alice: Friend = {
  id: 'a',
  name: 'Alice',
  tags: ['Best Friend'],
  groups: ['TXST'],
  relationshipStatus: 'Friend',
  birthday: '',
  contactInfo: '',
  notes: 'Met at college',
  favoriteActivities: [],
  relationships: [],
  isArchived: false,
  createdAt: '2026-01-01',
};

const bob: Friend = {
  id: 'b',
  name: 'bob',
  tags: ['Family'],
  groups: [],
  relationshipStatus: 'None',
  birthday: '',
  contactInfo: '',
  notes: '',
  favoriteActivities: [],
  relationships: [],
  isArchived: false,
  createdAt: '2026-01-01',
};

const carol: Friend = {
  id: 'c',
  name: 'Carol',
  tags: ['Coworker'],
  groups: [],
  relationshipStatus: 'Crush',
  birthday: '',
  contactInfo: '',
  notes: '',
  favoriteActivities: [],
  relationships: [],
  isArchived: false,
  createdAt: '2026-01-01',
};

const hangouts: Hangout[] = [
  {
    id: 'h1',
    friendIds: ['a'],
    startTime: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 3);
      return d.toISOString().slice(0, 16);
    })(),
    endTime: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 3);
      d.setHours(d.getHours() + 2);
      return d.toISOString().slice(0, 16);
    })(),
    location: '',
    type: 'Chill',
    notes: '',
    segments: [],
    createdAt: '2026-06-28T10:00',
  },
];

describe('friendMatchesSearch', () => {
  it('matches name, tags, groups, relationship status, and notes', () => {
    expect(friendMatchesSearch(alice, 'alice')).toBe(true);
    expect(friendMatchesSearch(alice, 'best')).toBe(true);
    expect(friendMatchesSearch(alice, 'txst')).toBe(true);
    expect(friendMatchesSearch(carol, 'crush')).toBe(true);
    expect(friendMatchesSearch(alice, 'college')).toBe(true);
    expect(friendMatchesSearch(bob, 'alice')).toBe(false);
  });
});

describe('compareFriendNames', () => {
  it('sorts case-insensitively', () => {
    expect(compareFriendNames(bob, alice)).toBeGreaterThan(0);
    expect(compareFriendNames(alice, bob)).toBeLessThan(0);
  });
});

describe('sortFriendsForPicker', () => {
  it('puts selected friends first when enabled', () => {
    const sorted = sortFriendsForPicker([carol, bob, alice], ['c'], true);
    expect(sorted.map((f) => f.id)).toEqual(['c', 'a', 'b']);
  });

  it('sorts alphabetically only when selected-first is off', () => {
    const sorted = sortFriendsForPicker([carol, bob, alice], ['c'], false);
    expect(sorted.map((f) => f.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('friendMatchesQuickFilter', () => {
  it('filters favorites and family by tag', () => {
    expect(friendMatchesQuickFilter(alice, 'favorites', hangouts)).toBe(true);
    expect(friendMatchesQuickFilter(bob, 'family', hangouts)).toBe(true);
    expect(friendMatchesQuickFilter(carol, 'favorites', hangouts)).toBe(false);
  });

  it('filters recent and no recent hangout', () => {
    expect(friendMatchesQuickFilter(alice, 'recent', hangouts)).toBe(true);
    expect(friendMatchesQuickFilter(carol, 'no_recent', hangouts)).toBe(true);
    expect(friendMatchesQuickFilter(alice, 'no_recent', hangouts)).toBe(false);
  });
});

describe('filterFriendsForPicker', () => {
  it('keeps selected friends visible when search does not match', () => {
    const result = filterFriendsForPicker([alice, bob, carol], {
      search: 'zzz',
      quickFilter: 'all',
      tagFilter: '',
      hangouts,
      selectedIds: ['a'],
      showSelectedFirst: true,
    });
    expect(result.map((f) => f.id)).toEqual(['a']);
  });

  it('applies tag filter', () => {
    const result = filterFriendsForPicker([alice, bob, carol], {
      search: '',
      quickFilter: 'all',
      tagFilter: 'Family',
      hangouts,
      selectedIds: [],
      showSelectedFirst: false,
    });
    expect(result.map((f) => f.id)).toEqual(['b']);
  });
});

describe('filterFriendsForSelect', () => {
  it('excludes specified friends and sorts alphabetically when searching', () => {
    const result = filterFriendsForSelect([alice, bob, carol], {
      search: '',
      excludeIds: ['a'],
      hangouts,
      prioritizeRecentFavorites: false,
    });
    expect(result.map((f) => f.id)).toEqual(['b', 'c']);
  });

  it('filters by search query', () => {
    const result = filterFriendsForSelect([alice, bob, carol], {
      search: 'txst',
      excludeIds: [],
      hangouts,
    });
    expect(result.map((f) => f.id)).toEqual(['a']);
  });

  it('excludes archived friends from select by default', () => {
    const archived = { ...alice, id: 'z', name: 'Zed', isArchived: true, archivedAt: '2026-06-01' };
    const result = filterFriendsForSelect([alice, archived], {
      search: '',
      hangouts,
      includeArchived: false,
    });
    expect(result.map((f) => f.id)).toEqual(['a']);
  });

  it('keeps selected archived friend visible in select', () => {
    const archived = { ...alice, id: 'z', name: 'Zed', isArchived: true, archivedAt: '2026-06-01' };
    const result = filterFriendsForSelect([alice, archived], {
      search: '',
      hangouts,
      includeArchived: false,
      selectedId: 'z',
    });
    expect(result.map((f) => f.id).sort()).toEqual(['a', 'z']);
  });
});

describe('toggleFriendSelection', () => {
  it('adds and removes ids', () => {
    expect(toggleFriendSelection(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleFriendSelection(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('formatSelectedCount', () => {
  it('formats counts', () => {
    expect(formatSelectedCount(0)).toBe('No friends selected');
    expect(formatSelectedCount(1)).toBe('1 friend selected');
    expect(formatSelectedCount(3)).toBe('3 friends selected');
  });
});
