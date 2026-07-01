import {
  differenceInDays,
  format,
  formatDistanceToNow,
  getDay,
  parseISO,
  startOfDay,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { calcDurationMinutes, formatDuration, weekdayLabel } from './dates';
import {
  friendInHangout,
  getHangoutDisplayType,
  getSegmentEffectiveDurationMinutes,
  getSegmentFriendIds,
  getSegmentSeenTime,
} from './hangout-segments';
import type { Friend, Hangout } from '../types';

export type FriendSortOption =
  | 'name'
  | 'last_seen_newest'
  | 'last_seen_oldest'
  | 'hangouts'
  | 'hours'
  | 'created_newest'
  | 'created_oldest'
  | 'birthday';

export interface FriendActivitySummary {
  totalHangouts: number;
  totalHours: number;
  avgDuration: number;
  lastSeen: string | null;
  firstHangout: string | null;
  daysSinceSeen: number | null;
}

export interface FriendDetailedStats extends FriendActivitySummary {
  lastHangoutStart: string | null;
  longestHangoutMinutes: number;
  shortestHangoutMinutes: number;
  mostCommonType: string | null;
  favoriteLocation: string | null;
  mostSeenWeekday: string | null;
  mostSeenTimeOfDay: string | null;
  longestGapDays: number | null;
  hangoutStreakWeeks: number;
}

export interface FriendHangoutTimelineItem {
  hangoutId: string;
  segmentId?: string;
  kind: 'hangout' | 'segment';
  date: string;
  type: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  location: string;
  otherFriends: { id: string; name: string }[];
}

export interface CatchUpFriend {
  friend: Friend;
  lastSeen: string | null;
  daysSinceSeen: number | null;
  totalHangouts: number;
}

/** Last Seen timestamp: endTime if present, otherwise startTime. */
export function getHangoutSeenTime(hangout: Pick<Hangout, 'startTime' | 'endTime'>): string {
  return hangout.endTime?.trim() || hangout.startTime;
}

export function getFriendHangouts(friendId: string, hangouts: Hangout[]): Hangout[] {
  return hangouts.filter((h) => friendInHangout(friendId, h));
}

export function getFriendMinutesInHangout(friendId: string, hangout: Hangout): number {
  if (hangout.friendIds.includes(friendId)) {
    return calcDurationMinutes(hangout.startTime, hangout.endTime);
  }
  let total = 0;
  for (const segment of hangout.segments ?? []) {
    if (getSegmentFriendIds(segment, hangout.friendIds).includes(friendId)) {
      total += getSegmentEffectiveDurationMinutes(segment);
    }
  }
  return total;
}

export function getFriendLastSeenInHangout(friendId: string, hangout: Hangout): string | null {
  if (!friendInHangout(friendId, hangout)) return null;
  if (hangout.friendIds.includes(friendId)) {
    return getHangoutSeenTime(hangout);
  }
  const segmentTimes = (hangout.segments ?? [])
    .filter((s) => getSegmentFriendIds(s, hangout.friendIds).includes(friendId))
    .map((s) => getSegmentSeenTime(s))
    .filter(Boolean);
  if (segmentTimes.length === 0) return getHangoutSeenTime(hangout);
  return segmentTimes.sort((a, b) => parseISO(b).getTime() - parseISO(a).getTime())[0];
}

export function getFriendLastSeen(friendId: string, hangouts: Hangout[]): string | null {
  const involved = getFriendHangouts(friendId, hangouts);
  if (involved.length === 0) return null;
  return involved
    .map((h) => getFriendLastSeenInHangout(friendId, h))
    .filter((t): t is string => !!t)
    .sort((a, b) => parseISO(b).getTime() - parseISO(a).getTime())[0];
}

export function getFriendFirstHangout(friendId: string, hangouts: Hangout[]): string | null {
  const friendHangouts = getFriendHangouts(friendId, hangouts);
  if (friendHangouts.length === 0) return null;
  return friendHangouts
    .map((h) => h.startTime)
    .sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime())[0];
}

