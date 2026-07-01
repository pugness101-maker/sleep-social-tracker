import { describe, expect, it, vi } from 'vitest';
import {
  defaultStatsDateRange,
  loadStatsDateRange,
  presetToStoredRange,
  resolveStatsDateRange,
  saveStatsDateRange,
} from './stats-date-range';

describe('resolveStatsDateRange', () => {
  const now = new Date('2026-07-01T12:00:00');

  it('returns unfiltered for all time', () => {
    const resolved = resolveStatsDateRange(defaultStatsDateRange, now);
    expect(resolved.isFiltered).toBe(false);
    expect(resolved.start).toBeNull();
    expect(resolved.label).toBe('Showing all time');
  });

  it('resolves today', () => {
    const resolved = resolveStatsDateRange(presetToStoredRange('today', now), now);
    expect(resolved.isFiltered).toBe(true);
    expect(resolved.start?.getDate()).toBe(1);
    expect(resolved.end?.getDate()).toBe(1);
  });

  it('resolves last 7 days', () => {
    const resolved = resolveStatsDateRange(presetToStoredRange('last_7_days', now), now);
    expect(resolved.isFiltered).toBe(true);
    expect(resolved.start?.getDate()).toBe(25);
    expect(resolved.end?.getDate()).toBe(1);
  });

  it('resolves custom range', () => {
    const resolved = resolveStatsDateRange(
      { preset: 'custom', startDate: '2026-04-01', endDate: '2026-07-01' },
      now
    );
    expect(resolved.isFiltered).toBe(true);
    expect(resolved.label).toBe('Showing Apr 1 – Jul 1, 2026');
  });
});

describe('stats date range storage', () => {
  it('round-trips through localStorage', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });

    const stored = { preset: 'last_30_days' as const, startDate: '2026-06-01', endDate: '2026-07-01' };
    saveStatsDateRange(stored);
    expect(loadStatsDateRange()).toEqual(stored);
    saveStatsDateRange(defaultStatsDateRange);
  });
});
