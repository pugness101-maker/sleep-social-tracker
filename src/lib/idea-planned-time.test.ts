import { describe, expect, it } from 'vitest';
import {
  calcPlannedDurationMinutes,
  compareIdeasByPlannedDate,
  formatPlannedDateLabel,
  formatPlannedTimeRange,
  matchesIdeaScheduleFilter,
  plannedTimesToHangoutRange,
} from './idea-planned-time';
import type { HangoutIdea } from '../types';

const baseIdea: HangoutIdea = {
  id: '1',
  title: 'Test',
  category: 'Social',
  type: 'Chill',
  estimatedCost: 'Free',
  estimatedDurationMinutes: null,
  location: '',
  status: 'Want to Try',
  friendIds: [],
  notes: '',
  links: [],
  isFavorite: false,
  createdAt: '2026-01-01T10:00',
};

describe('idea-planned-time', () => {
  it('calculates duration within same day', () => {
    expect(calcPlannedDurationMinutes('2026-07-05', '18:00', '21:00')).toBe(180);
  });

  it('assumes end is next day when before start', () => {
    expect(calcPlannedDurationMinutes('2026-07-05', '22:00', '01:00')).toBe(180);
  });

  it('formats planned date and time range', () => {
    const idea = {
      ...baseIdea,
      plannedDate: '2026-07-05',
      plannedStartTime: '18:00',
      plannedEndTime: '21:00',
    };
    expect(formatPlannedDateLabel(idea.plannedDate)).toBe('Jul 5, 2026');
    expect(formatPlannedTimeRange(idea)).toBe('6:00 PM–9:00 PM');
  });

  it('builds hangout range from planned fields', () => {
    const range = plannedTimesToHangoutRange({
      plannedDate: '2026-07-05',
      plannedStartTime: '18:00',
      plannedEndTime: '21:00',
      estimatedDurationMinutes: null,
    });
    expect(range).toEqual({
      startTime: '2026-07-05T18:00',
      endTime: '2026-07-05T21:00',
    });
  });

  it('prefills date-only idea at midday', () => {
    const range = plannedTimesToHangoutRange({
      plannedDate: '2026-07-05',
      estimatedDurationMinutes: 60,
    });
    expect(range?.startTime).toBe('2026-07-05T12:00');
    expect(range?.endTime).toBe('2026-07-05T13:00');
  });

  it('filters scheduled vs unscheduled', () => {
    const scheduled = { ...baseIdea, plannedDate: '2026-07-05' };
    expect(matchesIdeaScheduleFilter(scheduled, 'scheduled')).toBe(true);
    expect(matchesIdeaScheduleFilter(scheduled, 'unscheduled')).toBe(false);
    expect(matchesIdeaScheduleFilter(baseIdea, 'unscheduled')).toBe(true);
  });

  it('sorts by planned date with unscheduled last', () => {
    const a = { ...baseIdea, id: 'a', plannedDate: '2026-07-10' };
    const b = { ...baseIdea, id: 'b', plannedDate: '2026-07-05' };
    const c = { ...baseIdea, id: 'c' };
    expect(compareIdeasByPlannedDate(a, b)).toBeGreaterThan(0);
    expect(compareIdeasByPlannedDate(b, c)).toBeLessThan(0);
  });
});
