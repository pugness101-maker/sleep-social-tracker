import {
  eachDayOfInterval,
  endOfDay,
  format,
  startOfDay,
  startOfWeek,
  subDays,
} from 'date-fns';
import { calcDurationMinutes, formatTime, getDay, isInRange, parseISO } from './dates';
import {
  calcSleepDebtMinutes,
  formatSleepDebt,
  getRecommendedBedtimeMinutes,
  timeStringToMinutes,
} from './sleep-goals';
import type { AppSettings, SleepEntry } from '../types';

export type HeatmapMode = 'duration' | 'debt' | 'goal_met';

export interface CircadianPoint {
  dateKey: string;
  dateLabel: string;
  bedtimeMinutes: number;
  wakeMinutes: number;
  durationMinutes: number;
  metGoal: boolean;
}

export interface HeatmapDay {
  date: Date;
  dateKey: string;
  dateLabel: string;
  dayOfMonth: number;
  durationMinutes: number | null;
  debtMinutes: number | null;
  metGoal: boolean | null;
  hasData: boolean;
  bedtimeLabel: string | null;
  wakeLabel: string | null;
}

export interface DebtCalendarDay {
  dateKey: string;
  dateLabel: string;
  debtMinutes: number | null;
  label: string;
  hasData: boolean;
}

export interface StreakStats {
  current: number;
  longest: number;
}

export interface BestSleepAnalysis {
  bestSleepDay: { date: string; durationMinutes: number } | null;
  bestWeekday: { weekday: number; label: string; avgMinutes: number } | null;
  longestSleep: { date: string; durationMinutes: number } | null;
  mostConsistentWeek: { weekLabel: string; stdDevMinutes: number } | null;
  mostRecoveredDay: { date: string; surplusMinutes: number } | null;
  lowestDebtDay: { date: string; debtMinutes: number } | null;
  highestDebtDay: { date: string; debtMinutes: number } | null;
}

export interface ConsistencyBreakdown {
  overall: number;
  bedtime: number;
  wakeUp: number;
  duration: number;
}

