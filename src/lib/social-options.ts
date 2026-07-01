export function normalizeOptionName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function isDuplicateOption(name: string, options: string[], exclude?: string): boolean {
  const normalized = normalizeOptionName(name).toLowerCase();
  if (!normalized) return false;
  return options.some(
    (o) => o.toLowerCase() === normalized && (!exclude || o.toLowerCase() !== exclude.toLowerCase())
  );
}

export function validateOptionName(name: string, options: string[], exclude?: string): string | null {
  const normalized = normalizeOptionName(name);
  if (!normalized) return 'Name cannot be empty.';
  if (isDuplicateOption(normalized, options, exclude)) return 'That name already exists.';
  return null;
}

export function countFriendsWithCategory(friends: { category: string }[], category: string): number {
  return friends.filter((f) => f.category === category).length;
}

export function countHangoutsWithType(hangouts: { type: string }[], type: string): number {
  return hangouts.filter((h) => h.type === type).length;
}
