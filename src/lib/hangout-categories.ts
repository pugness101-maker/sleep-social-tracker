import type { AppData, Hangout, HangoutIdea, HangoutSegment } from '../types';

export type HangoutCategory = string;

/** Broad activity categories. Mixed is special (segments-only). */
export const DEFAULT_HANGOUT_CATEGORIES = [
  'Social',
  'Food',
  'Fitness',
  'Other',
  'Mixed',
] as const;

export const FUN_LEGACY_CATEGORY = 'Fun';
export const FAITH_LEGACY_CATEGORY = 'Faith';

/** Default types removed from the catalog; records still using them need user resolution. */
export const RETIRED_DEFAULT_TYPES: Record<string, string[]> = {
  Social: ['Concert'],
  Other: ['Appointment', 'Study', 'Class'],
};

export const MIXED_HANGOUT_CATEGORY = 'Mixed';
export const MIXED_HANGOUT_MAIN_TYPE = 'Mixed';

export const DEFAULT_HANGOUT_CATEGORY = 'Other';

export const DEFAULT_HANGOUT_TYPES_BY_CATEGORY: Record<string, string[]> = {
  Social: [
    'Chill',
    'Group Hangout',
    'Party',
    'Sleepover',
    'Travel',
    'Car Ride',
    'Movie / TV',
    'Gaming',
    'Shopping',
    'Activity',
  ],
  Food: ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Cook Together'],
  Fitness: ['Gym', 'MMA', 'Running', 'Hiking', 'Outdoor', 'Wellness'],
  Other: ['Church', 'Bible Study', 'Small Group', 'School', 'Work', 'Errands'],
  Mixed: [],
};

/** Legacy category names → current catalog categories */
export const LEGACY_CATEGORY_MIGRATION: Record<string, string> = {
  Entertainment: 'Social',
  Fun: 'Social',
  Faith: 'Other',
  School: 'Other',
  Outdoor: 'Other',
  Shopping: 'Social',
  Travel: 'Social',
  Work: 'Other',
  Wellness: 'Fitness',
};

/** Legacy type labels → new type labels within migrated categories */
export const LEGACY_TYPE_RENAMES: Record<string, string> = {
  Date: 'Other',
  Movie: 'Movie / TV',
  'TV / Shows': 'Movie / TV',
  Brunch: 'Breakfast',
  Coffee: 'Breakfast',
  Hike: 'Hiking',
  Park: 'Activity',
  Beach: 'Activity',
  Camping: 'Outdoor',
  Mall: 'Shopping',
  Grocery: 'Errands',
  'Road Trip': 'Travel',
  Vacation: 'Travel',
  Networking: 'Work',
  Spa: 'Wellness',
  Meditation: 'Wellness',
  Therapy: 'Wellness',
  'Group Project': 'School',
  Walking: 'Running',
  Wrestling: 'MMA',
  Prayer: 'Small Group',
  Bowling: 'Activity',
  'Cook Together': 'Cook Together',
};

/** Maps legacy flat hangout.type values to { category, type } */
export const LEGACY_HANGOUT_TYPE_MIGRATION: Record<string, { category: string; type: string }> = {
  Chill: { category: 'Social', type: 'Chill' },
  Mixed: { category: MIXED_HANGOUT_CATEGORY, type: MIXED_HANGOUT_MAIN_TYPE },
  Food: { category: 'Food', type: 'Dinner' },
  Study: { category: 'Other', type: 'School' },
  Gym: { category: 'Fitness', type: 'Gym' },
  Party: { category: 'Social', type: 'Party' },
  Shopping: { category: 'Social', type: 'Shopping' },
  Travel: { category: 'Social', type: 'Travel' },
  Sleepover: { category: 'Social', type: 'Sleepover' },
  Work: { category: 'Other', type: 'Work' },
  Other: { category: 'Other', type: 'Other' },
  Date: { category: 'Social', type: 'Other' },
};

export function remapLegacyCategoryType(
  category: string,
  type: string
): { category: string; type: string } {
  let cat = LEGACY_CATEGORY_MIGRATION[category] ?? category;
  let typ = LEGACY_TYPE_RENAMES[type] ?? type;

  if (category === 'Shopping' && type === 'Shopping') {
    cat = 'Social';
    typ = 'Shopping';
  }
  if (category === 'Outdoor') {
    cat = typ === 'Hiking' || typ === 'Outdoor' ? 'Fitness' : 'Other';
    if (typ === 'Hike') typ = 'Hiking';
  }
  if (category === 'Travel') {
    cat = 'Social';
  }
  if (cat === FUN_LEGACY_CATEGORY || category === FUN_LEGACY_CATEGORY) {
    cat = 'Social';
  }
  if (cat === FAITH_LEGACY_CATEGORY || category === FAITH_LEGACY_CATEGORY) {
    cat = 'Other';
  }

  return { category: cat, type: typ };
}

