import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
} from 'date-fns';

export const STATS_DATE_RANGE_STORAGE_KEY = 'sleep-social-tracker-stats-date-range';

export type StatsDatePreset =
  | 'all_time'
  | 'today'
  | 'this_week'
  | 'last_7_days'
  | 'this_month'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_year'
  | 'custom';

export interface StatsDateRange {
  preset: StatsDatePreset;
  startDate: string;
  endDate: string;
}

export interface ResolvedStatsDateRange {
  start: Date | null;
  end: Date | null;
  preset: StatsDatePreset;
  label: string;
  isFiltered: boolean;
}

export const STATS_DATE_PRESETS: { id: StatsDatePreset; label: string }[] = [
  { id: 'all_time', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'last_90_days', label: 'Last 90 Days' },
  { id: 'this_year', label: 'This Year' },
  { id: 'custom', label: 'Custom' },
];

export const defaultStatsDateRange: StatsDateRange = {
  preset: 'all_time',
  startDate: '',
  endDate: '',
};

export function toDateInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatStatsRangeLabel(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const startFmt = sameYear ? format(start, 'MMM d') : format(start, 'MMM d, yyyy');
  const endFmt = format(end, 'MMM d, yyyy');
  return `Showing ${startFmt} – ${endFmt}`;
}

export function resolveStatsDateRange(range: StatsDateRange, now = new Date()): ResolvedStatsDateRange {
  if (range.preset === 'all_time') {
    return {
      start: null,
      end: null,
      preset: 'all_time',
      label: 'Showing all time',
      isFiltered: false,
    };
  }

  let start: Date;
  let end: Date;

  switch (range.preset) {
    case 'today':
      start = startOfDay(now);
      end = endOfDay(now);
      break;
    case 'this_week':
      start = startOfWeek(now, { weekStartsOn: 0 });
      end = endOfWeek(now, { weekStartsOn: 0 });
      break;
    case 'last_7_days':
      start = startOfDay(subDays(now, 6));
      end = endOfDay(now);
      break;
    case 'this_month':
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    case 'last_30_days':
      start = startOfDay(subDays(now, 29));
      end = endOfDay(now);
      break;
    case 'last_90_days':
      start = startOfDay(subDays(now, 89));
      end = endOfDay(now);
      break;
    case 'this_year':
      start = startOfYear(now);
      end = endOfYear(now);
      break;
    case 'custom':
      if (!range.startDate || !range.endDate) {
        return resolveStatsDateRange({ ...defaultStatsDateRange, preset: 'all_time' }, now);
      }
      start = startOfDay(parseISO(`${range.startDate}T00:00:00`));
      end = endOfDay(parseISO(`${range.endDate}T00:00:00`));
      if (start > end) {
        [start, end] = [endOfDay(start), startOfDay(end)];
      }
      break;
    default:
      return resolveStatsDateRange(defaultStatsDateRange, now);
  }

  return {
    start,
    end,
    preset: range.preset,
    label: formatStatsRangeLabel(start, end),
    isFiltered: true,
  };
}

export function presetToStoredRange(preset: StatsDatePreset, now = new Date()): StatsDateRange {
  if (preset === 'all_time') return { ...defaultStatsDateRange };
  if (preset === 'custom') {
    return {
      preset: 'custom',
      startDate: toDateInputValue(subDays(now, 29)),
      endDate: toDateInputValue(now),
    };
  }
  const resolved = resolveStatsDateRange({ preset, startDate: '', endDate: '' }, now);
  return {
    preset,
    startDate: resolved.start ? toDateInputValue(resolved.start) : '',
    endDate: resolved.end ? toDateInputValue(resolved.end) : '',
  };
}

export function loadStatsDateRange(): StatsDateRange {
  try {
    const raw = localStorage.getItem(STATS_DATE_RANGE_STORAGE_KEY);
    if (!raw) return { ...defaultStatsDateRange };
    const parsed = JSON.parse(raw) as Partial<StatsDateRange>;
    return {
      preset: parsed.preset ?? 'all_time',
      startDate: parsed.startDate ?? '',
      endDate: parsed.endDate ?? '',
    };
  } catch {
    return { ...defaultStatsDateRange };
  }
}

export function saveStatsDateRange(range: StatsDateRange): void {
  localStorage.setItem(STATS_DATE_RANGE_STORAGE_KEY, JSON.stringify(range));
}

export function hasActiveStatsRange(resolved: ResolvedStatsDateRange): boolean {
  return resolved.isFiltered && resolved.start != null && resolved.end != null;
}
