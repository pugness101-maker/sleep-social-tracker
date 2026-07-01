import {
  addDays,
  endOfMonth,
  format,
  getDay,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns';
import {
  calcDurationMinutes,
  getMonthRange,
  getWeekRange,
  isInRange,
} from './dates';
import {
  getAwakeStats,
  getMonthlyTrends,
  getNapStats,
  getSleepDebtStats,
  getSleepStats,
  getSocialStats,
} from './stats';
import { getFriendActivitySummary, getFriendMinutesInHangout } from './friend-activity';
import { friendInHangout } from './hangout-segments';
import { getLocationHistory } from './location-history';
import { countActiveFriends, filterFriendsByArchiveFilter } from './friend-archive';
import type { AppData, Friend, Hangout, SleepEntry } from '../types';

export interface TrendPoint {
  label: string;
  value: number;
  count?: number;
}

export interface LabeledValue {
  label: string;
  value: number;
}

export interface FriendRankingRow {
  friendId: string;
  name: string;
  hangouts: number;
  hours: number;
  lastSeen: string | null;
}

export interface StatisticsBundle {
  overview: {
    totalSleepMinutes: number;
    totalHangouts: number;
    totalFriends: number;
    totalAwakeMinutes: number;
    sleepGoalPercent: number;
    sleepConsistency: number;
    totalHangoutHours: number;
    avgHangoutMinutes: number;
  };
  sleep: {
    total: number;
    avg: number;
    longest: number;
    shortest: number;
    goalProgress: number;
    consistency: number;
    avgBedtime: number;
    avgWake: number;
    weekdayBedtime: number | null;
    weekendBedtime: number | null;
    weekdayWake: number | null;
    weekendWake: number | null;
    debtDaily: number | null;
    debtWeekly: number;
    debtMonthly: number;
    debtLifetime: number;
    naps: ReturnType<typeof getNapStats>;
    dailyTrend7: TrendPoint[];
    monthlySleepTrend: TrendPoint[];
  };
  social: {
    friends: {
      total: number;
      active: number;
      archived: number;
      newInRange: number;
      seenThisMonth: number;
      notSeenRecently: number;
    };
    hangouts: {
      total: number;
      hoursThisWeek: number;
      hoursThisMonth: number;
      avgDuration: number;
      longest: number;
      shortest: number;
      totalHours: number;
    };
    activities: {
      byCategory: LabeledValue[];
      byType: LabeledValue[];
      topCategory: string | null;
      topType: string | null;
    };
    people: {
      mostSeen: FriendRankingRow[];
      leastSeen: FriendRankingRow[];
      ranking: FriendRankingRow[];
      groupHangoutPct: number;
      soloHangoutPct: number;
    };
    locations: {
      topLocations: LabeledValue[];
      uniqueCount: number;
      favoriteRestaurants: LabeledValue[];
      favoriteSpots: LabeledValue[];
    };
    hoursByWeek: TrendPoint[];
    hoursByMonth: TrendPoint[];
  };
  combined: {
    avgSleepAfterHangout: number | null;
    avgSleepAfterNoHangout: number | null;
    sleepByCategory: LabeledValue[];
    sleepByFriend: LabeledValue[];
    sleepByWeekday: LabeledValue[];
    avgAwakeBeforeHangout: number | null;
    longestAwakeBeforeHangout: number | null;
    avgSleepAfterLateHangout: number | null;
    avgSleepAfterExercise: number | null;
    consistencyWithSocial: { label: string; consistency: number; hangouts: number }[];
  };
  trends: {
    monthlySleep: TrendPoint[];
    monthlyHangouts: TrendPoint[];
    friendGrowth: TrendPoint[];
    hangoutFrequency: TrendPoint[];
    consistencyTrend: TrendPoint[];
    debtTrend: TrendPoint[];
    categoryTrend: Record<string, TrendPoint[]>;
    timeWithFriends: TrendPoint[];
  };
}

function filterSleepEntries(data: AppData, start?: Date, end?: Date): SleepEntry[] {
  let entries = [...data.sleepEntries];
  if (start && end) {
    entries = entries.filter((s) => isInRange(s.wakeUp, start, end));
  }
  return entries;
}

function filterHangouts(data: AppData, start?: Date, end?: Date): Hangout[] {
  let hangouts = [...data.hangouts];
  if (start && end) {
    hangouts = hangouts.filter((h) => isInRange(h.startTime, start, end));
  }
  return hangouts;
}

function isWeekendDay(day: number): boolean {
  return day === 0 || day === 6;
}

function avgTimeMinutes(entries: SleepEntry[], pick: 'bedtime' | 'wake', weekend: boolean | null): number | null {
  const filtered = entries.filter((s) => {
    const day = getDay(parseISO(s.wakeUp));
    if (weekend === null) return true;
    return weekend ? isWeekendDay(day) : !isWeekendDay(day);
  });
  if (filtered.length === 0) return null;
  const values = filtered.map((s) => {
    const d = parseISO(pick === 'bedtime' ? s.sleepStart : s.wakeUp);
    return d.getHours() * 60 + d.getMinutes();
  });
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function hangoutDayKeys(hangouts: Hangout[]): Set<string> {
  const keys = new Set<string>();
  for (const h of hangouts) {
    keys.add(format(startOfDay(parseISO(h.startTime)), 'yyyy-MM-dd'));
  }
  return keys;
}

function previousDayKey(wakeUp: string): string {
  return format(subDays(startOfDay(parseISO(wakeUp)), 1), 'yyyy-MM-dd');
}

function buildFriendRanking(friends: Friend[], hangouts: Hangout[]): FriendRankingRow[] {
  return friends
    .map((friend) => {
      const summary = getFriendActivitySummary(friend.id, hangouts);
      let minutes = 0;
      for (const h of hangouts) {
        if (friendInHangout(friend.id, h)) minutes += getFriendMinutesInHangout(friend.id, h);
      }
      return {
        friendId: friend.id,
        name: friend.name,
        hangouts: summary.totalHangouts,
        hours: minutes / 60,
        lastSeen: summary.lastSeen,
      };
    })
    .sort((a, b) => b.hangouts - a.hangouts || b.hours - a.hours);
}

function getDailySleepTrend(entries: SleepEntry[], days = 7): TrendPoint[] {
  const byDay: Record<string, number> = {};
  for (const s of entries) {
    const key = format(startOfDay(parseISO(s.wakeUp)), 'MMM d');
    byDay[key] = (byDay[key] ?? 0) + calcDurationMinutes(s.sleepStart, s.wakeUp);
  }
  return Object.entries(byDay)
    .slice(-days)
    .map(([label, value]) => ({ label, value }));
}

function hoursInPeriod(hangouts: Hangout[], periodStart: Date, periodEnd: Date, rangeStart?: Date, rangeEnd?: Date): number {
  const start = rangeStart && rangeStart > periodStart ? rangeStart : periodStart;
  const end = rangeEnd && rangeEnd < periodEnd ? rangeEnd : periodEnd;
  if (start > end) return 0;
  const minutes = hangouts
    .filter((h) => isInRange(h.startTime, start, end))
    .reduce((sum, h) => sum + calcDurationMinutes(h.startTime, h.endTime), 0);
  return minutes / 60;
}

function countByCategory(hangouts: Hangout[]): LabeledValue[] {
  const counts: Record<string, number> = {};
  for (const h of hangouts) {
    const cat = h.category || 'Other';
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function countByType(hangouts: Hangout[]): LabeledValue[] {
  const counts: Record<string, number> = {};
  for (const h of hangouts) {
    counts[h.type] = (counts[h.type] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function buildCombinedStats(data: AppData, sleepEntries: SleepEntry[], hangouts: Hangout[]) {
  const hangoutDays = hangoutDayKeys(hangouts);
  const afterHangout: number[] = [];
  const afterNoHangout: number[] = [];
  const afterLate: number[] = [];
  const afterExercise: number[] = [];
  const awakeBefore: number[] = [];

  const hangoutsByDay = new Map<string, Hangout[]>();
  for (const h of hangouts) {
    const key = format(startOfDay(parseISO(h.startTime)), 'yyyy-MM-dd');
    if (!hangoutsByDay.has(key)) hangoutsByDay.set(key, []);
    hangoutsByDay.get(key)!.push(h);
  }

  const sortedSleep = [...sleepEntries].sort(
    (a, b) => parseISO(a.sleepStart).getTime() - parseISO(b.sleepStart).getTime()
  );

  for (const entry of sortedSleep) {
    const duration = calcDurationMinutes(entry.sleepStart, entry.wakeUp);
    const prevKey = previousDayKey(entry.wakeUp);
    if (hangoutDays.has(prevKey)) afterHangout.push(duration);
    else afterNoHangout.push(duration);

    const prevHangouts = hangoutsByDay.get(prevKey) ?? [];
    const hadLate = prevHangouts.some((h) => {
      const end = parseISO(h.endTime || h.startTime);
      return end.getHours() >= 22 || end.getHours() < 4;
    });
    if (hadLate) afterLate.push(duration);

    const hadExercise = prevHangouts.some(
      (h) => h.category === 'Fitness' || h.type === 'Gym' || h.type === 'Workout'
    );
    if (hadExercise) afterExercise.push(duration);
  }

  for (const h of hangouts) {
    const hangoutStart = parseISO(h.startTime);
    const priorSleep = sortedSleep
      .filter((s) => parseISO(s.wakeUp) < hangoutStart)
      .sort((a, b) => parseISO(b.wakeUp).getTime() - parseISO(a.wakeUp).getTime())[0];
    if (priorSleep) {
      const awakeMin = calcDurationMinutes(priorSleep.wakeUp, h.startTime);
      if (awakeMin > 0) awakeBefore.push(awakeMin);
    }
  }

  const sleepByCategoryMap: Record<string, number[]> = {};
  for (const entry of sleepEntries) {
    const prevKey = previousDayKey(entry.wakeUp);
    const prev = hangoutsByDay.get(prevKey)?.[0];
    if (!prev) continue;
    const cat = prev.category || 'Other';
    if (!sleepByCategoryMap[cat]) sleepByCategoryMap[cat] = [];
    sleepByCategoryMap[cat].push(calcDurationMinutes(entry.sleepStart, entry.wakeUp));
  }

  const sleepByFriendMap: Record<string, number[]> = {};
  for (const entry of sleepEntries) {
    const prevKey = previousDayKey(entry.wakeUp);
    const prevList = hangoutsByDay.get(prevKey) ?? [];
    const friendIds = new Set<string>();
    prevList.forEach((h) => h.friendIds.forEach((id) => friendIds.add(id)));
    for (const fid of friendIds) {
      if (!sleepByFriendMap[fid]) sleepByFriendMap[fid] = [];
      sleepByFriendMap[fid].push(calcDurationMinutes(entry.sleepStart, entry.wakeUp));
    }
  }

  const sleepByWeekdayMap: Record<number, number[]> = {};
  for (const entry of sleepEntries) {
    const day = getDay(parseISO(entry.wakeUp));
    if (!sleepByWeekdayMap[day]) sleepByWeekdayMap[day] = [];
    sleepByWeekdayMap[day].push(calcDurationMinutes(entry.sleepStart, entry.wakeUp));
  }

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  const consistencyWithSocial: { label: string; consistency: number; hangouts: number }[] = [];
  const monthBuckets = new Map<string, { durations: number[]; hangouts: number }>();
  for (const s of sleepEntries) {
    const label = format(startOfMonth(parseISO(s.wakeUp)), 'MMM yyyy');
    if (!monthBuckets.has(label)) monthBuckets.set(label, { durations: [], hangouts: 0 });
    monthBuckets.get(label)!.durations.push(calcDurationMinutes(s.sleepStart, s.wakeUp));
  }
  for (const h of hangouts) {
    const label = format(startOfMonth(parseISO(h.startTime)), 'MMM yyyy');
    if (!monthBuckets.has(label)) monthBuckets.set(label, { durations: [], hangouts: 0 });
    monthBuckets.get(label)!.hangouts += 1;
  }
  for (const [label, bucket] of monthBuckets) {
    if (bucket.durations.length < 2) continue;
    const mean = bucket.durations.reduce((a, b) => a + b, 0) / bucket.durations.length;
    const variance =
      bucket.durations.reduce((sum, d) => sum + (d - mean) ** 2, 0) / bucket.durations.length;
    const consistency = Math.max(0, 100 - Math.min(100, Math.sqrt(variance) / 60 * 10));
    consistencyWithSocial.push({ label, consistency: Math.round(consistency), hangouts: bucket.hangouts });
  }

  return {
    avgSleepAfterHangout: avg(afterHangout),
    avgSleepAfterNoHangout: avg(afterNoHangout),
    sleepByCategory: Object.entries(sleepByCategoryMap).map(([label, vals]) => ({
      label,
      value: avg(vals) ?? 0,
    })),
    sleepByFriend: Object.entries(sleepByFriendMap).map(([fid, vals]) => ({
      label: data.friends.find((f) => f.id === fid)?.name ?? 'Unknown',
      value: avg(vals) ?? 0,
    })),
    sleepByWeekday: Object.entries(sleepByWeekdayMap).map(([day, vals]) => ({
      label: weekdayNames[Number(day)],
      value: avg(vals) ?? 0,
    })),
    avgAwakeBeforeHangout: avg(awakeBefore),
    longestAwakeBeforeHangout: awakeBefore.length ? Math.max(...awakeBefore) : null,
    avgSleepAfterLateHangout: avg(afterLate),
    avgSleepAfterExercise: avg(afterExercise),
    consistencyWithSocial: consistencyWithSocial.sort((a, b) => a.label.localeCompare(b.label)),
  };
}

export function buildStatisticsBundle(
  data: AppData,
  rangeStart?: Date,
  rangeEnd?: Date
): StatisticsBundle {
  const sleep = getSleepStats(data, rangeStart, rangeEnd);
  const debtStats = getSleepDebtStats(data, rangeStart, rangeEnd);
  const naps = getNapStats(data, rangeStart, rangeEnd);
  const social = getSocialStats(data, rangeStart, rangeEnd);
  const awake = getAwakeStats(data, rangeStart, rangeEnd);
  const monthlyTrends = getMonthlyTrends(data, 6, rangeStart, rangeEnd);
  const sleepEntries = filterSleepEntries(data, rangeStart, rangeEnd);
  const hangouts = filterHangouts(data, rangeStart, rangeEnd);

  const durations = hangouts.map((h) => calcDurationMinutes(h.startTime, h.endTime));
  const { start: weekStart, end: weekEnd } = getWeekRange();
  const { start: monthStart, end: monthEnd } = getMonthRange();

  const allFriends = data.friends;
  const activeFriends = countActiveFriends(allFriends);
  const archivedFriends = filterFriendsByArchiveFilter(allFriends, 'archived').length;

  const newInRange = allFriends.filter((f) => {
    if (rangeStart && rangeEnd) return isInRange(f.createdAt, rangeStart, rangeEnd);
    return isInRange(f.createdAt, monthStart, monthEnd);
  }).length;

  const seenThisMonth = new Set<string>();
  const monthHangouts = data.hangouts.filter((h) => isInRange(h.startTime, monthStart, monthEnd));
  monthHangouts.forEach((h) => h.friendIds.forEach((id) => seenThisMonth.add(id)));

  const notSeenRecently = allFriends.filter((f) => {
    if (f.isArchived) return false;
    const summary = getFriendActivitySummary(f.id, data.hangouts);
    return summary.daysSinceSeen == null || summary.daysSinceSeen > 30;
  }).length;

  const ranking = buildFriendRanking(allFriends, hangouts);
  const withFriends = hangouts.filter((h) => h.friendIds.length > 0);
  const solo = withFriends.filter((h) => h.friendIds.length === 1);
  const group = withFriends.filter((h) => h.friendIds.length > 1);

  const locations = getLocationHistory(hangouts, 50);
  const foodLocations = locations.filter(
    (l) => l.mostCommonType === 'Food' || l.mostCommonType === 'Dinner' || l.mostCommonType === 'Lunch'
  );

  const byCategory = countByCategory(hangouts);
  const byType = countByType(hangouts);

  const combined = buildCombinedStats(data, sleepEntries, hangouts);

  const friendGrowthMap: Record<string, number> = {};
  for (const f of allFriends) {
    const label = format(startOfMonth(parseISO(f.createdAt)), 'MMM yyyy');
    friendGrowthMap[label] = (friendGrowthMap[label] ?? 0) + 1;
  }
  let cumulative = 0;
  const friendGrowth = Object.entries(friendGrowthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => {
      cumulative += count;
      return { label, value: cumulative, count };
    });

  const categoryTrend: Record<string, TrendPoint[]> = {};
  const categories = [...new Set(hangouts.map((h) => h.category || 'Other'))];
  for (const cat of categories) {
    categoryTrend[cat] = monthlyTrends.socialTrend.map((t) => ({ label: t.label, value: 0 }));
  }
  if (rangeStart && rangeEnd) {
    let cursor = startOfMonth(rangeStart);
    while (cursor <= rangeEnd) {
      const bucketStart = cursor < rangeStart ? rangeStart : startOfMonth(cursor);
      const bucketEnd = endOfMonth(cursor) > rangeEnd ? rangeEnd : endOfMonth(cursor);
      const label = format(cursor, 'MMM yyyy');
      for (const cat of categories) {
        const count = hangouts.filter(
          (h) =>
            (h.category || 'Other') === cat && isInRange(h.startTime, bucketStart, bucketEnd)
        ).length;
        if (!categoryTrend[cat]) categoryTrend[cat] = [];
        categoryTrend[cat].push({ label, value: count });
      }
      cursor = addDays(endOfMonth(cursor), 1);
    }
  }

  const debtTrend = monthlyTrends.sleepTrend.map((t) => ({
    label: t.label,
    value: t.count > 0 ? Math.round(t.minutes / t.count - sleep.goalMinutes) : 0,
  }));

  const consistencyTrend = monthlyTrends.sleepTrend.map((t) => ({
    label: t.label,
    value: t.count > 1 ? Math.max(0, 100 - Math.min(100, (t.minutes / t.count / 60) * 5)) : 100,
  }));

  const weeklySocialBuckets: TrendPoint[] = [];
  if (hangouts.length > 0) {
    const sorted = [...hangouts].sort(
      (a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime()
    );
    const first = startOfDay(parseISO(sorted[0].startTime));
    const last = startOfDay(parseISO(sorted[sorted.length - 1].startTime));
    let cursor = startOfDay(first);
    while (cursor <= last) {
      const weekEndDay = addDays(cursor, 6);
      const mins = hangouts
        .filter((h) => isInRange(h.startTime, cursor, weekEndDay))
        .reduce((s, h) => s + calcDurationMinutes(h.startTime, h.endTime), 0);
      weeklySocialBuckets.push({ label: format(cursor, 'MMM d'), value: mins / 60 });
      cursor = addDays(cursor, 7);
    }
  }

  return {
    overview: {
      totalSleepMinutes: sleep.total,
      totalHangouts: social.totalHangouts,
      totalFriends: allFriends.length,
      totalAwakeMinutes: awake.avgAwake * sleepEntries.length || awake.currentAwake,
      sleepGoalPercent: sleep.goalProgress,
      sleepConsistency: sleep.consistency,
      totalHangoutHours: social.totalHours,
      avgHangoutMinutes: social.avgDuration,
    },
    sleep: {
      total: sleep.total,
      avg: sleep.avg,
      longest: sleep.longest,
      shortest: sleep.shortest,
      goalProgress: sleep.goalProgress,
      consistency: sleep.consistency,
      avgBedtime: sleep.avgBedtime,
      avgWake: sleep.avgWake,
      weekdayBedtime: avgTimeMinutes(sleepEntries, 'bedtime', false),
      weekendBedtime: avgTimeMinutes(sleepEntries, 'bedtime', true),
      weekdayWake: avgTimeMinutes(sleepEntries, 'wake', false),
      weekendWake: avgTimeMinutes(sleepEntries, 'wake', true),
      debtDaily: debtStats.todaySleepDebt,
      debtWeekly: debtStats.weeklyDebt,
      debtMonthly: debtStats.monthlyDebt,
      debtLifetime: debtStats.totalDebt,
      naps,
      dailyTrend7: getDailySleepTrend(sleepEntries, 7),
      monthlySleepTrend: monthlyTrends.sleepTrend.map((t) => ({
        label: t.label,
        value: t.minutes,
        count: t.count,
      })),
    },
    social: {
      friends: {
        total: allFriends.length,
        active: activeFriends,
        archived: archivedFriends,
        newInRange,
        seenThisMonth: seenThisMonth.size,
        notSeenRecently,
      },
      hangouts: {
        total: social.totalHangouts,
        hoursThisWeek: hoursInPeriod(hangouts, weekStart, weekEnd, rangeStart, rangeEnd),
        hoursThisMonth: hoursInPeriod(hangouts, monthStart, monthEnd, rangeStart, rangeEnd),
        avgDuration: social.avgDuration,
        longest: durations.length ? Math.max(...durations) : 0,
        shortest: durations.length ? Math.min(...durations) : 0,
        totalHours: social.totalHours,
      },
      activities: {
        byCategory,
        byType,
        topCategory: byCategory[0]?.label ?? null,
        topType: byType[0]?.label ?? null,
      },
      people: {
        mostSeen: ranking.filter((r) => r.hangouts > 0).slice(0, 5),
        leastSeen: [...ranking].filter((r) => r.hangouts > 0).reverse().slice(0, 5),
        ranking,
        groupHangoutPct: withFriends.length ? (group.length / withFriends.length) * 100 : 0,
        soloHangoutPct: withFriends.length ? (solo.length / withFriends.length) * 100 : 0,
      },
      locations: {
        topLocations: locations.slice(0, 8).map((l) => ({ label: l.location, value: l.visitCount })),
        uniqueCount: locations.length,
        favoriteRestaurants: foodLocations.slice(0, 5).map((l) => ({ label: l.location, value: l.visitCount })),
        favoriteSpots: locations.slice(0, 5).map((l) => ({ label: l.location, value: l.totalHours })),
      },
      hoursByWeek: weeklySocialBuckets.slice(-8),
      hoursByMonth: monthlyTrends.socialTrend.map((t) => ({ label: t.label, value: t.minutes / 60 })),
    },
    combined,
    trends: {
      monthlySleep: monthlyTrends.sleepTrend.map((t) => ({ label: t.label, value: t.minutes / 60 })),
      monthlyHangouts: monthlyTrends.socialTrend.map((t) => ({ label: t.label, value: t.count })),
      friendGrowth,
      hangoutFrequency: monthlyTrends.socialTrend.map((t) => ({ label: t.label, value: t.count })),
      consistencyTrend,
      debtTrend,
      categoryTrend,
      timeWithFriends: monthlyTrends.socialTrend.map((t) => ({ label: t.label, value: t.minutes / 60 })),
    },
  };
}
