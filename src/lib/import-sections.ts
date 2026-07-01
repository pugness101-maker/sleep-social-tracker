import type { AppData, ActiveTimers, Friend, Hangout, HangoutIdea } from '../types';
import {
  defaultActiveTimers,
  defaultAppData,
  normalizeAppData,
  PRE_IMPORT_BACKUP_KEY,
  STORAGE_KEY,
} from './storage';

export type ImportSectionPreset =
  | 'sleep'
  | 'social'
  | 'friends'
  | 'hangouts'
  | 'ideas'
  | 'settings'
  | 'everything';

export type ImportMode = 'replace' | 'merge';

export interface ImportPreview {
  valid: boolean;
  error?: string;
  exportedAt?: string;
  version?: number;
  sleepEntries: number;
  napEntries: number;
  friends: number;
  hangouts: number;
  ideas: number;
  friendTags: number;
  relationshipStatuses: number;
  relationshipTypes: number;
  hangoutTypes: number;
  hasSettings: boolean;
}

export interface SectionImportOptions {
  preset: ImportSectionPreset;
  mode: ImportMode;
}

export interface SectionImportResult {
  success: boolean;
  error?: string;
  backupCreated: boolean;
}

export interface ParsedBackup {
  version?: number;
  exportedAt?: string;
  data: Partial<AppData>;
}

export const IMPORT_PRESET_OPTIONS: {
  id: ImportSectionPreset;
  label: string;
  description: string;
}[] = [
  {
    id: 'sleep',
    label: 'Sleep Log Data',
    description: 'Sleep entries, naps, and sleep/nap timers (Sleep Log)',
  },
  {
    id: 'social',
    label: 'Social Data',
    description: 'Friends, hangouts, ideas, tags, statuses, types, and hangout timers',
  },
  {
    id: 'friends',
    label: 'Friends Only',
    description: 'Friends, friend tags, and relationship statuses',
  },
  {
    id: 'hangouts',
    label: 'Hangouts Only',
    description: 'Hangouts and hangout types',
  },
  {
    id: 'ideas',
    label: 'Ideas Only',
    description: 'Hangout ideas and hangout types',
  },
  {
    id: 'settings',
    label: 'Settings Only',
    description: 'App settings and preferences',
  },
  {
    id: 'everything',
    label: 'Everything',
    description: 'Full backup restore (all sections)',
  },
];

const APP_DATA_KEYS = [
  'sleepEntries',
  'napEntries',
  'friends',
  'hangouts',
  'ideas',
  'activeTimers',
  'settings',
  'friendTags',
  'relationshipStatuses',
  'relationshipTypes',
  'hangoutTypes',
] as const;

interface PresetConfig {
  sleepEntries?: boolean;
  napEntries?: boolean;
  friends?: boolean;
  hangouts?: boolean;
  ideas?: boolean;
  friendTags?: boolean;
  relationshipStatuses?: boolean;
  relationshipTypes?: boolean;
  hangoutTypes?: boolean;
  settings?: boolean;
  sleepTimers?: boolean;
  hangoutTimers?: boolean;
  importMissingFriends?: boolean;
}

const PRESET_CONFIG: Record<ImportSectionPreset, PresetConfig> = {
  sleep: {
    sleepEntries: true,
    napEntries: true,
    sleepTimers: true,
  },
  social: {
    friends: true,
    hangouts: true,
    ideas: true,
    friendTags: true,
    relationshipStatuses: true,
    relationshipTypes: true,
    hangoutTypes: true,
    hangoutTimers: true,
    importMissingFriends: true,
  },
  friends: {
    friends: true,
    friendTags: true,
    relationshipStatuses: true,
    relationshipTypes: true,
  },
  hangouts: {
    hangouts: true,
    hangoutTypes: true,
  },
  ideas: {
    ideas: true,
    hangoutTypes: true,
  },
  settings: {
    settings: true,
  },
  everything: {
    sleepEntries: true,
    napEntries: true,
    friends: true,
    hangouts: true,
    ideas: true,
    friendTags: true,
    relationshipStatuses: true,
    relationshipTypes: true,
    hangoutTypes: true,
    settings: true,
    sleepTimers: true,
    hangoutTimers: true,
    importMissingFriends: true,
  },
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function parseBackupJson(json: string): { ok: true; backup: ParsedBackup } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Invalid JSON file.' };
  }

  if (!isObject(parsed)) {
    return { ok: false, error: 'Backup must be a JSON object.' };
  }

  const hasWrapper = isObject(parsed.data);
  const data = hasWrapper ? (parsed.data as Partial<AppData>) : (parsed as Partial<AppData>);

  if (!isObject(data)) {
    return { ok: false, error: 'Backup is missing a data object.' };
  }

  const hasKnownField = APP_DATA_KEYS.some((key) => key in data);
  if (!hasKnownField) {
    return {
      ok: false,
      error: 'Backup does not contain any recognized sections (sleepEntries, friends, settings, etc.).',
    };
  }

  const arrayFields: (keyof AppData)[] = [
    'sleepEntries',
    'napEntries',
    'friends',
    'hangouts',
    'ideas',
    'friendTags',
    'relationshipStatuses',
    'relationshipTypes',
    'hangoutTypes',
  ];

  for (const field of arrayFields) {
    if (field in data && data[field] !== undefined && !isArray(data[field])) {
      return { ok: false, error: `Invalid backup: "${field}" must be an array.` };
    }
  }

  if ('settings' in data && data.settings !== undefined && !isObject(data.settings)) {
    return { ok: false, error: 'Invalid backup: "settings" must be an object.' };
  }

  if ('activeTimers' in data && data.activeTimers !== undefined && !isObject(data.activeTimers)) {
    return { ok: false, error: 'Invalid backup: "activeTimers" must be an object.' };
  }

  return {
    ok: true,
    backup: {
      version: typeof parsed.version === 'number' ? parsed.version : undefined,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined,
      data,
    },
  };
}

