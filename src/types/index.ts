export type FriendTag = string;

export type HangoutType = string;
export type HangoutCategory = string;

export const DEFAULT_FRIEND_TAGS = [
  'Family',
  'Friend',
  'Good Friend',
  'Best Friend',
  'Acquaintance',
  'Coworker',
  'Classmate',
  'Online Friend',
  'Gym Buddy',
  'Study Buddy',
] as const;

export const DEFAULT_FRIEND_GROUPS = [
  'TXST',
  'Family',
  'Church',
  'MMA',
  'Work',
  'High School',
  'Roommates',
  'Dating',
  'Close Circle',
] as const;

/** Legacy tag values migrated into relationshipStatus */
export const RELATIONSHIP_TAGS_TO_MIGRATE = [
  'Talking',
  'Dating',
  'Partner',
  'Ex',
  'Friends with Benefits',
  'Situationship',
  'Crush',
] as const;

export const DEFAULT_RELATIONSHIP_STATUSES = [
  'None',
  'Talking',
  'Dating',
  'Partner',
  'Ex',
  'Friends with Benefits',
  'Situationship',
  'Crush',
] as const;

export const DEFAULT_RELATIONSHIP_STATUS = 'None';

/** Linked relationship types between friends (Settings → Relationship Types) */
export const DEFAULT_RELATIONSHIP_TYPES = [
  'Dating',
  'Partner',
  'Spouse',
  'Ex',
  'Sibling',
  'Parent',
  'Child',
  'Cousin',
  'Friend',
  'Best Friend',
  'Coworker',
  'Classmate',
  'Roommate',
  'Teammate',
  'Mutual Friend',
  'Other',
] as const;

export const DEFAULT_RELATIONSHIP_TYPE = 'Other';

/** @deprecated use DEFAULT_RELATIONSHIP_TYPES */
export const DEFAULT_FRIEND_LINK_TYPES = DEFAULT_RELATIONSHIP_TYPES;

export type FriendLinkType = string;

export interface FriendLink {
  id: string;
  relatedFriendId: string;
  type: FriendLinkType;
  notes: string;
  createdAt: string;
}

export const DEFAULT_HANGOUT_TYPES = [
  'Chill', 'Mixed', 'Food', 'Study', 'Gym', 'Party', 'Shopping', 'Travel', 'Sleepover', 'Work', 'Other',
] as const;

export const DEFAULT_HANGOUT_TYPE = 'Other';

export const DEFAULT_HANGOUT_CATEGORIES = [
  'Social',
  'Food',
  'Entertainment',
  'Fitness',
  'Faith',
  'School',
  'Outdoor',
  'Shopping',
  'Travel',
  'Work',
  'Wellness',
  'Other',
] as const;

export const DEFAULT_HANGOUT_CATEGORY = 'Other';

export interface HangoutSegment {
  id: string;
  category: HangoutCategory;
  type: HangoutType;
  /** Friends involved in this segment; defaults to main hangout friends when empty. */
  friendIds: string[];
  /** Optional; when both start and end are set, duration is derived from them. */
  startTime: string;
  endTime: string;
  /** Optional manual duration (minutes) when start/end are not set. */
  durationMinutes: number | null;
  location: string;
  notes: string;
}

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

export type RelationshipStatus = string;

export interface Friend {
  id: string;
  name: string;
  tags: FriendTag[];
  /** Friend groups (separate from tags); multiple allowed. */
  groups: string[];
  relationshipStatus: RelationshipStatus;
  birthday: string;
  contactInfo: string;
  notes: string;
  favoriteActivities: string[];
  relationships: FriendLink[];
  createdAt: string;
}

export interface Hangout {
  id: string;
  friendIds: string[];
  startTime: string;
  endTime: string;
  location: string;
  category: HangoutCategory;
  type: HangoutType;
  notes: string;
  segments: HangoutSegment[];
  createdAt: string;
  source?: string;
  sourceCalendarUid?: string;
}

export interface HangoutIdea {
  id: string;
  title: string;
  category: HangoutCategory;
  type: HangoutType;
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
  hangoutCategory: HangoutCategory;
  hangoutType: HangoutType;
  hangoutLocation: string;
}

export interface AppSettings {
  theme: ThemeMode;
  awakeWarningHours: number;
  sleepGoalHours: number;
  targetWakeUpTime: string;
  targetBedtime: string;
  autoCalculateBedtime: boolean;
  autoCalculateWakeTime: boolean;
  notificationsEnabled: boolean;
  bedtimeReminder: boolean;
  hangoutReminder: boolean;
  /** Friend picker: show selected friends before the rest when sorting. */
  friendPickerShowSelectedFirst: boolean;
}

export interface AppData {
  sleepEntries: SleepEntry[];
  napEntries: NapEntry[];
  friends: Friend[];
  hangouts: Hangout[];
  ideas: HangoutIdea[];
  activeTimers: ActiveTimers;
  settings: AppSettings;
  friendTags: string[];
  friendGroups: string[];
  relationshipStatuses: string[];
  relationshipTypes: string[];
  hangoutTypes: string[];
  hangoutCategories: string[];
  hangoutTypesByCategory: Record<string, string[]>;
  /** User-starred locations for quick pick in autocomplete. */
  favoriteLocations: string[];
}

export type ActivityItem = {
  id: string;
  type: 'sleep' | 'nap' | 'hangout';
  title: string;
  timestamp: string;
  detail: string;
};
