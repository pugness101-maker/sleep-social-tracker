import { getReciprocalLinkType } from './friend-links';
import type { Friend, FriendLink } from '../types';

export interface FriendPair {
  aId: string;
  bId: string;
}

export interface BulkRelationshipPreview {
  pairCount: number;
  directionalLinks: number;
  pairs: FriendPair[];
  /** Pairs that would be created (add) or removed (remove) */
  affectedPairs: FriendPair[];
  skippedPairs: FriendPair[];
}

export function getFriendPairs(friendIds: string[]): FriendPair[] {
  const unique = [...new Set(friendIds)];
  const pairs: FriendPair[] = [];
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      pairs.push({ aId: unique[i], bId: unique[j] });
    }
  }
  return pairs;
}

function pairKey(aId: string, bId: string): string {
  return [aId, bId].sort().join('::');
}

function linkMatchesTypeFilter(type: string, typeFilter?: string): boolean {
  if (!typeFilter) return true;
  return type === typeFilter || type === getReciprocalLinkType(typeFilter);
}

export function friendsAreLinked(
  friends: Friend[],
  aId: string,
  bId: string,
  typeFilter?: string
): boolean {
  const a = friends.find((f) => f.id === aId);
  const b = friends.find((f) => f.id === bId);
  if (!a || !b) return false;
  const linkA = a.relationships.find((r) => r.relatedFriendId === bId);
  const linkB = b.relationships.find((r) => r.relatedFriendId === aId);
  if (!typeFilter) return !!(linkA || linkB);
  return (
    (linkA != null && linkMatchesTypeFilter(linkA.type, typeFilter)) ||
    (linkB != null && linkMatchesTypeFilter(linkB.type, typeFilter))
  );
}

export function previewBulkAddRelationships(
  friends: Friend[],
  selectedIds: string[],
  _type: string
): BulkRelationshipPreview {
  const pairs = getFriendPairs(selectedIds);
  const affected: FriendPair[] = [];
  const skipped: FriendPair[] = [];

  for (const pair of pairs) {
    if (friendsAreLinked(friends, pair.aId, pair.bId)) {
      skipped.push(pair);
    } else {
      affected.push(pair);
    }
  }

  return {
    pairCount: pairs.length,
    directionalLinks: affected.length * 2,
    pairs,
    affectedPairs: affected,
    skippedPairs: skipped,
  };
}

export function previewBulkRemoveRelationships(
  friends: Friend[],
  selectedIds: string[],
  typeFilter?: string
): BulkRelationshipPreview {
  const pairs = getFriendPairs(selectedIds);
  const affected: FriendPair[] = [];
  const skipped: FriendPair[] = [];

  for (const pair of pairs) {
    if (friendsAreLinked(friends, pair.aId, pair.bId, typeFilter)) {
      affected.push(pair);
    } else {
      skipped.push(pair);
    }
  }

  return {
    pairCount: pairs.length,
    directionalLinks: affected.length * 2,
    pairs,
    affectedPairs: affected,
    skippedPairs: skipped,
  };
}

export function formatBulkPreviewMessage(
  action: 'add' | 'remove',
  preview: BulkRelationshipPreview,
  reciprocal: boolean
): string {
  const { affectedPairs, skippedPairs } = preview;
  const pairCount = affectedPairs.length;
  const links = reciprocal || action === 'remove' ? pairCount * 2 : pairCount;

  if (pairCount === 0) {
    return action === 'add'
      ? 'No new relationship pairs to create. All selected pairs may already be linked.'
      : 'No matching relationships to remove between the selected friends.';
  }

  const main =
    action === 'add'
      ? `This will create ${pairCount} relationship pair${pairCount === 1 ? '' : 's'} (${links} directional link${links === 1 ? '' : 's'}).`
      : `This will remove ${pairCount} relationship pair${pairCount === 1 ? '' : 's'} (${links} directional link${links === 1 ? '' : 's'}).`;

  if (skippedPairs.length === 0) return main;

  const skippedNote =
    action === 'add'
      ? ` ${skippedPairs.length} pair${skippedPairs.length === 1 ? '' : 's'} already linked and will be skipped.`
      : ` ${skippedPairs.length} pair${skippedPairs.length === 1 ? '' : 's'} have no matching link.`;

  return main + skippedNote;
}

export function applyBulkAddRelationships(
  friends: Friend[],
  selectedIds: string[],
  type: string,
  reciprocal: boolean,
  createId: () => string,
  timestamp: () => string
): { friends: Friend[]; createdPairs: number; skippedPairs: number } {
  const preview = previewBulkAddRelationships(friends, selectedIds, type);
  if (preview.affectedPairs.length === 0) {
    return { friends, createdPairs: 0, skippedPairs: preview.skippedPairs.length };
  }

  const friendMap = new Map(friends.map((f) => [f.id, { ...f, relationships: [...f.relationships] }]));
  const reciprocalType = getReciprocalLinkType(type);
  const now = timestamp();

  for (const { aId, bId } of preview.affectedPairs) {
    const a = friendMap.get(aId)!;
    const b = friendMap.get(bId)!;

    const linkA: FriendLink = {
      id: createId(),
      relatedFriendId: bId,
      type,
      notes: '',
      createdAt: now,
    };
    a.relationships.push(linkA);

    if (reciprocal) {
      const linkB: FriendLink = {
        id: createId(),
        relatedFriendId: aId,
        type: reciprocalType,
        notes: '',
        createdAt: now,
      };
      b.relationships.push(linkB);
    }

    friendMap.set(aId, a);
    friendMap.set(bId, b);
  }

  return {
    friends: friends.map((f) => friendMap.get(f.id) ?? f),
    createdPairs: preview.affectedPairs.length,
    skippedPairs: preview.skippedPairs.length,
  };
}

export function applyBulkRemoveRelationships(
  friends: Friend[],
  selectedIds: string[],
  typeFilter?: string
): { friends: Friend[]; removedPairs: number } {
  const preview = previewBulkRemoveRelationships(friends, selectedIds, typeFilter);
  if (preview.affectedPairs.length === 0) {
    return { friends, removedPairs: 0 };
  }

  const removeKeys = new Set(preview.affectedPairs.map((p) => pairKey(p.aId, p.bId)));
  const selectedSet = new Set(selectedIds);

  const updated = friends.map((friend) => {
    if (!selectedSet.has(friend.id)) return friend;

    const relationships = friend.relationships.filter((link) => {
      if (!selectedSet.has(link.relatedFriendId)) return true;
      const key = pairKey(friend.id, link.relatedFriendId);
      if (!removeKeys.has(key)) return true;
      if (!linkMatchesTypeFilter(link.type, typeFilter)) return true;
      return false;
    });

    return relationships.length === friend.relationships.length
      ? friend
      : { ...friend, relationships };
  });

  return { friends: updated, removedPairs: preview.affectedPairs.length };
}

export function friendNameLookup(friends: Friend[], id: string): string {
  return friends.find((f) => f.id === id)?.name ?? 'Unknown';
}

export function formatPairList(friends: Friend[], pairs: FriendPair[], limit = 6): string {
  const lines = pairs.slice(0, limit).map(({ aId, bId }) => {
    return `${friendNameLookup(friends, aId)} ↔ ${friendNameLookup(friends, bId)}`;
  });
  if (pairs.length > limit) {
    lines.push(`…and ${pairs.length - limit} more`);
  }
  return lines.join('\n');
}
