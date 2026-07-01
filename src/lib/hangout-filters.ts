import { formatDate, formatDateTime } from './dates';
import {
  filterTypesForDropdown,
  isMixedHangoutCategory,
  typesForCategory,
} from './hangout-categories';
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
  category: string;
  type: string;
  location: string;
}

export const defaultHangoutTabFilters: HangoutTabFilters = {
  search: '',
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

/** Categories from settings plus any still referenced in hangout/segment data. */
export function getHangoutCategoryFilterOptions(
  settingsCategories: string[],
  hangouts: Hangout[]
): string[] {
  const set = new Set(settingsCategories);
  for (const h of hangouts) {
    if (h.category?.trim()) set.add(h.category);
    for (const s of h.segments ?? []) {
      if (s.category?.trim()) set.add(s.category);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function collectTypesForCategoryFromHangouts(hangouts: Hangout[], category: string): string[] {
  const set = new Set<string>();
  for (const h of hangouts) {
    if (h.category === category && h.type?.trim()) set.add(h.type);
    for (const s of h.segments ?? []) {
      if (s.category === category && s.type?.trim()) set.add(s.type);
    }
  }
  return [...set];
}

/** Types for filter dropdown — scoped to category when set, otherwise all known types. */
export function getHangoutTypeFilterOptions(
  hangouts: Hangout[],
  catalog: Record<string, string[]>,
  flatTypes: string[],
  selectedCategory: string
): string[] {
  const set = new Set<string>();

  if (selectedCategory) {
    for (const t of typesForCategory(catalog, selectedCategory)) set.add(t);
    for (const t of collectTypesForCategoryFromHangouts(hangouts, selectedCategory)) set.add(t);
  } else {
    for (const types of Object.values(catalog)) {
      types.forEach((t) => set.add(t));
    }
    flatTypes.forEach((t) => set.add(t));
    for (const h of hangouts) {
      if (h.type?.trim() && !isMixedHangoutCategory(h.category)) set.add(h.type);
      for (const s of h.segments ?? []) {
        if (s.type?.trim()) set.add(s.type);
      }
    }
  }

  return filterTypesForDropdown([...set]).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
}

export function typeBelongsToHangoutCategory(
  type: string,
  category: string,
  hangouts: Hangout[],
  catalog: Record<string, string[]>
): boolean {
  if (!type) return true;
  if (!category) return true;
  const catalogTypes = typesForCategory(catalog, category);
  if (catalogTypes.some((t) => t.toLowerCase() === type.toLowerCase())) return true;
  return collectTypesForCategoryFromHangouts(hangouts, category).some(
    (t) => t.toLowerCase() === type.toLowerCase()
  );
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
    if (!hangoutMatchesCategoryTypeFilter(h, filters.category, filters.type)) return false;
    if (!hangoutMatchesLocationFilter(h, filters.location)) return false;
    return true;
  });
}

export function sanitizeHangoutTabFilters(
  filters: HangoutTabFilters,
  settingsCategories: string[],
  hangouts: Hangout[],
  catalog: Record<string, string[]>
): HangoutTabFilters {
  let { category, type } = filters;
  const categoryOptions = getHangoutCategoryFilterOptions(settingsCategories, hangouts);
  if (category && !categoryOptions.includes(category)) {
    category = '';
  }
  if (type && category && !typeBelongsToHangoutCategory(type, category, hangouts, catalog)) {
    type = '';
  }
  const typeOptions = getHangoutTypeFilterOptions(hangouts, catalog, [], category);
  if (type && !typeOptions.some((t) => t.toLowerCase() === type.toLowerCase())) {
    const stillUsed = hangouts.some((h) => {
      if (h.type === type && (!category || h.category === category)) return true;
      return h.segments?.some(
        (s) => s.type === type && (!category || s.category === category)
      );
    });
    if (!stillUsed) type = '';
  }
  return { ...filters, category, type };
}
