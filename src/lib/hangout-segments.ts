import { calcDurationMinutes, generateId } from './dates';
import type { Hangout, HangoutSegment, HangoutType } from '../types';

export function createHangoutSegment(
  type: HangoutType,
  startTime: string,
  endTime: string,
  location = '',
  notes = ''
): HangoutSegment {
  return { id: generateId(), type, startTime, endTime, location, notes };
}

export function getHangoutDurationMinutes(hangout: Pick<Hangout, 'startTime' | 'endTime'>): number {
  return calcDurationMinutes(hangout.startTime, hangout.endTime);
}

export function getSegmentDurationMinutes(segment: Pick<HangoutSegment, 'startTime' | 'endTime'>): number {
  return calcDurationMinutes(segment.startTime, segment.endTime);
}

/** Activity minutes grouped by type; uses segments when present, otherwise main hangout type. */
export function getActivityTimeByType(hangout: Hangout): Record<string, number> {
  const result: Record<string, number> = {};
  if (hangout.segments?.length) {
    for (const segment of hangout.segments) {
      const mins = getSegmentDurationMinutes(segment);
      if (mins > 0 && segment.type) {
        result[segment.type] = (result[segment.type] ?? 0) + mins;
      }
    }
    return result;
  }
  const mins = getHangoutDurationMinutes(hangout);
  if (mins > 0 && hangout.type) {
    result[hangout.type] = mins;
  }
  return result;
}

export function aggregateActivityTimeByType(hangouts: Hangout[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const hangout of hangouts) {
    const byType = getActivityTimeByType(hangout);
    for (const [type, mins] of Object.entries(byType)) {
      result[type] = (result[type] ?? 0) + mins;
    }
  }
  return result;
}

export function getHangoutDisplayType(hangout: Hangout): string {
  if (hangout.segments?.length) {
    const types = new Set(hangout.segments.map((s) => s.type).filter(Boolean));
    if (types.size > 1) return hangout.type || 'Mixed';
    if (types.size === 1) return [...types][0];
  }
  return hangout.type || 'Untyped';
}

export function hangoutMatchesTypeFilter(hangout: Hangout, filterType: string): boolean {
  if (!filterType) return true;
  if (hangout.type === filterType) return true;
  return hangout.segments?.some((s) => s.type === filterType) ?? false;
}

export function formatSegmentSummary(hangout: Hangout): string {
  if (!hangout.segments?.length) return getHangoutDisplayType(hangout);
  return hangout.segments
    .map((s) => `${s.type} ${formatSegmentTimeRange(s)}`)
    .join(' · ');
}

function formatSegmentTimeRange(segment: HangoutSegment): string {
  const start = segment.startTime.slice(11, 16);
  const end = segment.endTime.slice(11, 16);
  return `${start}–${end}`;
}

export function newSegmentDefaults(
  hangoutStart: string,
  hangoutEnd: string,
  defaultType: HangoutType,
  existingSegments: HangoutSegment[]
): Pick<HangoutSegment, 'startTime' | 'endTime' | 'type'> {
  const lastEnd = existingSegments.length
    ? existingSegments[existingSegments.length - 1].endTime
    : hangoutStart;
  return {
    type: defaultType,
    startTime: lastEnd || hangoutStart,
    endTime: hangoutEnd || lastEnd,
  };
}

export function normalizeHangoutSegments(segments: HangoutSegment[] | undefined): HangoutSegment[] {
  return segments?.map((s) => ({
    id: s.id || generateId(),
    type: s.type,
    startTime: s.startTime,
    endTime: s.endTime,
    location: s.location ?? '',
    notes: s.notes ?? '',
  })) ?? [];
}
