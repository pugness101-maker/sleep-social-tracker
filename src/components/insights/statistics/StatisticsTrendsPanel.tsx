import type { StatisticsBundle } from '../../../lib/statistics-analytics';
import { BarChart } from './SimpleCharts';
import { Card } from '../../ui/Card';

export function StatisticsTrendsPanel({ stats }: { stats: StatisticsBundle }) {
  const t = stats.trends;
  const categoryKeys = Object.keys(t.categoryTrend);

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-3">
        <BarChart title="Monthly Sleep Trend" data={t.monthlySleep} valueSuffix="h" colorClass="bg-sleep/60" />
        <BarChart title="Monthly Hangout Trend" data={t.monthlyHangouts} colorClass="bg-social/60" />
      </div>
      <div className="grid lg:grid-cols-2 gap-3">
        <BarChart title="Friend Growth" data={t.friendGrowth} colorClass="bg-social/60" />
        <BarChart title="Hangout Frequency" data={t.hangoutFrequency} colorClass="bg-social/60" />
      </div>
      <div className="grid lg:grid-cols-2 gap-3">
        <BarChart title="Sleep Consistency Trend" data={t.consistencyTrend} valueSuffix="%" colorClass="bg-sleep/60" />
        <BarChart title="Sleep Debt Trend" data={t.debtTrend} colorClass="bg-sleep/60" />
      </div>
      <BarChart title="Time With Friends Trend" data={t.timeWithFriends} valueSuffix="h" colorClass="bg-social/60" />

      {categoryKeys.length > 0 && (
        <Card>
          <h4 className="font-medium mb-3 text-sm text-left" style={{ color: 'var(--text-heading)' }}>
            Activity Category Trend
          </h4>
          <div className="grid lg:grid-cols-2 gap-3">
            {categoryKeys.map((cat) => (
              <BarChart key={cat} title={cat} data={t.categoryTrend[cat]} colorClass="bg-social/50" />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