export function daysSinceDate(iso: string, now = new Date()): number {
  return Math.max(0, differenceInDays(startOfDay(now), startOfDay(parseISO(iso))));
}

export function formatRelativeLastSeen(iso: string | null): string | null {
  if (!iso) return null;
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}

export function formatLastSeenLabel(iso: string | null): { relative: string | null; absolute: string | null } {
  if (!iso) return { relative: null, absolute: null };
  return {
    relative: formatRelativeLastSeen(iso),
    absolute: format(parseISO(iso), 'MMM d, yyyy'),
  };
}

function modeValue(counts: Record<string, number>): string | null {
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  return entries.sort(([, a], [, b]) => b - a)[0][0];
}

function weekStartKey(date: Date): string {
  return format(startOfWeek(date, { weekStartsOn: 0 }), 'yyyy-MM-dd');
}

function getHangoutStreakWeeks(friendId: string, friendHangouts: Hangout[]): number {
  if (friendHangouts.length === 0) return 0;
  const weeksWithHangouts = new Set(
    friendHangouts
      .map((h) => getFriendLastSeenInHangout(friendId, h))
      .filter((t): t is string => !!t)
      .map((t) => weekStartKey(parseISO(t)))
  );
  const mostRecent = [...weeksWithHangouts]
    .sort((a, b) => b.localeCompare(a))[0];
  if (!mostRecent) return 0;
  let cursor = parseISO(mostRecent);
  let streak = 0;
  while (weeksWithHangouts.has(weekStartKey(cursor))) {
    streak++;
    cursor = subWeeks(cursor, 1);
  }
  return streak;
}

function getLongestGapDays(sortedSeenTimes: string[]): number | null {
  if (sortedSeenTimes.length < 2) return null;
  let maxGap = 0;
  for (let i = 1; i < sortedSeenTimes.length; i++) {
    const gap = differenceInDays(parseISO(sortedSeenTimes[i]), parseISO(sortedSeenTimes[i - 1]));
    maxGap = Math.max(maxGap, gap);
  }
  return maxGap;
}

function nextBirthdaySortKey(birthday: string, now = new Date()): number {
  if (!birthday) return Number.MAX_SAFE_INTEGER;
  const b = parseISO(birthday);
  let next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
  if (next < startOfDay(now)) {
    next = new Date(now.getFullYear() + 1, b.getMonth(), b.getDate());
  }
  return differenceInDays(next, startOfDay(now));
}

export function getFriendActivitySummary(friendId: string, hangouts: Hangout[]): FriendActivitySummary {
  const friendHangouts = getFriendHangouts(friendId, hangouts);
  const totalMinutes = friendHangouts.reduce(
    (sum, h) => sum + getFriendMinutesInHangout(friendId, h),
    0
  );
  const lastSeen = getFriendLastSeen(friendId, hangouts);
  const firstTimes = friendHangouts
    .filter((h) => h.friendIds.includes(friendId))
    .map((h) => h.startTime);
  const segmentFirstTimes = friendHangouts.flatMap((h) =>
    (h.segments ?? [])
      .filter((s) => getSegmentFriendIds(s, h.friendIds).includes(friendId))
      .map((s) => s.startTime?.trim() || h.startTime)
  );
  const allFirst = [...firstTimes, ...segmentFirstTimes]
    .filter(Boolean)
    .sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime());

  return {
    totalHangouts: friendHangouts.length,
    totalHours: totalMinutes / 60,
    avgDuration: friendHangouts.length ? totalMinutes / friendHangouts.length : 0,
    lastSeen,
    firstHangout: allFirst[0] ?? null,
    daysSinceSeen: lastSeen ? daysSinceDate(lastSeen) : null,
  };
}