/** Resolve the catalog category that holds Social activity types (handles renames). */
export function resolveSocialCategoryName(
  categories: string[],
  catalog: Record<string, string[]>
): string {
  if (categories.includes('Social')) return 'Social';
  const markers = DEFAULT_HANGOUT_TYPES_BY_CATEGORY.Social.slice(0, 4);
  for (const cat of categories) {
    const types = catalog[cat] ?? [];
    if (markers.some((m) => types.some((t) => t.toLowerCase() === m.toLowerCase()))) {
      return cat;
    }
  }
  return 'Social';
}

/** Merge legacy Fun category catalog entries into Social and drop Fun from settings. */
export function consolidateFunIntoSocialCatalog(
  categories: string[],
  catalog: Record<string, string[]>
): { categories: string[]; catalog: Record<string, string[]> } {
  const funTypes = catalog[FUN_LEGACY_CATEGORY] ?? [];
  const hadFunCategory = categories.includes(FUN_LEGACY_CATEGORY);

  if (!hadFunCategory && funTypes.length === 0) {
    return { categories: [...categories], catalog: { ...catalog } };
  }

  const nextCategories = categories.filter((c) => c !== FUN_LEGACY_CATEGORY);
  const nextCatalog = { ...catalog };
  delete nextCatalog[FUN_LEGACY_CATEGORY];

  const socialCategory = resolveSocialCategoryName(nextCategories, nextCatalog);

  if (socialCategory === 'Social' && !nextCategories.includes('Social')) {
    nextCategories.unshift('Social');
  }

  const socialTypes = [
    ...(nextCatalog[socialCategory] ?? DEFAULT_HANGOUT_TYPES_BY_CATEGORY.Social ?? []),
  ];
  for (const t of funTypes) {
    if (!socialTypes.some((x) => x.toLowerCase() === t.toLowerCase())) {
      socialTypes.push(t);
    }
  }
  nextCatalog[socialCategory] = socialTypes;

  if (socialCategory !== 'Social' && nextCatalog.Social && !nextCategories.includes('Social')) {
    delete nextCatalog.Social;
  }

  return { categories: nextCategories, catalog: nextCatalog };
}

export function remapFunCategory(
  category: string,
  categories?: string[],
  catalog?: Record<string, string[]>
): string {
  if (category !== FUN_LEGACY_CATEGORY) return category;
  if (categories && catalog) {
    return resolveSocialCategoryName(categories, catalog);
  }
  return 'Social';
}

export function migrateFunCategoryOnHangouts(
  hangouts: Hangout[],
  categories?: string[],
  catalog?: Record<string, string[]>
): Hangout[] {
  return hangouts.map((h) => ({
    ...h,
    category: remapFunCategory(h.category, categories, catalog),
    segments: (h.segments ?? []).map((s) => ({
      ...s,
      category: remapFunCategory(s.category, categories, catalog),
    })),
  }));
}

export function migrateFunCategoryOnIdeas(
  ideas: HangoutIdea[],
  categories?: string[],
  catalog?: Record<string, string[]>
): HangoutIdea[] {
  return ideas.map((i) => ({
    ...i,
    category: remapFunCategory(i.category, categories, catalog),
  }));
}

/** Resolve the catalog category that holds Other activity types (handles renames). */
export function resolveOtherCategoryName(
  categories: string[],
  catalog: Record<string, string[]>
): string {
  if (categories.includes('Other')) return 'Other';
  const markers = DEFAULT_HANGOUT_TYPES_BY_CATEGORY.Other.slice(0, 4);
  for (const cat of categories) {
    const types = catalog[cat] ?? [];
    if (markers.some((m) => types.some((t) => t.toLowerCase() === m.toLowerCase()))) {
      return cat;
    }
  }
  return 'Other';
}

