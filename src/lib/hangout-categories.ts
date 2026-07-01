import type { Hangout, HangoutIdea, HangoutSegment } from '../types';

export type HangoutCategory = string;

export const DEFAULT_HANGOUT_CATEGORIES = [
  'Social',
  'Mixed',
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

export const MIXED_HANGOUT_CATEGORY = 'Mixed';
export const MIXED_HANGOUT_MAIN_TYPE = 'Mixed';

export const DEFAULT_HANGOUT_CATEGORY = 'Other';

export const DEFAULT_HANGOUT_TYPES_BY_CATEGORY: Record<string, string[]> = {
  Social: ['Chill', 'Date', 'Group Hangout', 'Party', 'Sleepover'],
  Mixed: [],
  Food: ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Coffee', 'Dessert'],
  Entertainment: ['Movie', 'TV / Shows', 'Gaming', 'Concert', 'Bowling'],
  Fitness: ['Gym', 'MMA', 'Wrestling', 'Running', 'Walking'],
  Faith: ['Church', 'Bible Study', 'Prayer'],
  School: ['Study', 'Class', 'Group Project'],
  Outdoor: ['Hike', 'Park', 'Beach', 'Camping'],
  Shopping: ['Shopping', 'Mall', 'Grocery'],
  Travel: ['Road Trip', 'Vacation'],
  Work: ['Work', 'Networking'],
  Wellness: ['Spa', 'Meditation', 'Therapy'],
  Other: ['Other'],
};

/** Maps legacy flat hangout.type values to { category, type } */
export const LEGACY_HANGOUT_TYPE_MIGRATION: Record<string, { category: string; type: string }> = {
  Chill: { category: 'Social', type: 'Chill' },
  Mixed: { category: MIXED_HANGOUT_CATEGORY, type: MIXED_HANGOUT_MAIN_TYPE },
  Food: { category: 'Food', type: 'Dinner' },
  Study: { category: 'School', type: 'Study' },
  Gym: { category: 'Fitness', type: 'Gym' },
  Party: { category: 'Social', type: 'Party' },
  Shopping: { category: 'Shopping', type: 'Shopping' },
  Travel: { category: 'Travel', type: 'Vacation' },
  Sleepover: { category: 'Social', type: 'Sleepover' },
  Work: { category: 'Work', type: 'Work' },
  Other: { category: 'Other', type: 'Other' },
};

export function cloneDefaultTypesByCategory(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [cat, types] of Object.entries(DEFAULT_HANGOUT_TYPES_BY_CATEGORY)) {
    out[cat] = [...types];
  }
  return out;
}

export function isMixedHangoutCategory(category?: string): boolean {
  return category?.trim().toLowerCase() === MIXED_HANGOUT_CATEGORY.toLowerCase();
}

export function isMixedHangoutMainType(type?: string): boolean {
  return type?.trim().toLowerCase() === MIXED_HANGOUT_MAIN_TYPE.toLowerCase();
}

export function normalizeHangoutMainFields(
  category: string,
  type: string
): { category: string; type: string } {
  if (isMixedHangoutCategory(category)) {
    return { category: MIXED_HANGOUT_CATEGORY, type: MIXED_HANGOUT_MAIN_TYPE };
  }
  return { category, type };
}

/**
 * Resolve category/type for hangout forms — handles Mixed and invalid/leaving-Mixed types.
 */
export function resolveHangoutMainFields(
  category: string,
  type: string,
  catalog: Record<string, string[]>,
  settingsCategories: string[]
): { category: string; type: string } {
  if (isMixedHangoutCategory(category)) {
    return { category: MIXED_HANGOUT_CATEGORY, type: MIXED_HANGOUT_MAIN_TYPE };
  }
  const activeTypes = getActiveTypeOptions(catalog, settingsCategories, category);
  if (
    !type.trim() ||
    isMixedHangoutMainType(type) ||
    !activeTypes.some((t) => t.toLowerCase() === type.toLowerCase())
  ) {
    return { category, type: getDefaultTypeForCategory(catalog, category) };
  }
  const match = activeTypes.find((t) => t.toLowerCase() === type.toLowerCase()) ?? type;
  return { category, type: match };
}

