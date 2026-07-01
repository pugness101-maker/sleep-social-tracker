import type { AppData, AppSettings, ActiveTimers, HangoutIdea, Friend } from '../types';
import {
  DEFAULT_FRIEND_TAGS,
  DEFAULT_HANGOUT_TYPES,
  DEFAULT_HANGOUT_TYPE,
  DEFAULT_RELATIONSHIP_STATUSES,
  DEFAULT_RELATIONSHIP_STATUS,
  RELATIONSHIP_TAGS_TO_MIGRATE,
} from '../types';

export const STORAGE_KEY = 'sleep-social-tracker-data';
export const DATA_VERSION = 6;

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
};

export const defaultActiveTimers: ActiveTimers = {
  sleepStart: null,
  napStart: null,
  hangoutStart: null,
  hangoutFriendIds: [],
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
  relationshipStatuses: [...DEFAULT_RELATIONSHIP_STATUSES],
  hangoutTypes: [...DEFAULT_HANGOUT_TYPES],
};

const migratedRelationshipTagSet = new Set<string>(RELATIONSHIP_TAGS_TO_MIGRATE);

function mergeSocialOptions(
  data: Partial<AppData> & { friendCategories?: string[] }
): Pick<AppData, 'friendTags' | 'relationshipStatuses' | 'hangoutTypes'> {
  const friendTags = [...(data.friendTags ?? data.friendCategories ?? defaultAppData.friendTags)]
    .filter((t) => !migratedRelationshipTagSet.has(t));
  const relationshipStatuses = [
    ...(data.relationshipStatuses ?? defaultAppData.relationshipStatuses),
  ];

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
  });

  const hangoutTypes = [...(data.hangoutTypes ?? defaultAppData.hangoutTypes)];
  data.hangouts?.forEach((h) => {
    if (h.type && !hangoutTypes.some((t) => t.toLowerCase() === h.type.toLowerCase())) {
      hangoutTypes.push(h.type);
    }
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

  return { friendTags, relationshipStatuses, hangoutTypes };
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
    return { ...rest, tags, relationshipStatus, relationships } as Friend;
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

export function normalizeAppData(
  raw: Partial<AppData> & {
    friendCategories?: string[];
    ideas?: Array<Partial<HangoutIdea> & { category?: string }>;
    friends?: Array<Partial<Friend> & { category?: string }>;
  }
): AppData {
  const friends = migrateFriends(raw.friends ?? []);
  const ideas = migrateIdeas(raw.ideas ?? []);
  const withMigrated = { ...raw, friends, ideas };
  const social = mergeSocialOptions(withMigrated);
  const activeTimers = { ...defaultActiveTimers, ...raw.activeTimers };
  if (!social.hangoutTypes.includes(activeTimers.hangoutType) && social.hangoutTypes.length > 0) {
    activeTimers.hangoutType = social.hangoutTypes.includes(DEFAULT_HANGOUT_TYPE)
      ? DEFAULT_HANGOUT_TYPE
      : social.hangoutTypes[0];
  }

  return {
    ...defaultAppData,
    ...withMigrated,
    friends,
    ideas,
    activeTimers,
    settings: { ...defaultSettings, ...raw.settings },
    ...social,
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
