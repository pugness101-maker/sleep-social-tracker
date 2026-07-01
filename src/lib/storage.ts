import type { AppData, AppSettings, ActiveTimers, HangoutIdea, Friend, Hangout } from '../types';
import { normalizeHangoutSegments } from './hangout-segments';
import { normalizeSleepAutoCalcSettings } from './sleep-goals';
import {
  cloneDefaultTypesByCategory,
  DEFAULT_HANGOUT_TYPES_BY_CATEGORY,
  inferCategoryAndType,
  mergeTypesIntoCatalog,
  migrateHangoutCategories,
  migrateIdeaCategories,
  allTypesFromCatalogExcludingMixed,
  isMixedHangoutCategory,
  MIXED_HANGOUT_CATEGORY,
} from './hangout-categories';
import {
  DEFAULT_HANGOUT_CATEGORIES,
  DEFAULT_FRIEND_TAGS,
  DEFAULT_FRIEND_GROUPS,
  DEFAULT_HANGOUT_TYPES,
  DEFAULT_HANGOUT_TYPE,
  DEFAULT_RELATIONSHIP_STATUSES,
  DEFAULT_RELATIONSHIP_STATUS,
  DEFAULT_RELATIONSHIP_TYPES,
  RELATIONSHIP_TAGS_TO_MIGRATE,
} from '../types';

export const STORAGE_KEY = 'sleep-social-tracker-data';
export const PRE_IMPORT_BACKUP_KEY = 'sleep-social-tracker-data-pre-import-backup';
export const DATA_VERSION = 14;

export const defaultSettings: AppSettings = {
  theme: 'system',
  awakeWarningHours: 16,
  sleepGoalHours: 8,
  targetWakeUpTime: '08:00',
  targetBedtime: '00:00',
  autoCalculateBedtime: false,
  autoCalculateWakeTime: false,
  notificationsEnabled: false,
  bedtimeReminder: false,
  hangoutReminder: false,
  friendPickerShowSelectedFirst: true,
  includeArchivedInDashboard: false,
};

export const defaultActiveTimers: ActiveTimers = {
  sleepStart: null,
  napStart: null,
  hangoutStart: null,
  hangoutFriendIds: [],
  hangoutCategory: 'Social',
  hangoutType: DEFAULT_HANGOUT_TYPES[0],
  hangoutLocation: '',
};

export const defaultAppData: AppData = {
  sleepEntries: [],
  napEntries: [],
  friends: [],
  hangouts: [],
  ideas: [],
  activeTimers: defaultActiveTimers,
  settings: defaultSettings,
  friendTags: [...DEFAULT_FRIEND_TAGS],
  friendGroups: [...DEFAULT_FRIEND_GROUPS],
  relationshipStatuses: [...DEFAULT_RELATIONSHIP_STATUSES],
  relationshipTypes: [...DEFAULT_RELATIONSHIP_TYPES],
  hangoutTypes: [...DEFAULT_HANGOUT_TYPES],
  hangoutCategories: [...DEFAULT_HANGOUT_CATEGORIES],
  hangoutTypesByCategory: cloneDefaultTypesByCategory(),
  favoriteLocations: [],
};

const migratedRelationshipTagSet = new Set<string>(RELATIONSHIP_TAGS_TO_MIGRATE);