export interface SleepInsights {
  consistency: {
    last7: ConsistencyBreakdown;
    last30: ConsistencyBreakdown;
    range: ConsistencyBreakdown;
  };
  circadian: CircadianPoint[];
  heatmapDays: HeatmapDay[];
  bedtimeByWeekday: Record<number, number | null>;
  wakeByWeekday: Record<number, number | null>;
  debtCalendarDays: DebtCalendarDay[];
  goalStreaks: StreakStats;
  wakeStreaks: StreakStats;
  bestDays: BestSleepAnalysis;
  goalMinutes: number;
  targetWakeMinutes: number;
  goalBedtimeMinutes: number;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function timeOfDayMinutes(iso: string): number {
  const d = parseISO(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/** Normalize bedtime so late-night times cluster correctly (after-midnight → evening). */
export function normalizeBedtimeMinutes(minutes: number): number {
  if (minutes < 12 * 60) return minutes + 24 * 60;
  return minutes;
}

function consistencyFromStdDev(stdMinutes: number, maxStd = 120): number {
  return Math.round(Math.max(0, Math.min(100, 100 - (stdMinutes / maxStd) * 100)));
}

export function calcConsistencyBreakdown(entries: SleepEntry[]): ConsistencyBreakdown {
  if (entries.length === 0) return { overall: 0, bedtime: 0, wakeUp: 0, duration: 0 };
  if (entries.length === 1) return { overall: 100, bedtime: 100, wakeUp: 100, duration: 100 };

  const bedtimes = entries.map((e) => normalizeBedtimeMinutes(timeOfDayMinutes(e.sleepStart)));
  const wakeups = entries.map((e) => timeOfDayMinutes(e.wakeUp));
  const durations = entries.map((e) => calcDurationMinutes(e.sleepStart, e.wakeUp));

  const bedtime = consistencyFromStdDev(stdDev(bedtimes));
  const wakeUp = consistencyFromStdDev(stdDev(wakeups));
  const duration = consistencyFromStdDev(stdDev(durations), 180);

  const overall = Math.round(bedtime * 0.4 + wakeUp * 0.4 + duration * 0.2);
  return { overall, bedtime, wakeUp, duration };
}

/** @deprecated use calcConsistencyBreakdown */
export function calcScheduleConsistencyScore(entries: SleepEntry[]): number {
  return calcConsistencyBreakdown(entries).overall;
}

function sortByWake(entries: SleepEntry[]): SleepEntry[] {
  return [...entries].sort(
    (a, b) => parseISO(a.wakeUp).getTime() - parseISO(b.wakeUp).getTime()
  );
}

function anchorEnd(rangeEnd?: Date): Date {
  return rangeEnd ? endOfDay(rangeEnd) : endOfDay(new Date());
}

function filterLastNDays(
  entries: SleepEntry[],
  days: number,
  end: Date,
  rangeStart?: Date
): SleepEntry[] {
  const windowStart = startOfDay(subDays(end, days - 1));
  return entries.filter((e) => {
    const wake = parseISO(e.wakeUp);
    if (wake < windowStart || wake > end) return false;
    if (rangeStart && wake < rangeStart) return false;
    return true;
  });
}

function entryMetGoal(entry: SleepEntry, goalMinutes: number): boolean {
  const actual = calcDurationMinutes(entry.sleepStart, entry.wakeUp);
  return actual >= goalMinutes;
}

function entryWakeOnTime(entry: SleepEntry, targetWakeMinutes: number): boolean {
  return timeOfDayMinutes(entry.wakeUp) <= targetWakeMinutes;
}

function calcStreaks(
  sortedEntries: SleepEntry[],
  predicate: (entry: SleepEntry) => boolean
): StreakStats {
  if (sortedEntries.length === 0) return { current: 0, longest: 0 };

  let longest = 0;
  let run = 0;
  for (const entry of sortedEntries) {
    if (predicate(entry)) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  let current = 0;
  for (let i = sortedEntries.length - 1; i >= 0; i--) {
    if (predicate(sortedEntries[i])) current++;
    else break;
  }

  return { current, longest };
}

function weekdayDurationAvgs(entries: SleepEntry[]): Record<number, number[]> {
  const byDay: Record<number, number[]> = {};
  for (const e of entries) {
    const day = getDay(parseISO(e.wakeUp));
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(calcDurationMinutes(e.sleepStart, e.wakeUp));
  }
  return byDay;
}

function weekdayTimeAvgs(
  entries: SleepEntry[],
  field: 'sleepStart' | 'wakeUp',
  normalizeBed = false
): Record<number, number | null> {
  const sums: Record<number, { total: number; count: number }> = {};
  for (const e of entries) {
    const day = getDay(parseISO(e.wakeUp));
    let mins = field === 'sleepStart' ? timeOfDayMinutes(e.sleepStart) : timeOfDayMinutes(e.wakeUp);
    if (normalizeBed && field === 'sleepStart') mins = normalizeBedtimeMinutes(mins);
    if (!sums[day]) sums[day] = { total: 0, count: 0 };
    sums[day].total += mins;
    sums[day].count++;
  }
  const result: Record<number, number | null> = {};
  for (let d = 0; d < 7; d++) {
    result[d] = sums[d] ? sums[d].total / sums[d].count : null;
  }
  return result;
}

function buildHeatmapDays(
  entries: SleepEntry[],
  goalMinutes: number,
  rangeStart?: Date,
  rangeEnd?: Date
): HeatmapDay[] {
  const end = anchorEnd(rangeEnd);
  const start = rangeStart
    ? startOfDay(rangeStart)
    : startOfDay(subDays(end, 89));

  const byWakeDate = new Map<string, SleepEntry>();
  for (const e of entries) {
    const key = format(startOfDay(parseISO(e.wakeUp)), 'yyyy-MM-dd');
    byWakeDate.set(key, e);
  }

  return eachDayOfInterval({ start, end }).map((date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const entry = byWakeDate.get(dateKey);
    if (!entry) {
      return {
        date,
        dateKey,
        dateLabel: format(date, 'MMM d'),
        dayOfMonth: date.getDate(),
        durationMinutes: null,
        debtMinutes: null,
        metGoal: null,
        hasData: false,
        bedtimeLabel: null,
        wakeLabel: null,
      };
    }
    const duration = calcDurationMinutes(entry.sleepStart, entry.wakeUp);
    const debt = calcSleepDebtMinutes(goalMinutes, duration);
    return {
      date,
      dateKey,
      dateLabel: format(date, 'MMM d'),
      dayOfMonth: date.getDate(),
      durationMinutes: duration,
      debtMinutes: debt,
      metGoal: debt <= 0,
      hasData: true,
      bedtimeLabel: formatTime(entry.sleepStart),
      wakeLabel: formatTime(entry.wakeUp),
    };
  });
}

function buildDebtCalendar(entries: SleepEntry[], goalMinutes: number): DebtCalendarDay[] {
  return sortByWake(entries).map((entry) => {
    const duration = calcDurationMinutes(entry.sleepStart, entry.wakeUp);
    const debt = calcSleepDebtMinutes(goalMinutes, duration);
    return {
      dateKey: format(startOfDay(parseISO(entry.wakeUp)), 'yyyy-MM-dd'),
      dateLabel: format(parseISO(entry.wakeUp), 'MMM d'),
      debtMinutes: debt,
      label: formatSleepDebt(debt),
      hasData: true,
    };
  });
}

function buildBestDaysAnalysis(entries: SleepEntry[], goalMinutes: number): BestSleepAnalysis {
  if (entries.length === 0) {
    return {
      bestSleepDay: null,
      bestWeekday: null,
      longestSleep: null,
      mostConsistentWeek: null,
      mostRecoveredDay: null,
      lowestDebtDay: null,
      highestDebtDay: null,
    };
  }

  let bestEntry = entries[0];
  let bestDuration = calcDurationMinutes(bestEntry.sleepStart, bestEntry.wakeUp);
  for (const e of entries) {
    const d = calcDurationMinutes(e.sleepStart, e.wakeUp);
    if (d > bestDuration) {
      bestDuration = d;
      bestEntry = e;
    }
  }

  const byWeekday = weekdayDurationAvgs(entries);
  let bestWeekday: BestSleepAnalysis['bestWeekday'] = null;
  let bestWeekdayAvg = -1;
  for (const [dayStr, vals] of Object.entries(byWeekday)) {
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (avg > bestWeekdayAvg) {
      bestWeekdayAvg = avg;
      const day = Number(dayStr);
      bestWeekday = { weekday: day, label: WEEKDAY_LABELS[day], avgMinutes: avg };
    }
  }

  const weekBuckets = new Map<string, number[]>();
  for (const e of entries) {
    const weekKey = format(startOfWeek(parseISO(e.wakeUp), { weekStartsOn: 0 }), 'yyyy-MM-dd');
    const dur = calcDurationMinutes(e.sleepStart, e.wakeUp);
    const list = weekBuckets.get(weekKey) ?? [];
    list.push(dur);
    weekBuckets.set(weekKey, list);
  }

  let mostConsistentWeek: BestSleepAnalysis['mostConsistentWeek'] = null;
  let lowestWeekStd = Infinity;
  for (const [weekKey, durs] of weekBuckets) {
    if (durs.length < 2) continue;
    const sd = stdDev(durs);
    if (sd < lowestWeekStd) {
      lowestWeekStd = sd;
      mostConsistentWeek = {
        weekLabel: format(parseISO(`${weekKey}T12:00`), 'MMM d') + ' week',
        stdDevMinutes: Math.round(sd),
      };
    }
  }

  let mostRecovered: BestSleepAnalysis['mostRecoveredDay'] = null;
  let lowestDebt: BestSleepAnalysis['lowestDebtDay'] = null;
  let highestDebt: BestSleepAnalysis['highestDebtDay'] = null;
  let bestSurplus = -Infinity;
  let minDebt = Infinity;
  let maxDebt = -Infinity;

  for (const e of entries) {
    const duration = calcDurationMinutes(e.sleepStart, e.wakeUp);
    const debt = calcSleepDebtMinutes(goalMinutes, duration);
    const date = format(parseISO(e.wakeUp), 'MMM d, yyyy');

    if (-debt > bestSurplus) {
      bestSurplus = -debt;
      mostRecovered = { date, surplusMinutes: -debt };
    }
    if (debt < minDebt) {
      minDebt = debt;
      lowestDebt = { date, debtMinutes: debt };
    }
    if (debt > maxDebt) {
      maxDebt = debt;
      highestDebt = { date, debtMinutes: debt };
    }
  }

  return {
    bestSleepDay: {
      date: format(parseISO(bestEntry.wakeUp), 'MMM d, yyyy'),
      durationMinutes: bestDuration,
    },
    bestWeekday,
    longestSleep: {
      date: format(parseISO(bestEntry.wakeUp), 'MMM d, yyyy'),
      durationMinutes: bestDuration,
    },
    mostConsistentWeek,
    mostRecoveredDay: mostRecovered,
    lowestDebtDay: lowestDebt,
    highestDebtDay: highestDebt,
  };
}

export function getSleepInsights(
  entries: SleepEntry[],
  settings: Pick<AppSettings, 'sleepGoalHours' | 'targetWakeUpTime' | 'targetBedtime'>,
  rangeStart?: Date,
  rangeEnd?: Date
): SleepInsights {
  const goalMinutes = settings.sleepGoalHours * 60;
  const targetWakeMinutes = timeStringToMinutes(settings.targetWakeUpTime);
  const goalBedtimeMinutes = getRecommendedBedtimeMinutes({
    targetWakeUpTime: settings.targetWakeUpTime,
    sleepGoalHours: settings.sleepGoalHours,
  });

  let rangeEntries = sortByWake(entries);
  if (rangeStart && rangeEnd) {
    rangeEntries = rangeEntries.filter((e) => isInRange(e.wakeUp, rangeStart, rangeEnd));
  }

  const end = anchorEnd(rangeEnd);
  const last7 = filterLastNDays(rangeEntries, 7, end, rangeStart);
  const last30 = filterLastNDays(rangeEntries, 30, end, rangeStart);

  const sorted = sortByWake(rangeEntries);

  return {
    consistency: {
      last7: calcConsistencyBreakdown(last7),
      last30: calcConsistencyBreakdown(last30),
      range: calcConsistencyBreakdown(rangeEntries),
    },
    circadian: sorted.map((e) => {
      const duration = calcDurationMinutes(e.sleepStart, e.wakeUp);
      const debt = calcSleepDebtMinutes(goalMinutes, duration);
      return {
        dateKey: format(startOfDay(parseISO(e.wakeUp)), 'yyyy-MM-dd'),
        dateLabel: format(parseISO(e.wakeUp), 'MMM d'),
        bedtimeMinutes: normalizeBedtimeMinutes(timeOfDayMinutes(e.sleepStart)),
        wakeMinutes: timeOfDayMinutes(e.wakeUp),
        durationMinutes: duration,
        metGoal: debt <= 0,
      };
    }),
    heatmapDays: buildHeatmapDays(rangeEntries, goalMinutes, rangeStart, rangeEnd),
    bedtimeByWeekday: weekdayTimeAvgs(rangeEntries, 'sleepStart', true),
    wakeByWeekday: weekdayTimeAvgs(rangeEntries, 'wakeUp'),
    debtCalendarDays: buildDebtCalendar(rangeEntries, goalMinutes),
    goalStreaks: calcStreaks(sorted, (e) => entryMetGoal(e, goalMinutes)),
    wakeStreaks: calcStreaks(sorted, (e) => entryWakeOnTime(e, targetWakeMinutes)),
    bestDays: buildBestDaysAnalysis(rangeEntries, goalMinutes),
    goalMinutes,
    targetWakeMinutes,
    goalBedtimeMinutes,
  };
}

export function sleepCalendarCellStyle(day: HeatmapDay): { background: string; borderColor: string } {
  if (!day.hasData) {
    return { background: 'var(--bg)', borderColor: 'var(--border)' };
  }
  const debt = day.debtMinutes ?? 0;
  if (debt <= 0) {
    return { background: 'rgba(52, 211, 153, 0.14)', borderColor: 'rgba(52, 211, 153, 0.35)' };
  }
  if (debt < 60) {
    return { background: 'rgba(234, 179, 8, 0.14)', borderColor: 'rgba(234, 179, 8, 0.35)' };
  }
  return { background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.35)' };
}

/** @deprecated use sleepCalendarCellStyle */
export function heatmapCellColor(day: HeatmapDay, mode: HeatmapMode, goalMinutes: number): string {
  if (!day.hasData) return 'var(--bg)';
  if (mode === 'goal_met') {
    return day.metGoal ? 'rgba(52, 211, 153, 0.75)' : 'rgba(148, 163, 184, 0.35)';
  }
  if (mode === 'debt') {
    const debt = day.debtMinutes ?? 0;
    if (debt <= 0) return `rgba(52, 211, 153, ${Math.min(0.9, 0.4 + (-debt / goalMinutes) * 0.5)})`;
    return `rgba(239, 68, 68, ${Math.min(0.9, 0.3 + (debt / goalMinutes) * 0.6)})`;
  }
  const ratio = Math.min(1.5, (day.durationMinutes ?? 0) / goalMinutes);
  return `rgba(99, 102, 241, ${0.2 + ratio * 0.6})`;
}

export function formatDebtCalendarShort(debtMinutes: number): string {
  if (debtMinutes === 0) return 'Met goal';
  const abs = Math.abs(debtMinutes);
  const h = Math.floor(abs / 60);
  const m = Math.round(abs % 60);
  const time = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
  return debtMinutes > 0 ? `${time} debt` : `${time} over`;
}

export { WEEKDAY_LABELS };