export function getFriendDetailedStats(friendId: string, hangouts: Hangout[]): FriendDetailedStats {
  const friendHangouts = getFriendHangouts(friendId, hangouts);
  const summary = getFriendActivitySummary(friendId, hangouts);
  const durations = friendHangouts.map((h) => getFriendMinutesInHangout(friendId, h));

  const typeCounts: Record<string, number> = {};
  const locationCounts: Record<string, number> = {};
  const weekdayCounts: Record<number, number> = {};
  const hourCounts: Record<number, number> = {};

  for (const hangout of friendHangouts) {
    if (hangout.friendIds.includes(friendId)) {
      const type = hangout.type;
      if (type) typeCounts[type] = (typeCounts[type] ?? 0) + 1;
    }
    for (const segment of hangout.segments ?? []) {
      if (!getSegmentFriendIds(segment, hangout.friendIds).includes(friendId)) continue;
      if (segment.type) typeCounts[segment.type] = (typeCounts[segment.type] ?? 0) + 1;
    }
    const loc = hangout.location?.trim();
    if (loc && hangout.friendIds.includes(friendId)) {
      locationCounts[loc] = (locationCounts[loc] ?? 0) + 1;
    }
    for (const segment of hangout.segments ?? []) {
      if (!getSegmentFriendIds(segment, hangout.friendIds).includes(friendId)) continue;
      const segLoc = segment.location?.trim() || loc;
      if (segLoc) locationCounts[segLoc] = (locationCounts[segLoc] ?? 0) + 1;
    }
    const involvementStart = hangout.friendIds.includes(friendId)
      ? parseISO(hangout.startTime)
      : null;
    if (involvementStart) {
      weekdayCounts[getDay(involvementStart)] = (weekdayCounts[getDay(involvementStart)] ?? 0) + 1;
      hourCounts[involvementStart.getHours()] = (hourCounts[involvementStart.getHours()] ?? 0) + 1;
    }
    for (const segment of hangout.segments ?? []) {
      if (!getSegmentFriendIds(segment, hangout.friendIds).includes(friendId)) continue;
      if (hangout.friendIds.includes(friendId)) continue;
      const segStart = segment.startTime?.trim() ? parseISO(segment.startTime) : parseISO(hangout.startTime);
      weekdayCounts[getDay(segStart)] = (weekdayCounts[getDay(segStart)] ?? 0) + 1;
      hourCounts[segStart.getHours()] = (hourCounts[segStart.getHours()] ?? 0) + 1;
    }
  }

  const seenTimes = friendHangouts
    .map((h) => getFriendLastSeenInHangout(friendId, h))
    .filter((t): t is string => !!t)
    .sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime());

  const mostSeenHour = modeValue(
    Object.fromEntries(Object.entries(hourCounts).map(([h, c]) => [h, c]))
  );

  const lastHangoutStart = friendHangouts.length
    ? friendHangouts
        .map((h) => h.startTime)
        .sort((a, b) => parseISO(b).getTime() - parseISO(a).getTime())[0]
    : null;

  const topWeekdayKey = modeValue(
    Object.fromEntries(Object.entries(weekdayCounts).map(([day, count]) => [String(day), count]))
  );

  return {
    ...summary,
    lastHangoutStart,
    longestHangoutMinutes: durations.length ? Math.max(...durations) : 0,
    shortestHangoutMinutes: durations.length ? Math.min(...durations) : 0,
    mostCommonType: modeValue(typeCounts),
    favoriteLocation: modeValue(locationCounts),
    mostSeenWeekday: topWeekdayKey != null ? weekdayLabel(Number(topWeekdayKey)) : null,
    mostSeenTimeOfDay: mostSeenHour != null ? formatHourLabel(Number(mostSeenHour)) : null,
    longestGapDays: getLongestGapDays(seenTimes),
    hangoutStreakWeeks: getHangoutStreakWeeks(friendId, friendHangouts),
  };
}

function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 || 12;
  return `${display}:00 ${period}`;
}

