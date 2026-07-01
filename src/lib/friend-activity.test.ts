import { describe, expect, it } from 'vitest';
import type { Friend, Hangout } from '../types';
import {
  daysSinceDate,
  getCatchUpFriends,
  getFriendActivitySummary,
  getFriendDetailedStats,
  getFriendFirstHangout,
  getFriendHangoutTimeline,
  getFriendLastSeen,
  getFriendMinutesInHangout,
  getHangoutSeenTime,
  sortFriends,
} from './friend-activity';
import { enrichFriend } from './stats';

const friendA: Friend = {
  id: 'f1',
  name: 'Alice',
  tags: [],
  groups: [],
  relationshipStatus: 'Friend',
  birthday: '',
  contactInfo: '',
  notes: '',
  favoriteActivities: [],
  relationships: [],
  createdAt: '2026-01-01T10:00:00',
};

const friendSophie: Friend = {
  id: 'f2',
  name: 'Sophie',
  tags: [],
  groups: [],
  relationshipStatus: 'Friend',
  birthday: '',
  contactInfo: '',
  notes: '',
  favoriteActivities: [],
  relationships: [],
  createdAt: '2026-02-01T10:00:00',
};

const friendC: Friend = {
  id: 'f3',
  name: 'Carol',
  tags: [],
  groups: [],
  relationshipStatus: 'Friend',
  birthday: '',
  contactInfo: '',
  notes: '',
  favoriteActivities: [],
  relationships: [],
  createdAt: '2026-03-01T10:00:00',
};

const hangouts: Hangout[] = [
  {
    id: 'h1',
    friendIds: ['f1'],
    startTime: '2026-06-20T16:00',
    endTime: '2026-06-20T18:00',
    location: 'Cafe',
    type: 'Food',
    notes: '',
    segments: [],
    createdAt: '2026-06-20T16:00',
  },
  {
    id: 'h2',
    friendIds: ['f1'],
    startTime: '2026-06-29T14:00',
    endTime: '',
    location: 'Park',
    type: 'Chill',
    notes: '',
    segments: [
      {
        id: 's1',
        type: 'Food',
        friendIds: ['f1'],
        startTime: '',
        endTime: '',
        durationMinutes: null,
        location: '',
        notes: '',
      },
    ],
    createdAt: '2026-06-29T14:00',
  },
];

const segmentOnlyHangout: Hangout = {
  id: 'h3',
  friendIds: ['f1'],
  startTime: '2026-07-01T08:00',
  endTime: '2026-07-01T19:00',
  location: 'Town',
  category: 'Mixed',
  type: 'Mixed',
  notes: '',
  segments: [
    {
      id: 's-food',
      type: 'Food',
      friendIds: ['f1', 'f2'],
      startTime: '2026-07-01T16:00',
      endTime: '2026-07-01T17:00',
      durationMinutes: null,
      location: '',
      notes: '',
    },
    {
      id: 's-shop',
      type: 'Shopping',
      friendIds: ['f1', 'f2'],
      startTime: '2026-07-01T17:00',
      endTime: '2026-07-01T18:00',
      durationMinutes: null,
      location: '',
      notes: '',
    },
  ],
  createdAt: '2026-07-01T08:00',
};

describe('getHangoutSeenTime', () => {
  it('uses endTime when available', () => {
    expect(getHangoutSeenTime(hangouts[0])).toBe('2026-06-20T18:00');
  });

  it('falls back to startTime when endTime is empty', () => {
    expect(getHangoutSeenTime(hangouts[1])).toBe('2026-06-29T14:00');
  });
});

describe('friend last seen', () => {
  it('returns most recent seen time', () => {
    expect(getFriendLastSeen('f1', hangouts)).toBe('2026-06-29T14:00');
  });

  it('returns earliest start for first hangout', () => {
    expect(getFriendFirstHangout('f1', hangouts)).toBe('2026-06-20T16:00');
  });

  it('calculates days since seen', () => {
    const days = daysSinceDate('2026-06-29T14:00', new Date('2026-07-01T12:00:00'));
    expect(days).toBe(2);
  });
});

describe('segment-only friends', () => {
  it('includes segment-only friends in hangout participation', () => {
    const summary = getFriendActivitySummary('f2', [segmentOnlyHangout]);
    expect(summary.totalHangouts).toBe(1);
    expect(summary.totalHours).toBe(2);
  });

  it('credits main hangout friends for full duration', () => {
    expect(getFriendMinutesInHangout('f1', segmentOnlyHangout)).toBe(660);
  });

  it('credits segment-only friends for segment duration only', () => {
    expect(getFriendMinutesInHangout('f2', segmentOnlyHangout)).toBe(120);
  });

  it('shows segment rows in timeline for segment-only friends', () => {
    const timeline = getFriendHangoutTimeline('f2', [segmentOnlyHangout], [friendA, friendSophie]);
    expect(timeline).toHaveLength(2);
    expect(timeline.every((item) => item.kind === 'segment')).toBe(true);
    expect(timeline.map((item) => item.type)).toEqual(['Shopping', 'Food']);
  });

  it('shows full hangout row for main hangout friends', () => {
    const timeline = getFriendHangoutTimeline('f1', [segmentOnlyHangout], [friendA, friendSophie]);
    expect(timeline).toHaveLength(1);
    expect(timeline[0].kind).toBe('hangout');
    expect(timeline[0].durationMinutes).toBe(660);
  });
});

describe('getFriendDetailedStats', () => {
  it('uses segment types for most common type', () => {
    const stats = getFriendDetailedStats('f1', hangouts);
    expect(stats.mostCommonType).toBe('Food');
    expect(stats.favoriteLocation).toBe('Park');
    expect(stats.totalHangouts).toBe(2);
  });
});

describe('sortFriends', () => {
  it('sorts by last seen oldest first', () => {
    const olderHangouts: Hangout[] = [
      {
        ...hangouts[0],
        id: 'h-old',
        endTime: '2026-06-01T18:00',
        startTime: '2026-06-01T16:00',
      },
    ];
    const enriched = [friendA, friendC].map((f) => enrichFriend(f, f.id === 'f1' ? olderHangouts : []));
    const sorted = sortFriends(enriched, 'last_seen_oldest');
    expect(sorted[0].id).toBe('f1');
    expect(sorted[1].id).toBe('f3');
  });
});

describe('getCatchUpFriends', () => {
  it('excludes friends without hangouts by default', () => {
    const result = getCatchUpFriends([friendA, friendC], hangouts, false);
    expect(result).toHaveLength(1);
    expect(result[0].friend.id).toBe('f1');
  });

  it('includes friends without hangouts when toggled', () => {
    const result = getCatchUpFriends([friendA, friendC], hangouts, true);
    expect(result).toHaveLength(2);
  });
});

describe('getFriendActivitySummary', () => {
  it('aggregates hangout totals', () => {
    const summary = getFriendActivitySummary('f1', hangouts);
    expect(summary.totalHangouts).toBe(2);
    expect(summary.totalHours).toBe(2);
  });
});
