import { calcDurationMinutes, formatDate, parseISO } from './dates';
import { getSegmentEffectiveDurationMinutes, getSegmentFriendIds } from './hangout-segments';
import type { Friend, Hangout } from '../types';

export interface LocationVisitRef {
  hangoutId: string;
  segmentId?: string;
  startTime: string;
  endTime: string;
  type: string;
  friendIds: string[];
  durationMinutes: number;
}

export interface LocationSummary {
  location: string;
  visitCount: number;
  totalMinutes: number;
  totalHours: number;
  friendIds: string[];
  mostCommonType: string | null;
  firstVisit: string;
  lastVisit: string;
  recentVisits: LocationVisitRef[];
}

function modeValue(counts: Record<string, number>): string | null {
  const entries = Object.entries(counts);
  if (!entries.length) return null;
  return entries.sort(([, a], [, b]) => b - a)[0][0];
}

export function getLocationHistory(hangouts: Hangout[], limit = 50): LocationSummary[] {
  const visitsWithLoc: { loc: string; visit: LocationVisitRef }[] = [];

  for (const hangout of hangouts) {
    const mainLoc = hangout.location?.trim();
    if (mainLoc && !hangout.segments?.length) {
      visitsWithLoc.push({
        loc: mainLoc,
        visit: {
          hangoutId: hangout.id,
          startTime: hangout.startTime,
          endTime: hangout.endTime,
          type: hangout.type,
          friendIds: [...hangout.friendIds],
          durationMinutes: calcDurationMinutes(hangout.startTime, hangout.endTime),
        },
      });
    }
    for (const segment of hangout.segments ?? []) {
      const loc = segment.location?.trim() || mainLoc;
      if (!loc) continue;
      const start = segment.startTime?.trim() || hangout.startTime;
      const end = segment.endTime?.trim() || hangout.endTime;
      visitsWithLoc.push({
        loc,
        visit: {
          hangoutId: hangout.id,
          segmentId: segment.id,
          startTime: start,
          endTime: end,
          type: segment.type,
          friendIds: getSegmentFriendIds(segment, hangout.friendIds),
          durationMinutes: getSegmentEffectiveDurationMinutes(segment) || calcDurationMinutes(start, end),
        },
      });
    }
  }

  const grouped = new Map<string, LocationVisitRef[]>();
  for (const { loc, visit } of visitsWithLoc) {
    const list = grouped.get(loc) ?? [];
    list.push(visit);
    grouped.set(loc, list);
  }

  const summaries: LocationSummary[] = [];

  for (const [location, visits] of grouped) {
    const typeCounts: Record<string, number> = {};
    const friendSet = new Set<string>();
    let totalMinutes = 0;
    const times: string[] = [];

    for (const v of visits) {
      if (v.type) typeCounts[v.type] = (typeCounts[v.type] ?? 0) + 1;
      v.friendIds.forEach((id) => friendSet.add(id));
      totalMinutes += v.durationMinutes;
      times.push(v.endTime || v.startTime);
    }

    times.sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime());
    const recent = [...visits]
      .sort((a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime())
      .slice(0, 5);

    summaries.push({
      location,
      visitCount: visits.length,
      totalMinutes,
      totalHours: totalMinutes / 60,
      friendIds: [...friendSet],
      mostCommonType: modeValue(typeCounts),
      firstVisit: times[0] ?? '',
      lastVisit: times[times.length - 1] ?? '',
      recentVisits: recent,
    });
  }

  return summaries
    .sort((a, b) => parseISO(b.lastVisit).getTime() - parseISO(a.lastVisit).getTime())
    .slice(0, limit);
}

export function formatLocationDate(iso: string): string {
  if (!iso) return '—';
  return formatDate(iso);
}

export function friendNamesAtLocation(friendIds: string[], friends: Friend[]): string {
  return friendIds.map((id) => friends.find((f) => f.id === id)?.name ?? '?').join(', ');
}
