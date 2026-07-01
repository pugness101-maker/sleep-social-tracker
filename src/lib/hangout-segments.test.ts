import { describe, expect, it } from 'vitest';
import type { Hangout, HangoutSegment } from '../types';
import {
  aggregateActivityCountByType,
  aggregateActivityTimeByType,
  formatSegmentLabel,
  formatSegmentSummary,
  getActivityCountByType,
  getActivityTimeByType,
  getHangoutDisplayType,
  getSegmentEffectiveDurationMinutes,
  normalizeHangoutSegments,
  parseDurationInput,
} from './hangout-segments';
import { MIXED_HANGOUT_CATEGORY } from './hangout-categories';

function segment(partial: Partial<HangoutSegment> & Pick<HangoutSegment, 'type'>): HangoutSegment {
  return {
    id: '1',
    category: 'Social',
    friendIds: [],
    startTime: '',
    endTime: '',
    durationMinutes: null,
    location: '',
    notes: '',
    ...partial,
  };
}

function hangout(overrides: Partial<Hangout> = {}): Hangout {
  return {
    id: 'h1',
    friendIds: [],
    startTime: '2026-01-01T16:45',
    endTime: '2026-01-01T21:45',
    location: '',
    category: 'Social',
    type: 'Chill',
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
      getSegmentEffectiveDurationMinutes(
        segment({
          type: 'Chill',
          startTime: '2026-01-01T16:45',
          endTime: '2026-01-01T18:00',
          durationMinutes: 30,
        })
      )
    ).toBe(75);
  });

  it('uses manual duration when times are empty', () => {
    expect(
      getSegmentEffectiveDurationMinutes(
        segment({ type: 'Food', durationMinutes: 45 })
      )
    ).toBe(45);
  });

  it('returns 0 for label-only segments', () => {
    expect(
      getSegmentEffectiveDurationMinutes(segment({ type: 'Movie' }))
    ).toBe(0);
  });
});

describe('normalizeHangoutSegments', () => {
  it('copies main hangout friends when segment friendIds is missing', () => {
    const result = normalizeHangoutSegments(
      [{ id: 's1', type: 'Chill', startTime: '', endTime: '', durationMinutes: null, location: '', notes: '' } as HangoutSegment],
      ['f1', 'f2']
    );
    expect(result[0].friendIds).toEqual(['f1', 'f2']);
  });

  it('preserves explicit segment friendIds', () => {
    const result = normalizeHangoutSegments(
      [segment({ id: 's1', type: 'Food', friendIds: ['f3'] })],
      ['f1']
    );
    expect(result[0].friendIds).toEqual(['f3']);
  });
});

describe('Mixed category hangouts', () => {
  it('displays Mixed in cards regardless of segments', () => {
    expect(
      getHangoutDisplayType(
        hangout({
          category: MIXED_HANGOUT_CATEGORY,
          type: 'Mixed',
          segments: [segment({ id: '1', type: 'Food', category: 'Food' })],
        })
      )
    ).toBe('Mixed');
  });

  it('uses segment types for stats when segments exist', () => {
    const mixed = hangout({
      category: MIXED_HANGOUT_CATEGORY,
      type: 'Mixed',
      segments: [
        segment({ id: '1', type: 'Food', category: 'Food', durationMinutes: 60 }),
        segment({ id: '2', type: 'Movie', category: 'Entertainment', durationMinutes: 90 }),
      ],
    });
    expect(getActivityTimeByType(mixed)).toEqual({ Food: 60, Movie: 90 });
    expect(getActivityCountByType(mixed)).toEqual({ Food: 1, Movie: 1 });
  });

  it('counts as Mixed only when no segments', () => {
    const mixed = hangout({ category: MIXED_HANGOUT_CATEGORY, type: 'Mixed', segments: [] });
    expect(getActivityTimeByType(mixed)).toEqual({ Mixed: 300 });
    expect(getActivityCountByType(mixed)).toEqual({ Mixed: 1 });
  });
});

describe('activity stats', () => {
  const segmented = hangout({
    category: MIXED_HANGOUT_CATEGORY,
    type: 'Mixed',
    segments: [
      segment({ id: '1', type: 'Chill' }),
      segment({ id: '2', type: 'Food', durationMinutes: 45 }),
      segment({ id: '3', type: 'Movie', durationMinutes: 120 }),
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
          segment({ id: '1', type: 'Chill' }),
          segment({ id: '2', type: 'Food', durationMinutes: 60 }),
          segment({ id: '3', type: 'Movie', durationMinutes: 120 }),
        ],
      })
    );
    expect(summary).toBe('Chill · Food, 1h · Movie, 2h');
  });

  it('formats timed segments with friend names', () => {
    expect(
      formatSegmentLabel(
        segment({
          type: 'Food',
          friendIds: ['a', 'b'],
          startTime: '2026-01-01T16:00',
          endTime: '2026-01-01T17:00',
        }),
        [],
        (id) => (id === 'a' ? 'JuJu' : 'Sophie')
      )
    ).toBe('Food — JuJu + Sophie — 4:00 PM–5:00 PM');
  });

  it('formats timed segments without name lookup', () => {
    expect(
      formatSegmentLabel(
        segment({
          type: 'Chill',
          startTime: '2026-01-01T16:45',
          endTime: '2026-01-01T18:00',
        })
      )
    ).toBe('Chill — 4:45 PM–6:00 PM');
  });
});

describe('aggregateActivityCountByType', () => {
  it('aggregates across hangouts', () => {
    const result = aggregateActivityCountByType([
      hangout({ segments: [segment({ id: '1', type: 'Chill' })] }),
      hangout({ segments: [segment({ id: '2', type: 'Chill', durationMinutes: 60 })] }),
    ]);
    expect(result).toEqual({ Chill: 2 });
  });
});

describe('aggregateActivityTimeByType', () => {
  it('aggregates timed and manual durations only', () => {
    const result = aggregateActivityTimeByType([
      hangout({
        segments: [
          segment({ id: '1', type: 'Chill' }),
          segment({ id: '2', type: 'Food', durationMinutes: 45 }),
        ],
      }),
    ]);
    expect(result).toEqual({ Food: 45 });
  });
});
