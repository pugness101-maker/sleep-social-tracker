import { DEFAULT_RELATIONSHIP_TYPE } from '../types';

/** Inverse type for asymmetric linked relationships */
const RECIPROCAL_TYPE_MAP: Record<string, string> = {
  Parent: 'Child',
  Child: 'Parent',
};

export function getReciprocalLinkType(type: string): string {
  return RECIPROCAL_TYPE_MAP[type] ?? type;
}

export function removeLinksToFriend<T extends { id: string; relationships: { relatedFriendId: string }[] }>(
  friends: T[],
  deletedFriendId: string
): T[] {
  return friends.map((f) => ({
    ...f,
    relationships: f.relationships.filter((r) => r.relatedFriendId !== deletedFriendId),
  }));
}

export function linkTypeOptions(types: string[], current?: string) {
  const list = [...types];
  if (current && !list.some((t) => t.toLowerCase() === current.toLowerCase())) {
    return [{ value: current, label: current }, ...list.map((t) => ({ value: t, label: t }))];
  }
  return list.map((t) => ({ value: t, label: t }));
}

export function updateAllFriendLinkTypes(
  friends: { relationships: { type: string }[] }[],
  oldName: string,
  newName: string
) {
  return friends.map((f) => ({
    ...f,
    relationships: f.relationships.map((r) =>
      r.type === oldName ? { ...r, type: newName } : r
    ),
  }));
}

export function replaceFriendLinkType(
  friends: { relationships: { type: string }[] }[],
  oldName: string,
  replacement: string
) {
  return friends.map((f) => ({
    ...f,
    relationships: f.relationships.map((r) =>
      r.type === oldName ? { ...r, type: replacement } : r
    ),
  }));
}

export { DEFAULT_RELATIONSHIP_TYPE };
