import { parseISO } from 'date-fns';
import { formatDate } from './dates';
import { daysSinceDate, formatDaysSinceLabel, getFriendLastSeen } from './friend-activity';
import type { AppData, Friend } from '../types';

export interface FriendUsageEntry {
  id: string;
  name: string;
  lastSeen: string | null;
  lastSeenLabel: string;
}

export interface RelationshipLinkUsageEntry {
  fromName: string;
  type: string;
  toName: string;
}

export interface HangoutLogEntry {
  sortTime: string;
  dateLabel: string;
  type: string;
  friendNames: string;
  location: string;
  kind: 'hangout' | 'segment' | 'idea';
}

export interface CategoryUsageSummary {
  hangouts: number;
  segments: number;
  ideas: number;
  logs: HangoutLogEntry[];
}

export type UsageLogContent =
  | { kind: 'friends'; label: string; entries: FriendUsageEntry[] }
  | { kind: 'relationship_links'; label: string; entries: RelationshipLinkUsageEntry[] }
  | { kind: 'category'; category: string; summary: CategoryUsageSummary }
  | { kind: 'category_type'; category: string; type: string; summary: CategoryUsageSummary }
  | { kind: 'occasion'; occasion: string; summary: CategoryUsageSummary };

function friendNameLookup(friends: Friend[]): (id: string) => string {
  const map = new Map(friends.map((f) => [f.id, f.name]));
  return (id) => map.get(id) ?? 'Unknown';
}

function formatLastSeenLabel(lastSeen: string | null): string {
  if (!lastSeen) return 'Never';
  const days = daysSinceDate(lastSeen, new Date());
  return formatDaysSinceLabel(days);
}

function friendNamesForIds(ids: string[], lookup: (id: string) => string): string {
  if (ids.length === 0) return '—';
  return ids.map(lookup).join(', ');
}

function sortLogsNewestFirst(logs: HangoutLogEntry[]): HangoutLogEntry[] {
  return [...logs].sort((a, b) => parseISO(b.sortTime).getTime() - parseISO(a.sortTime).getTime());
}