/** Normalize stored hangout fields when opening Add/Edit form. */
export function hangoutMainFieldsForForm(
  hangout: { category?: string; type?: string },
  catalog: Record<string, string[]>,
  settingsCategories: string[]
): { category: string; type: string } {
  const inferred = inferCategoryAndType(hangout.type ?? '', hangout.category, catalog);
  return resolveHangoutMainFields(inferred.category, inferred.type, catalog, settingsCategories);
}

/** Types selectable in dropdowns — Mixed is a category-only label, not a type option. */
export function filterTypesForDropdown(types: string[]): string[] {
  return types.filter((t) => t.toLowerCase() !== MIXED_HANGOUT_MAIN_TYPE.toLowerCase());
}

export function defaultSegmentCategory(hangoutCategory: string): string {
  return isMixedHangoutCategory(hangoutCategory) ? 'Social' : hangoutCategory;
}

export function allTypesFromCatalog(catalog: Record<string, string[]>): string[] {
  const set = new Set<string>();
  for (const types of Object.values(catalog)) {
    types.forEach((t) => set.add(t));
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function allTypesFromCatalogExcludingMixed(catalog: Record<string, string[]>): string[] {
  return filterTypesForDropdown(allTypesFromCatalog(catalog));
}

export function inferCategoryAndType(
  type: string,
  category?: string,
  catalog?: Record<string, string[]>
): { category: string; type: string } {
  const trimmedType = (type || 'Other').trim() || 'Other';
  if (trimmedType.toLowerCase() === MIXED_HANGOUT_MAIN_TYPE.toLowerCase() && !category?.trim()) {
    return { category: MIXED_HANGOUT_CATEGORY, type: MIXED_HANGOUT_MAIN_TYPE };
  }
  if (isMixedHangoutCategory(category)) {
    return { category: MIXED_HANGOUT_CATEGORY, type: MIXED_HANGOUT_MAIN_TYPE };
  }
  if (category?.trim()) {
    return { category: category.trim(), type: trimmedType };
  }
  const legacy = LEGACY_HANGOUT_TYPE_MIGRATION[trimmedType];
  if (legacy) return legacy;
  if (catalog) {
    for (const [cat, types] of Object.entries(catalog)) {
      if (types.some((t) => t.toLowerCase() === trimmedType.toLowerCase())) {
        const match = types.find((t) => t.toLowerCase() === trimmedType.toLowerCase()) ?? trimmedType;
        return { category: cat, type: match };
      }
    }
  }
  return { category: DEFAULT_HANGOUT_CATEGORY, type: trimmedType };
}

export function typesForCategory(catalog: Record<string, string[]>, category: string): string[] {
  if (isMixedHangoutCategory(category)) return [];
  return catalog[category] ?? [];
}

/** Active category options from saved Settings only (sorted). */
export function getActiveCategoryOptions(settingsCategories: string[]): string[] {
  return [...settingsCategories].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/**
 * Active type options from saved Settings catalog only.
 * When selectedCategory is set, returns types for that category (empty for Mixed).
 * When omitted/empty, returns all types across active settings categories.
 */
export function getActiveTypeOptions(
  catalog: Record<string, string[]>,
  settingsCategories: string[],
  selectedCategory = ''
): string[] {
  const types = new Set<string>();

  if (selectedCategory.trim()) {
    if (!isMixedHangoutCategory(selectedCategory)) {
      for (const t of typesForCategory(catalog, selectedCategory)) types.add(t);
    }
  } else {
    for (const cat of settingsCategories) {
      if (isMixedHangoutCategory(cat)) continue;
      for (const t of typesForCategory(catalog, cat)) types.add(t);
    }
  }

  return filterTypesForDropdown([...types]).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
}

export function isActiveTypeInCatalog(
  type: string,
  catalog: Record<string, string[]>,
  settingsCategories: string[],
  category = ''
): boolean {
  if (!type.trim()) return true;
  return getActiveTypeOptions(catalog, settingsCategories, category).some(
    (t) => t.toLowerCase() === type.toLowerCase()
  );
}

export function isActiveCategoryInSettings(category: string, settingsCategories: string[]): boolean {
  if (!category.trim()) return true;
  return settingsCategories.some((c) => c.toLowerCase() === category.toLowerCase());
}

export function getDefaultTypeForCategory(
  catalog: Record<string, string[]>,
  category: string
): string {
  if (isMixedHangoutCategory(category)) return MIXED_HANGOUT_MAIN_TYPE;
  const types = typesForCategory(catalog, category);
  if (types.includes('Chill') && category === 'Social') return 'Chill';
  if (types.includes('Other')) return 'Other';
  return types[0] ?? 'Other';
}

export function getDefaultHangoutCategoryPair(catalog: Record<string, string[]>): {
  category: string;
  type: string;
} {
  const category = catalog.Social ? 'Social' : DEFAULT_HANGOUT_CATEGORIES[0];
  return { category, type: getDefaultTypeForCategory(catalog, category) };
}

export function formatHangoutCategoryType(category: string, type: string): string {
  if (isMixedHangoutCategory(category)) return MIXED_HANGOUT_CATEGORY;
  if (!category || category === type) return type || category || '—';
  return `${category} · ${type}`;
}

export function countHangoutsWithCategory(
  hangouts: { category?: string; segments?: { category?: string }[] }[],
  category: string
): number {
  let count = 0;
  for (const h of hangouts) {
    if (h.category === category) count += 1;
    else if (h.segments?.some((s) => s.category === category)) count += 1;
  }
  return count;
}

export function countHangoutsWithCategoryType(
  hangouts: { category?: string; type: string; segments?: { category?: string; type: string }[] }[],
  category: string,
  type: string
): number {
  let count = 0;
  for (const h of hangouts) {
    if (h.category === category && h.type === type) count += 1;
    else if (h.segments?.some((s) => s.category === category && s.type === type)) count += 1;
  }
  return count;
}

export function migrateHangoutCategories(
  hangouts: Hangout[],
  catalog: Record<string, string[]>
): Hangout[] {
  return hangouts.map((h) => {
    const main = inferCategoryAndType(h.type, h.category, catalog);
    const segments = (h.segments ?? []).map((s) => {
      const seg = inferCategoryAndType(s.type, s.category, catalog);
      return { ...s, category: seg.category, type: seg.type };
    });
    return { ...h, category: main.category, type: main.type, segments };
  });
}

export function migrateIdeaCategories(
  ideas: HangoutIdea[],
  catalog: Record<string, string[]>
): HangoutIdea[] {
  return ideas.map((i) => {
    const pair = inferCategoryAndType(i.type, i.category, catalog);
    return { ...i, category: pair.category, type: pair.type };
  });
}

export function mergeTypesIntoCatalog(
  categories: string[],
  catalog: Record<string, string[]>,
  hangouts: Hangout[],
  ideas: HangoutIdea[]
): { categories: string[]; catalog: Record<string, string[]> } {
  const nextCategories = [...categories];
  const nextCatalog = { ...catalog };
  if (nextCategories.some(isMixedHangoutCategory)) {
    nextCatalog[MIXED_HANGOUT_CATEGORY] = [];
  }
  if (nextCatalog.Social) {
    nextCatalog.Social = nextCatalog.Social.filter((t) => t.toLowerCase() !== MIXED_HANGOUT_MAIN_TYPE.toLowerCase());
  }

  const ensure = (category: string, type: string) => {
    if (isMixedHangoutCategory(category)) return;
    const cat = category.trim() || DEFAULT_HANGOUT_CATEGORY;
    const typ = type.trim() || 'Other';
    if (typ.toLowerCase() === MIXED_HANGOUT_MAIN_TYPE.toLowerCase()) return;
    if (!nextCategories.includes(cat)) nextCategories.push(cat);
    const list = nextCatalog[cat] ? [...nextCatalog[cat]] : [];
    if (!list.some((t) => t.toLowerCase() === typ.toLowerCase())) list.push(typ);
    nextCatalog[cat] = list;
  };

  for (const h of hangouts) {
    ensure(h.category ?? '', h.type);
    for (const s of h.segments ?? []) ensure(s.category ?? h.category ?? '', s.type);
  }
  for (const i of ideas) ensure(i.category ?? '', i.type);

  return { categories: nextCategories, catalog: nextCatalog };
}

export type CategoryTypeEntity = Pick<Hangout, 'category' | 'type'> | Pick<HangoutSegment, 'category' | 'type'> | Pick<HangoutIdea, 'category' | 'type'>;
