import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns';
import type { ResolvedStatsDateRange, StatsDateRange } from './stats-date-range';
import { formatStatsRangeLabel, resolveStatsDateRange, toDateInputValue } from './stats-date-range';

export const STATS_COMPARE_STORAGE_KEY = 'sleep-social-tracker-stats-compare';

export type StatsCompareMode = 'single' | 'compare';

export type ComparePreset =
  | 'this_week_vs_last'
  | 'this_month_vs_last'
  | 'this_year_vs_last'
  | 'custom';

export interface StatsCompareSettings {
  mode: StatsCompareMode;
  comparePreset: ComparePreset;
  rangeA: StatsDateRange;
  rangeB: StatsDateRange;
}

export const COMPARE_PRESETS: { id: ComparePreset; label: string }[] = [
  { id: 'this_week_vs_last', label: 'This Week vs Last Week' },
  { id: 'this_month_vs_last', label: 'This Month vs Last Month' },
  { id: 'this_year_vs_last', label: 'This Year vs Last Year' },
  { id: 'custom', label: 'Custom Range A vs B' },
];

export const defaultStatsCompareSettings: StatsCompareSettings = {
  mode: 'single',
  comparePreset: 'this_week_vs_last',
  rangeA: { preset: 'this_week', startDate: '', endDate: '' },
  rangeB: { preset: 'custom', startDate: '', endDate: '' },
};

export function resolveComparePresetRanges(
  preset: ComparePreset,
  customA: StatsDateRange,
  customB: StatsDateRange,
  now = new Date()
): { a: ResolvedStatsDateRange; b: ResolvedStatsDateRange } {
  switch (preset) {
    case 'this_week_vs_last': {
      const aStart = startOfWeek(now, { weekStartsOn: 0 });
      const aEnd = endOfWeek(now, { weekStartsOn: 0 });
      const bEnd = endOfDay(subDays(aStart, 1));
      const bStart = startOfWeek(bEnd, { weekStartsOn: 0 });
      return {
        a: {
          start: aStart,
          end: aEnd,
          preset: 'this_week',
          label: `Range A: ${formatStatsRangeLabel(aStart, aEnd)}`,
          isFiltered: true,
        },
        b: {
          start: bStart,
          end: bEnd,
          preset: 'custom',
          label: `Range B: ${formatStatsRangeLabel(bStart, bEnd)}`,
          isFiltered: true,
        },
      };
    }
    case 'this_month_vs_last': {
      const aStart = startOfMonth(now);
      const aEnd = endOfMonth(now);
      const bEnd = endOfDay(subDays(aStart, 1));
      const bStart = startOfMonth(bEnd);
      return {
        a: {
          start: aStart,
          end: aEnd,
          preset: 'this_month',
          label: `Range A: ${formatStatsRangeLabel(aStart, aEnd)}`,
          isFiltered: true,
        },
        b: {
          start: bStart,
          end: bEnd,
          preset: 'custom',
          label: `Range B: ${formatStatsRangeLabel(bStart, bEnd)}`,
          isFiltered: true,
        },
      };
    }
    case 'this_year_vs_last': {
      const aStart = startOfYear(now);
      const aEnd = endOfYear(now);
      const bEnd = endOfDay(subDays(aStart, 1));
      const bStart = startOfYear(bEnd);
      return {
        a: {
          start: aStart,
          end: aEnd,
          preset: 'this_year',
          label: `Range A: ${formatStatsRangeLabel(aStart, aEnd)}`,
          isFiltered: true,
        },
        b: {
          start: bStart,
          end: bEnd,
          preset: 'custom',
          label: `Range B: ${formatStatsRangeLabel(bStart, bEnd)}`,
          isFiltered: true,
        },
      };
    }
    case 'custom': {
      const a = resolveStatsDateRange(
        customA.preset === 'all_time'
          ? { preset: 'custom', startDate: toDateInputValue(subDays(now, 29)), endDate: toDateInputValue(now) }
          : customA,
        now
      );
      const b = resolveStatsDateRange(
        customB.preset === 'all_time'
          ? { preset: 'custom', startDate: toDateInputValue(subDays(now, 59)), endDate: toDateInputValue(subDays(now, 30)) }
          : customB,
        now
      );
      return {
        a: { ...a, label: a.start && a.end ? `Range A: ${formatStatsRangeLabel(a.start, a.end)}` : 'Range A: —' },
        b: { ...b, label: b.start && b.end ? `Range B: ${formatStatsRangeLabel(b.start, b.end)}` : 'Range B: —' },
      };
    }
    default:
      return resolveComparePresetRanges('this_week_vs_last', customA, customB, now);
  }
}

export function comparePresetToStoredRanges(preset: ComparePreset, now = new Date()): Pick<StatsCompareSettings, 'rangeA' | 'rangeB'> {
  const { a, b } = resolveComparePresetRanges(preset, defaultStatsCompareSettings.rangeA, defaultStatsCompareSettings.rangeB, now);
  return {
    rangeA: {
      preset: preset === 'custom' ? 'custom' : a.preset,
      startDate: a.start ? toDateInputValue(a.start) : '',
      endDate: a.end ? toDateInputValue(a.end) : '',
    },
    rangeB: {
      preset: 'custom',
      startDate: b.start ? toDateInputValue(b.start) : '',
      endDate: b.end ? toDateInputValue(b.end) : '',
    },
  };
}

export function loadStatsCompareSettings(): StatsCompareSettings {
  try {
    const raw = localStorage.getItem(STATS_COMPARE_STORAGE_KEY);
    if (!raw) return { ...defaultStatsCompareSettings };
    const parsed = JSON.parse(raw) as Partial<StatsCompareSettings>;
    return {
      mode: parsed.mode === 'compare' ? 'compare' : 'single',
      comparePreset: parsed.comparePreset ?? defaultStatsCompareSettings.comparePreset,
      rangeA: { ...defaultStatsCompareSettings.rangeA, ...parsed.rangeA },
      rangeB: { ...defaultStatsCompareSettings.rangeB, ...parsed.rangeB },
    };
  } catch {
    return { ...defaultStatsCompareSettings };
  }
}

export function saveStatsCompareSettings(settings: StatsCompareSettings): void {
  localStorage.setItem(STATS_COMPARE_STORAGE_KEY, JSON.stringify(settings));
}

/** Sync custom B dates when preset changes away from custom */
export function initCustomCompareRanges(now = new Date()): Pick<StatsCompareSettings, 'rangeA' | 'rangeB'> {
  const aEnd = endOfWeek(now, { weekStartsOn: 0 });
  const aStart = startOfWeek(now, { weekStartsOn: 0 });
  const bEnd = endOfDay(subDays(aStart, 1));
  const bStart = startOfWeek(bEnd, { weekStartsOn: 0 });
  return {
    rangeA: { preset: 'custom', startDate: toDateInputValue(aStart), endDate: toDateInputValue(aEnd) },
    rangeB: { preset: 'custom', startDate: toDateInputValue(bStart), endDate: toDateInputValue(bEnd) },
  };
}

export function shiftRangeByPreset(base: StatsDateRange, direction: -1 | 1): StatsDateRange {
  if (base.preset === 'custom' && base.startDate && base.endDate) {
    const start = parseISO(`${base.startDate}T00:00:00`);
    const end = parseISO(`${base.endDate}T00:00:00`);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    const delta = direction * days;
    return {
      preset: 'custom',
      startDate: toDateInputValue(subDays(start, delta)),
      endDate: toDateInputValue(subDays(end, delta)),
    };
  }
  return base;
}

export { subMonths, subWeeks, subYears };
