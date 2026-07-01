import { describe, expect, it } from 'vitest';
import type { Hangout } from '../types';
import {
  aggregateActivityCountByType,
  aggregateActivityTimeByType,
  formatSegmentLabel,
  formatSegmentSummary,
  getActivityCountByType,
  getActivityTimeByType,
  getSegmentEffectiveDurationMinutes,
  parseDurationInput,
} from './hangout-segments';

function hangout(overrides: Partial<Hangout> = {}): Hangout {
  return {
    id: 'h1',
    friendIds: [],
    startTime: '2026-01-01T16:45',
    endTime: '2026-01-01T21:45',
    location: '',
    type: 'Mixed',
    notes: '',
    segments: [],
    createdAt: '2026-01-01T16:45',
    ...overrides,
  };
}

describe('parseDurationInput', () => {
  it('parses hours and minutes', () => {
    expect(parseDurationInput('1h')).toBe(60);
    expect(parseDurationInput('45m')).toBe(45);
    expect(parseDurationInput('1h 30m')).toBe(90);
    expect(parseDurationInput('2h')).toBe(120);
  });

  it('parses plain minutes', () => {
    expect(parseDurationInput('90')).toBe(90);
  });
});

describe('getSegmentEffectiveDurationMinutes', () => {
  it('uses start/end when both set', () => {
    expect(
      getSegmentEffectiveDurationMinutes({
        id: '1',
        type: 'Chill',
        startTime: '2026-01-01T16:45',
        endTime: '2026-01-01T18:00',
        durationMinutes: 30,
        location: '',
        notes: '',
      })
    ).toBe(75);
  });

  it('uses manual duration when times are empty', () => {
    expect(
      getSegmentEffectiveDurationMinutes({
        id: '1',
        type: 'Food',
        startTime: '',
        endTime: '',
        durationMinutes: 45,
        location: '',
        notes: '',
      })
    ).toBe(45);
  });

  it('returns 0 for label-only segments', () => {
    expect(
      getSegmentEffectiveDurationMinutes({
        id: '1',
        type: 'Movie',
        startTime: '',
        endTime: '',
        durationMinutes: null,
        location: '',
        notes: '',
      })
    ).toBe(0);
  });
});

describe('activity stats', () => {
  const segmented = hangout({
    segments: [
      { id: '1', type: 'Chill', startTime: '', endTime: '', durationMinutes: null, location: '', notes: '' },
      { id: '2', type: 'Food', startTime: '', endTime: '', durationMinutes: 45, location: '', notes: '' },
      { id: '3', type: 'Movie', startTime: '', endTime: '', durationMinutes: 120, location: '', notes: '' },
    ],
  });

  it('counts all segment types including label-only', () => {
    expect(getActivityCountByType(segmented)).toEqual({ Chill: 1, Food: 1, Movie: 1 });
  });

  it('sums only segments with duration for activity time', () => {
    expect(getActivityTimeByType(segmented)).toEqual({ Food: 45, Movie: 120 });
  });

  it('does not fall back to hangout duration when segments exist without times', () => {
    expect(getActivityTimeByType(segmented)).not.toHaveProperty('Mixed');
    expect(getActivityTimeByType(segmented).Chill).toBeUndefined();
  });

  it('uses main hangout type and total duration when no segments', () => {
    expect(getActivityTimeByType(hangout({ type: 'Chill' }))).toEqual({ Chill: 300 });
    expect(getActivityCountByType(hangout({ type: 'Chill' }))).toEqual({ Chill: 1 });
  });
});

describe('formatSegmentSummary', () => {
  it('formats label-only and duration segments', () => {
    const summary = formatSegmentSummary(
      hangout({
        segments: [
          { id: '1', type: 'Chill', startTime: '', endTime: '', durationMinutes: null, location: '', notes: '' },
          { id: '2', type: 'Food', startTime: '', endTime: '', durationMinutes: 60, location: '', notes: '' },
          { id: '3', type: 'Movie', startTime: '', endTime: '', durationMinutes: 120, location: '', notes: '' },
        ],
      })
    );
    expect(summary).toBe('Chill · Food, 1h · Movie, 2h');
  });

  it('formats timed segments', () => {
    expect(
      formatSegmentLabel({
        id: '1',
        type: 'Chill',
        startTime: '2026-01-01T16:45',
        endTime: '2026-01-01T18:00',
        durationMinutes: null,
        location: '',
        notes: '',
      })
    ).toBe('Chill 16:45–18:00');
  });
});

describe('aggregateActivityCountByType', () => {
  it('aggregates across hangouts', () => {
    const result = aggregateActivityCountByType([
      hangout({
        segments: [
          { id: '1', type: 'Chill', startTime: '', endTime: '', durationMinutes: null, location: '', notes: '' },
        ],
      }),
      hangout({
        segments: [
          { id: '2', type: 'Chill', startTime: '', endTime: '', durationMinutes: 60, location: '', notes: '' },
        ],
      }),
    ]);
    expect(result).toEqual({ Chill: 2 });
  });
});

describe('aggregateActivityTimeByType', () => {
  it('aggregates timed and manual durations only', () => {
    const result = aggregateActivityTimeByType([
      hangout({
        segments: [
          { id: '1', type: 'Chill', startTime: '', endTime: '', durationMinutes: null, location: '', notes: '' },
          { id: '2', type: 'Food', startTime: '', endTime: '', durationMinutes: 45, location: '', notes: '' },
        ],
      }),
    ]);
    expect(result).toEqual({ Food: 45 });
  });
});
