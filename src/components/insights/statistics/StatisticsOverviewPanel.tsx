import type { StatisticsBundle } from '../../../lib/statistics-analytics';
import { OVERVIEW_METRICS } from '../../../lib/statistics-compare';
import { AdaptiveMetrics, type StatisticsCompareProps } from './CompareStatGrid';

export function StatisticsOverviewPanel({
  stats,
  compare,
}: {
  stats: StatisticsBundle;
  compare?: StatisticsCompareProps | null;
}) {
  return <AdaptiveMetrics metrics={OVERVIEW_METRICS} stats={stats} compare={compare ?? null} />;
}
