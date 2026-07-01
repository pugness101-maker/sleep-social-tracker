import { describe, expect, it } from 'vitest';
import type { Hangout, HangoutIdea } from '../types';
import {
  buildLocationSuggestions,
  collectUniqueLocations,
  compareLocationSummaries,
  filterLocationSuggestions,
  getLocationHistory,
  locationMatchesSearch,
} from './location-history';

const hangouts: Hangout[] = [
  {
    id: 'h1',
    friendIds: ['f1'],
    startTime: '2026-06-01T10:00',
    endTime: '2026-06-01T12:00',
    location: 'Central Park',
    type: 'Chill',
    notes: '',
    segments: [],
    createdAt: '2026-06-01',
  },
  {
    id: 'h2',
    friendIds: ['f1'],
    startTime: '2026-06-10T14:00',
    endTime: '2026-06-10T16:00',
    location: 'central park',
    type: 'Walk',
    notes: '',
    segments: [],
    createdAt: '2026-06-10',
  },
  {
    id: 'h3',
    friendIds: ['f1'],
    startTime: '2026-06-15T18:00',
    endTime: '2026-06-15T20:00',
    location: 'Coffee Shop',
    type: 'Chill',
    notes: '',
    segments: [
      {
        id: 's1',
        type: 'Study',
        friendIds: ['f1'],
        startTime: '',
        endTime: '',
        durationMinutes: 60,
        location: 'Library',
        notes: '',
      },
    ],
    createdAt: '2026-06-15',
  },
];

const ideas: HangoutIdea[] = [
  {
    id: 'i1',
    title: 'Museum',
    type: 'Chill',
    estimatedCost: 'Free',
    estimatedDurationMinutes: 120,
    location: 'Art Museum',
    priority: 3,
    status: 'Want to Try',
    friendIds: [],
    notes: '',
    links: [],
    isFavorite: false,
    createdAt: '2026-05-01T10:00',
  },
];

describe('buildLocationSuggestions', () => {
  it('deduplicates locations case-insensitively and counts visits', () => {
    const suggestions = buildLocationSuggestions(hangouts, ideas);
    const park = suggestions.find((s) => s.location.toLowerCase() === 'central park');
    expect(park?.visitCount).toBe(2);
    expect(suggestions.find((s) => s.location === 'Library')?.visitCount).toBe(1);
    expect(suggestions.find((s) => s.location === 'Art Museum')?.ideaCount).toBe(1);
  });

  it('sorts by visit count then recency then alphabetically', () => {
    const suggestions = buildLocationSuggestions(hangouts, ideas);
    expect(suggestions[0].visitCount).toBeGreaterThanOrEqual(suggestions[1].visitCount);
  });

  it('filters by search query', () => {
    const all = buildLocationSuggestions(hangouts, ideas);
    const filtered = filterLocationSuggestions(all, 'library');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].location).toBe('Library');
  });

  it('includes favorite-only locations', () => {
    const suggestions = buildLocationSuggestions(hangouts, [], ['Home']);
    expect(suggestions.some((s) => s.location === 'Home' && s.isFavorite)).toBe(true);
  });
});

describe('getLocationHistory', () => {
  it('merges case variants and sorts by usage', () => {
    const history = getLocationHistory(hangouts);
    const park = history.find((h) => h.location.toLowerCase() === 'central park');
    expect(park?.visitCount).toBe(2);
    expect(history.sort(compareLocationSummaries)).toEqual(history);
  });
});

describe('collectUniqueLocations', () => {
  it('returns sorted unique location names from hangouts and ideas', () => {
    const locs = collectUniqueLocations(hangouts, ideas);
    expect(locs).toContain('Art Museum');
    expect(locs.filter((l) => l.toLowerCase() === 'central park')).toHaveLength(1);
  });
});

describe('locationMatchesSearch', () => {
  it('matches substring in location name', () => {
    expect(
      locationMatchesSearch(
        { location: 'Central Park', visitCount: 1, ideaCount: 0, lastVisit: '', isFavorite: false },
        'park'
      )
    ).toBe(true);
  });
});
