import { describe, expect, it } from 'vitest';
import type { AppData } from '../types';
import { defaultAppData } from './storage';
import { buildStatisticsBundle } from './statistics-analytics';
import {
  computeCompareRows,
  mergeBreakdownCompare,
  mergeFriendRankingCompare,
  OVERVIEW_METRICS,
  formatMetricDiff,
  formatMetricValue,
} from './statistics-compare';

describe('statistics-compare', () => {
  const data: AppData = { ...defaultAppData };
  const statsA = buildStatisticsBundle(data, new Date('2026-01-01'), new Date('2026-01-31'));
  const statsB = buildStatisticsBundle(data, new Date('2025-12-01'), new Date('2025-12-31'));

  it('formats metric values', () => {
    expect(formatMetricValue(null, 'count')).toBe('—');
    expect(formatMetricValue(7, 'count')).toBe('7');
    expect(formatMetricDiff(50, 'duration')).toMatch(/^\+/);
  });

  it('computes compare rows with direction', () => {
    const rows = computeCompareRows(OVERVIEW_METRICS.slice(0, 2), statsA, statsB);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      formattedA: expect.any(String),
      formattedB: expect.any(String),
      direction: expect.stringMatching(/up|down|flat|na/),
    });
  });

  it('merges breakdown compare rows', () => {
    const rows = mergeBreakdownCompare(
      'test',
      [{ label: 'Food', value: 5 }],
      [{ label: 'Food', value: 3 }, { label: 'Sports', value: 2 }]
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const food = rows.find((r) => r.label === 'Food');
    expect(food?.formattedDiff).toBe('+2');
  });

  it('merges friend ranking compare', () => {
    const rows = mergeFriendRankingCompare(statsA, statsB, 5);
    expect(Array.isArray(rows)).toBe(true);
    rows.forEach((row) => {
      expect(row).not.toHaveProperty('sortKey');
    });
  });
});