/** Merge legacy Faith category catalog entries into Other and drop Faith from settings. */
export function consolidateFaithIntoOtherCatalog(
  categories: string[],
  catalog: Record<string, string[]>
): { categories: string[]; catalog: Record<string, string[]> } {
  const faithTypes = catalog[FAITH_LEGACY_CATEGORY] ?? [];
  const hadFaithCategory = categories.includes(FAITH_LEGACY_CATEGORY);

  if (!hadFaithCategory && faithTypes.length === 0) {
    return { categories: [...categories], catalog: { ...catalog } };
  }

  const nextCategories = categories.filter((c) => c !== FAITH_LEGACY_CATEGORY);
  const nextCatalog = { ...catalog };
  delete nextCatalog[FAITH_LEGACY_CATEGORY];

  const otherCategory = resolveOtherCategoryName(nextCategories, nextCatalog);

  if (otherCategory === 'Other' && !nextCategories.includes('Other')) {
    nextCategories.push('Other');
  }

  const otherTypes = [
    ...(nextCatalog[otherCategory] ?? DEFAULT_HANGOUT_TYPES_BY_CATEGORY.Other ?? []),
  ];
  for (const t of faithTypes) {
    if (!otherTypes.some((x) => x.toLowerCase() === t.toLowerCase())) {
      otherTypes.push(t);
    }
  }
  nextCatalog[otherCategory] = otherTypes;

  if (otherCategory !== 'Other' && nextCatalog.Other && !nextCategories.includes('Other')) {
    delete nextCatalog.Other;
  }

  return { categories: nextCategories, catalog: nextCatalog };
}

export function remapFaithCategory(
  category: string,
  categories?: string[],
  catalog?: Record<string, string[]>
): string {
  if (category !== FAITH_LEGACY_CATEGORY) return category;
  if (categories && catalog) {
    return resolveOtherCategoryName(categories, catalog);
  }
  return 'Other';
}

export function migrateFaithCategoryOnHangouts(
  hangouts: Hangout[],
  categories?: string[],
  catalog?: Record<string, string[]>
): Hangout[] {
  return hangouts.map((h) => ({
    ...h,
    category: remapFaithCategory(h.category, categories, catalog),
    segments: (h.segments ?? []).map((s) => ({
      ...s,
      category: remapFaithCategory(s.category, categories, catalog),
    })),
  }));
}

export function migrateFaithCategoryOnIdeas(
  ideas: HangoutIdea[],
  categories?: string[],
  catalog?: Record<string, string[]>
): HangoutIdea[] {
  return ideas.map((i) => ({
    ...i,
    category: remapFaithCategory(i.category, categories, catalog),
  }));
}

export function isRetiredDefaultType(category: string, type: string): boolean {
  const retired = RETIRED_DEFAULT_TYPES[category] ?? [];
  return retired.some((t) => t.toLowerCase() === type.toLowerCase());
}

export function pruneRetiredTypesFromCatalog(
  categories: string[],
  catalog: Record<string, string[]>
): { categories: string[]; catalog: Record<string, string[]> } {
  const nextCategories = categories.filter((c) => c !== FAITH_LEGACY_CATEGORY);
  const nextCatalog = { ...catalog };
  delete nextCatalog[FAITH_LEGACY_CATEGORY];

  for (const [cat, retiredTypes] of Object.entries(RETIRED_DEFAULT_TYPES)) {
    const list = nextCatalog[cat];
    if (!list) continue;
    nextCatalog[cat] = list.filter(
      (t) => !retiredTypes.some((r) => r.toLowerCase() === t.toLowerCase())
    );
  }

  return { categories: nextCategories, catalog: nextCatalog };
}

export interface RetiredTypeUsage {
  category: string;
  type: string;
  hangouts: number;
  segments: number;
  ideas: number;
  includesActiveTimer: boolean;
}

