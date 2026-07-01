import { formatDuration } from '../../../lib/dates';
import type { StatisticsBundle } from '../../../lib/statistics-analytics';
import { COMBINED_METRICS } from '../../../lib/statistics-compare';
import { AdaptiveMetrics, type StatisticsCompareProps } from './CompareStatGrid';
import { HorizontalBarList } from './SimpleCharts';

export function StatisticsCombinedPanel({
  stats,
  compare,
}: {
  stats: StatisticsBundle;
  compare?: StatisticsCompareProps | null;
}) {
  const c = stats.combined;

  return (
    <div className="space-y-4">
      <AdaptiveMetrics metrics={COMBINED_METRICS} stats={stats} compare={compare ?? null} columns={2} />

      {!compare && (
        <div className="grid lg:grid-cols-2 gap-3">
          <HorizontalBarList
            title="Sleep by Hangout Occasion"
            data={c.sleepByOccasion}
            formatValue={(v) => formatDuration(v)}
            emptyMessage="No sleep nights following hangouts in this range."
          />
          <HorizontalBarList
            title="Sleep by Hangout Category"
            data={c.sleepByCategory}
            formatValue={(v) => formatDuration(v)}
            emptyMessage="No sleep nights following hangouts in this range."
          />
        </div>
      )}
    </div>
  );
}