export function getFriendHangoutTimeline(
  friendId: string,
  hangouts: Hangout[],
  friends: Friend[],
  limit = 20
): FriendHangoutTimelineItem[] {
  const friendName = (id: string) => friends.find((f) => f.id === id)?.name ?? 'Unknown';
  const items: FriendHangoutTimelineItem[] = [];

  for (const hangout of getFriendHangouts(friendId, hangouts)) {
    if (hangout.friendIds.includes(friendId)) {
      items.push({
        hangoutId: hangout.id,
        kind: 'hangout',
        date: getHangoutSeenTime(hangout),
        type: getHangoutDisplayType(hangout),
        startTime: hangout.startTime,
        endTime: hangout.endTime,
        durationMinutes: calcDurationMinutes(hangout.startTime, hangout.endTime),
        location: hangout.location,
        otherFriends: hangout.friendIds
          .filter((id) => id !== friendId)
          .map((id) => ({ id, name: friendName(id) })),
      });
    }

    if (!hangout.friendIds.includes(friendId)) {
      for (const segment of hangout.segments ?? []) {
        if (!getSegmentFriendIds(segment, hangout.friendIds).includes(friendId)) continue;
        const segFriends = getSegmentFriendIds(segment, hangout.friendIds);
        items.push({
          hangoutId: hangout.id,
          segmentId: segment.id,
          kind: 'segment',
          date: getSegmentSeenTime(segment) || getHangoutSeenTime(hangout),
          type: segment.type,
          startTime: segment.startTime?.trim() || hangout.startTime,
          endTime: segment.endTime?.trim() || hangout.endTime,
          durationMinutes: getSegmentEffectiveDurationMinutes(segment),
          location: segment.location || hangout.location,
          otherFriends: segFriends
            .filter((id) => id !== friendId)
            .map((id) => ({ id, name: friendName(id) })),
        });
      }
    }
  }

  return items
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
    .slice(0, limit);
}

export function getCatchUpFriends(
  friends: Friend[],
  hangouts: Hangout[],
  includeNoHangouts = false
): CatchUpFriend[] {
  const list = friends
    .map((friend) => {
      const summary = getFriendActivitySummary(friend.id, hangouts);
      return {
        friend,
        lastSeen: summary.lastSeen,
        daysSinceSeen: summary.daysSinceSeen,
        totalHangouts: summary.totalHangouts,
      };
    })
    .filter((item) => includeNoHangouts || item.totalHangouts > 0);

  return list.sort((a, b) => {
    if (a.daysSinceSeen == null && b.daysSinceSeen == null) return a.friend.name.localeCompare(b.friend.name);
    if (a.daysSinceSeen == null) return 1;
    if (b.daysSinceSeen == null) return -1;
    return b.daysSinceSeen - a.daysSinceSeen;
  });
}

export function sortFriends<T extends Friend & FriendActivitySummary>(
  friends: T[],
  sortBy: FriendSortOption
): T[] {
  const sorted = [...friends];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'last_seen_newest': {
        if (!a.lastSeen && !b.lastSeen) return a.name.localeCompare(b.name);
        if (!a.lastSeen) return 1;
        if (!b.lastSeen) return -1;
        return parseISO(b.lastSeen).getTime() - parseISO(a.lastSeen).getTime();
      }
      case 'last_seen_oldest': {
        if (!a.lastSeen && !b.lastSeen) return a.name.localeCompare(b.name);
        if (!a.lastSeen) return 1;
        if (!b.lastSeen) return -1;
        return parseISO(a.lastSeen).getTime() - parseISO(b.lastSeen).getTime();
      }
      case 'hangouts':
        return b.totalHangouts - a.totalHangouts || a.name.localeCompare(b.name);
      case 'hours':
        return b.totalHours - a.totalHours || a.name.localeCompare(b.name);
      case 'created_newest':
        return parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime();
      case 'created_oldest':
        return parseISO(a.createdAt).getTime() - parseISO(b.createdAt).getTime();
      case 'birthday':
        return nextBirthdaySortKey(a.birthday) - nextBirthdaySortKey(b.birthday) || a.name.localeCompare(b.name);
      default:
        return a.name.localeCompare(b.name);
    }
  });
  return sorted;
}

export function formatDaysSinceLabel(days: number | null): string {
  if (days == null) return 'Never';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function formatStreakLabel(weeks: number): string {
  if (weeks === 0) return '—';
  if (weeks === 1) return '1 week';
  return `${weeks} weeks`;
}

export function formatGapDays(days: number | null): string {
  if (days == null) return '—';
  if (days === 0) return 'Same day';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export { formatDuration };
