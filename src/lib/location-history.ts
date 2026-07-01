import { calcDurationMinutes, formatDate, parseISO } from './dates';
import { getSegmentEffectiveDurationMinutes, getSegmentFriendIds } from './hangout-segments';
import type { Friend, Hangout, HangoutIdea } from '../types';

export const LOCATION_RECENT_DAYS = 30;

export interface LocationVisitRef {
  hangoutId: string;
  segmentId?: string;
  startTime: string;
  endTime: string;
  type: string;
  friendIds: string[];
  durationMinutes: number;
}

export interface LocationSummary {
  location: string;
  visitCount: number;
  totalMinutes: number;
  totalHours: number;
  friendIds: string[];
  mostCommonType: string | null;
  firstVisit: string;
  lastVisit: string;
  recentVisits: LocationVisitRef[];
}

export interface LocationSuggestion {
  location: string;
  visitCount: number;
  ideaCount: number;
  lastVisit: string;
  isFavorite: boolean;
}

interface LocationAccumulator {
  spellings: Map<string, number>;
  latestSpelling: string;
  latestTime: number;
  visitCount: number;
  ideaCount: number;
  lastVisit: string;
}

function locationKey(loc: string): string {
  return loc.trim().toLowerCase();
}

function modeValue(counts: Record<string, number>): string | null {
  const entries = Object.entries(counts);
  if (!entries.length) return null;
  return entries.sort(([, a], [, b]) => b - a)[0][0];
}

function createAccumulator(): LocationAccumulator {
  return {
    spellings: new Map(),
    latestSpelling: '',
    latestTime: 0,
    visitCount: 0,
    ideaCount: 0,
    lastVisit: '',
  };
}

function recordSpelling(acc: LocationAccumulator, spelling: string, time?: string) {
  const trimmed = spelling.trim();
  if (!trimmed) return;
  acc.spellings.set(trimmed, (acc.spellings.get(trimmed) ?? 0) + 1);
  if (time) {
    const t = parseISO(time).getTime();
    if (t >= acc.latestTime) {
      acc.latestTime = t;
      acc.latestSpelling = trimmed;
    }
    if (!acc.lastVisit || t > parseISO(acc.lastVisit).getTime()) {
      acc.lastVisit = time;
    }
  } else if (!acc.latestSpelling) {
    acc.latestSpelling = trimmed;
  }
}

function canonicalLocationName(acc: LocationAccumulator): string {
  let best = acc.latestSpelling;
  let bestCount = 0;
  for (const [spelling, count] of acc.spellings) {
    if (count > bestCount) {
      bestCount = count;
      best = spelling;
    }
  }
  return best;
}

function compareLocationSuggestions(a: LocationSuggestion, b: LocationSuggestion): number {
  if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
  const lastA = a.lastVisit ? parseISO(a.lastVisit).getTime() : 0;
  const lastB = b.lastVisit ? parseISO(b.lastVisit).getTime() : 0;
  if (lastB !== lastA) return lastB - lastA;
  return a.location.localeCompare(b.location, undefined, { sensitivity: 'base' });
}

export function compareLocationSummaries(a: LocationSummary, b: LocationSummary): number {
  if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
  const lastA = a.lastVisit ? parseISO(a.lastVisit).getTime() : 0;
  const lastB = b.lastVisit ? parseISO(b.lastVisit).getTime() : 0;
  if (lastB !== lastA) return lastB - lastA;
  return a.location.localeCompare(b.location, undefined, { sensitivity: 'base' });
}

export function locationMatchesSearch(suggestion: LocationSuggestion, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return suggestion.location.toLowerCase().includes(q);
}

export function isRecentLocation(
  suggestion: LocationSuggestion,
  days = LOCATION_RECENT_DAYS
): boolean {
  if (!suggestion.lastVisit || suggestion.visitCount === 0) return false;
  const ms = Date.now() - parseISO(suggestion.lastVisit).getTime();
  return ms / (1000 * 60 * 60 * 24) <= days;
}

