export type FriendCategory = string;

export type HangoutType = string;

export const DEFAULT_FRIEND_CATEGORIES = ['Family', 'Friend', 'Good Friend', 'Best Friend'] as const;

export const DEFAULT_HANGOUT_TYPES = [
  'Chill', 'Food', 'Study', 'Gym', 'Party', 'Shopping', 'Travel', 'Sleepover', 'Work', 'Other',
] as const;

export const DEFAULT_FRIEND_CATEGORY = 'Friend';
export const DEFAULT_HANGOUT_TYPE = 'Other';

export type IdeaCategory =
  | 'Food'
  | 'Coffee'
  | 'Hiking'
  | 'Movies'
  | 'Sports'
  | 'Shopping'
  | 'Gaming'
  | 'Arts & Crafts'
  | 'Travel'
  | 'Concerts'
  | 'Nightlife'
  | 'Outdoors'
  | 'Study'
  | 'Volunteering'
  | 'Other';

export type CostLevel = 'Free' | '$' | '$$' | '$$$';

export type IdeaStatus = 'Want to Try' | 'Planned' | 'Completed' | 'Archived';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface SleepEntry {
  id: string;
  sleepStart: string;
  wakeUp: string;
  notes: string;
  createdAt: string;
}

export interface NapEntry {
  id: string;
  napStart: string;
  napEnd: string;
  notes: string;
  createdAt: string;
}

export interface Friend {
  id: string;
  name: string;
  category: FriendCategory;
  birthday: string;
  contactInfo: string;
  notes: string;
  favoriteActivities: string[];
  createdAt: string;
}

export interface Hangout {
  id: string;
  friendIds: string[];
  startTime: string;
  endTime: string;
  location: string;
  type: HangoutType;
  notes: string;
  createdAt: string;
}

export interface HangoutIdea {
  id: string;
  title: string;
  category: IdeaCategory;
  estimatedCost: CostLevel;
  estimatedDurationMinutes: number;
  location: string;
  priority: number;
  status: IdeaStatus;
  friendIds: string[];
  notes: string;
  links: string[];
  isFavorite: boolean;
  createdAt: string;
}

export interface ActiveTimers {
  sleepStart: string | null;
  napStart: string | null;
  hangoutStart: string | null;
  hangoutFriendIds: string[];
  hangoutType: HangoutType;
  hangoutLocation: string;
}

export interface AppSettings {
  theme: ThemeMode;
  awakeWarningHours: number;
  sleepGoalHours: number;
  notificationsEnabled: boolean;
  bedtimeReminder: boolean;
  hangoutReminder: boolean;
}

export interface AppData {
  sleepEntries: SleepEntry[];
  napEntries: NapEntry[];
  friends: Friend[];
  hangouts: Hangout[];
  ideas: HangoutIdea[];
  activeTimers: ActiveTimers;
  settings: AppSettings;
  friendCategories: string[];
  hangoutTypes: string[];
}

export type ActivityItem = {
  id: string;
  type: 'sleep' | 'nap' | 'hangout';
  title: string;
  timestamp: string;
  detail: string;
};
