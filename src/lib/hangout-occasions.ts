import type { Hangout } from '../types';

export const DEFAULT_HANGOUT_OCCASION = 'None';

export const DEFAULT_HANGOUT_OCCASIONS = [
  'None',
  'Date',
  'Friends',
  'Family',
  'Event',
] as const;

export function normalizeOccasion(occasion?: string): string {
  const trimmed = occasion?.trim();
  return trimmed || DEFAULT_HANGOUT_OCCASION;
}

export function isLegacyDateHangoutType(type?: string): boolean {
  return type?.trim().toLowerCase() === 'date';
}

/** Resolve occasion for a hangout, including legacy Date type migration. */
export function resolveHangoutOccasion(h: {
  type?: string;
  category?: string;
  occasion?: string;
}): string {
  if (h.occasion?.trim()) return normalizeOccasion(h.occasion);
  if (isLegacyDateHangoutType(h.type)) return 'Date';
  return DEFAULT_HANGOUT_OCCASION;
}

export function migrateHangoutOccasionFields(h: Hangout): Hangout {
  const occasion = resolveHangoutOccasion(h);
  let category = h.category;
  let type = h.type;
  if (!h.occasion?.trim() && isLegacyDateHangoutType(h.type)) {
    category = 'Social';
    type = 'Other';
  }
  return { ...h, occasion, category, type };
}

export function migrateHangoutsOccasions(hangouts: Hangout[]): Hangout[] {
  return hangouts.map(migrateHangoutOccasionFields);
}

export function countHangoutsWithOccasion(hangouts: Hangout[], occasion: string): number {
  return hangouts.filter((h) => normalizeOccasion(h.occasion) === occasion).length;
}

export function mergeOccasionsFromHangouts(
  saved: string[] | undefined,
  hangouts: Hangout[]
): string[] {
  const list = saved?.length ? [...saved] : [...DEFAULT_HANGOUT_OCCASIONS];
  for (const h of hangouts) {
    const occ = resolveHangoutOccasion(h);
    if (!list.some((o) => o.toLowerCase() === occ.toLowerCase())) list.push(occ);
  }
  return list;
}

export function getActiveOccasionOptions(occasions: string[]): string[] {
  return [...occasions].sort((a, b) => {
    if (a === DEFAULT_HANGOUT_OCCASION) return -1;
    if (b === DEFAULT_HANGOUT_OCCASION) return 1;
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  });
}

export function isActiveOccasionInSettings(occasion: string, occasions: string[]): boolean {
  if (!occasion.trim()) return true;
  return occasions.some((o) => o.toLowerCase() === occasion.toLowerCase());
}

export function hangoutMatchesOccasionFilter(hangout: Hangout, filterOccasion: string): boolean {
  if (!filterOccasion) return true;
  return normalizeOccasion(hangout.occasion) === filterOccasion;
}
