import type { AppData, Friend, Hangout, SleepEntry } from '../types';
import {
  calcDurationMinutes,
  getWeekRange,
  getMonthRange,
  isInRange,
  parseISO,
  getDay,
  subDays,
  format,
  isSameDay,
} from './dates';

export function getLastWakeUp(data: AppData): string | null {
  const { activeTimers, sleepEntries } = data;
  if (activeTimers.sleepStart) return null;
  const sorted = [...sleepEntries].sort(
    (a, b) => parseISO(b.wakeUp).getTime() - parseISO(a.wakeUp).getTime()
  );
  return sorted[0]?.wakeUp ?? null;
}

export function getAwakeMs(data: AppData, now = Date.now()): number {
  const lastWake = getLastWakeUp(data);
  if (!lastWake) {
    if (data.activeTimers.sleepStart) return 0;
    return 0;
  }
  return Math.max(0, now - parseISO(lastWake).getTime());
}

export function getLastNightSleep(data: AppData): SleepEntry | null {
  const today = new Date();
  const sorted = [...data.sleepEntries].sort(
    (a, b) => parseISO(b.sleepStart).getTime() - parseISO(a.sleepStart).getTime()
  );
  return sorted.find((e) => {
    const wake = parseISO(e.wakeUp);
    return wake <= today;
  }) ?? sorted[0] ?? null;
}

export function getTodayWakeUp(data: AppData): string | null {
  const last = getLastNightSleep(data);
  if (!last) return null;
  if (isSameDay(parseISO(last.wakeUp), new Date())) return last.wakeUp;
  return null;
}

export function getTodayNapTotal(data: AppData): number {
  const today = new Date();
  return data.napEntries
    .filter((n) => isSameDay(parseISO(n.napStart), today))
    .reduce((sum, n) => sum + calcDurationMinutes(n.napStart, n.napEnd), 0);
}

export function getTodayHangouts(data: AppData): Hangout[] {
  const today = new Date();
  return data.hangouts.filter((h) => isSameDay(parseISO(h.startTime), today));
}

export function getSocialHoursThisWeek(data: AppData): number {
  const { start, end } = getWeekRange();
  const minutes = data.hangouts
    .filter((h) => isInRange(h.startTime, start, end))
    .reduce((sum, h) => sum + calcDurationMinutes(h.startTime, h.endTime), 0);
  return minutes / 60;
}

export function getAverageSleepThisWeek(data: AppData): number {
  const { start, end } = getWeekRange();
  const entries = data.sleepEntries.filter((s) => isInRange(s.sleepStart, start, end));
  if (entries.length === 0) return 0;
  const total = entries.reduce(
    (sum, s) => sum + calcDurationMinutes(s.sleepStart, s.wakeUp),
    0
  );
  return total / entries.length;
}

export function getFriendStats(friendId: string, hangouts: Hangout[]) {
  const friendHangouts = hangouts.filter((h) => h.friendIds.includes(friendId));
  const totalMinutes = friendHangouts.reduce(
    (sum, h) => sum + calcDurationMinutes(h.startTime, h.endTime),
    0
  );
  const lastHangout = friendHangouts.sort(
    (a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime()
  )[0];
  return {
    totalHangouts: friendHangouts.length,
    totalHours: totalMinutes / 60,
    avgDuration: friendHangouts.length ? totalMinutes / friendHangouts.length : 0,
    lastHangout: lastHangout?.startTime ?? null,
  };
}

export function getAwakeStats(data: AppData) {
  const sorted = [...data.sleepEntries].sort(
    (a, b) => parseISO(a.sleepStart).getTime() - parseISO(b.sleepStart).getTime()
  );

  const awakePeriods: number[] = [];
  let longestStreak = 0;

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    const prevWake = i > 0 ? sorted[i - 1].wakeUp : null;
    if (prevWake) {
      const awakeMin = calcDurationMinutes(prevWake, entry.sleepStart);
      awakePeriods.push(awakeMin);
      longestStreak = Math.max(longestStreak, awakeMin);
    }
  }

  const currentAwake = getAwakeMs(data) / 60000;
  if (currentAwake > 0) {
    awakePeriods.push(currentAwake);
    longestStreak = Math.max(longestStreak, currentAwake);
  }

  const avgAwake = awakePeriods.length
    ? awakePeriods.reduce((a, b) => a + b, 0) / awakePeriods.length
    : 0;

  const lastSleep = sorted[sorted.length - 1];
  const awakeBeforeBed = lastSleep && data.activeTimers.sleepStart
    ? calcDurationMinutes(lastSleep.wakeUp, data.activeTimers.sleepStart)
    : currentAwake;

  return { avgAwake, longestStreak, awakeBeforeBed, currentAwake };
}