export function findRetiredTypeUsage(
  data: Pick<AppData, 'hangouts' | 'ideas' | 'activeTimers'>
): RetiredTypeUsage[] {
  const map = new Map<string, RetiredTypeUsage>();
  const bump = (
    category: string | undefined,
    type: string | undefined,
    field: 'hangouts' | 'segments' | 'ideas'
  ) => {
    if (!category?.trim() || !type?.trim()) return;
    if (!isRetiredDefaultType(category, type)) return;
    const key = `${category}::${type}`;
    const entry = map.get(key) ?? { category, type, hangouts: 0, segments: 0, ideas: 0, includesActiveTimer: false };
    entry[field] += 1;
    map.set(key, entry);
  };

  for (const h of data.hangouts) {
    if (!isMixedHangoutCategory(h.category)) {
      bump(h.category, h.type, 'hangouts');
    }
    for (const s of h.segments ?? []) bump(s.category, s.type, 'segments');
  }
  for (const i of data.ideas) bump(i.category, i.type, 'ideas');

  const timers = data.activeTimers;
  if (
    timers.hangoutCategory &&
    timers.hangoutType &&
    isRetiredDefaultType(timers.hangoutCategory, timers.hangoutType)
  ) {
    const key = `${timers.hangoutCategory}::${timers.hangoutType}`;
    const entry = map.get(key) ?? {
      category: timers.hangoutCategory,
      type: timers.hangoutType,
      hangouts: 0,
      segments: 0,
      ideas: 0,
      includesActiveTimer: false,
    };
    entry.includesActiveTimer = true;
    map.set(key, entry);
  }

  return [...map.values()].sort((a, b) =>
    `${a.category}${a.type}`.localeCompare(`${b.category}${b.type}`, undefined, { sensitivity: 'base' })
  );
}

export type RetiredTypeResolution =
  | { action: 'replace'; category: string; type: string }
  | { action: 'move_other'; type: string };

export function applyRetiredTypeResolution(
  data: AppData,
  fromCategory: string,
  fromType: string,
  resolution: RetiredTypeResolution
): AppData {
  const targetCategory = resolution.action === 'move_other' ? 'Other' : resolution.category;
  const targetType = resolution.type;
  const matches = (category?: string, type?: string) =>
    category === fromCategory && type === fromType;

  return {
    ...data,
    hangouts: data.hangouts.map((h) => ({
      ...h,
      category: matches(h.category, h.type) ? targetCategory : h.category,
      type: matches(h.category, h.type) ? targetType : h.type,
      segments:
        h.segments?.map((s) =>
          matches(s.category, s.type)
            ? { ...s, category: targetCategory, type: targetType }
            : s
        ) ?? [],
    })),
    ideas: data.ideas.map((i) =>
      matches(i.category, i.type) ? { ...i, category: targetCategory, type: targetType } : i
    ),
    activeTimers:
      matches(data.activeTimers.hangoutCategory, data.activeTimers.hangoutType)
        ? { ...data.activeTimers, hangoutCategory: targetCategory, hangoutType: targetType }
        : data.activeTimers,
  };
}

export function finalizeHangoutCatalog(
  categories: string[],
  catalog: Record<string, string[]>
): { categories: string[]; catalog: Record<string, string[]> } {
  let result = consolidateFunIntoSocialCatalog(categories, catalog);
  result = consolidateFaithIntoOtherCatalog(result.categories, result.catalog);
  return pruneRetiredTypesFromCatalog(result.categories, result.catalog);
}

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

export function hangoutMainFieldsForForm(
  hangout: { category?: string; type?: string },
  catalog: Record<string, string[]>,
  settingsCategories: string[]
): { category: string; type: string } {
  const inferred = inferCategoryAndType(hangout.type ?? '', hangout.category, catalog);
  return resolveHangoutMainFields(inferred.category, inferred.type, catalog, settingsCategories);
}

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
    const remapped = remapLegacyCategoryType(category.trim(), trimmedType);
    return remapped;
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

export function getActiveCategoryOptions(settingsCategories: string[]): string[] {
  return [...settingsCategories].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

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
  if (types.includes('School') && category === 'Other') return 'School';
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
    nextCatalog.Social = nextCatalog.Social.filter(
      (t) => t.toLowerCase() !== MIXED_HANGOUT_MAIN_TYPE.toLowerCase() && t.toLowerCase() !== 'date'
    );
  }

  const ensure = (category: string, type: string) => {
    if (isMixedHangoutCategory(category)) return;
    const cat = category.trim() || DEFAULT_HANGOUT_CATEGORY;
    const typ = type.trim() || 'Other';
    if (typ.toLowerCase() === MIXED_HANGOUT_MAIN_TYPE.toLowerCase()) return;
    if (typ.toLowerCase() === 'date') return;
    if (isRetiredDefaultType(cat, typ)) return;
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

  return finalizeHangoutCatalog(nextCategories, nextCatalog);
}

export type CategoryTypeEntity = Pick<Hangout, 'category' | 'type'> | Pick<HangoutSegment, 'category' | 'type'> | Pick<HangoutIdea, 'category' | 'type'>;
