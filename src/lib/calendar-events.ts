import { addDays } from 'date-fns';
import type { AppData, HangoutIdea } from '../types';
import {
  calcDurationMinutes,
  formatDuration,
  formatTime,
  isSameDay,
  parseISO,
  startOfDay,
} from './dates';
import { getHangoutDisplayType, segmentHasCalendarTimes } from './hangout-segments';
import { isIdeaScheduled, plannedTimesToHangoutRange } from './idea-planned-time';

export type CalEventType = 'sleep' | 'nap' | 'awake' | 'hangout' | 'planned_hangout';

export interface CalEvent {
  id: string;
  type: CalEventType;
  label: string;
  start: Date;
  end: Date;
  color: string;
  ideaId?: string;
  hangoutId?: string;
}

export const CAL_COLORS = {
  sleep: '#818cf8',
  nap: '#a78bfa',
  hangout: '#34d399',
  planned_hangout: '#facc15',
  awake: '#f59e0b',
} as const;

export type CalLegendKey = keyof typeof CAL_COLORS;

export const CAL_LEGEND: { key: CalLegendKey; label: string }[] = [
  { key: 'sleep', label: 'Sleep' },
  { key: 'nap', label: 'Naps' },
  { key: 'hangout', label: 'Completed Hangouts' },
  { key: 'planned_hangout', label: 'Planned Hangouts' },
  { key: 'awake', label: 'Awake gaps' },
];

export const DEFAULT_CAL_VISIBILITY: Record<CalLegendKey, boolean> = {
  sleep: true,
  nap: true,
  hangout: true,
  planned_hangout: true,
  awake: true,
};

function friendNames(data: AppData, friendIds: string[]): string {
  return friendIds.map((id) => data.friends.find((f) => f.id === id)?.name ?? '?').join(', ');
}

function buildPlannedHangoutEvent(data: AppData, idea: HangoutIdea): CalEvent | null {
  if (idea.status !== 'Planned' || !isIdeaScheduled(idea)) return null;

  const range = plannedTimesToHangoutRange(idea);
  if (!range) return null;

  const names = friendNames(data, idea.friendIds);
  const who = names ? ` · ${names}` : '';

  return {
    id: `planned-${idea.id}`,
    type: 'planned_hangout',
    label: `${idea.title}${who}`,
    start: parseISO(range.startTime),
    end: parseISO(range.endTime),
    color: CAL_COLORS.planned_hangout,
    ideaId: idea.id,
  };
}

export function buildCalendarEvents(data: AppData): CalEvent[] {
  const events: CalEvent[] = [];

  data.sleepEntries.forEach((s) => {
    events.push({
      id: s.id,
      type: 'sleep',
      label: `Sleep ${formatDuration(calcDurationMinutes(s.sleepStart, s.wakeUp))}`,
      start: parseISO(s.sleepStart),
      end: parseISO(s.wakeUp),
      color: CAL_COLORS.sleep,
    });
  });

  data.napEntries.forEach((n) => {
    events.push({
      id: n.id,
      type: 'nap',
      label: `Nap ${formatDuration(calcDurationMinutes(n.napStart, n.napEnd))}`,
      start: parseISO(n.napStart),
      end: parseISO(n.napEnd),
      color: CAL_COLORS.nap,
    });
  });

  data.hangouts.forEach((h) => {
    const names = friendNames(data, h.friendIds);
    const baseLabel = `${getHangoutDisplayType(h)}: ${names || 'Hangout'}`;

    if (h.segments?.length) {
      const timedSegments = h.segments.filter(segmentHasCalendarTimes);
      if (timedSegments.length > 0) {
        timedSegments.forEach((seg) => {
          events.push({
            id: `${h.id}-${seg.id}`,
            type: 'hangout',
            label: `${seg.type}: ${names || 'Hangout'}`,
            start: parseISO(seg.startTime),
            end: parseISO(seg.endTime),
            color: CAL_COLORS.hangout,
            hangoutId: h.id,
          });
        });
        return;
      }
    }

    events.push({
      id: h.id,
      type: 'hangout',
      label: baseLabel,
      start: parseISO(h.startTime),
      end: parseISO(h.endTime),
      color: CAL_COLORS.hangout,
      hangoutId: h.id,
    });
  });

  data.ideas.forEach((idea) => {
    const planned = buildPlannedHangoutEvent(data, idea);
    if (planned) events.push(planned);
  });

  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function filterCalendarEvents(
  events: CalEvent[],
  visibility: Record<CalLegendKey, boolean>
): CalEvent[] {
  return events.filter((event) => visibility[event.type]);
}

export function isEventOnDay(event: CalEvent, day: Date): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  return (
    isSameDay(event.start, day) ||
    isSameDay(event.end, day) ||
    (event.start < dayEnd && event.end > dayStart)
  );
}

export function eventsOnDay(events: CalEvent[], day: Date): CalEvent[] {
  return events.filter((event) => isEventOnDay(event, day));
}

export function formatEventTimeRange(event: CalEvent): string {
  if (event.start.getTime() === event.end.getTime()) {
    return formatTime(event.start.toISOString());
  }
  return `${formatTime(event.start.toISOString())} – ${formatTime(event.end.toISOString())}`;
}

export function plannedSummaryForDay(planned: CalEvent[]): string | null {
  if (planned.length === 0) return null;
  if (planned.length === 1) return planned[0].label;
  return `${planned.length} planned`;
}
