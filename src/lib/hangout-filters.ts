import { formatDate, formatDateTime } from './dates';
import {
  getActiveCategoryOptions,
  getActiveTypeOptions,
  isActiveCategoryInSettings,
  isActiveTypeInCatalog,
  isMixedHangoutCategory,
} from './hangout-categories';
import {
  getActiveOccasionOptions,
  hangoutMatchesOccasionFilter,
  isActiveOccasionInSettings,
} from './hangout-occasions';
import {
  getSegmentFriendIds,
  hangoutMatchesCategoryFilter,
  hangoutMatchesTypeFilter,
} from './hangout-segments';
import type { Friend, Hangout } from '../types';

export const HANGOUT_FILTERS_STORAGE_KEY = 'sleep-social-tracker-hangout-filters';
/** @deprecated migrated into HANGOUT_FILTERS_STORAGE_KEY */
const LEGACY_TYPE_FILTER_KEY = 'sleep-social-tracker-hangout-filter-type';

export interface HangoutTabFilters {
  search: string;
  occasion: string;
  category: string;
  type: string;
  location: string;
}

export const defaultHangoutTabFilters: HangoutTabFilters = {
  search: '',
  occasion: '',
  category: '',
  type: '',
  location: '',
};

export function loadHangoutTabFilters(): HangoutTabFilters {
  try {
    const raw = localStorage.getItem(HANGOUT_FILTERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<HangoutTabFilters>;
      return { ...defaultHangoutTabFilters, ...parsed };
    }
    const legacyType = localStorage.getItem(LEGACY_TYPE_FILTER_KEY);
    if (legacyType) {
      return { ...defaultHangoutTabFilters, type: legacyType };
    }
  } catch {
    /* ignore */
  }
  return { ...defaultHangoutTabFilters };
}

export function saveHangoutTabFilters(filters: HangoutTabFilters): void {
  localStorage.setItem(HANGOUT_FILTERS_STORAGE_KEY, JSON.stringify(filters));
}

/** Occasion filter options from saved Settings only. */
export function getHangoutOccasionFilterOptions(occasions: string[]): string[] {
  return getActiveOccasionOptions(occasions);
}

/** Category filter options from saved Settings only. */
export function getHangoutCategoryFilterOptions(settingsCategories: string[]): string[] {
  return getActiveCategoryOptions(settingsCategories);
}

/** Type filter options from saved Settings catalog only. */
export function getHangoutTypeFilterOptions(
  catalog: Record<string, string[]>,
  settingsCategories: string[],
  selectedCategory: string
): string[] {
  return getActiveTypeOptions(catalog, settingsCategories, selectedCategory);
}

export function typeBelongsToHangoutCategory(
  type: string,
  category: string,
  catalog: Record<string, string[]>,
  settingsCategories: string[]
): boolean {
  return isActiveTypeInCatalog(type, catalog, settingsCategories, category);
}

export function hangoutMatchesLocationFilter(hangout: Hangout, filterLocation: string): boolean {
  if (!filterLocation) return true;
  const loc = filterLocation.trim().toLowerCase();
  if (hangout.location?.trim().toLowerCase() === loc) return true;
  return (
    hangout.segments?.some((s) => (s.location?.trim() || hangout.location?.trim() || '').toLowerCase() === loc) ??
    false
  );
}

export function hangoutMatchesCategoryTypeFilter(
  hangout: Hangout,
  filterCategory: string,
  filterType: string
): boolean {
  if (!filterCategory && !filterType) return true;
  if (filterCategory && !filterType) return hangoutMatchesCategoryFilter(hangout, filterCategory);
  if (!filterCategory && filterType) return hangoutMatchesTypeFilter(hangout, filterType);

  if (
    hangout.category === filterCategory &&
    hangout.type === filterType &&
    !isMixedHangoutCategory(hangout.category)
  ) {
    return true;
  }
  return (
    hangout.segments?.some((s) => s.category === filterCategory && s.type === filterType) ?? false
  );
}

function friendNameLookup(friends: Friend[]): (id: string) => string {
  const map = new Map(friends.map((f) => [f.id, f.name]));
  return (id) => map.get(id) ?? '';
}

export function hangoutMatchesSearch(hangout: Hangout, query: string, friends: Friend[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const lookup = friendNameLookup(friends);
  const tokens: string[] = [];

  hangout.friendIds.forEach((id) => tokens.push(lookup(id)));
  if (hangout.category) tokens.push(hangout.category);
  if (hangout.type) tokens.push(hangout.type);
  if (hangout.occasion) tokens.push(hangout.occasion);
  if (hangout.location) tokens.push(hangout.location);
  if (hangout.notes) tokens.push(hangout.notes);
  if (hangout.startTime) {
    tokens.push(hangout.startTime);
    tokens.push(formatDate(hangout.startTime));
    tokens.push(formatDateTime(hangout.startTime));
  }
  if (hangout.endTime) {
    tokens.push(hangout.endTime);
    tokens.push(formatDate(hangout.endTime));
    tokens.push(formatDateTime(hangout.endTime));
  }

  for (const s of hangout.segments ?? []) {
    if (s.category) tokens.push(s.category);
    if (s.type) tokens.push(s.type);
    if (s.location) tokens.push(s.location);
    if (s.notes) tokens.push(s.notes);
    getSegmentFriendIds(s, hangout.friendIds).forEach((id) => tokens.push(lookup(id)));
    if (s.startTime) {
      tokens.push(s.startTime);
      tokens.push(formatDate(s.startTime));
    }
    if (s.endTime) {
      tokens.push(s.endTime);
      tokens.push(formatDate(s.endTime));
    }
  }

  return tokens.some((t) => t.toLowerCase().includes(q));
}

export function filterHangoutsForTab(
  hangouts: Hangout[],
  friends: Friend[],
  filters: HangoutTabFilters
): Hangout[] {
  return hangouts.filter((h) => {
    if (!hangoutMatchesSearch(h, filters.search, friends)) return false;
    if (!hangoutMatchesOccasionFilter(h, filters.occasion)) return false;
    if (!hangoutMatchesCategoryTypeFilter(h, filters.category, filters.type)) return false;
    if (!hangoutMatchesLocationFilter(h, filters.location)) return false;
    return true;
  });
}

export function sanitizeHangoutTabFilters(
  filters: HangoutTabFilters,
  settingsCategories: string[],
  catalog: Record<string, string[]>,
  occasions: string[] = []
): HangoutTabFilters {
  let { category, type, occasion } = filters;

  if (occasion && !isActiveOccasionInSettings(occasion, occasions)) {
    occasion = '';
  }

  if (category && !isActiveCategoryInSettings(category, settingsCategories)) {
    category = '';
  }

  if (type && !isActiveTypeInCatalog(type, catalog, settingsCategories, category)) {
    type = '';
  }

  return { ...filters, category, type, occasion };
}