function mergeSocialOptions(
  data: Partial<AppData> & { friendCategories?: string[] }
): Pick<AppData, 'friendTags' | 'friendGroups' | 'relationshipStatuses' | 'relationshipTypes' | 'hangoutTypes'> {
  const friendTags = [...(data.friendTags ?? data.friendCategories ?? defaultAppData.friendTags)]
    .filter((t) => !migratedRelationshipTagSet.has(t));
  const friendGroups = [...(data.friendGroups ?? defaultAppData.friendGroups)];
  const relationshipStatuses = [
    ...(data.relationshipStatuses ?? defaultAppData.relationshipStatuses),
  ];
  const relationshipTypes = [...(data.relationshipTypes ?? defaultAppData.relationshipTypes)];

  data.friends?.forEach((f) => {
    const friend = f as Friend & { category?: string };
    const tags = friend.tags?.length ? friend.tags : friend.category ? [friend.category] : [];
    tags.forEach((tag) => {
      if (
        tag &&
        !migratedRelationshipTagSet.has(tag) &&
        !friendTags.some((t) => t.toLowerCase() === tag.toLowerCase())
      ) {
        friendTags.push(tag);
      }
    });
    const status = friend.relationshipStatus;
    if (status && !relationshipStatuses.some((s) => s.toLowerCase() === status.toLowerCase())) {
      relationshipStatuses.push(status);
    }
    friend.relationships?.forEach((link) => {
      if (
        link.type &&
        !relationshipTypes.some((t) => t.toLowerCase() === link.type.toLowerCase())
      ) {
        relationshipTypes.push(link.type);
      }
    });
    (friend.groups ?? []).forEach((group) => {
      if (
        group &&
        !friendGroups.some((g) => g.toLowerCase() === group.toLowerCase())
      ) {
        friendGroups.push(group);
      }
    });
  });

  const hangoutTypes = [...(data.hangoutTypes ?? defaultAppData.hangoutTypes)];
  data.hangouts?.forEach((h) => {
    if (h.type && !hangoutTypes.some((t) => t.toLowerCase() === h.type.toLowerCase())) {
      hangoutTypes.push(h.type);
    }
    h.segments?.forEach((seg) => {
      if (seg.type && !hangoutTypes.some((t) => t.toLowerCase() === seg.type.toLowerCase())) {
        hangoutTypes.push(seg.type);
      }
    });
  });

  data.ideas?.forEach((i) => {
    if (i.type && !hangoutTypes.some((t) => t.toLowerCase() === i.type.toLowerCase())) {
      hangoutTypes.push(i.type);
    }
  });

  if (
    data.activeTimers?.hangoutType &&
    !hangoutTypes.some((t) => t.toLowerCase() === data.activeTimers!.hangoutType.toLowerCase())
  ) {
    hangoutTypes.push(data.activeTimers.hangoutType);
  }

  return { friendTags, friendGroups, relationshipStatuses, relationshipTypes, hangoutTypes };
}

/** Build category catalog from saved settings — defaults only on first install. */
export function buildHangoutCatalogFromSaved(raw: Partial<AppData>): {
  categories: string[];
  catalog: Record<string, string[]>;
} {
  if (raw.hangoutCategories == null) {
    return {
      categories: [...DEFAULT_HANGOUT_CATEGORIES],
      catalog: cloneDefaultTypesByCategory(),
    };
  }

  const categories = [...raw.hangoutCategories];
  const catalog: Record<string, string[]> = {};

  if (raw.hangoutTypesByCategory != null) {
    for (const cat of categories) {
      catalog[cat] = [...(raw.hangoutTypesByCategory[cat] ?? ['Other'])];
    }
    for (const [cat, types] of Object.entries(raw.hangoutTypesByCategory)) {
      if (!catalog[cat]) catalog[cat] = [...types];
    }
  } else {
    for (const cat of categories) {
      catalog[cat] = [...(DEFAULT_HANGOUT_TYPES_BY_CATEGORY[cat] ?? ['Other'])];
    }
  }

  if (categories.some(isMixedHangoutCategory)) {
    catalog[MIXED_HANGOUT_CATEGORY] = [];
  }

  return { categories, catalog };
}

/** Migrate legacy friend.category → tags, and relationship labels out of tags */
function migrateFriends(rawFriends: Array<Partial<Friend> & { category?: string }>): Friend[] {
  return rawFriends.map((friend) => {
    let tags = [...(friend.tags ?? [])];
    if (tags.length === 0 && friend.category) {
      tags = [friend.category];
    }

    let relationshipStatus = friend.relationshipStatus ?? '';
    const foundInTags = tags.filter((t) => migratedRelationshipTagSet.has(t));

    if (foundInTags.length > 0) {
      if (!relationshipStatus) relationshipStatus = foundInTags[0];
      tags = tags.filter((t) => !migratedRelationshipTagSet.has(t));
    }

    if (!relationshipStatus) relationshipStatus = DEFAULT_RELATIONSHIP_STATUS;

    const relationships = friend.relationships ?? [];

    const { category: _removed, ...rest } = friend;
    const isArchived = friend.isArchived ?? false;
    return {
      ...rest,
      tags,
      groups: friend.groups ?? [],
      relationshipStatus,
      relationships,
      isArchived,
      archivedAt: isArchived ? friend.archivedAt : undefined,
    } as Friend;
  });
}

/** Migrate legacy idea.category → idea.type */
function migrateIdeas(rawIdeas: Array<Partial<HangoutIdea> & { category?: string }>): HangoutIdea[] {
  return rawIdeas.map((idea) => {
    const type = idea.type ?? idea.category ?? DEFAULT_HANGOUT_TYPE;
    const { category: _removed, ...rest } = idea;
    return { ...rest, type } as HangoutIdea;
  });
}

