export const SETTINGS_ACCORDION_STORAGE_KEY = 'sleep-social-tracker-settings-accordion';

export type TopSettingsSectionId =
  | 'appearance'
  | 'sleep_awake'
  | 'friend_picker'
  | 'dashboard'
  | 'social_customization'
  | 'backup_restore'
  | 'data_management';

export type SocialNestedSectionId =
  | 'friend_tags'
  | 'friend_groups'
  | 'relationship_statuses'
  | 'relationship_types'
  | 'hangout_categories'
  | 'hangout_types_by_category';

export type DataManagementNestedSectionId =
  | 'cleanup_summary'
  | 'merge_duplicate_friends'
  | 'rename_friend'
  | 'duplicate_hangouts'
  | 'bulk_edit_hangouts'
  | 'empty_friends'
  | 'clear_all_data';

export type NestedSettingsGroup = 'social' | 'data_management';

export interface SettingsAccordionState {
  top: Record<TopSettingsSectionId, boolean>;
  nested: {
    social: Record<SocialNestedSectionId, boolean>;
    data_management: Record<DataManagementNestedSectionId, boolean>;
  };
}

export const TOP_SECTION_IDS: TopSettingsSectionId[] = [
  'appearance',
  'sleep_awake',
  'friend_picker',
  'dashboard',
  'social_customization',
  'backup_restore',
  'data_management',
];

const DEFAULT_TOP: Record<TopSettingsSectionId, boolean> = {
  appearance: false,
  sleep_awake: true,
  friend_picker: false,
  dashboard: false,
  social_customization: false,
  backup_restore: true,
  data_management: false,
};

const DEFAULT_NESTED_SOCIAL: Record<SocialNestedSectionId, boolean> = {
  friend_tags: false,
  friend_groups: false,
  relationship_statuses: false,
  relationship_types: false,
  hangout_categories: false,
  hangout_types_by_category: false,
};

const DEFAULT_NESTED_DATA: Record<DataManagementNestedSectionId, boolean> = {
  cleanup_summary: false,
  merge_duplicate_friends: false,
  rename_friend: false,
  duplicate_hangouts: false,
  bulk_edit_hangouts: false,
  empty_friends: false,
  clear_all_data: false,
};

export const DEFAULT_SETTINGS_ACCORDION: SettingsAccordionState = {
  top: { ...DEFAULT_TOP },
  nested: {
    social: { ...DEFAULT_NESTED_SOCIAL },
    data_management: { ...DEFAULT_NESTED_DATA },
  },
};

export function loadSettingsAccordion(): SettingsAccordionState {
  try {
    const raw = localStorage.getItem(SETTINGS_ACCORDION_STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS_ACCORDION);
    const parsed = JSON.parse(raw) as Partial<SettingsAccordionState>;
    const top = { ...DEFAULT_TOP };
    for (const id of TOP_SECTION_IDS) {
      if (parsed.top?.[id] !== undefined) top[id] = parsed.top[id];
    }
    const social = { ...DEFAULT_NESTED_SOCIAL };
    for (const id of Object.keys(DEFAULT_NESTED_SOCIAL) as SocialNestedSectionId[]) {
      if (parsed.nested?.social?.[id] !== undefined) social[id] = parsed.nested.social[id];
    }
    const data_management = { ...DEFAULT_NESTED_DATA };
    for (const id of Object.keys(DEFAULT_NESTED_DATA) as DataManagementNestedSectionId[]) {
      if (parsed.nested?.data_management?.[id] !== undefined) {
        data_management[id] = parsed.nested.data_management[id];
      }
    }
    return { top, nested: { social, data_management } };
  } catch {
    return structuredClone(DEFAULT_SETTINGS_ACCORDION);
  }
}

export function saveSettingsAccordion(state: SettingsAccordionState): void {
  localStorage.setItem(SETTINGS_ACCORDION_STORAGE_KEY, JSON.stringify(state));
}
