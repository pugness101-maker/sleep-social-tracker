import { calcDurationMinutes, formatDuration, generateId } from './dates';
import type { Hangout, HangoutSegment, HangoutType } from '../types';

export function createHangoutSegment(
  type: HangoutType,
  partial: Partial<Omit<HangoutSegment, 'id' | 'type'>> = {}
): HangoutSegment {
  return {
    id: generateId(),
    type,
    startTime: '',
    endTime: '',
    durationMinutes: null,
    location: '',
    notes: '',
    ...partial,
  };
}

export function segmentHasSpecificTime(segment: Pick<HangoutSegment, 'startTime' | 'endTime'>): boolean {
  return !!(segment.startTime?.trim() || segment.endTime?.trim());
}

/** Parse flexible duration input: "1h", "45m", "1h 30m", "1.5h", or plain minutes. */
export function parseDurationInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase();
  let total = 0;
  let matched = false;

  const hourParts = normalized.matchAll(/(\d+(?:\.\d+)?)\s*h/g);
  for (const part of hourParts) {
    total += Math.round(parseFloat(part[1]) * 60);
    matched = true;
  }

  const minuteParts = normalized.matchAll(/(\d+(?:\.\d+)?)\s*m(?!s)/g);
  for (const part of minuteParts) {
    total += Math.round(parseFloat(part[1]));
    matched = true;
  }

  if (matched) return total > 0 ? total : null;

  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber) && asNumber > 0) return Math.round(asNumber);

  return null;
}

export function formatDurationInput(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return '';
  return formatDuration(minutes);
}

export function getHangoutDurationMinutes(hangout: Pick<Hangout, 'startTime' | 'endTime'>): number {
  return calcDurationMinutes(hangout.startTime, hangout.endTime);
}

/** Duration from start/end when both set; otherwise manual durationMinutes; else 0. */
export function getSegmentEffectiveDurationMinutes(segment: HangoutSegment): number {
  if (segment.startTime?.trim() && segment.endTime?.trim()) {
    return calcDurationMinutes(segment.startTime, segment.endTime);
  }
  if (segment.durationMinutes != null && segment.durationMinutes > 0) {
    return segment.durationMinutes;
  }
  return 0;
}

/** @deprecated use getSegmentEffectiveDurationMinutes */
export function getSegmentDurationMinutes(segment: Pick<HangoutSegment, 'startTime' | 'endTime'>): number {
  if (segment.startTime?.trim() && segment.endTime?.trim()) {
    return calcDurationMinutes(segment.startTime, segment.endTime);
  }
  return 0;
}

/** Activity minutes grouped by type; uses segment durations when present. */
export function getActivityTimeByType(hangout: Hangout): Record<string, number> {
  const result: Record<string, number> = {};
  if (hangout.segments?.length) {
    for (const segment of hangout.segments) {
      const mins = getSegmentEffectiveDurationMinutes(segment);
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

/** Activity segment counts by type (includes label-only segments). */
export function getActivityCountByType(hangout: Hangout): Record<string, number> {
  const result: Record<string, number> = {};
  if (hangout.segments?.length) {
    for (const segment of hangout.segments) {
      if (segment.type) {
        result[segment.type] = (result[segment.type] ?? 0) + 1;
      }
    }
    return result;
  }
  if (hangout.type) {
    result[hangout.type] = 1;
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

export function aggregateActivityCountByType(hangouts: Hangout[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const hangout of hangouts) {
    const byType = getActivityCountByType(hangout);
    for (const [type, count] of Object.entries(byType)) {
      result[type] = (result[type] ?? 0) + count;
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
  return hangout.segments.map(formatSegmentLabel).join(' · ');
}

export function formatSegmentLabel(segment: HangoutSegment): string {
  if (segment.startTime?.trim() && segment.endTime?.trim()) {
    return `${segment.type} ${formatSegmentTimeRange(segment)}`;
  }
  const mins = getSegmentEffectiveDurationMinutes(segment);
  if (mins > 0) return `${segment.type}, ${formatDuration(mins)}`;
  return segment.type;
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
  return (
    segments?.map((s) => ({
      id: s.id || generateId(),
      type: s.type,
      startTime: s.startTime ?? '',
      endTime: s.endTime ?? '',
      durationMinutes:
        s.durationMinutes != null && s.durationMinutes > 0 ? s.durationMinutes : null,
      location: s.location ?? '',
      notes: s.notes ?? '',
    })) ?? []
  );
}

export function segmentHasCalendarTimes(segment: HangoutSegment): boolean {
  return !!(segment.startTime?.trim() && segment.endTime?.trim());
}
