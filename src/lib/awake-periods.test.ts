import { describe, expect, it } from 'vitest';
import type { AppData } from '../types';
import { defaultAppData } from './storage';
import { getAwakePeriods, getLatestCompletedWakeUp } from './stats';

describe('getAwakePeriods', () => {
  it('returns gaps between consecutive sleep sessions', () => {
    const data: AppData = {
      ...defaultAppData,
      sleepEntries: [
        {
          id: 's1',
          sleepStart: '2026-06-01T23:00',
          wakeUp: '2026-06-02T07:00',
          notes: '',
          createdAt: '2026-06-02T07:00',
        },
        {
          id: 's2',
          sleepStart: '2026-06-02T23:30',
          wakeUp: '2026-06-03T06:30',
          notes: '',
          createdAt: '2026-06-03T06:30',
        },
      ],
      activeTimers: { sleepStart: null, napStart: null },
    };
    const periods = getAwakePeriods(data, new Date('2026-06-03T12:00').getTime());
    const gap = periods.find((p) => p.start === '2026-06-02T07:00');
    expect(gap?.end).toBe('2026-06-02T23:30');
    expect(gap?.isCurrent).toBe(false);
    const current = periods.find((p) => p.isCurrent);
    expect(current?.start).toBe('2026-06-03T06:30');
  });

  it('includes pre-sleep gap when sleep timer is active', () => {
    const data: AppData = {
      ...defaultAppData,
      sleepEntries: [
        {
          id: 's1',
          sleepStart: '2026-06-01T23:00',
          wakeUp: '2026-06-02T07:00',
          notes: '',
          createdAt: '2026-06-02T07:00',
        },
      ],
      activeTimers: { sleepStart: '2026-06-02T23:00', napStart: null },
    };
    const periods = getAwakePeriods(data);
    expect(periods.some((p) => p.start === '2026-06-02T07:00' && p.end === '2026-06-02T23:00')).toBe(true);
    expect(periods.some((p) => p.isCurrent)).toBe(false);
  });

  it('getLatestCompletedWakeUp returns most recent wake', () => {
    const data: AppData = {
      ...defaultAppData,
      sleepEntries: [
        { id: 's1', sleepStart: '2026-06-01T23:00', wakeUp: '2026-06-02T07:00', notes: '', createdAt: '' },
        { id: 's2', sleepStart: '2026-06-02T23:00', wakeUp: '2026-06-03T08:00', notes: '', createdAt: '' },
      ],
      activeTimers: { sleepStart: '2026-06-03T23:00', napStart: null },
    };
    expect(getLatestCompletedWakeUp(data)).toBe('2026-06-03T08:00');
  });
});
