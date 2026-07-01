import { describe, expect, it } from 'vitest';
import type { AppSettings } from '../types';
import {
  addMinutes,
  getRecommendedBedtimeMinutes,
  getRecommendedWakeTimeMinutes,
  getSleepSchedule,
  minutesToTimeString,
  normalizeSleepAutoCalcSettings,
  subtractMinutes,
  timeStringToMinutes,
} from './sleep-goals';

function baseSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    theme: 'system',
    awakeWarningHours: 16,
    sleepGoalHours: 8,
    targetWakeUpTime: '08:00',
    targetBedtime: '00:00',
    autoCalculateBedtime: false,
    autoCalculateWakeTime: false,
    notificationsEnabled: false,
    bedtimeReminder: false,
    hangoutReminder: false,
    ...overrides,
  };
}

describe('minute arithmetic', () => {
  it('subtracts 8h from noon to 4:00 AM', () => {
    expect(minutesToTimeString(subtractMinutes(timeStringToMinutes('12:00'), 8 * 60))).toBe('04:00');
  });

  it('subtracts 8h from midnight to 4:00 PM', () => {
    expect(minutesToTimeString(subtractMinutes(timeStringToMinutes('00:00'), 8 * 60))).toBe('16:00');
  });

  it('adds 8h to 11:00 PM crossing midnight to 7:00 AM', () => {
    expect(minutesToTimeString(addMinutes(timeStringToMinutes('23:00'), 8 * 60))).toBe('07:00');
  });
});

describe('getRecommendedBedtimeMinutes', () => {
  it('9h goal with 10:00 AM wake → 1:00 AM bedtime', () => {
    const mins = getRecommendedBedtimeMinutes({
      targetWakeUpTime: '10:00',
      sleepGoalHours: 9,
    });
    expect(minutesToTimeString(mins)).toBe('01:00');
  });

  it('8h goal with noon wake → 4:00 AM bedtime', () => {
    const mins = getRecommendedBedtimeMinutes({
      targetWakeUpTime: '12:00',
      sleepGoalHours: 8,
    });
    expect(minutesToTimeString(mins)).toBe('04:00');
  });

  it('8.5h goal with 10:00 AM wake → 1:30 AM bedtime', () => {
    const mins = getRecommendedBedtimeMinutes({
      targetWakeUpTime: '10:00',
      sleepGoalHours: 8.5,
    });
    expect(minutesToTimeString(mins)).toBe('01:30');
  });

  it('8h goal with midnight wake → 4:00 PM bedtime', () => {
    const mins = getRecommendedBedtimeMinutes({
      targetWakeUpTime: '00:00',
      sleepGoalHours: 8,
    });
    expect(minutesToTimeString(mins)).toBe('16:00');
  });
});

describe('getRecommendedWakeTimeMinutes', () => {
  it('9h goal with 1:00 AM bedtime → 10:00 AM wake', () => {
    const mins = getRecommendedWakeTimeMinutes({
      targetBedtime: '01:00',
      sleepGoalHours: 9,
    });
    expect(minutesToTimeString(mins)).toBe('10:00');
  });

  it('8h goal with 11:00 PM bedtime → 7:00 AM wake', () => {
    const mins = getRecommendedWakeTimeMinutes({
      targetBedtime: '23:00',
      sleepGoalHours: 8,
    });
    expect(minutesToTimeString(mins)).toBe('07:00');
  });

  it('8.5h goal with 1:00 AM bedtime → 9:30 AM wake', () => {
    const mins = getRecommendedWakeTimeMinutes({
      targetBedtime: '01:00',
      sleepGoalHours: 8.5,
    });
    expect(minutesToTimeString(mins)).toBe('09:30');
  });

  it('8h goal with midnight bedtime → 8:00 AM wake', () => {
    const mins = getRecommendedWakeTimeMinutes({
      targetBedtime: '00:00',
      sleepGoalHours: 8,
    });
    expect(minutesToTimeString(mins)).toBe('08:00');
  });
});

describe('getSleepSchedule', () => {
  it('auto-calculate bedtime: wake is source of truth', () => {
    const schedule = getSleepSchedule(
      baseSettings({
        autoCalculateBedtime: true,
        targetWakeUpTime: '10:00',
        targetBedtime: '23:00',
        sleepGoalHours: 9,
      })
    );
    expect(schedule.recommendedBedtime24).toBe('01:00');
    expect(schedule.recommendedWakeTime24).toBe('10:00');
  });

  it('auto-calculate wake time: bedtime is source of truth', () => {
    const schedule = getSleepSchedule(
      baseSettings({
        autoCalculateWakeTime: true,
        targetBedtime: '01:00',
        targetWakeUpTime: '06:00',
        sleepGoalHours: 9,
      })
    );
    expect(schedule.recommendedBedtime24).toBe('01:00');
    expect(schedule.recommendedWakeTime24).toBe('10:00');
  });

  it('both toggles off: uses manual targets', () => {
    const schedule = getSleepSchedule(
      baseSettings({
        targetBedtime: '01:00',
        targetWakeUpTime: '10:00',
        sleepGoalHours: 9,
      })
    );
    expect(schedule.recommendedBedtime24).toBe('01:00');
    expect(schedule.recommendedWakeTime24).toBe('10:00');
  });
});

describe('normalizeSleepAutoCalcSettings', () => {
  it('disables wake auto-calc when both are enabled', () => {
    expect(
      normalizeSleepAutoCalcSettings({ autoCalculateBedtime: true, autoCalculateWakeTime: true })
    ).toEqual({ autoCalculateBedtime: true, autoCalculateWakeTime: false });
  });
});