function migrateHangouts(rawHangouts: Partial<Hangout>[], catalog: Record<string, string[]>): Hangout[] {
  return rawHangouts.map((h) => {
    const pair = inferCategoryAndType(h.type ?? 'Other', h.category, catalog);
    const friendIds = h.friendIds ?? [];
    const segments = normalizeHangoutSegments(h.segments, friendIds, pair.category, catalog);
    return {
      ...h,
      friendIds,
      category: pair.category,
      type: pair.type,
      segments,
    } as Hangout;
  });
}

export function normalizeAppData(
  raw: Partial<AppData> & {
    friendCategories?: string[];
    ideas?: Array<Partial<HangoutIdea> & { category?: string }>;
    friends?: Array<Partial<Friend> & { category?: string }>;
  }
): AppData {
  const friends = migrateFriends(raw.friends ?? []);
  const { categories, catalog: catalogBase } = buildHangoutCatalogFromSaved(raw);
  let ideas = migrateIdeas(raw.ideas ?? []);
  let hangouts = migrateHangouts(raw.hangouts ?? [], catalogBase);
  const merged = mergeTypesIntoCatalog(categories, catalogBase, hangouts, ideas);
  hangouts = migrateHangoutCategories(hangouts, merged.catalog);
  ideas = migrateIdeaCategories(ideas, merged.catalog);
  const withMigrated = {
    ...raw,
    friends,
    ideas,
    hangouts,
    hangoutCategories: merged.categories,
    hangoutTypesByCategory: merged.catalog,
  };
  const social = mergeSocialOptions(withMigrated);
  const hangoutTypes = allTypesFromCatalogExcludingMixed(merged.catalog);
  const activeTimers = {
    ...defaultActiveTimers,
    ...raw.activeTimers,
    hangoutCategory:
      raw.activeTimers?.hangoutCategory ??
      inferCategoryAndType(raw.activeTimers?.hangoutType ?? DEFAULT_HANGOUT_TYPE, undefined, merged.catalog).category,
    hangoutType:
      raw.activeTimers?.hangoutType ??
      inferCategoryAndType(DEFAULT_HANGOUT_TYPE, raw.activeTimers?.hangoutCategory, merged.catalog).type,
  };
  const mainFields = inferCategoryAndType(activeTimers.hangoutType, activeTimers.hangoutCategory, merged.catalog);
  activeTimers.hangoutCategory = mainFields.category;
  activeTimers.hangoutType = mainFields.type;
  if (!hangoutTypes.includes(activeTimers.hangoutType) && hangoutTypes.length > 0 && !isMixedHangoutCategory(activeTimers.hangoutCategory)) {
    activeTimers.hangoutType = social.hangoutTypes.includes(DEFAULT_HANGOUT_TYPE)
      ? DEFAULT_HANGOUT_TYPE
      : social.hangoutTypes[0];
  }

  return {
    ...defaultAppData,
    ...withMigrated,
    friends,
    ideas,
    hangouts,
    activeTimers,
    settings: {
      ...defaultSettings,
      ...raw.settings,
      ...normalizeSleepAutoCalcSettings({
        autoCalculateBedtime: raw.settings?.autoCalculateBedtime ?? defaultSettings.autoCalculateBedtime,
        autoCalculateWakeTime: raw.settings?.autoCalculateWakeTime ?? defaultSettings.autoCalculateWakeTime,
      }),
    },
    ...social,
    hangoutTypes,
    hangoutCategories: merged.categories,
    hangoutTypesByCategory: merged.catalog,
    favoriteLocations: raw.favoriteLocations ?? defaultAppData.favoriteLocations,
  };
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultAppData };
    return normalizeAppData(JSON.parse(raw) as AppData);
  } catch {
    return { ...defaultAppData };
  }
}

export function saveAppData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function exportAppData(data: AppData): string {
  return JSON.stringify({ version: DATA_VERSION, exportedAt: new Date().toISOString(), data }, null, 2);
}

export function importAppData(json: string): AppData {
  const parsed = JSON.parse(json);
  const data = parsed.data ?? parsed;
  return normalizeAppData(data);
}

export function clearAllData(): AppData {
  localStorage.removeItem(STORAGE_KEY);
  return { ...defaultAppData };
}
