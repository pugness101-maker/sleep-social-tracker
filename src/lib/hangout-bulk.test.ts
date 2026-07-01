import { describe, expect, it } from 'vitest';
import { defaultAppData } from './storage';
import {
  bulkArchiveHangouts,
  bulkDeleteHangouts,
  bulkDuplicateHangouts,
  bulkEditHangouts,
  duplicateHangoutToTargetDate,
  filterHangoutsByArchive,
} from './hangout-bulk';

const sampleHangout = {
  id: 'h1',
  friendIds: ['f1'],
  startTime: '2025-06-01T14:00',
  endTime: '2025-06-01T16:00',
  location: 'Park',
  occasion: 'Friends',
  category: 'Social',
  type: 'Chill',
  notes: 'Hello',
  segments: [{ id: 's1', category: 'Food', type: 'Lunch', friendIds: [], startTime: '', endTime: '', durationMinutes: null, location: '', notes: '' }],
  createdAt: '2025-06-01T14:00',
};

describe('hangout-bulk', () => {
  it('bulk edits only checked fields and preserves segments', () => {
    const data = { ...defaultAppData, hangouts: [{ ...sampleHangout }] };
    const next = bulkEditHangouts(data, ['h1'], { occasion: 'Family' });
    expect(next.hangouts[0].occasion).toBe('Family');
    expect(next.hangouts[0].type).toBe('Chill');
    expect(next.hangouts[0].segments).toHaveLength(1);
    expect(next.hangouts[0].segments[0].category).toBe('Food');
  });

  it('shifts start and end together', () => {
    const data = { ...defaultAppData, hangouts: [{ ...sampleHangout }] };
    const next = bulkEditHangouts(data, ['h1'], { timeShiftMinutes: 30 });
    expect(next.hangouts[0].startTime).toBe('2025-06-01T14:30');
    expect(next.hangouts[0].endTime).toBe('2025-06-01T16:30');
  });

  it('adds and removes friends', () => {
    const data = { ...defaultAppData, hangouts: [{ ...sampleHangout, friendIds: ['f1', 'f2'] }] };
    const next = bulkEditHangouts(data, ['h1'], {
      friends: { mode: 'add_remove', add: ['f3'], remove: ['f1'] },
    });
    expect(next.hangouts[0].friendIds).toEqual(['f2', 'f3']);
  });

  it('archives and filters archived hangouts', () => {
    const data = { ...defaultAppData, hangouts: [{ ...sampleHangout }] };
    const archived = bulkArchiveHangouts(data, ['h1'], true);
    expect(archived.hangouts[0].isArchived).toBe(true);
    expect(filterHangoutsByArchive(archived.hangouts, false)).toHaveLength(0);
    expect(filterHangoutsByArchive(archived.hangouts, true)).toHaveLength(1);
  });

  it('deletes selected hangouts', () => {
    const data = { ...defaultAppData, hangouts: [{ ...sampleHangout }, { ...sampleHangout, id: 'h2' }] };
    const next = bulkDeleteHangouts(data, ['h1']);
    expect(next.hangouts).toHaveLength(1);
    expect(next.hangouts[0].id).toBe('h2');
  });

  it('duplicates hangouts preserving duration', () => {
    const data = { ...defaultAppData, hangouts: [{ ...sampleHangout }] };
    const next = bulkDuplicateHangouts(data, ['h1'], { mode: 'custom', date: '2025-07-04' });
    expect(next.hangouts).toHaveLength(2);
    const copy = next.hangouts[1];
    expect(copy.id).not.toBe('h1');
    expect(copy.startTime).toBe('2025-07-04T14:00');
    expect(copy.endTime).toBe('2025-07-04T16:00');
    expect(copy.segments[0].category).toBe('Food');
  });

  it('duplicateHangoutToTargetDate keeps duration', () => {
    const result = duplicateHangoutToTargetDate(
      '2025-01-01T10:00',
      '2025-01-01T12:30',
      { mode: 'custom', date: '2025-02-01' }
    );
    expect(result.startTime).toBe('2025-02-01T10:00');
    expect(result.endTime).toBe('2025-02-01T12:30');
  });
});
