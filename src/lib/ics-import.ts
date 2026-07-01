import ICAL from 'ical.js';
import {
  endOfDay,
  endOfMonth,
  format,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import type { AppData, Friend, Hangout } from '../types';
import { DEFAULT_HANGOUT_TYPE, DEFAULT_RELATIONSHIP_STATUS } from '../types';
import { generateId, toLocalISO } from './dates';
import { inferCategoryAndType } from './hangout-categories';
import { createPreImportBackup } from './import-sections';

export type IcsImportMode = 'merge' | 'replace';

export interface ParsedIcsEvent {
  uid: string;
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
  isCancelled: boolean;
}

export type FriendResolution =
  | { action: 'create' }
  | { action: 'match'; friendId: string }
  | { action: 'ignore' };

export interface IcsPreviewItem {
  uid: string;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  type: string;
  detectedNames: string[];
  resolvedFriendIds: string[];
  location: string;
  notes: string;
  import: boolean;
  isDuplicate: boolean;
  duplicateReason?: string;
  ignoredReason?: string;
}

export interface IcsImportOptions {
  mode: IcsImportMode;
  skipDuplicates: boolean;
  importLocation: boolean;
  importDescription: boolean;
  createMissingFriends: boolean;
  includeAllDay: boolean;
}

export interface IcsParseStats {
  totalEvents: number;
  inRange: number;
  detectedHangouts: number;
  ignoredEvents: number;
  uniqueNames: string[];
  newFriendsCount: number;
  duplicateCount: number;
}

export interface IcsDateRange {
  start: Date;
  end: Date;
}

const HANGOUT_TITLE_PATTERNS = [
  /hang\s*w\//i,
  /hangout\s*w\//i,
  /hang\s*out\s*w\//i,
  /date\s*w\//i,
  /lunch\s*w\//i,
  /dinner\s*w\//i,
  /movie\s*w\//i,
  /club\s*w\//i,
  /church\s*w\//i,
  /food\s*w\//i,
  /coffee\s*w\//i,
  /\bw\/\s*\S/i,
  /\bwith\s+\S/i,
];

const IGNORE_TITLE_PATTERNS = [
  /\bwork\b/i,
  /\bappointment\b/i,
  /\btherapy\b/i,
  /\binterview\b/i,
  /\bflight\b/i,
  /\bpay\s*day\b/i,
  /\bregistration\b/i,
  /\breminder\b/i,
  /\bwake\s*up\b/i,
  /\bsleep\b/i,
  /\bmorning\s*routine\b/i,
  /\bnight\s*routine\b/i,
  /\bcommute\b/i,
];

const NAME_PREFIX_PATTERNS = [
  /^(?:hang(?:\s*out)?|date|lunch|dinner|movie|movies|club(?:bing)?|church|food|coffee|brunch|eat)\s*w\/\s*(.+)$/i,
  /^hang\s*w\/\s*(.+)$/i,
  /\bw\/\s*(.+)$/i,
  /\bwith\s+(.+)$/i,
];

const NAME_SPLIT_REGEX = /\s*(?:&|,|\/|\band\b)\s*/i;

export const ICS_DATE_PRESETS = [
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'custom', label: 'Custom range' },
] as const;

export type IcsDatePresetId = (typeof ICS_DATE_PRESETS)[number]['id'];

