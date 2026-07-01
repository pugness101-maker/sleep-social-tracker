import type { StatisticsBundle } from '../../../lib/statistics-analytics';
import { TRENDS_METRICS } from '../../../lib/statistics-compare';
import { CompareStatGrid, type StatisticsCompareProps } from './CompareStatGrid';
import { BarChart, LineTrendChart, TREND_EMPTY, trendHasMeaningfulData } from './SimpleCharts';
import { Card } from '../../ui/Card';

export function StatisticsTrendsPanel({
  stats,
  compare,
}: {
  stats: StatisticsBundle;
  compare?: StatisticsCompareProps | null;
}) {
  const t = stats.trends;
  const categoryKeys = Object.keys(t.categoryTrend).filter((cat) =>
    trendHasMeaningfulData(t.categoryTrend[cat])
  );

  if (compare) {
    return (
      <CompareStatGrid
        metrics={TRENDS_METRICS}
        statsA={compare.statsA}
        statsB={compare.statsB}
        labelA={compare.labelA}
        labelB={compare.labelB}
        columns={2}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-3">
        <LineTrendChart
          title="Monthly Sleep Trend"
          subtitle="Average sleep hours per night"
          data={t.monthlySleep}
          valueSuffix="h"
        />
        <LineTrendChart
          title="Monthly Hangout Trend"
          subtitle="Hangouts per month"
          data={t.monthlyHangouts}
        />
      </div>
      <div className="grid lg:grid-cols-2 gap-3">
        <BarChart
          title="Sleep Debt Trend"
          data={t.debtTrend.filter((d) => d.count && d.count > 0)}
          valueSuffix=" min"
          emptyMessage={TREND_EMPTY}
          minMeaningfulPoints={2}
        />
        <BarChart
          title="Hangout Frequency Trend"
          data={t.hangoutFrequency}
          emptyMessage={TREND_EMPTY}
          minMeaningfulPoints={2}
        />
      </div>

      {categoryKeys.length > 0 ? (
        <Card>
          <h4 className="font-medium mb-3 text-sm text-left" style={{ color: 'var(--text-heading)' }}>
            Category Trend
          </h4>
          <div className="grid lg:grid-cols-2 gap-3">
            {categoryKeys.map((cat) => (
              <BarChart
                key={cat}
                title={cat}
                data={t.categoryTrend[cat].filter((d) => (d.count ?? 0) > 0 || d.value > 0)}
                colorClass="bg-social/50"
                emptyMessage={TREND_EMPTY}
                minMeaningfulPoints={2}
              />
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <h4 className="font-medium mb-2 text-sm text-left" style={{ color: 'var(--text-heading)' }}>
            Category Trend
          </h4>
          <p className="text-sm opacity-70 text-left">{TREND_EMPTY}</p>
        </Card>
      )}
    </div>
  );
}
