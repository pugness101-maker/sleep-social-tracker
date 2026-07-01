import { describe, expect, it, vi } from 'vitest';
import {
  comparePresetToStoredRanges,
  loadStatsCompareSettings,
  resolveComparePresetRanges,
} from './stats-compare-mode';

describe('stats-compare-mode', () => {
  const now = new Date('2026-07-01T12:00:00');

  it('resolves week vs last week preset', () => {
    const { a, b } = resolveComparePresetRanges('this_week_vs_last', { preset: 'custom', startDate: '', endDate: '' }, { preset: 'custom', startDate: '', endDate: '' }, now);
    expect(a.start).toBeTruthy();
    expect(b.end!.getTime()).toBeLessThan(a.start!.getTime());
    expect(a.label).toContain('Range A');
    expect(b.label).toContain('Range B');
  });

  it('stores preset ranges as date inputs', () => {
    const stored = comparePresetToStoredRanges('this_month_vs_last', now);
    expect(stored.rangeA.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(stored.rangeB.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('loads default settings when storage empty', () => {
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
    const settings = loadStatsCompareSettings();
    expect(settings.mode).toBe('single');
    expect(settings.comparePreset).toBe('this_week_vs_last');
  });
});
