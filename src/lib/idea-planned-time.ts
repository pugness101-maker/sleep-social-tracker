import { addDays, addMinutes, differenceInMinutes, format, isWithinInterval, parseISO } from 'date-fns';
import type { HangoutIdea } from '../types';
import { formatDate, getMonthRange, getWeekRange, toLocalISO } from './dates';

export type IdeaScheduleFilter = '' | 'unscheduled' | 'scheduled' | 'this_week' | 'this_month';
export type IdeaSortOption = 'newest' | 'planned_date';

export function normalizePlannedDate(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function normalizePlannedTime(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.length === 5 ? trimmed : trimmed.slice(0, 5);
}

export function isIdeaScheduled(idea: Pick<HangoutIdea, 'plannedDate'>): boolean {
  return !!normalizePlannedDate(idea.plannedDate);
}

export function calcPlannedDurationMinutes(
  plannedDate: string | undefined,
  startTime: string | undefined,
  endTime: string | undefined
): number | null {
  const start = normalizePlannedTime(startTime);
  const end = normalizePlannedTime(endTime);
  if (!start || !end) return null;

  const date = normalizePlannedDate(plannedDate) ?? format(new Date(), 'yyyy-MM-dd');
  const startDt = parseISO(`${date}T${start}`);
  let endDt = parseISO(`${date}T${end}`);
  if (endDt <= startDt) {
    endDt = addDays(endDt, 1);
  }
  return Math.max(0, differenceInMinutes(endDt, startDt));
}

export function formatTimeOfDay(hhmm: string): string {
  return format(parseISO(`2000-01-01T${hhmm}`), 'h:mm a');
}

export function formatPlannedDateLabel(plannedDate?: string): string | null {
  const date = normalizePlannedDate(plannedDate);
  if (!date) return null;
  return formatDate(`${date}T12:00`);
}

export function formatPlannedTimeRange(idea: Pick<HangoutIdea, 'plannedStartTime' | 'plannedEndTime'>): string | null {
  const start = normalizePlannedTime(idea.plannedStartTime);
  const end = normalizePlannedTime(idea.plannedEndTime);
  if (start && end) return `${formatTimeOfDay(start)}–${formatTimeOfDay(end)}`;
  if (start) return formatTimeOfDay(start);
  return null;
}

export function matchesIdeaScheduleFilter(
  idea: Pick<HangoutIdea, 'plannedDate'>,
  filter: IdeaScheduleFilter
): boolean {
  if (!filter) return true;
  const scheduled = isIdeaScheduled(idea);
  if (filter === 'unscheduled') return !scheduled;
  if (filter === 'scheduled') return scheduled;
  if (!scheduled) return false;

  const day = startOfDaySafe(idea.plannedDate!);
  if (filter === 'this_week') {
    const { start, end } = getWeekRange();
    return isWithinInterval(day, { start, end });
  }
  if (filter === 'this_month') {
    const { start, end } = getMonthRange();
    return isWithinInterval(day, { start, end });
  }
  return true;
}

function startOfDaySafe(dateStr: string): Date {
  return parseISO(`${dateStr}T12:00`);
}

export function compareIdeasByPlannedDate(a: HangoutIdea, b: HangoutIdea): number {
  const aScheduled = isIdeaScheduled(a);
  const bScheduled = isIdeaScheduled(b);
  if (aScheduled && !bScheduled) return -1;
  if (!aScheduled && bScheduled) return 1;
  if (!aScheduled && !bScheduled) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }
  const dateCmp = a.plannedDate!.localeCompare(b.plannedDate!);
  if (dateCmp !== 0) return dateCmp;
  const aStart = normalizePlannedTime(a.plannedStartTime) ?? '';
  const bStart = normalizePlannedTime(b.plannedStartTime) ?? '';
  return aStart.localeCompare(bStart);
}

/** Build hangout start/end for convert modal from planned fields. */
export function plannedTimesToHangoutRange(
  idea: Pick<
    HangoutIdea,
    'plannedDate' | 'plannedStartTime' | 'plannedEndTime' | 'estimatedDurationMinutes'
  >
): { startTime: string; endTime: string } | null {
  const date = normalizePlannedDate(idea.plannedDate);
  if (!date) return null;

  const startTime = normalizePlannedTime(idea.plannedStartTime);
  const endTime = normalizePlannedTime(idea.plannedEndTime);

  if (startTime) {
    const startDt = parseISO(`${date}T${startTime}`);
    let endDt: Date;
    if (endTime) {
      endDt = parseISO(`${date}T${endTime}`);
      if (endDt <= startDt) endDt = addDays(endDt, 1);
    } else if (idea.estimatedDurationMinutes != null && idea.estimatedDurationMinutes > 0) {
      endDt = addMinutes(startDt, idea.estimatedDurationMinutes);
    } else {
      endDt = startDt;
    }
    return { startTime: toLocalISO(startDt), endTime: toLocalISO(endDt) };
  }

  // Date only — prefill midday so user can set times in convert modal
  const startDt = parseISO(`${date}T12:00`);
  let endDt = startDt;
  if (idea.estimatedDurationMinutes != null && idea.estimatedDurationMinutes > 0) {
    endDt = addMinutes(startDt, idea.estimatedDurationMinutes);
  }
  return { startTime: toLocalISO(startDt), endTime: toLocalISO(endDt) };
}

export function normalizeIdeaPlannedFields(idea: Partial<HangoutIdea>): Pick<
  HangoutIdea,
  'plannedDate' | 'plannedStartTime' | 'plannedEndTime'
> {
  const plannedDate = normalizePlannedDate(idea.plannedDate);
  const plannedStartTime = plannedDate ? normalizePlannedTime(idea.plannedStartTime) : undefined;
  const plannedEndTime = plannedDate ? normalizePlannedTime(idea.plannedEndTime) : undefined;
  return { plannedDate, plannedStartTime, plannedEndTime };
}