function collectHangoutVisits(hangouts: Hangout[]): { loc: string; visit: LocationVisitRef }[] {
  const visitsWithLoc: { loc: string; visit: LocationVisitRef }[] = [];

  for (const hangout of hangouts) {
    const mainLoc = hangout.location?.trim();
    const hasSegments = (hangout.segments?.length ?? 0) > 0;

    if (mainLoc && !hasSegments) {
      visitsWithLoc.push({
        loc: mainLoc,
        visit: {
          hangoutId: hangout.id,
          startTime: hangout.startTime,
          endTime: hangout.endTime,
          type: hangout.type,
          friendIds: [...hangout.friendIds],
          durationMinutes: calcDurationMinutes(hangout.startTime, hangout.endTime),
        },
      });
    } else if (mainLoc && hasSegments) {
      visitsWithLoc.push({
        loc: mainLoc,
        visit: {
          hangoutId: hangout.id,
          startTime: hangout.startTime,
          endTime: hangout.endTime,
          type: hangout.type,
          friendIds: [...hangout.friendIds],
          durationMinutes: calcDurationMinutes(hangout.startTime, hangout.endTime),
        },
      });
    }

    for (const segment of hangout.segments ?? []) {
      const loc = segment.location?.trim();
      if (!loc) continue;
      const start = segment.startTime?.trim() || hangout.startTime;
      const end = segment.endTime?.trim() || hangout.endTime;
      visitsWithLoc.push({
        loc,
        visit: {
          hangoutId: hangout.id,
          segmentId: segment.id,
          startTime: start,
          endTime: end,
          type: segment.type,
          friendIds: getSegmentFriendIds(segment, hangout.friendIds),
          durationMinutes:
            getSegmentEffectiveDurationMinutes(segment) || calcDurationMinutes(start, end),
        },
      });
    }
  }

  return visitsWithLoc;
}

export function buildLocationSuggestions(
  hangouts: Hangout[],
  ideas: HangoutIdea[] = [],
  favoriteLocations: string[] = []
): LocationSuggestion[] {
  const favoriteKeys = new Set(favoriteLocations.map(locationKey));

  const accumulators = new Map<string, LocationAccumulator>();

  const getAcc = (loc: string) => {
    const key = locationKey(loc);
    let acc = accumulators.get(key);
    if (!acc) {
      acc = createAccumulator();
      accumulators.set(key, acc);
    }
    return acc;
  };

  for (const { loc, visit } of collectHangoutVisits(hangouts)) {
    const acc = getAcc(loc);
    acc.visitCount += 1;
    recordSpelling(acc, loc, visit.endTime || visit.startTime);
  }

  for (const idea of ideas) {
    const loc = idea.location?.trim();
    if (!loc) continue;
    const acc = getAcc(loc);
    acc.ideaCount += 1;
    recordSpelling(acc, loc, idea.createdAt);
  }

  const suggestions: LocationSuggestion[] = [];

  for (const [key, acc] of accumulators) {
    const location = canonicalLocationName(acc);
    suggestions.push({
      location,
      visitCount: acc.visitCount,
      ideaCount: acc.ideaCount,
      lastVisit: acc.lastVisit,
      isFavorite: favoriteKeys.has(key),
    });
  }

  // Include favorites that have no hangout/idea data yet
  for (const fav of favoriteLocations) {
    const trimmed = fav.trim();
    if (!trimmed) continue;
    const key = locationKey(trimmed);
    if (!accumulators.has(key)) {
      suggestions.push({
        location: trimmed,
        visitCount: 0,
        ideaCount: 0,
        lastVisit: '',
        isFavorite: true,
      });
    }
  }

  return suggestions.sort(compareLocationSuggestions);
}

export function filterLocationSuggestions(
  suggestions: LocationSuggestion[],
  query: string
): LocationSuggestion[] {
  if (!query.trim()) return suggestions;
  return suggestions.filter((s) => locationMatchesSearch(s, query));
}

