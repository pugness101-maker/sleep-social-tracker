import { addMinutes, parseISO, set, startOfDay } from 'date-fns';
import { generateId, toLocalISO } from './dates';
import { normalizeHangoutMainFields } from './hangout-categories';
import { normalizeOccasion } from './hangout-occasions';
import type { AppData, Hangout } from '../types';

export interface HangoutBulkEditPatch {
  occasion?: string;
  category?: string;
  type?: string;
  location?: { mode: 'replace' | 'clear'; value?: string };
  notes?: { mode: 'append' | 'replace' | 'clear'; value?: string };
  timeShiftMinutes?: number;
  setStartTime?: string;
  setEndTime?: string;
  friends?: {
    mode: 'replace' | 'add_remove';
    replace?: string[];
    add?: string[];
    remove?: string[];
  };
  isArchived?: boolean;
}

export type BulkDuplicateTarget =
  | { mode: 'today' }
  | { mode: 'tomorrow' }
  | { mode: 'custom'; date: string };

function shiftIso(iso: string, minutes: number): string {
  if (!iso) return iso;
  return toLocalISO(addMinutes(parseISO(iso), minutes));
}

function applyPatchToHangout(h: Hangout, patch: HangoutBulkEditPatch): Hangout {
  let next: Hangout = { ...h };

  if (patch.occasion !== undefined) {
    next.occasion = normalizeOccasion(patch.occasion);
  }

  if (patch.category !== undefined || patch.type !== undefined) {
    const category = patch.category ?? next.category;
    const type = patch.type ?? next.type;
    const main = normalizeHangoutMainFields(category, type);
    next = { ...next, category: main.category, type: main.type };
  }

  if (patch.location) {
    next.location =
      patch.location.mode === 'clear' ? '' : (patch.location.value ?? next.location);
  }

  if (patch.notes) {
    if (patch.notes.mode === 'clear') next.notes = '';
    else if (patch.notes.mode === 'replace') next.notes = patch.notes.value ?? '';
    else if (patch.notes.mode === 'append') {
      const addition = patch.notes.value ?? '';
      next.notes = next.notes.trim() ? `${next.notes.trim()}\n${addition}` : addition;
    }
  }

  if (patch.timeShiftMinutes !== undefined && patch.timeShiftMinutes !== 0) {
    next.startTime = shiftIso(next.startTime, patch.timeShiftMinutes);
    next.endTime = shiftIso(next.endTime, patch.timeShiftMinutes);
  }
  if (patch.setStartTime) next.startTime = patch.setStartTime;
  if (patch.setEndTime) next.endTime = patch.setEndTime;

  if (patch.friends) {
    if (patch.friends.mode === 'replace' && patch.friends.replace) {
      next.friendIds = [...patch.friends.replace];
    } else if (patch.friends.mode === 'add_remove') {
      const removeSet = new Set(patch.friends.remove ?? []);
      const ids = next.friendIds.filter((id) => !removeSet.has(id));
      for (const id of patch.friends.add ?? []) {
        if (!ids.includes(id)) ids.push(id);
      }
      next.friendIds = ids;
    }
  }

  if (patch.isArchived !== undefined) {
    next.isArchived = patch.isArchived;
    next.archivedAt = patch.isArchived ? toLocalISO() : undefined;
  }

  return next;
}

export function bulkEditHangouts(
  data: AppData,
  hangoutIds: string[],
  patch: HangoutBulkEditPatch
): AppData {
  const idSet = new Set(hangoutIds);
  return {
    ...data,
    hangouts: data.hangouts.map((h) => (idSet.has(h.id) ? applyPatchToHangout(h, patch) : h)),
  };
}

export function bulkArchiveHangouts(
  data: AppData,
  hangoutIds: string[],
  archive: boolean
): AppData {
  const idSet = new Set(hangoutIds);
  const now = toLocalISO();
  return {
    ...data,
    hangouts: data.hangouts.map((h) => {
      if (!idSet.has(h.id)) return h;
      return { ...h, isArchived: archive, archivedAt: archive ? now : undefined };
    }),
  };
}

export function bulkDeleteHangouts(data: AppData, hangoutIds: string[]): AppData {
  const idSet = new Set(hangoutIds);
  return { ...data, hangouts: data.hangouts.filter((h) => !idSet.has(h.id)) };
}

export function duplicateHangoutToTargetDate(
  startTime: string,
  endTime: string,
  target: BulkDuplicateTarget
): { startTime: string; endTime: string } {
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  const durationMs = Math.max(0, end.getTime() - start.getTime());

  let targetDay: Date;
  const now = new Date();
  if (target.mode === 'today') {
    targetDay = startOfDay(now);
  } else if (target.mode === 'tomorrow') {
    const d = startOfDay(now);
    d.setDate(d.getDate() + 1);
    targetDay = d;
  } else {
    targetDay = parseISO(`${target.date}T00:00`);
  }

  const newStart = set(targetDay, {
    hours: start.getHours(),
    minutes: start.getMinutes(),
    seconds: 0,
    milliseconds: 0,
  });
  const newEnd = new Date(newStart.getTime() + durationMs);

  return { startTime: toLocalISO(newStart), endTime: toLocalISO(newEnd) };
}

export function bulkDuplicateHangouts(
  data: AppData,
  hangoutIds: string[],
  target: BulkDuplicateTarget
): AppData {
  const idSet = new Set(hangoutIds);
  const copies: Hangout[] = [];

  for (const h of data.hangouts) {
    if (!idSet.has(h.id)) continue;
    const times = duplicateHangoutToTargetDate(h.startTime, h.endTime, target);
    copies.push({
      ...h,
      ...times,
      id: generateId(),
      createdAt: toLocalISO(),
      isArchived: false,
      archivedAt: undefined,
      segments: (h.segments ?? []).map((s) => ({ ...s })),
    });
  }

  return { ...data, hangouts: [...data.hangouts, ...copies] };
}

export function filterHangoutsByArchive(hangouts: Hangout[], showArchived: boolean): Hangout[] {
  if (showArchived) return hangouts;
  return hangouts.filter((h) => !h.isArchived);
}
