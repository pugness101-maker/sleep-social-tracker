import { describe, expect, it } from 'vitest';
import type { Hangout } from '../types';
import {
  filterHangoutsForTab,
  getHangoutCategoryFilterOptions,
  getHangoutTypeFilterOptions,
  hangoutMatchesSearch,
  sanitizeHangoutTabFilters,
  typeBelongsToHangoutCategory,
} from './hangout-filters';
import { getActiveTypeOptions } from './hangout-categories';

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

const settingsCategories = ['Social', 'Food', 'Mixed'];
const catalog = { Social: ['Chill'], Food: ['Dinner', 'Dessert'], Mixed: [] };

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
  it('uses settings categories only', () => {
    const opts = getHangoutCategoryFilterOptions(settingsCategories);
    expect(opts).toContain('Food');
    expect(opts).toContain('Social');
    expect(opts).not.toContain('DeletedCategory');
  });

  it('scopes types to selected category from settings', () => {
    const opts = getHangoutTypeFilterOptions(catalog, settingsCategories, 'Food');
    expect(opts).toContain('Dinner');
    expect(opts).toContain('Dessert');
    expect(opts).not.toContain('Chill');
  });

  it('excludes deleted types and orphan hangout types when All Categories', () => {
    const opts = getHangoutTypeFilterOptions(catalog, settingsCategories, '');
    expect(opts).toContain('Chill');
    expect(opts).toContain('Dinner');
    expect(opts).not.toContain('LegacyDeletedType');
  });

  it('excludes types from deleted categories when All Categories', () => {
    const opts = getActiveTypeOptions(catalog, settingsCategories);
    expect(opts).not.toContain('Gym');
  });

  it('validates type belongs to category via settings catalog', () => {
    expect(typeBelongsToHangoutCategory('Dinner', 'Food', catalog, settingsCategories)).toBe(true);
    expect(typeBelongsToHangoutCategory('Dinner', 'Social', catalog, settingsCategories)).toBe(false);
    expect(typeBelongsToHangoutCategory('LegacyDeletedType', '', catalog, settingsCategories)).toBe(false);
  });

  it('resets deleted type filter to All Types', () => {
    const sanitized = sanitizeHangoutTabFilters(
      { search: '', category: '', type: 'Chill', location: '' },
      ['Social'],
      { Social: ['Party'] }
    );
    expect(sanitized.type).toBe('');
  });
});