export function getImportPreview(json: string): ImportPreview {
  const parsed = parseBackupJson(json);
  if (!parsed.ok) {
    return {
      valid: false,
      error: parsed.error,
      sleepEntries: 0,
      napEntries: 0,
      friends: 0,
      hangouts: 0,
      ideas: 0,
      friendTags: 0,
      relationshipStatuses: 0,
      relationshipTypes: 0,
      hangoutTypes: 0,
      hasSettings: false,
    };
  }

  const { backup } = parsed;
  const { data } = backup;

  return {
    valid: true,
    exportedAt: backup.exportedAt,
    version: backup.version,
    sleepEntries: data.sleepEntries?.length ?? 0,
    napEntries: data.napEntries?.length ?? 0,
    friends: data.friends?.length ?? 0,
    hangouts: data.hangouts?.length ?? 0,
    ideas: data.ideas?.length ?? 0,
    friendTags: data.friendTags?.length ?? 0,
    relationshipStatuses: data.relationshipStatuses?.length ?? 0,
    relationshipTypes: data.relationshipTypes?.length ?? 0,
    hangoutTypes: data.hangoutTypes?.length ?? 0,
    hasSettings: !!data.settings && Object.keys(data.settings).length > 0,
  };
}

export function createPreImportBackup(): boolean {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (!current) return false;
    localStorage.setItem(
      PRE_IMPORT_BACKUP_KEY,
      JSON.stringify({ savedAt: new Date().toISOString(), snapshot: current })
    );
    return true;
  } catch {
    return false;
  }
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const map = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) {
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

function mergeUniqueStrings(current: string[], incoming: string[]): string[] {
  const result = [...current];
  for (const value of incoming) {
    if (!value) continue;
    if (!result.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
      result.push(value);
    }
  }
  return result;
}

function applyArraySection<T extends { id: string }>(
  current: T[],
  incoming: T[],
  mode: ImportMode
): T[] {
  return mode === 'replace' ? [...incoming] : mergeById(current, incoming);
}

function applyStringListSection(current: string[], incoming: string[], mode: ImportMode): string[] {
  return mode === 'replace' ? [...incoming] : mergeUniqueStrings(current, incoming);
}

function applySleepTimers(current: ActiveTimers, incoming: ActiveTimers, mode: ImportMode): ActiveTimers {
  if (mode === 'replace') {
    return {
      ...current,
      sleepStart: incoming.sleepStart ?? null,
      napStart: incoming.napStart ?? null,
    };
  }
  return {
    ...current,
    sleepStart: incoming.sleepStart ?? current.sleepStart,
    napStart: incoming.napStart ?? current.napStart,
  };
}

function applyHangoutTimers(current: ActiveTimers, incoming: ActiveTimers, mode: ImportMode): ActiveTimers {
  if (mode === 'replace') {
    return {
      ...current,
      hangoutStart: incoming.hangoutStart ?? null,
      hangoutFriendIds: [...(incoming.hangoutFriendIds ?? [])],
      hangoutType: incoming.hangoutType ?? current.hangoutType,
      hangoutLocation: incoming.hangoutLocation ?? '',
    };
  }
  return {
    ...current,
    hangoutStart: incoming.hangoutStart ?? current.hangoutStart,
    hangoutFriendIds: incoming.hangoutFriendIds?.length
      ? [...incoming.hangoutFriendIds]
      : current.hangoutFriendIds,
    hangoutType: incoming.hangoutType || current.hangoutType,
    hangoutLocation: incoming.hangoutLocation ?? current.hangoutLocation,
  };
}

function collectReferencedFriendIds(hangouts: Hangout[], ideas: HangoutIdea[]): Set<string> {
  const ids = new Set<string>();
  hangouts.forEach((h) => h.friendIds?.forEach((id) => ids.add(id)));
  ideas.forEach((i) => i.friendIds?.forEach((id) => ids.add(id)));
  return ids;
}

function addMissingReferencedFriends(
  currentFriends: Friend[],
  sourceFriends: Friend[],
  hangouts: Hangout[],
  ideas: HangoutIdea[]
): Friend[] {
  const currentIds = new Set(currentFriends.map((f) => f.id));
  const needed = collectReferencedFriendIds(hangouts, ideas);
  const missing = sourceFriends.filter((f) => needed.has(f.id) && !currentIds.has(f.id));
  return missing.length ? [...currentFriends, ...missing] : currentFriends;
}

export function applySectionImport(
  current: AppData,
  rawImport: Partial<AppData>,
  options: SectionImportOptions
): AppData {
  const source = normalizeAppData({ ...defaultAppData, ...rawImport });
  const config = PRESET_CONFIG[options.preset];
  const { mode } = options;

  if (options.preset === 'everything' && mode === 'replace') {
    return normalizeAppData(source);
  }

  let next: AppData = { ...current };

  if (config.sleepEntries) {
    next.sleepEntries = applyArraySection(current.sleepEntries, source.sleepEntries, mode);
  }
  if (config.napEntries) {
    next.napEntries = applyArraySection(current.napEntries, source.napEntries, mode);
  }
  if (config.friends) {
    next.friends = applyArraySection(current.friends, source.friends, mode);
  }
  if (config.hangouts) {
    next.hangouts = applyArraySection(current.hangouts, source.hangouts, mode);
  }
  if (config.ideas) {
    next.ideas = applyArraySection(current.ideas, source.ideas, mode);
  }

  if (config.importMissingFriends) {
    next.friends = addMissingReferencedFriends(
      next.friends,
      source.friends,
      config.hangouts ? source.hangouts : [],
      config.ideas ? source.ideas : []
    );
  }

  if (config.friendTags) {
    next.friendTags = applyStringListSection(current.friendTags, source.friendTags, mode);
  }
  if (config.relationshipStatuses) {
    next.relationshipStatuses = applyStringListSection(
      current.relationshipStatuses,
      source.relationshipStatuses,
      mode
    );
  }
  if (config.relationshipTypes) {
    next.relationshipTypes = applyStringListSection(
      current.relationshipTypes,
      source.relationshipTypes,
      mode
    );
  }
  if (config.hangoutTypes) {
    next.hangoutTypes = applyStringListSection(current.hangoutTypes, source.hangoutTypes, mode);
  }
  if (config.settings) {
    next.settings = mode === 'replace' ? { ...source.settings } : { ...current.settings, ...source.settings };
  }

  let timers = { ...next.activeTimers };
  if (config.sleepTimers) {
    timers = applySleepTimers(timers, source.activeTimers, mode);
  }
  if (config.hangoutTimers) {
    timers = applyHangoutTimers(timers, source.activeTimers, mode);
  }
  next.activeTimers = {
    ...defaultActiveTimers,
    ...timers,
    hangoutFriendIds: [...timers.hangoutFriendIds],
  };

  const normalized = normalizeAppData({
    ...next,
    friends: next.friends,
    hangouts: next.hangouts,
    ideas: next.ideas,
  });

  if (config.friendTags || config.friends) {
    next.friendTags = mergeUniqueStrings(next.friendTags, normalized.friendTags);
  }
  if (config.relationshipStatuses || config.friends) {
    next.relationshipStatuses = mergeUniqueStrings(
      next.relationshipStatuses,
      normalized.relationshipStatuses
    );
  }
  if (config.relationshipTypes || config.friends) {
    next.relationshipTypes = mergeUniqueStrings(
      next.relationshipTypes,
      normalized.relationshipTypes
    );
  }
  if (config.hangoutTypes || config.hangouts || config.ideas) {
    next.hangoutTypes = mergeUniqueStrings(next.hangoutTypes, normalized.hangoutTypes);
  }

  next.friends = normalized.friends;
  next.ideas = normalized.ideas;

  return next;
}

export function importSectionsFromJsonData(
  current: AppData,
  json: string,
  options: SectionImportOptions
): { success: true; data: AppData; backupCreated: boolean } | { success: false; error: string; backupCreated: boolean } {
  const parsed = parseBackupJson(json);
  if (!parsed.ok) {
    return { success: false, error: parsed.error, backupCreated: false };
  }

  const backupCreated = createPreImportBackup();

  try {
    const data = applySectionImport(current, parsed.backup.data, options);
    return { success: true, data, backupCreated };
  } catch {
    return { success: false, error: 'Import failed while applying sections.', backupCreated };
  }
}

export function getPresetLabel(preset: ImportSectionPreset): string {
  return IMPORT_PRESET_OPTIONS.find((p) => p.id === preset)?.label ?? preset;
}
