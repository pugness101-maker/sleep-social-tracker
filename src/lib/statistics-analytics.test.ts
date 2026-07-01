import { describe, expect, it } from 'vitest';
import type { AppData } from '../types';
import { defaultAppData } from './storage';
import { buildStatisticsBundle } from './statistics-analytics';

describe('buildStatisticsBundle', () => {
  it('returns overview metrics for empty data', () => {
    const data: AppData = { ...defaultAppData };
    const stats = buildStatisticsBundle(data);
    expect(stats.overview.totalHangouts).toBe(0);
    expect(stats.overview.totalFriends).toBe(0);
    expect(stats.social.friends.active).toBe(0);
  });

  it('respects date range filtering', () => {
    const data: AppData = {
      ...defaultAppData,
      hangouts: [
        {
          id: 'h1',
          friendIds: [],
          startTime: '2026-06-01T18:00',
          endTime: '2026-06-01T20:00',
          location: '',
          category: 'Social',
          type: 'Chill',
          notes: '',
          segments: [],
          createdAt: '2026-06-01T18:00',
        },
      ],
    };
    const inRange = buildStatisticsBundle(
      data,
      new Date('2026-06-01T00:00:00'),
      new Date('2026-06-30T23:59:59')
    );
    const outOfRange = buildStatisticsBundle(
      data,
      new Date('2026-07-01T00:00:00'),
      new Date('2026-07-31T23:59:59')
    );
    expect(inRange.overview.totalHangouts).toBe(1);
    expect(outOfRange.overview.totalHangouts).toBe(0);
  });
});

describe('statistics accordion defaults', () => {
  it('defaults overview open', async () => {
    const { DEFAULT_STATISTICS_ACCORDION } = await import('./statistics-accordion');
    expect(DEFAULT_STATISTICS_ACCORDION.top.overview).toBe(true);
    expect(DEFAULT_STATISTICS_ACCORDION.top.sleep).toBe(false);
  });
});
