import { DEFAULT_HANGOUT_TYPE, DEFAULT_RELATIONSHIP_TYPE } from '../types';

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

export function countFriendsWithTag(friends: { tags: string[] }[], tag: string): number {
  return friends.filter((f) => f.tags.includes(tag)).length;
}

export function friendMatchesTagFilter(friend: { tags: string[] }, filterTags: string[]): boolean {
  if (filterTags.length === 0) return true;
  return filterTags.some((tag) => friend.tags.includes(tag));
}

export function toggleTag(tags: string[], tag: string): string[] {
  return tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
}

export function countHangoutsWithType(hangouts: { type: string; segments?: { type: string }[] }[], type: string): number {
  let count = 0;
  for (const h of hangouts) {
    if (h.type === type) count += 1;
    else if (h.segments?.some((s) => s.type === type)) count += 1;
  }
  return count;
}

export function countIdeasWithType(ideas: { type: string }[], type: string): number {
  return ideas.filter((i) => i.type === type).length;
}

export function getDefaultHangoutType(types: string[]): string {
  if (types.includes('Chill')) return 'Chill';
  if (types.includes(DEFAULT_HANGOUT_TYPE)) return DEFAULT_HANGOUT_TYPE;
  return types[0] ?? '';
}

export function countFriendsWithRelationshipStatus(
  friends: { relationshipStatus: string }[],
  status: string
): number {
  return friends.filter((f) => f.relationshipStatus === status).length;
}

export function countFriendLinksWithType(friends: { relationships: { type: string }[] }[], type: string): number {
  return friends.reduce((sum, f) => sum + f.relationships.filter((r) => r.type === type).length, 0);
}

export function getDefaultRelationshipType(types: string[]): string {
  if (types.includes('Friend')) return 'Friend';
  return types[0] ?? DEFAULT_RELATIONSHIP_TYPE;
}

export function optionSelectOptions(options: string[], current?: string) {
  const opts = options.map((o) => ({ value: o, label: o }));
  if (current && !options.includes(current)) {
    return [{ value: current, label: current }, ...opts];
  }
  return opts;
}

export function hangoutTypeSelectOptions(types: string[], current?: string) {
  return optionSelectOptions(types, current);
}
