import type { AppData, AppSettings, ActiveTimers, HangoutIdea } from '../types';
import {
  DEFAULT_FRIEND_CATEGORIES,
  DEFAULT_HANGOUT_TYPES,
  DEFAULT_HANGOUT_TYPE,
} from '../types';

export const STORAGE_KEY = 'sleep-social-tracker-data';
export const DATA_VERSION = 3;

export const defaultSettings: AppSettings = {
  theme: 'system',
  awakeWarningHours: 16,
  sleepGoalHours: 8,
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
  friendCategories: [...DEFAULT_FRIEND_CATEGORIES],
  hangoutTypes: [...DEFAULT_HANGOUT_TYPES],
};

function mergeSocialOptions(data: Partial<AppData>): Pick<AppData, 'friendCategories' | 'hangoutTypes'> {
  const friendCategories = [...(data.friendCategories ?? defaultAppData.friendCategories)];
  data.friends?.forEach((f) => {
    if (f.category && !friendCategories.some((c) => c.toLowerCase() === f.category.toLowerCase())) {
      friendCategories.push(f.category);
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

  if (data.activeTimers?.hangoutType && !hangoutTypes.some((t) => t.toLowerCase() === data.activeTimers!.hangoutType.toLowerCase())) {
    hangoutTypes.push(data.activeTimers.hangoutType);
  }

  return { friendCategories, hangoutTypes };
}

/** Migrate legacy idea.category → idea.type */
function migrateIdeas(rawIdeas: Array<Partial<HangoutIdea> & { category?: string }>): HangoutIdea[] {
  return rawIdeas.map((idea) => {
    const type = idea.type ?? idea.category ?? DEFAULT_HANGOUT_TYPE;
    const { category: _removed, ...rest } = idea;
    return { ...rest, type } as HangoutIdea;
  });
}

export function normalizeAppData(raw: Partial<AppData> & { ideas?: Array<Partial<HangoutIdea> & { category?: string }> }): AppData {
  const ideas = migrateIdeas(raw.ideas ?? []);
  const withMigratedIdeas = { ...raw, ideas };
  const social = mergeSocialOptions(withMigratedIdeas);
  const activeTimers = { ...defaultActiveTimers, ...raw.activeTimers };
  if (!social.hangoutTypes.includes(activeTimers.hangoutType) && social.hangoutTypes.length > 0) {
    activeTimers.hangoutType = social.hangoutTypes.includes(DEFAULT_HANGOUT_TYPE)
      ? DEFAULT_HANGOUT_TYPE
      : social.hangoutTypes[0];
  }

  return {
    ...defaultAppData,
    ...withMigratedIdeas,
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
