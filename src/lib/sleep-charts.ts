import { addDays, endOfDay, endOfMonth, format, startOfDay, startOfMonth, subDays } from 'date-fns';
import { calcDurationMinutes, formatTime, isInRange, parseISO } from './dates';
import { calcSleepDebtMinutes, formatSleepDebt } from './sleep-goals';
import { normalizeBedtimeMinutes, timeOfDayMinutes } from './sleep-insights';
import type { SleepEntry } from '../types';

export interface SleepTrendDayPoint {
  dateKey: string;
  label: string;
  hours: number;
  durationMinutes: number;
  debtMinutes: number | null;
  hasData: boolean;
}

export interface SleepTrendMonthPoint {
  label: string;
  avgHours: number;
  count: number;
}

export interface ScheduleTrendPoint {
  dateKey: string;
  label: string;
  bedtimeMinutes: number;
  wakeMinutes: number;
  durationMinutes: number;
  debtMinutes: number;
}

/** Map clock time to evening→morning chart scale (handles after-midnight bedtimes). */
export function toScheduleChartMinutes(minutes: number): number {
  const m = minutes % (24 * 60);
  if (m < 12 * 60) return m + 24 * 60;
  return m;
}

export const SCHEDULE_CHART_Y_MIN = 18 * 60;
export const SCHEDULE_CHART_Y_MAX = 36 * 60;

export function build7DaySleepTrend(
  entries: SleepEntry[],
  goalMinutes: number,
  rangeEnd?: Date,
  days = 7
): SleepTrendDayPoint[] {
  const end = rangeEnd ? endOfDay(rangeEnd) : endOfDay(new Date());
  const byWakeDate = new Map<string, SleepEntry>();

  for (const entry of entries) {
    const key = format(startOfDay(parseISO(entry.wakeUp)), 'yyyy-MM-dd');
    byWakeDate.set(key, entry);
  }

  const result: SleepTrendDayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = startOfDay(subDays(end, i));
    const dateKey = format(date, 'yyyy-MM-dd');
    const entry = byWakeDate.get(dateKey);
    if (!entry) {
      result.push({
        dateKey,
        label: format(date, 'MMM d'),
        hours: 0,
        durationMinutes: 0,
        debtMinutes: null,
        hasData: false,
      });
      continue;
    }
    const durationMinutes = calcDurationMinutes(entry.sleepStart, entry.wakeUp);
    const debtMinutes = calcSleepDebtMinutes(goalMinutes, durationMinutes);
    result.push({
      dateKey,
      label: format(date, 'MMM d'),
      hours: durationMinutes / 60,
      durationMinutes,
      debtMinutes,
      hasData: true,
    });
  }
  return result;
}

export function buildMonthlySleepTrend(
  entries: SleepEntry[],
  months = 6,
  rangeStart?: Date,
  rangeEnd?: Date
): SleepTrendMonthPoint[] {
  const buckets: SleepTrendMonthPoint[] = [];

  if (rangeStart && rangeEnd) {
    let cursor = startOfMonth(rangeStart);
    while (cursor <= rangeEnd) {
      const bucketStart = cursor < rangeStart ? rangeStart : startOfMonth(cursor);
      const bucketEnd = endOfMonth(cursor) > rangeEnd ? rangeEnd : endOfMonth(cursor);
      buckets.push(buildMonthBucket(entries, format(cursor, 'MMM yyyy'), bucketStart, bucketEnd));
      cursor = addDays(endOfMonth(cursor), 1);
    }
    return buckets;
  }

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = startOfMonth(subDays(new Date(), i * 28));
    const monthEnd = endOfMonth(monthStart);
    buckets.push(buildMonthBucket(entries, format(monthStart, 'MMM yyyy'), monthStart, monthEnd));
  }
  return buckets;
}

function buildMonthBucket(
  entries: SleepEntry[],
  label: string,
  bucketStart: Date,
  bucketEnd: Date
): SleepTrendMonthPoint {
  const inRange = entries.filter((e) => isInRange(e.wakeUp, bucketStart, bucketEnd));
  const totalMinutes = inRange.reduce(
    (sum, e) => sum + calcDurationMinutes(e.sleepStart, e.wakeUp),
    0
  );
  return {
    label,
    avgHours: inRange.length > 0 ? totalMinutes / inRange.length / 60 : 0,
    count: inRange.length,
  };
}

export function buildScheduleTrend(
  entries: SleepEntry[],
  goalMinutes: number,
  rangeStart?: Date,
  rangeEnd?: Date
): ScheduleTrendPoint[] {
  let list = [...entries].sort(
    (a, b) => parseISO(a.wakeUp).getTime() - parseISO(b.wakeUp).getTime()
  );
  if (rangeStart && rangeEnd) {
    list = list.filter((e) => isInRange(e.wakeUp, rangeStart, rangeEnd));
  }
  return list.map((entry) => {
    const durationMinutes = calcDurationMinutes(entry.sleepStart, entry.wakeUp);
    const debtMinutes = calcSleepDebtMinutes(goalMinutes, durationMinutes);
    const wakeDate = parseISO(entry.wakeUp);
    return {
      dateKey: format(startOfDay(wakeDate), 'yyyy-MM-dd'),
      label: format(wakeDate, 'MMM d'),
      bedtimeMinutes: normalizeBedtimeMinutes(timeOfDayMinutes(entry.sleepStart)),
      wakeMinutes: toScheduleChartMinutes(timeOfDayMinutes(entry.wakeUp)),
      durationMinutes,
      debtMinutes,
    };
  });
}

export function formatTrendDebtLabel(debtMinutes: number | null): string {
  if (debtMinutes == null) return '—';
  if (debtMinutes === 0) return 'Met goal';
  return formatSleepDebt(debtMinutes);
}

export function formatTrendHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatScheduleRange(bedIso: string, wakeIso: string): string {
  return `${formatTime(bedIso)} → ${formatTime(wakeIso)}`;
}
