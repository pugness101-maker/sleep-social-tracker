import { differenceInDays, format, parseISO, startOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { calcDurationMinutes, getWeekRange, isInRange } from './dates';
import { getFriendActivitySummary, getFriendMinutesInHangout } from './friend-activity';
import { aggregateActivityCountByType, friendInHangout, getHangoutDisplayType, getSegmentFriendIds } from './hangout-segments';
import type { AppData, Friend } from '../types';

export interface TopFriendThisMonth {
  friend: Friend;
  hangoutCount: number;
  totalHours: number;
}

export interface ThisWeekSocialSummary {
  totalHangouts: number;
  totalHours: number;
  topType: string | null;
}

export interface UpcomingBirthday {
  friend: Friend;
  birthday: string;
  daysAway: number;
  displayDate: string;
}

export interface RecentActivityItem {
  id: string;
  kind: 'sleep' | 'nap' | 'hangout' | 'segment';
  title: string;
  detail: string;
  timestamp: string;
  refId: string;
  hangoutId?: string;
}

function nextBirthdayDays(birthday: string, now = new Date()): number | null {
  if (!birthday) return null;
  const b = parseISO(birthday);
  let next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
  if (next < startOfDay(now)) {
    next = new Date(now.getFullYear() + 1, b.getMonth(), b.getDate());
  }
  return differenceInDays(next, startOfDay(now));
}

export function getTopFriendsThisMonth(data: AppData, limit = 5, includeArchived = false): TopFriendThisMonth[] {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  const monthHangouts = data.hangouts.filter((h) => isInRange(h.startTime, start, end));
  const friends = includeArchived ? data.friends : data.friends.filter((f) => !f.isArchived);

  return friends
    .map((friend) => {
      const involved = monthHangouts.filter((h) => friendInHangout(friend.id, h));
      const totalMinutes = involved.reduce(
        (sum, h) => sum + getFriendMinutesInHangout(friend.id, h),
        0
      );
      return {
        friend,
        hangoutCount: involved.length,
        totalHours: totalMinutes / 60,
      };
    })
    .filter((x) => x.hangoutCount > 0)
    .sort((a, b) => b.hangoutCount - a.hangoutCount || b.totalHours - a.totalHours)
    .slice(0, limit);
}

export function getThisWeekSocial(data: AppData): ThisWeekSocialSummary {
  const { start, end } = getWeekRange();
  const hangouts = data.hangouts.filter((h) => isInRange(h.startTime, start, end));
  const totalMinutes = hangouts.reduce(
    (sum, h) => sum + calcDurationMinutes(h.startTime, h.endTime),
    0
  );
  const activityCounts = aggregateActivityCountByType(hangouts);
  const topType =
    Object.entries(activityCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ??
    hangouts.sort((a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime())[0]?.type ??
    null;

  return {
    totalHangouts: hangouts.length,
    totalHours: totalMinutes / 60,
    topType,
  };
}

export function getUpcomingBirthdays(data: AppData, limit = 8, includeArchived = false): UpcomingBirthday[] {
  const friends = includeArchived ? data.friends : data.friends.filter((f) => !f.isArchived);
  return friends
    .filter((f) => f.birthday)
    .map((friend) => {
      const daysAway = nextBirthdayDays(friend.birthday)!;
      const b = parseISO(friend.birthday);
      const now = new Date();
      let year = now.getFullYear();
      let next = new Date(year, b.getMonth(), b.getDate());
      if (next < startOfDay(now)) next = new Date(year + 1, b.getMonth(), b.getDate());
      return {
        friend,
        birthday: friend.birthday,
        daysAway,
        displayDate: format(next, 'MMM d'),
      };
    })
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, limit);
}

export function getDashboardRecentActivity(data: AppData, limit = 10): RecentActivityItem[] {
  const items: RecentActivityItem[] = [];
  const friendName = (id: string) => data.friends.find((f) => f.id === id)?.name ?? '?';

  data.sleepEntries.forEach((s) => {
    items.push({
      id: `sleep-${s.id}`,
      kind: 'sleep',
      title: 'Sleep logged',
      detail: `${Math.round(calcDurationMinutes(s.sleepStart, s.wakeUp))} min`,
      timestamp: s.wakeUp,
      refId: s.id,
    });
  });

  data.napEntries.forEach((n) => {
    items.push({
      id: `nap-${n.id}`,
      kind: 'nap',
      title: 'Nap logged',
      detail: `${Math.round(calcDurationMinutes(n.napStart, n.napEnd))} min`,
      timestamp: n.napEnd,
      refId: n.id,
    });
  });

  data.hangouts.forEach((h) => {
    const names = h.friendIds.map(friendName).join(', ');
    items.push({
      id: `hangout-${h.id}`,
      kind: 'hangout',
      title: `Hangout with ${names || 'friends'}`,
      detail: getHangoutDisplayType(h),
      timestamp: h.endTime || h.startTime,
      refId: h.id,
      hangoutId: h.id,
    });
    for (const s of h.segments ?? []) {
      const segFriends = getSegmentFriendIds(s, h.friendIds);
      const segmentOnlyFriends = segFriends.filter((id) => !h.friendIds.includes(id));
      if (segmentOnlyFriends.length === 0) continue;
      items.push({
        id: `segment-${h.id}-${s.id}`,
        kind: 'segment',
        title: `${s.category ? `${s.category} · ` : ''}${s.type} — ${segmentOnlyFriends.map(friendName).join(' + ')}`,
        detail: h.location || s.location || 'Segment',
        timestamp: s.endTime?.trim() || s.startTime?.trim() || h.endTime || h.startTime,
        refId: s.id,
        hangoutId: h.id,
      });
    }
  });

  return items
    .sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime())
    .slice(0, limit);
}

export { getFriendActivitySummary };