// Sleep statistics
export function getSleepStats(data: AppData, rangeStart?: Date, rangeEnd?: Date) {
  let entries = [...data.sleepEntries];
  if (rangeStart && rangeEnd) {
    entries = entries.filter((s) => isInRange(s.sleepStart, rangeStart, rangeEnd));
  }

  const durations = entries.map((s) => calcDurationMinutes(s.sleepStart, s.wakeUp));
  const total = durations.reduce((a, b) => a + b, 0);
  const avg = durations.length ? total / durations.length : 0;

  const bedtimes = entries.map((s) => {
    const d = parseISO(s.sleepStart);
    return d.getHours() * 60 + d.getMinutes();
  });
  const wakeups = entries.map((s) => {
    const d = parseISO(s.wakeUp);
    return d.getHours() * 60 + d.getMinutes();
  });

  const avgBedtime = bedtimes.length ? bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length : 0;
  const avgWake = wakeups.length ? wakeups.reduce((a, b) => a + b, 0) / wakeups.length : 0;

  const byWeekday: Record<number, number[]> = {};
  entries.forEach((s) => {
    const day = getDay(parseISO(s.sleepStart));
    if (!byWeekday[day]) byWeekday[day] = [];
    byWeekday[day].push(calcDurationMinutes(s.sleepStart, s.wakeUp));
  });

  const weekdayAvgs = Object.fromEntries(
    Object.entries(byWeekday).map(([d, vals]) => [d, vals.reduce((a, b) => a + b, 0) / vals.length])
  );

  const goalMinutes = data.settings.sleepGoalHours * 60;
  const sleepDebt = entries.reduce((debt, s) => {
    const dur = calcDurationMinutes(s.sleepStart, s.wakeUp);
    return debt + Math.max(0, goalMinutes - dur);
  }, 0);

  const consistency = durations.length > 1
    ? 100 - Math.min(100, stdDev(durations) / 60 * 10)
    : 100;

  return {
    total,
    avg,
    avgBedtime,
    avgWake,
    longest: durations.length ? Math.max(...durations) : 0,
    shortest: durations.length ? Math.min(...durations) : 0,
    consistency,
    sleepDebt,
    weekdayAvgs,
    count: entries.length,
  };
}

export function getNapStats(data: AppData, rangeStart?: Date, rangeEnd?: Date) {
  let entries = [...data.napEntries];
  if (rangeStart && rangeEnd) {
    entries = entries.filter((n) => isInRange(n.napStart, rangeStart, rangeEnd));
  }
  const durations = entries.map((n) => calcDurationMinutes(n.napStart, n.napEnd));
  return {
    totalNaps: entries.length,
    totalTime: durations.reduce((a, b) => a + b, 0),
    avgDuration: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
  };
}

export function getSocialStats(data: AppData, rangeStart?: Date, rangeEnd?: Date) {
  let hangouts = [...data.hangouts];
  if (rangeStart && rangeEnd) {
    hangouts = hangouts.filter((h) => isInRange(h.startTime, rangeStart, rangeEnd));
  }

  const durations = hangouts.map((h) => calcDurationMinutes(h.startTime, h.endTime));
  const totalMinutes = durations.reduce((a, b) => a + b, 0);

  const friendCounts: Record<string, number> = {};
  hangouts.forEach((h) => {
    h.friendIds.forEach((fid) => {
      friendCounts[fid] = (friendCounts[fid] ?? 0) + 1;
    });
  });

  const byType: Record<string, number> = {};
  hangouts.forEach((h) => {
    byType[h.type] = (byType[h.type] ?? 0) + 1;
  });

  const lastHangout = hangouts.sort(
    (a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime()
  )[0];

  const daysSinceLast = lastHangout
    ? Math.floor((Date.now() - parseISO(lastHangout.startTime).getTime()) / 86400000)
    : null;

  return {
    totalHangouts: hangouts.length,
    totalHours: totalMinutes / 60,
    avgDuration: durations.length ? totalMinutes / durations.length : 0,
    friendCounts,
    daysSinceLast,
    byType,
  };
}

export function getMonthlyTrends(data: AppData, months = 6) {
  const sleepTrend: { label: string; minutes: number; count: number }[] = [];
  const socialTrend: { label: string; minutes: number; count: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = subDays(new Date(), i * 30);
    const { start, end } = getMonthRange(date);
    const label = format(start, 'MMM yyyy');

    const sleepEntries = data.sleepEntries.filter((s) => isInRange(s.sleepStart, start, end));
    const sleepMin = sleepEntries.reduce(
      (sum, s) => sum + calcDurationMinutes(s.sleepStart, s.wakeUp),
      0
    );
    sleepTrend.push({ label, minutes: sleepMin, count: sleepEntries.length });

    const hangouts = data.hangouts.filter((h) => isInRange(h.startTime, start, end));
    const socialMin = hangouts.reduce(
      (sum, h) => sum + calcDurationMinutes(h.startTime, h.endTime),
      0
    );
    socialTrend.push({ label, minutes: socialMin, count: hangouts.length });
  }

  return { sleepTrend, socialTrend };
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function enrichFriend(friend: Friend, hangouts: Hangout[]) {
  return { ...friend, ...getFriendStats(friend.id, hangouts) };
}

export function getRecentActivity(data: AppData, limit = 8) {
  const items: { id: string; type: string; title: string; timestamp: string; detail: string }[] = [];

  data.sleepEntries.forEach((s) => {
    items.push({
      id: s.id,
      type: 'sleep',
      title: 'Sleep logged',
      timestamp: s.wakeUp,
      detail: `${formatDuration(calcDurationMinutes(s.sleepStart, s.wakeUp))} sleep`,
    });
  });

  data.napEntries.forEach((n) => {
    items.push({
      id: n.id,
      type: 'nap',
      title: 'Nap logged',
      timestamp: n.napEnd,
      detail: `${formatDuration(calcDurationMinutes(n.napStart, n.napEnd))} nap`,
    });
  });

  data.hangouts.forEach((h) => {
    const names = h.friendIds
      .map((fid) => data.friends.find((f) => f.id === fid)?.name ?? 'Unknown')
      .join(', ');
    items.push({
      id: h.id,
      type: 'hangout',
      title: `Hangout with ${names || 'friends'}`,
      timestamp: h.endTime,
      detail: h.type,
    });
  });

  return items
    .sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime())
    .slice(0, limit);
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}