function dateToLocalISO(d: Date): string {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function parseFlexibleDateInput(input: string): Date | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const formats = ['M/d/yy', 'M/d/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'M/d/yyyy', 'MM/d/yyyy'];
  for (const fmt of formats) {
    const parsed = parse(trimmed, fmt, new Date());
    if (isValid(parsed)) return startOfDay(parsed);
  }

  const ts = Date.parse(trimmed);
  if (!Number.isNaN(ts)) {
    const d = new Date(ts);
    if (isValid(d)) return startOfDay(d);
  }

  return null;
}

export function formatDateInputValue(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function getIcsDateRangePreset(preset: IcsDatePresetId): IcsDateRange {
  const today = new Date();
  const end = endOfDay(today);

  switch (preset) {
    case '30':
      return { start: startOfDay(subDays(today, 30)), end };
    case '90':
      return { start: startOfDay(subDays(today, 90)), end };
    case 'this-month':
      return { start: startOfMonth(today), end };
    case 'last-month': {
      const last = subMonths(today, 1);
      return { start: startOfMonth(last), end: endOfMonth(last) };
    }
    default:
      return { start: startOfDay(subDays(today, 30)), end };
  }
}

export function parseIcsFile(text: string): { events: ParsedIcsEvent[] } | { error: string } {
  try {
    const jcal = ICAL.parse(text);
    const comp = new ICAL.Component(jcal);
    const vevents = comp.getAllSubcomponents('vevent');
    const events: ParsedIcsEvent[] = [];

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);
      const title = event.summary || '';
      const status = vevent.getFirstPropertyValue('status');
      if (String(status ?? '').toUpperCase() === 'CANCELLED') continue;

      const startDate = event.startDate;
      const endDate = event.endDate;
      if (!startDate) continue;

      const isAllDay = !!startDate.isDate;
      const start = startDate.toJSDate();
      const end = endDate ? endDate.toJSDate() : start;

      events.push({
        uid: event.uid || `${title}-${start.getTime()}`,
        title,
        description: event.description || '',
        location: event.location || '',
        start,
        end,
        isAllDay,
        isCancelled: false,
      });
    }

    if (events.length === 0) {
      return { error: 'No events found in this calendar file.' };
    }

    return { events };
  } catch {
    return { error: 'Could not parse the .ics file. Make sure it is a valid calendar export.' };
  }
}

export function isEventInRange(event: ParsedIcsEvent, range: IcsDateRange): boolean {
  const start = startOfDay(event.start);
  return start >= startOfDay(range.start) && start <= endOfDay(range.end);
}

function isHangoutTitle(title: string): boolean {
  if (!title.trim()) return false;
  if (IGNORE_TITLE_PATTERNS.some((p) => p.test(title)) && !HANGOUT_TITLE_PATTERNS.some((p) => p.test(title))) {
    return false;
  }
  return HANGOUT_TITLE_PATTERNS.some((p) => p.test(title));
}

