import { isInRange } from './dates';
import {
  isActiveCategoryInSettings,
  isActiveTypeInCatalog,
} from './hangout-categories';
import { hangoutMatchesOccasionFilter, isActiveOccasionInSettings } from './hangout-occasions';
import { friendInHangout, getSegmentFriendIds, hangoutMatchesCategoryFilter, hangoutMatchesTypeFilter } from './hangout-segments';
import type { AppData, Friend, Hangout } from '../types';

export { collectUniqueLocations } from './location-history';

export const INSIGHTS_FILTERS_STORAGE_KEY = 'sleep-social-tracker-insights-filters';

export interface InsightsFilters {
  friendId: string;
  friendTag: string;
  friendGroup: string;
  relationshipStatus: string;
  hangoutOccasion: string;
  hangoutCategory: string;
  hangoutType: string;
  segmentType: string;
  location: string;
  peopleCount: string;
  showSleep: boolean;
  showNaps: boolean;
  showHangouts: boolean;
  showSegments: boolean;
}

export const defaultInsightsFilters: InsightsFilters = {
  friendId: '',
  friendTag: '',
  friendGroup: '',
  relationshipStatus: '',
  hangoutOccasion: '',
  hangoutCategory: '',
  hangoutType: '',
  segmentType: '',
  location: '',
  peopleCount: '',
  showSleep: true,
  showNaps: true,
  showHangouts: true,
  showSegments: true,
};

export function loadInsightsFilters(): InsightsFilters {
  try {
    const raw = localStorage.getItem(INSIGHTS_FILTERS_STORAGE_KEY);
    if (!raw) return { ...defaultInsightsFilters };
    return { ...defaultInsightsFilters, ...JSON.parse(raw) };
  } catch {
    return { ...defaultInsightsFilters };
  }
}

export function saveInsightsFilters(filters: InsightsFilters): void {
  localStorage.setItem(INSIGHTS_FILTERS_STORAGE_KEY, JSON.stringify(filters));
}

export function sanitizeInsightsFilters(
  filters: InsightsFilters,
  settingsCategories: string[],
  catalog: Record<string, string[]>,
  settingsOccasions: string[] = []
): InsightsFilters {
  let { hangoutCategory, hangoutType, segmentType, hangoutOccasion } = filters;

  if (hangoutOccasion && !isActiveOccasionInSettings(hangoutOccasion, settingsOccasions)) {
    hangoutOccasion = '';
  }

  if (hangoutCategory && !isActiveCategoryInSettings(hangoutCategory, settingsCategories)) {
    hangoutCategory = '';
  }

  if (hangoutType && !isActiveTypeInCatalog(hangoutType, catalog, settingsCategories, hangoutCategory)) {
    hangoutType = '';
  }

  if (segmentType && !isActiveTypeInCatalog(segmentType, catalog, settingsCategories)) {
    segmentType = '';
  }

  return { ...filters, hangoutOccasion, hangoutCategory, hangoutType, segmentType };
}

export function hasActiveInsightsFilters(filters: InsightsFilters): boolean {
  return (
    !!filters.friendId ||
    !!filters.friendTag ||
    !!filters.friendGroup ||
    !!filters.relationshipStatus ||
    !!filters.hangoutOccasion ||
    !!filters.hangoutCategory ||
    !!filters.hangoutType ||
    !!filters.segmentType ||
    !!filters.location ||
    !!filters.peopleCount ||
    !filters.showSleep ||
    !filters.showNaps ||
    !filters.showHangouts ||
    !filters.showSegments
  );
}

export interface FilterChip {
  key: keyof InsightsFilters;
  label: string;
}

export function getInsightsFilterChips(
  filters: InsightsFilters,
  friends: Friend[]
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.friendId) {
    const name = friends.find((f) => f.id === filters.friendId)?.name ?? 'Friend';
    chips.push({ key: 'friendId', label: `Friend: ${name}` });
  }
  if (filters.friendTag) chips.push({ key: 'friendTag', label: `Tag: ${filters.friendTag}` });
  if (filters.friendGroup) chips.push({ key: 'friendGroup', label: `Group: ${filters.friendGroup}` });
  if (filters.relationshipStatus) chips.push({ key: 'relationshipStatus', label: `Status: ${filters.relationshipStatus}` });
  if (filters.hangoutOccasion) chips.push({ key: 'hangoutOccasion', label: `Occasion: ${filters.hangoutOccasion}` });
  if (filters.hangoutCategory) chips.push({ key: 'hangoutCategory', label: `Category: ${filters.hangoutCategory}` });
  if (filters.hangoutType) chips.push({ key: 'hangoutType', label: `Type: ${filters.hangoutType}` });
  if (filters.segmentType) chips.push({ key: 'segmentType', label: `Segment: ${filters.segmentType}` });
  if (filters.location) chips.push({ key: 'location', label: `Location: ${filters.location}` });
  if (filters.peopleCount) {
    const label =
      filters.peopleCount === '1' ? 'Solo' : filters.peopleCount === '2' ? '2 people' : '3+ people';
    chips.push({ key: 'peopleCount', label: `Size: ${label}` });
  }
  if (!filters.showSleep) chips.push({ key: 'showSleep', label: 'Hide sleep' });
  if (!filters.showNaps) chips.push({ key: 'showNaps', label: 'Hide naps' });
  if (!filters.showHangouts) chips.push({ key: 'showHangouts', label: 'Hide hangouts' });
  if (!filters.showSegments) chips.push({ key: 'showSegments', label: 'Hide segments' });
  return chips;
}

