import { describe, expect, it } from 'vitest';
import { parseISO } from 'date-fns';
import type { SleepEntry } from '../types';
import {
  build7DaySleepTrend,
  buildMonthlySleepTrend,
  buildScheduleTrend,
  toScheduleChartMinutes,
} from './sleep-charts';

function entry(wakeDate: string, bedHour: number, wakeHour: number, durationHours?: number): SleepEntry {
  const wakeD = parseISO(`${wakeDate}T12:00`);
  const bedD = new Date(wakeD);
  bedD.setHours(bedHour, 0, 0, 0);
  if (bedHour >= wakeHour) bedD.setDate(bedD.getDate() - 1);
  const wakeTime = new Date(wakeD);
  wakeTime.setHours(wakeHour, 0, 0, 0);
  if (durationHours != null) {
    bedD.setTime(wakeTime.getTime() - durationHours * 60 * 60 * 1000);
  }
  return {
    id: wakeDate,
    sleepStart: bedD.toISOString().slice(0, 16),
    wakeUp: wakeTime.toISOString().slice(0, 16),
    notes: '',
    createdAt: wakeTime.toISOString().slice(0, 16),
  };
}

describe('sleep-charts', () => {
  it('build7DaySleepTrend returns chronological labels with full dates', () => {
    const entries = [
      entry('2026-06-25', 23, 7),
      entry('2026-06-27', 22, 6),
    ];
    const trend = build7DaySleepTrend(entries, 8 * 60, parseISO('2026-06-27T23:59:59'), 7);
    expect(trend).toHaveLength(7);
    expect(trend[0].label).toBe('Jun 21');
    expect(trend[trend.length - 1].label).toBe('Jun 27');
    const jun25 = trend.find((d) => d.dateKey === '2026-06-25');
    expect(jun25?.hasData).toBe(true);
    expect(jun25?.hours).toBeGreaterThan(7);
    expect(trend.find((d) => d.dateKey === '2026-06-26')?.hasData).toBe(false);
  });

  it('buildMonthlySleepTrend averages hours per month', () => {
    const entries = [
      entry('2026-06-10', 23, 7),
      entry('2026-06-20', 23, 7),
    ];
    const trend = buildMonthlySleepTrend(
      entries,
      6,
      parseISO('2026-06-01'),
      parseISO('2026-06-30T23:59:59')
    );
    expect(trend.length).toBeGreaterThan(0);
    expect(trend[0].count).toBe(2);
    expect(trend[0].avgHours).toBeGreaterThan(7);
  });

  it('toScheduleChartMinutes handles after-midnight bedtimes', () => {
    expect(toScheduleChartMinutes(60)).toBe(60 + 24 * 60);
    expect(toScheduleChartMinutes(7 * 60)).toBe(7 * 60 + 24 * 60);
    expect(toScheduleChartMinutes(23 * 60)).toBe(23 * 60);
  });

  it('buildScheduleTrend uses wake-up date labels', () => {
    const points = buildScheduleTrend([entry('2026-06-25', 1, 11)], 8 * 60);
    expect(points).toHaveLength(1);
    expect(points[0].label).toBe('Jun 25');
    expect(points[0].durationMinutes).toBeGreaterThan(0);
    expect(points[0].bedtimeMinutes).toBeGreaterThan(12 * 60);
  });
});