export function extractFriendNames(title: string): string[] {
  for (const pattern of NAME_PREFIX_PATTERNS) {
    const match = title.match(pattern);
    if (match?.[1]) {
      return match[1]
        .split(NAME_SPLIT_REGEX)
        .map((n) => n.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function detectHangoutType(title: string): string {
  const t = title.toLowerCase();
  if (/\b(lunch|dinner|food|eat|brunch)\b/.test(t)) return 'Food';
  if (/\bmovies?\b/.test(t)) return 'Movie';
  if (/\b(club|clubbing|party)\b/.test(t)) return 'Party';
  if (/\b(church|bible study)\b/.test(t)) return 'Church';
  if (/\b(date|seek)\b/.test(t)) return 'Date';
  if (/\b(gym|mma|workout)\b/.test(t)) return 'Gym';
  if (/\b(study|tutor)\b/.test(t)) return 'Study';
  if (/\b(shopping|shop|mall)\b/.test(t)) return 'Shopping';
  if (/\bsleepover\b/.test(t)) return 'Sleepover';
  return 'Chill';
}

export function findFriendByName(friends: Friend[], name: string): Friend | undefined {
  const normalized = name.trim().toLowerCase();
  return friends.find((f) => f.name.trim().toLowerCase() === normalized);
}

export function buildDefaultFriendResolutions(
  names: string[],
  friends: Friend[]
): Record<string, FriendResolution> {
  const resolutions: Record<string, FriendResolution> = {};
  for (const name of names) {
    const existing = findFriendByName(friends, name);
    resolutions[name] = existing ? { action: 'match', friendId: existing.id } : { action: 'create' };
  }
  return resolutions;
}

function hangoutMatchesDuplicate(
  hangout: Pick<Hangout, 'startTime' | 'endTime' | 'friendIds' | 'type' | 'sourceCalendarUid'>,
  existing: Hangout
): boolean {
  if (
    hangout.sourceCalendarUid &&
    existing.sourceCalendarUid &&
    hangout.sourceCalendarUid === existing.sourceCalendarUid
  ) {
    return true;
  }

  const aIds = [...hangout.friendIds].sort().join(',');
  const bIds = [...existing.friendIds].sort().join(',');
  return (
    hangout.startTime === existing.startTime &&
    hangout.endTime === existing.endTime &&
    hangout.type === existing.type &&
    aIds === bIds
  );
}

export function buildIcsPreview(
  events: ParsedIcsEvent[],
  range: IcsDateRange,
  _friends: Friend[],
  hangouts: Hangout[],
  friendResolutions: Record<string, FriendResolution>,
  options: Pick<IcsImportOptions, 'includeAllDay' | 'importLocation' | 'importDescription'>
): { items: IcsPreviewItem[]; stats: IcsParseStats } {
  const inRangeEvents = events.filter((e) => !e.isCancelled && isEventInRange(e, range));
  const items: IcsPreviewItem[] = [];
  let ignoredEvents = 0;
  const allNames = new Set<string>();

  for (const event of inRangeEvents) {
    if (event.isAllDay && !options.includeAllDay) {
      ignoredEvents += 1;
      continue;
    }

    if (!isHangoutTitle(event.title)) {
      ignoredEvents += 1;
      continue;
    }

    const detectedNames = extractFriendNames(event.title);
    detectedNames.forEach((n) => allNames.add(n));

    const type = detectHangoutType(event.title);
    const startTime = dateToLocalISO(event.start);
    const endTime = dateToLocalISO(event.end);
    const resolvedFriendIds = detectedNames
      .map((name) => {
        const resolution = friendResolutions[name];
        if (!resolution || resolution.action === 'ignore') return null;
        if (resolution.action === 'match') return resolution.friendId;
        return null;
      })
      .filter((id): id is string => !!id);

    const candidate = {
      uid: event.uid,
      startTime,
      endTime,
      friendIds: resolvedFriendIds,
      type,
      sourceCalendarUid: event.uid,
    };

    const duplicate = hangouts.find((h) => hangoutMatchesDuplicate(candidate, h));
    const duplicateReason = duplicate
      ? duplicate.sourceCalendarUid === event.uid
        ? 'Same calendar UID'
        : 'Same time, friends, and type'
      : undefined;

    items.push({
      uid: event.uid,
      title: event.title,
      startTime,
      endTime,
      durationMinutes: Math.max(0, Math.round((event.end.getTime() - event.start.getTime()) / 60_000)),
      type,
      detectedNames,
      resolvedFriendIds,
      location: options.importLocation ? event.location : '',
      notes: options.importDescription ? event.description : '',
      import: !duplicate,
      isDuplicate: !!duplicate,
      duplicateReason,
    });
  }

  const uniqueNames = [...allNames];
  const newFriendsCount = uniqueNames.filter((name) => {
    const r = friendResolutions[name];
    return r?.action === 'create';
  }).length;

  return {
    items,
    stats: {
      totalEvents: events.length,
      inRange: inRangeEvents.length,
      detectedHangouts: items.length,
      ignoredEvents,
      uniqueNames,
      newFriendsCount,
      duplicateCount: items.filter((i) => i.isDuplicate).length,
    },
  };
}

export function applyIcsCalendarImport(
  current: AppData,
  items: IcsPreviewItem[],
  friendResolutions: Record<string, FriendResolution>,
  options: IcsImportOptions
): AppData {
  const stamp = toLocalISO();
  let friends = [...current.friends];
  let hangouts = options.mode === 'replace' ? [] : [...current.hangouts];
  let hangoutTypes = [...current.hangoutTypes];

  const friendIdByName = new Map<string, string>();
  friends.forEach((f) => friendIdByName.set(f.name.trim().toLowerCase(), f.id));

  const namesToCreate = new Set<string>();
  for (const item of items) {
    if (!item.import) continue;
    for (const name of item.detectedNames) {
      const resolution = friendResolutions[name];
      if (resolution?.action === 'create' && options.createMissingFriends) {
        namesToCreate.add(name);
      }
    }
  }

  for (const name of namesToCreate) {
    const key = name.trim().toLowerCase();
    if (friendIdByName.has(key)) continue;
    const friend: Friend = {
      id: generateId(),
      name: name.trim(),
      tags: [],
      groups: [],
      relationshipStatus: DEFAULT_RELATIONSHIP_STATUS,
      birthday: '',
      contactInfo: '',
      notes: 'Imported from Google Calendar',
      favoriteActivities: [],
      relationships: [],
      createdAt: stamp,
    };
    friends.push(friend);
    friendIdByName.set(key, friend.id);
  }

  for (const item of items) {
    if (!item.import) continue;

    const friendIds = item.detectedNames
      .map((name) => {
        const resolution = friendResolutions[name];
        if (!resolution || resolution.action === 'ignore') return null;
        if (resolution.action === 'match') return resolution.friendId;
        if (resolution.action === 'create' && options.createMissingFriends) {
          return friendIdByName.get(name.trim().toLowerCase()) ?? null;
        }
        return null;
      })
      .filter((id): id is string => !!id);

    const type = item.type || DEFAULT_HANGOUT_TYPE;
    const { category } = inferCategoryAndType(type);
    const hangout: Hangout = {
      id: generateId(),
      friendIds,
      startTime: item.startTime,
      endTime: item.endTime,
      location: options.importLocation ? item.location : '',
      category,
      type,
      notes: options.importDescription ? item.notes : '',
      segments: [],
      createdAt: stamp,
      source: 'google_calendar_ics',
      sourceCalendarUid: item.uid,
    };

    if (options.skipDuplicates && hangouts.some((h) => hangoutMatchesDuplicate(hangout, h))) {
      continue;
    }

    if (!hangoutTypes.some((t) => t.toLowerCase() === hangout.type.toLowerCase())) {
      hangoutTypes.push(hangout.type);
    }

    hangouts.push(hangout);
  }

  return { ...current, friends, hangouts, hangoutTypes };
}

export function importIcsCalendarData(
  current: AppData,
  items: IcsPreviewItem[],
  friendResolutions: Record<string, FriendResolution>,
  options: IcsImportOptions
): { success: true; data: AppData; friendsCreated: number; hangoutsImported: number; backupCreated: boolean } | { success: false; error: string; backupCreated: boolean } {
  const toImport = items.filter((i) => i.import);
  if (toImport.length === 0) {
    return { success: false, error: 'No hangouts selected for import.', backupCreated: false };
  }

  const backupCreated = createPreImportBackup();

  try {
    const friendsBefore = current.friends.length;
    const hangoutsBefore = current.hangouts.length;
    const data = applyIcsCalendarImport(current, items, friendResolutions, options);
    const friendsCreated = data.friends.length - friendsBefore;
    const hangoutsImported =
      options.mode === 'replace' ? data.hangouts.length : data.hangouts.length - hangoutsBefore;
    return { success: true, data, friendsCreated, hangoutsImported, backupCreated };
  } catch {
    return { success: false, error: 'Import failed while applying calendar data.', backupCreated };
  }
}

export async function readIcsFile(file: File): Promise<{ text: string } | { error: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'ics') {
    return { error: 'Unsupported file type. Please upload a .ics file.' };
  }
  try {
    const text = await file.text();
    return { text };
  } catch {
    return { error: 'Could not read the file.' };
  }
}