export function friendMatchesInsightsFilters(friend: Friend, filters: InsightsFilters): boolean {
  if (filters.friendId && friend.id !== filters.friendId) return false;
  if (filters.friendTag && !friend.tags.includes(filters.friendTag)) return false;
  if (filters.friendGroup && !(friend.groups ?? []).includes(filters.friendGroup)) return false;
  if (filters.relationshipStatus && friend.relationshipStatus !== filters.relationshipStatus) return false;
  return true;
}

function hangoutPeopleCount(h: Hangout): number {
  const ids = new Set(h.friendIds);
  for (const s of h.segments ?? []) {
    getSegmentFriendIds(s, h.friendIds).forEach((id) => ids.add(id));
  }
  return ids.size;
}

function matchesPeopleCount(count: number, filter: string): boolean {
  if (!filter) return true;
  if (filter === '1') return count === 1;
  if (filter === '2') return count === 2;
  if (filter === '3+') return count >= 3;
  return true;
}

export function hangoutMatchesInsightsFilters(
  hangout: Hangout,
  filters: InsightsFilters,
  friends: Friend[],
  rangeStart?: Date,
  rangeEnd?: Date
): boolean {
  if (rangeStart && rangeEnd && !isInRange(hangout.startTime, rangeStart, rangeEnd)) {
    return false;
  }

  if (filters.friendId && !friendInHangout(filters.friendId, hangout)) return false;

  if (filters.friendTag || filters.friendGroup || filters.relationshipStatus) {
    const involved = new Set<string>(hangout.friendIds);
    for (const s of hangout.segments ?? []) {
      getSegmentFriendIds(s, hangout.friendIds).forEach((id) => involved.add(id));
    }
    const involvedFriends = friends.filter((f) => involved.has(f.id));
    if (involvedFriends.length === 0) return false;
    const anyMatch = involvedFriends.some((f) => friendMatchesInsightsFilters(f, filters));
    if (!anyMatch) return false;
  }

  if (filters.hangoutOccasion && !hangoutMatchesOccasionFilter(hangout, filters.hangoutOccasion)) return false;

  if (filters.hangoutCategory && !hangoutMatchesCategoryFilter(hangout, filters.hangoutCategory)) return false;

  if (filters.hangoutType && !hangoutMatchesTypeFilter(hangout, filters.hangoutType)) return false;

  if (filters.segmentType) {
    const hasSegment = hangout.segments?.some((s) => s.type === filters.segmentType);
    if (!hasSegment && hangout.type !== filters.segmentType) return false;
  }

  if (filters.location) {
    const loc = filters.location.toLowerCase();
    const hangoutLoc = hangout.location?.trim().toLowerCase() ?? '';
    const segmentLocs = (hangout.segments ?? []).map((s) =>
      (s.location?.trim() || hangout.location?.trim() || '').toLowerCase()
    );
    if (hangoutLoc !== loc && !segmentLocs.includes(loc)) return false;
  }

  if (!matchesPeopleCount(hangoutPeopleCount(hangout), filters.peopleCount)) return false;

  return true;
}

export function filterHangoutsByInsights(
  hangouts: Hangout[],
  filters: InsightsFilters,
  friends: Friend[],
  rangeStart?: Date,
  rangeEnd?: Date
): Hangout[] {
  return hangouts.filter((h) => hangoutMatchesInsightsFilters(h, filters, friends, rangeStart, rangeEnd));
}

export function getFilteredInsightsData(
  data: AppData,
  filters: InsightsFilters,
  rangeStart?: Date,
  rangeEnd?: Date
): Pick<AppData, 'sleepEntries' | 'napEntries' | 'hangouts'> {
  const hangouts = filterHangoutsByInsights(data.hangouts, filters, data.friends, rangeStart, rangeEnd);

  let sleepEntries = data.sleepEntries;
  let napEntries = data.napEntries;

  if (rangeStart && rangeEnd) {
    sleepEntries = sleepEntries.filter((s) => isInRange(s.wakeUp, rangeStart, rangeEnd));
    napEntries = napEntries.filter(
      (n) => isInRange(n.napStart, rangeStart, rangeEnd) || isInRange(n.napEnd, rangeStart, rangeEnd)
    );
  }

  return { sleepEntries, napEntries, hangouts };
}

export function collectSegmentTypes(hangouts: Hangout[]): string[] {
  const types = new Set<string>();
  for (const h of hangouts) {
    if (h.segments?.length) {
      h.segments.forEach((s) => { if (s.type) types.add(s.type); });
    }
  }
  return [...types].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}
