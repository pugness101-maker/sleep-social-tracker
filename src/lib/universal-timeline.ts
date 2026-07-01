import { format, parseISO, startOfDay } from 'date-fns';
import { calcDurationMinutes, formatDuration, formatTime } from './dates';
import {
  getHangoutDisplayType,
  getSegmentEffectiveDurationMinutes,
  getSegmentFriendIds,
} from './hangout-segments';
import type { AppData, Hangout } from '../types';
import type { InsightsFilters } from './insights-filters';
import { filterHangoutsByInsights } from './insights-filters';

export type UniversalTimelineKind = 'sleep' | 'nap' | 'hangout' | 'segment';

export interface UniversalTimelineItem {
  id: string;
  kind: UniversalTimelineKind;
  timestamp: string;
  dateKey: string;
  title: string;
  detail: string;
  location: string;
  type: string;
  durationMinutes: number;
  refId: string;
  hangoutId?: string;
  segmentId?: string;
}

export function buildUniversalTimeline(
  data: AppData,
  filters: InsightsFilters,
  rangeStart?: Date,
  rangeEnd?: Date,
  limit = 200
): UniversalTimelineItem[] {
  const items: UniversalTimelineItem[] = [];
  const friendName = (id: string) => data.friends.find((f) => f.id === id)?.name ?? '?';

  if (filters.showSleep) {
    let sleepEntries = data.sleepEntries;
    if (rangeStart && rangeEnd) {
      sleepEntries = sleepEntries.filter((s) => {
        const t = parseISO(s.wakeUp);
        return t >= rangeStart && t <= rangeEnd;
      });
    }
    for (const s of sleepEntries) {
      const mins = calcDurationMinutes(s.sleepStart, s.wakeUp);
      items.push({
        id: `sleep-${s.id}`,
        kind: 'sleep',
        timestamp: s.wakeUp,
        dateKey: format(startOfDay(parseISO(s.wakeUp)), 'yyyy-MM-dd'),
        title: 'Sleep',
        detail: `${formatDuration(mins)} · ${formatTime(s.sleepStart)} – ${formatTime(s.wakeUp)}`,
        location: '',
        type: 'Sleep',
        durationMinutes: mins,
        refId: s.id,
      });
    }
  }

  if (filters.showNaps) {
    let napEntries = data.napEntries;
    if (rangeStart && rangeEnd) {
      napEntries = napEntries.filter((n) => {
        const t = parseISO(n.napEnd);
        return t >= rangeStart && t <= rangeEnd;
      });
    }
    for (const n of napEntries) {
      const mins = calcDurationMinutes(n.napStart, n.napEnd);
      items.push({
        id: `nap-${n.id}`,
        kind: 'nap',
        timestamp: n.napEnd,
        dateKey: format(startOfDay(parseISO(n.napEnd)), 'yyyy-MM-dd'),
        title: 'Nap',
        detail: `${formatDuration(mins)} · ${formatTime(n.napStart)} – ${formatTime(n.napEnd)}`,
        location: '',
        type: 'Nap',
        durationMinutes: mins,
        refId: n.id,
      });
    }
  }

  const hangouts = filterHangoutsByInsights(data.hangouts, filters, data.friends, rangeStart, rangeEnd);

  for (const h of hangouts) {
    appendHangoutTimelineItems(h, items, filters, friendName);
  }

  return items
    .sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime())
    .slice(0, limit);
}

function appendHangoutTimelineItems(
  h: Hangout,
  items: UniversalTimelineItem[],
  filters: InsightsFilters,
  friendName: (id: string) => string
) {
  const names = h.friendIds.map(friendName).join(', ') || 'friends';

  if (filters.showHangouts) {
    items.push({
      id: `hangout-${h.id}`,
      kind: 'hangout',
      timestamp: h.endTime || h.startTime,
      dateKey: format(startOfDay(parseISO(h.endTime || h.startTime)), 'yyyy-MM-dd'),
      title: `Hangout with ${names}`,
      detail: `${getHangoutDisplayType(h)} · ${formatDuration(calcDurationMinutes(h.startTime, h.endTime))}`,
      location: h.location,
      type: h.type,
      durationMinutes: calcDurationMinutes(h.startTime, h.endTime),
      refId: h.id,
      hangoutId: h.id,
    });
  }

  if (filters.showSegments && h.segments?.length) {
    for (const s of h.segments) {
      const segFriends = getSegmentFriendIds(s, h.friendIds).map(friendName).join(' + ');
      const start = s.startTime?.trim() || h.startTime;
      const end = s.endTime?.trim() || h.endTime;
      const mins = getSegmentEffectiveDurationMinutes(s) || calcDurationMinutes(start, end);
      items.push({
        id: `segment-${h.id}-${s.id}`,
        kind: 'segment',
        timestamp: end || start,
        dateKey: format(startOfDay(parseISO(end || start)), 'yyyy-MM-dd'),
        title: `${s.type} — ${segFriends || names}`,
        detail: mins > 0 ? formatDuration(mins) : 'Activity only',
        location: s.location || h.location,
        type: s.type,
        durationMinutes: mins,
        refId: s.id,
        hangoutId: h.id,
        segmentId: s.id,
      });
    }
  }
}

export function groupTimelineByDate(items: UniversalTimelineItem[]): { date: string; label: string; items: UniversalTimelineItem[] }[] {
  const groups = new Map<string, UniversalTimelineItem[]>();
  for (const item of items) {
    const list = groups.get(item.dateKey) ?? [];
    list.push(item);
    groups.set(item.dateKey, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, groupItems]) => ({
      date: dateKey,
      label: format(parseISO(dateKey), 'EEEE, MMM d, yyyy'),
      items: groupItems,
    }));
}
