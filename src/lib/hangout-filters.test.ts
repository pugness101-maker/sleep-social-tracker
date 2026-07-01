import { describe, expect, it } from 'vitest';
import type { Hangout } from '../types';
import {
  filterHangoutsForTab,
  getHangoutCategoryFilterOptions,
  getHangoutTypeFilterOptions,
  hangoutMatchesSearch,
  typeBelongsToHangoutCategory,
} from './hangout-filters';

const hangouts: Hangout[] = [
  {
    id: 'h1',
    friendIds: ['f1'],
    startTime: '2026-06-30T19:00',
    endTime: '2026-06-30T21:00',
    location: 'Sakura',
    category: 'Food',
    type: 'Dinner',
    notes: 'Birthday dinner',
    segments: [],
    createdAt: '2026-06-30T19:00',
  },
  {
    id: 'h2',
    friendIds: ['f1', 'f2'],
    startTime: '2026-06-27T14:00',
    endTime: '2026-06-27T16:00',
    location: 'Town',
    category: 'Mixed',
    type: 'Mixed',
    notes: '',
    segments: [
      {
        id: 's1',
        category: 'Food',
        type: 'Dessert',
        friendIds: ['f2'],
        startTime: '',
        endTime: '',
        durationMinutes: 60,
        location: 'Froyo',
        notes: '',
      },
    ],
    createdAt: '2026-06-27T14:00',
  },
];

const friends = [
  { id: 'f1', name: 'JuJu' },
  { id: 'f2', name: 'Sophie' },
] as Parameters<typeof hangoutMatchesSearch>[2];

const catalog = { Food: ['Dinner', 'Dessert'], Mixed: [] };

describe('hangoutMatchesSearch', () => {
  it('finds friend names and segment fields', () => {
    expect(hangoutMatchesSearch(hangouts[0], 'juju', friends)).toBe(true);
    expect(hangoutMatchesSearch(hangouts[1], 'froyo', friends)).toBe(true);
    expect(hangoutMatchesSearch(hangouts[1], 'dessert', friends)).toBe(true);
    expect(hangoutMatchesSearch(hangouts[0], 'jun 30', friends)).toBe(true);
  });
});

describe('filterHangoutsForTab', () => {
  it('filters by category including segments', () => {
    const result = filterHangoutsForTab(hangouts, friends, {
      search: '',
      category: 'Food',
      type: '',
      location: '',
    });
    expect(result.map((h) => h.id).sort()).toEqual(['h1', 'h2']);
  });

  it('filters by category and type on segments', () => {
    const result = filterHangoutsForTab(hangouts, friends, {
      search: '',
      category: 'Food',
      type: 'Dessert',
      location: '',
    });
    expect(result.map((h) => h.id)).toEqual(['h2']);
  });
});

describe('filter options', () => {
  it('includes orphan categories from hangout data', () => {
    const opts = getHangoutCategoryFilterOptions(['Social'], hangouts);
    expect(opts).toContain('Food');
    expect(opts).toContain('Mixed');
  });

  it('scopes types to selected category', () => {
    const opts = getHangoutTypeFilterOptions(hangouts, catalog, [], 'Food');
    expect(opts).toContain('Dinner');
    expect(opts).toContain('Dessert');
  });

  it('validates type belongs to category', () => {
    expect(typeBelongsToHangoutCategory('Dinner', 'Food', hangouts, catalog)).toBe(true);
    expect(typeBelongsToHangoutCategory('Dinner', 'Social', hangouts, catalog)).toBe(false);
  });
});
