import type { AppData, AppSettings, ActiveTimers } from '../types';

export const STORAGE_KEY = 'sleep-social-tracker-data';
export const DATA_VERSION = 1;

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
  hangoutType: 'Chill',
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
};

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultAppData };
    const parsed = JSON.parse(raw) as AppData;
    return {
      ...defaultAppData,
      ...parsed,
      activeTimers: { ...defaultActiveTimers, ...parsed.activeTimers },
      settings: { ...defaultSettings, ...parsed.settings },
    };
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
  return {
    ...defaultAppData,
    ...data,
    activeTimers: { ...defaultActiveTimers, ...data.activeTimers },
    settings: { ...defaultSettings, ...data.settings },
  };
}

export function clearAllData(): AppData {
  localStorage.removeItem(STORAGE_KEY);
  return { ...defaultAppData };
}
