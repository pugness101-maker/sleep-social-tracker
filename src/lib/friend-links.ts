import { DEFAULT_FRIEND_LINK_TYPES } from '../types';

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

export function linkTypeOptions(current?: string) {
  const types = [...DEFAULT_FRIEND_LINK_TYPES];
  if (current && !types.includes(current as (typeof types)[number])) {
    return [{ value: current, label: current }, ...types.map((t) => ({ value: t, label: t }))];
  }
  return types.map((t) => ({ value: t, label: t }));
}