export function getFriendTagUsage(data: Pick<AppData, 'friends' | 'hangouts'>, tag: string): UsageLogContent {
  const entries: FriendUsageEntry[] = data.friends
    .filter((f) => f.tags.includes(tag))
    .map((f) => {
      const lastSeen = getFriendLastSeen(f.id, data.hangouts);
      return {
        id: f.id,
        name: f.name,
        lastSeen,
        lastSeenLabel: formatLastSeenLabel(lastSeen),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return { kind: 'friends', label: tag, entries };
}

export function getFriendGroupUsage(data: Pick<AppData, 'friends' | 'hangouts'>, group: string): UsageLogContent {
  const entries: FriendUsageEntry[] = data.friends
    .filter((f) => (f.groups ?? []).includes(group))
    .map((f) => {
      const lastSeen = getFriendLastSeen(f.id, data.hangouts);
      return {
        id: f.id,
        name: f.name,
        lastSeen,
        lastSeenLabel: formatLastSeenLabel(lastSeen),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return { kind: 'friends', label: group, entries };
}

export function getRelationshipStatusUsage(
  data: Pick<AppData, 'friends' | 'hangouts'>,
  status: string
): UsageLogContent {
  const entries: FriendUsageEntry[] = data.friends
    .filter((f) => f.relationshipStatus === status)
    .map((f) => {
      const lastSeen = getFriendLastSeen(f.id, data.hangouts);
      return {
        id: f.id,
        name: f.name,
        lastSeen,
        lastSeenLabel: formatLastSeenLabel(lastSeen),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return { kind: 'friends', label: status, entries };
}

export function getRelationshipTypeUsage(data: Pick<AppData, 'friends'>, type: string): UsageLogContent {
  const lookup = friendNameLookup(data.friends);
  const entries: RelationshipLinkUsageEntry[] = [];

  for (const friend of data.friends) {
    for (const link of friend.relationships) {
      if (link.type !== type) continue;
      entries.push({
        fromName: friend.name,
        type: link.type,
        toName: lookup(link.relatedFriendId),
      });
    }
  }

  entries.sort((a, b) =>
    `${a.fromName}${a.toName}`.localeCompare(`${b.fromName}${b.toName}`, undefined, { sensitivity: 'base' })
  );

  return { kind: 'relationship_links', label: type, entries };
}

export function getCategoryUsage(
  data: Pick<AppData, 'friends' | 'hangouts' | 'ideas'>,
  category: string
): UsageLogContent {
  const lookup = friendNameLookup(data.friends);
  let hangoutCount = 0;
  let segmentCount = 0;
  const logs: HangoutLogEntry[] = [];

  for (const h of data.hangouts) {
    if (h.category === category) {
      hangoutCount += 1;
      logs.push({
        sortTime: h.startTime,
        dateLabel: formatDate(h.startTime),
        type: h.type,
        friendNames: friendNamesForIds(h.friendIds, lookup),
        location: h.location?.trim() || '—',
        kind: 'hangout',
      });
    }
    for (const s of h.segments ?? []) {
      if (s.category === category) {
        segmentCount += 1;
        const segFriends = s.friendIds?.length ? s.friendIds : h.friendIds;
        logs.push({
          sortTime: s.startTime?.trim() || h.startTime,
          dateLabel: formatDate(s.startTime?.trim() || h.startTime),
          type: s.type,
          friendNames: friendNamesForIds(segFriends, lookup),
          location: s.location?.trim() || h.location?.trim() || '—',
          kind: 'segment',
        });
      }
    }
  }

  let ideaCount = 0;
  for (const i of data.ideas) {
    if (i.category === category) {
      ideaCount += 1;
      logs.push({
        sortTime: i.createdAt,
        dateLabel: formatDate(i.createdAt),
        type: i.type,
        friendNames: friendNamesForIds(i.friendIds, lookup),
        location: i.location?.trim() || '—',
        kind: 'idea',
      });
    }
  }

  return {
    kind: 'category',
    category,
    summary: {
      hangouts: hangoutCount,
      segments: segmentCount,
      ideas: ideaCount,
      logs: sortLogsNewestFirst(logs),
    },
  };
}

export function getCategoryTypeUsage(
  data: Pick<AppData, 'friends' | 'hangouts' | 'ideas'>,
  category: string,
  type: string
): UsageLogContent {
  const lookup = friendNameLookup(data.friends);
  let hangoutCount = 0;
  let segmentCount = 0;
  const logs: HangoutLogEntry[] = [];

  for (const h of data.hangouts) {
    if (h.category === category && h.type === type) {
      hangoutCount += 1;
      logs.push({
        sortTime: h.startTime,
        dateLabel: formatDate(h.startTime),
        type: h.type,
        friendNames: friendNamesForIds(h.friendIds, lookup),
        location: h.location?.trim() || '—',
        kind: 'hangout',
      });
    }
    for (const s of h.segments ?? []) {
      if (s.category === category && s.type === type) {
        segmentCount += 1;
        const segFriends = s.friendIds?.length ? s.friendIds : h.friendIds;
        logs.push({
          sortTime: s.startTime?.trim() || h.startTime,
          dateLabel: formatDate(s.startTime?.trim() || h.startTime),
          type: s.type,
          friendNames: friendNamesForIds(segFriends, lookup),
          location: s.location?.trim() || h.location?.trim() || '—',
          kind: 'segment',
        });
      }
    }
  }

  let ideaCount = 0;
  for (const i of data.ideas) {
    if (i.category === category && i.type === type) {
      ideaCount += 1;
      logs.push({
        sortTime: i.createdAt,
        dateLabel: formatDate(i.createdAt),
        type: i.type,
        friendNames: friendNamesForIds(i.friendIds, lookup),
        location: i.location?.trim() || '—',
        kind: 'idea',
      });
    }
  }

  return {
    kind: 'category_type',
    category,
    type,
    summary: {
      hangouts: hangoutCount,
      segments: segmentCount,
      ideas: ideaCount,
      logs: sortLogsNewestFirst(logs),
    },
  };
}

export function getOccasionUsage(
  data: Pick<AppData, 'friends' | 'hangouts'>,
  occasion: string
): UsageLogContent {
  const lookup = friendNameLookup(data.friends);
  let hangoutCount = 0;
  const logs: HangoutLogEntry[] = [];

  for (const h of data.hangouts) {
    if ((h.occasion || 'None') !== occasion) continue;
    hangoutCount += 1;
    logs.push({
      sortTime: h.startTime,
      dateLabel: formatDate(h.startTime),
      type: `${h.category} · ${h.type}`,
      friendNames: friendNamesForIds(h.friendIds, lookup),
      location: h.location?.trim() || '—',
      kind: 'hangout',
    });
  }

  return {
    kind: 'occasion',
    occasion,
    summary: {
      hangouts: hangoutCount,
      segments: 0,
      ideas: 0,
      logs: sortLogsNewestFirst(logs),
    },
  };
}