export function getFavoriteLocationSuggestions(
  suggestions: LocationSuggestion[]
): LocationSuggestion[] {
  return suggestions
    .filter((s) => s.isFavorite)
    .sort((a, b) => compareLocationSuggestions(a, b));
}

export function getRecentLocationSuggestions(
  suggestions: LocationSuggestion[],
  days = LOCATION_RECENT_DAYS
): LocationSuggestion[] {
  return suggestions
    .filter((s) => isRecentLocation(s, days))
    .sort((a, b) => {
      const lastB = b.lastVisit ? parseISO(b.lastVisit).getTime() : 0;
      const lastA = a.lastVisit ? parseISO(a.lastVisit).getTime() : 0;
      return lastB - lastA;
    });
}

export function collectUniqueLocations(
  hangouts: Hangout[],
  ideas: HangoutIdea[] = []
): string[] {
  return buildLocationSuggestions(hangouts, ideas).map((s) => s.location);
}

export function getLocationHistory(hangouts: Hangout[], limit = 50): LocationSummary[] {
  const visitsWithLoc = collectHangoutVisits(hangouts);
  const accumulators = new Map<string, LocationAccumulator & { visits: LocationVisitRef[] }>();

  for (const { loc, visit } of visitsWithLoc) {
    const key = locationKey(loc);
    let entry = accumulators.get(key);
    if (!entry) {
      entry = { ...createAccumulator(), visits: [] };
      accumulators.set(key, entry);
    }
    entry.visits.push(visit);
    entry.visitCount += 1;
    recordSpelling(entry, loc, visit.endTime || visit.startTime);
  }

  const summaries: LocationSummary[] = [];

  for (const entry of accumulators.values()) {
    const { visits } = entry;
    const display = canonicalLocationName(entry);
    const typeCounts: Record<string, number> = {};
    const friendSet = new Set<string>();
    let totalMinutes = 0;
    const times: string[] = [];

    for (const v of visits) {
      if (v.type) typeCounts[v.type] = (typeCounts[v.type] ?? 0) + 1;
      v.friendIds.forEach((id) => friendSet.add(id));
      totalMinutes += v.durationMinutes;
      times.push(v.endTime || v.startTime);
    }

    times.sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime());
    const recent = [...visits]
      .sort((a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime())
      .slice(0, 5);

    summaries.push({
      location: display,
      visitCount: visits.length,
      totalMinutes,
      totalHours: totalMinutes / 60,
      friendIds: [...friendSet],
      mostCommonType: modeValue(typeCounts),
      firstVisit: times[0] ?? '',
      lastVisit: times[times.length - 1] ?? '',
      recentVisits: recent,
    });
  }

  return summaries.sort(compareLocationSummaries).slice(0, limit);
}

export function formatLocationDate(iso: string): string {
  if (!iso) return '—';
  return formatDate(iso);
}

export function formatLocationSuggestionMeta(suggestion: LocationSuggestion): string {
  const parts: string[] = [];
  if (suggestion.visitCount > 0) {
    parts.push(`${suggestion.visitCount} visit${suggestion.visitCount === 1 ? '' : 's'}`);
  }
  if (suggestion.ideaCount > 0) {
    parts.push(`${suggestion.ideaCount} idea${suggestion.ideaCount === 1 ? '' : 's'}`);
  }
  if (suggestion.lastVisit) {
    parts.push(`Last: ${formatLocationDate(suggestion.lastVisit)}`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'No visits yet';
}

export function friendNamesAtLocation(friendIds: string[], friends: Friend[]): string {
  return friendIds.map((id) => friends.find((f) => f.id === id)?.name ?? '?').join(', ');
}

export function isFavoriteLocation(location: string, favoriteLocations: string[]): boolean {
  const key = locationKey(location);
  return favoriteLocations.some((f) => locationKey(f) === key);
}
