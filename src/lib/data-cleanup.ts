import type { AppData, Friend, Hangout } from '../types';
import { removeLinksToFriend } from './friend-links';
import { getSegmentFriendIds } from './hangout-segments';
import { inferCategoryAndType } from './hangout-categories';

export interface DuplicateFriendGroup {
  normalizedName: string;
  friends: Friend[];
}

export interface DuplicateHangoutGroup {
  key: string;
  hangouts: Hangout[];
}

export interface EmptyFriend {
  friend: Friend;
}

export interface CleanupPreview {
  duplicateFriends: DuplicateFriendGroup[];
  duplicateHangouts: DuplicateHangoutGroup[];
  emptyFriends: EmptyFriend[];
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function findDuplicateFriends(friends: Friend[]): DuplicateFriendGroup[] {
  const map = new Map<string, Friend[]>();
  for (const f of friends) {
    const key = normalizeName(f.name);
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(f);
    map.set(key, list);
  }
  return [...map.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([normalizedName, list]) => ({
      normalizedName,
      friends: [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }));
}

export function findEmptyFriends(friends: Friend[]): EmptyFriend[] {
  return friends
    .filter(
      (f) =>
        !f.notes.trim() &&
        !f.contactInfo.trim() &&
        !f.birthday &&
        f.tags.length === 0 &&
        (f.groups ?? []).length === 0 &&
        f.favoriteActivities.length === 0 &&
        f.relationships.length === 0
    )
    .map((friend) => ({ friend }));
}

export function hangoutDuplicateKey(h: Hangout): string {
  const friendKey = [...h.friendIds].sort().join(',');
  const cat = h.category ?? '';
  return [
    h.startTime,
    h.endTime,
    friendKey,
    cat,
    h.type,
    h.sourceCalendarUid ?? '',
  ].join('::');
}

export function findDuplicateHangouts(hangouts: Hangout[]): DuplicateHangoutGroup[] {
  const map = new Map<string, Hangout[]>();
  for (const h of hangouts) {
    const key = hangoutDuplicateKey(h);
    const list = map.get(key) ?? [];
    list.push(h);
    map.set(key, list);
  }
  return [...map.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({ key, hangouts: list }));
}

export function buildCleanupPreview(data: AppData): CleanupPreview {
  return {
    duplicateFriends: findDuplicateFriends(data.friends),
    duplicateHangouts: findDuplicateHangouts(data.hangouts),
    emptyFriends: findEmptyFriends(data.friends),
  };
}

function replaceFriendIdEverywhere(data: AppData, fromId: string, toId: string): AppData {
  if (fromId === toId) return data;

  const friends = data.friends.map((f) => {
    let next = f;
    if (f.id === fromId) return f;
    if (f.relationships.some((r) => r.relatedFriendId === fromId)) {
      next = {
        ...f,
        relationships: f.relationships.map((r) =>
          r.relatedFriendId === fromId ? { ...r, relatedFriendId: toId } : r
        ),
      };
    }
    return next;
  });

  const hangouts = data.hangouts.map((h) => ({
    ...h,
    friendIds: [...new Set(h.friendIds.map((id) => (id === fromId ? toId : id)))],
    segments: (h.segments ?? []).map((s) => ({
      ...s,
      friendIds: [...new Set(getSegmentFriendIds(s, h.friendIds).map((id) => (id === fromId ? toId : id)))],
    })),
  }));

  const ideas = data.ideas.map((i) => ({
    ...i,
    friendIds: [...new Set(i.friendIds.map((id) => (id === fromId ? toId : id)))],
  }));

  const activeTimers = {
    ...data.activeTimers,
    hangoutFriendIds: data.activeTimers.hangoutFriendIds.map((id) => (id === fromId ? toId : id)),
  };

  return { ...data, friends, hangouts, ideas, activeTimers };
}

export function mergeFriends(
  data: AppData,
  primaryId: string,
  duplicateIds: string[]
): AppData {
  const primary = data.friends.find((f) => f.id === primaryId);
  if (!primary) return data;

  let next: AppData = { ...data };
  let mergedPrimary = { ...primary };

  for (const dupId of duplicateIds) {
    if (dupId === primaryId) continue;
    const dup = next.friends.find((f) => f.id === dupId);
    if (!dup) continue;

    mergedPrimary = {
      ...mergedPrimary,
      tags: [...new Set([...mergedPrimary.tags, ...dup.tags])],
      groups: [...new Set([...(mergedPrimary.groups ?? []), ...(dup.groups ?? [])])],
      favoriteActivities: [...new Set([...mergedPrimary.favoriteActivities, ...dup.favoriteActivities])],
      notes: [mergedPrimary.notes, dup.notes].filter(Boolean).join('\n---\n'),
      contactInfo: mergedPrimary.contactInfo || dup.contactInfo,
      birthday: mergedPrimary.birthday || dup.birthday,
    };

    next = replaceFriendIdEverywhere(next, dupId, primaryId);
    next = {
      ...next,
      friends: removeLinksToFriend(
        next.friends.filter((f) => f.id !== dupId),
        dupId
      ) as Friend[],
    };
  }

  next = {
    ...next,
    friends: next.friends.map((f) =>
      f.id === primaryId
        ? {
            ...mergedPrimary,
            relationships: mergedPrimary.relationships.filter(
              (r) => r.relatedFriendId !== primaryId
            ),
          }
        : f
    ),
  };

  return next;
}

export function renameFriendEverywhere(data: AppData, friendId: string, newName: string): AppData {
  const trimmed = newName.trim();
  if (!trimmed) return data;
  return {
    ...data,
    friends: data.friends.map((f) => (f.id === friendId ? { ...f, name: trimmed } : f)),
  };
}

export function deleteFriendsById(data: AppData, friendIds: string[]): AppData {
  let next = { ...data };
  for (const id of friendIds) {
    next = {
      ...next,
      friends: removeLinksToFriend(next.friends.filter((f) => f.id !== id), id) as Friend[],
      hangouts: next.hangouts.map((h) => ({
        ...h,
        friendIds: h.friendIds.filter((fid) => fid !== id),
        segments: (h.segments ?? []).map((s) => ({
          ...s,
          friendIds: getSegmentFriendIds(s, h.friendIds).filter((fid) => fid !== id),
        })),
      })),
      ideas: next.ideas.map((i) => ({ ...i, friendIds: i.friendIds.filter((fid) => fid !== id) })),
      activeTimers: {
        ...next.activeTimers,
        hangoutFriendIds: next.activeTimers.hangoutFriendIds.filter((fid) => fid !== id),
      },
    };
  }
  return next;
}

export function deleteHangoutsById(data: AppData, hangoutIds: string[]): AppData {
  const set = new Set(hangoutIds);
  return { ...data, hangouts: data.hangouts.filter((h) => !set.has(h.id)) };
}

export function bulkUpdateHangoutCategoryType(
  data: AppData,
  hangoutIds: string[],
  category: string,
  type: string
): AppData {
  const set = new Set(hangoutIds);
  return {
    ...data,
    hangouts: data.hangouts.map((h) =>
      set.has(h.id) ? { ...h, category, type } : h
    ),
  };
}

export function bulkUpdateHangoutLocations(
  data: AppData,
  hangoutIds: string[],
  location: string
): AppData {
  const set = new Set(hangoutIds);
  return {
    ...data,
    hangouts: data.hangouts.map((h) => (set.has(h.id) ? { ...h, location } : h)),
  };
}

export function normalizeImportedFriendNames(data: AppData): AppData {
  return {
    ...data,
    friends: data.friends.map((f) => ({
      ...f,
      name: f.name.trim().replace(/\s+/g, ' '),
    })),
  };
}

export function normalizeHangoutCategoriesInData(data: AppData): AppData {
  const catalog = data.hangoutTypesByCategory ?? {};
  return {
    ...data,
    hangouts: data.hangouts.map((h) => {
      const main = inferCategoryAndType(h.type, h.category, catalog);
      return {
        ...h,
        category: main.category,
        type: main.type,
        segments: (h.segments ?? []).map((s) => {
          const seg = inferCategoryAndType(s.type, s.category, catalog);
          return { ...s, category: seg.category, type: seg.type };
        }),
      };
    }),
    ideas: data.ideas.map((i) => {
      const pair = inferCategoryAndType(i.type, i.category, catalog);
      return { ...i, category: pair.category, type: pair.type };
    }),
  };
}
