import { describe, expect, it } from 'vitest';
import { format, parseISO } from 'date-fns';
import type { SleepEntry } from '../types';
import {
  calcScheduleConsistencyScore,
  formatDebtCalendarShort,
  getSleepInsights,
  normalizeBedtimeMinutes,
} from './sleep-insights';

const goalSettings = {
  sleepGoalHours: 8,
  targetWakeUpTime: '08:00',
  targetBedtime: '00:00',
};

function entry(wakeDate: string, bedHour: number, wakeHour: number): SleepEntry {
  const wakeD = parseISO(`${wakeDate}T12:00`);
  const bedD = new Date(wakeD);
  bedD.setHours(bedHour, 0, 0, 0);
  if (bedHour >= wakeHour) bedD.setDate(bedD.getDate() - 1);
  const wakeTime = new Date(wakeD);
  wakeTime.setHours(wakeHour, 0, 0, 0);
  const wakeIso = format(wakeTime, "yyyy-MM-dd'T'HH:mm");
  return {
    id: `${wakeDate}-${bedHour}`,
    sleepStart: format(bedD, "yyyy-MM-dd'T'HH:mm"),
    wakeUp: wakeIso,
    notes: '',
    createdAt: wakeIso,
  };
}

describe('normalizeBedtimeMinutes', () => {
  it('shifts after-midnight bedtimes into evening cluster', () => {
    expect(normalizeBedtimeMinutes(60)).toBe(60 + 24 * 60);
    expect(normalizeBedtimeMinutes(23 * 60)).toBe(23 * 60);
  });
});

describe('calcScheduleConsistencyScore', () => {
  it('returns 100 for a single entry', () => {
    expect(calcScheduleConsistencyScore([entry('2026-06-01', 23, 7)])).toBe(100);
  });

  it('returns higher score for consistent schedules', () => {
    const consistent = [
      entry('2026-06-01', 23, 7),
      entry('2026-06-02', 23, 7),
      entry('2026-06-03', 23, 7),
    ];
    const varied = [
      entry('2026-06-01', 21, 6),
      entry('2026-06-02', 1, 10),
      entry('2026-06-03', 23, 8),
    ];
    expect(calcScheduleConsistencyScore(consistent)).toBeGreaterThan(
      calcScheduleConsistencyScore(varied)
    );
  });
});

describe('getSleepInsights', () => {
  const entries: SleepEntry[] = [
    entry('2026-06-28', 23, 7),
    entry('2026-06-29', 23, 7),
    entry('2026-06-30', 22, 6),
  ];

  it('computes goal and wake streaks', () => {
    const insights = getSleepInsights(entries, goalSettings);
    expect(insights.goalStreaks.current).toBeGreaterThan(0);
    expect(insights.wakeStreaks.current).toBeGreaterThan(0);
  });

  it('builds circadian and debt calendar data', () => {
    const insights = getSleepInsights(entries, goalSettings);
    expect(insights.circadian).toHaveLength(3);
    expect(insights.debtCalendarDays).toHaveLength(3);
    expect(insights.bestDays.longestSleep).not.toBeNull();
  });

  it('respects date range filter', () => {
    const start = new Date('2026-06-29T00:00:00');
    const end = new Date('2026-06-30T23:59:59');
    const insights = getSleepInsights(entries, goalSettings, start, end);
    expect(insights.circadian).toHaveLength(2);
  });
});

describe('formatDebtCalendarShort', () => {
  it('formats debt and surplus labels', () => {
    expect(formatDebtCalendarShort(0)).toBe('Met goal');
    expect(formatDebtCalendarShort(120)).toBe('2h debt');
    expect(formatDebtCalendarShort(-60)).toBe('1h over');
  });
});
