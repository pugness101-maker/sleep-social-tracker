import { formatDuration } from '../../../lib/dates';
import type { StatisticsBundle } from '../../../lib/statistics-analytics';
import { COMBINED_METRICS, mergeBreakdownCompare } from '../../../lib/statistics-compare';
import { AdaptiveMetrics, CompareBreakdownTable, type StatisticsCompareProps } from './CompareStatGrid';
import { BarChart, HorizontalBarList } from './SimpleCharts';
import { Card } from '../../ui/Card';

export function StatisticsCombinedPanel({
  stats,
  compare,
}: {
  stats: StatisticsBundle;
  compare?: StatisticsCompareProps | null;
}) {
  const c = stats.combined;
  const inCompare = Boolean(compare);

  return (
    <div className="space-y-4">
      <AdaptiveMetrics metrics={COMBINED_METRICS} stats={stats} compare={compare ?? null} columns={2} />

      {inCompare && compare ? (
        <div className="grid lg:grid-cols-2 gap-3">
          <CompareBreakdownTable
            title="Sleep by Hangout Category"
            rows={mergeBreakdownCompare(
              'sleepCat',
              compare.statsA.combined.sleepByCategory.map((x) => ({ label: x.label, value: x.value })),
              compare.statsB.combined.sleepByCategory.map((x) => ({ label: x.label, value: x.value }))
            )}
            labelA={compare.labelA}
            labelB={compare.labelB}
          />
          <CompareBreakdownTable
            title="Sleep by Friend"
            rows={mergeBreakdownCompare(
              'sleepFriend',
              compare.statsA.combined.sleepByFriend.map((x) => ({ label: x.label, value: x.value })),
              compare.statsB.combined.sleepByFriend.map((x) => ({ label: x.label, value: x.value }))
            )}
            labelA={compare.labelA}
            labelB={compare.labelB}
          />
          <CompareBreakdownTable
            title="Sleep by Weekday"
            rows={mergeBreakdownCompare(
              'sleepWd',
              compare.statsA.combined.sleepByWeekday.map((x) => ({ label: x.label, value: x.value })),
              compare.statsB.combined.sleepByWeekday.map((x) => ({ label: x.label, value: x.value }))
            )}
            labelA={compare.labelA}
            labelB={compare.labelB}
          />
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-3">
            <HorizontalBarList
              title="Sleep by Hangout Category"
              data={c.sleepByCategory.map((x) => ({ label: x.label, value: x.value }))}
              formatValue={(v) => formatDuration(v)}
              emptyMessage="No sleep nights following hangouts in range."
            />
            <HorizontalBarList
              title="Sleep by Friend"
              data={c.sleepByFriend.slice(0, 8).map((x) => ({ label: x.label, value: x.value }))}
              formatValue={(v) => formatDuration(v)}
              emptyMessage="No sleep nights following friend hangouts in range."
            />
          </div>

          <HorizontalBarList
            title="Sleep by Weekday"
            data={c.sleepByWeekday.map((x) => ({ label: x.label, value: x.value }))}
            formatValue={(v) => formatDuration(v)}
          />

          <Card>
            <h4 className="font-medium mb-3 text-sm text-left" style={{ color: 'var(--text-heading)' }}>
              Sleep Consistency vs Social Activity
            </h4>
            {c.consistencyWithSocial.length === 0 ? (
              <p className="text-sm opacity-70 text-left">Need more sleep data to show correlation.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="opacity-60 border-b" style={{ borderColor: 'var(--border)' }}>
                      <th className="py-2 pr-4">Month</th>
                      <th className="py-2 pr-4">Consistency</th>
                      <th className="py-2">Hangouts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.consistencyWithSocial.map((row) => (
                      <tr key={row.label} className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <td className="py-2 pr-4">{row.label}</td>
                        <td className="py-2 pr-4">{row.consistency}%</td>
                        <td className="py-2">{row.hangouts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <BarChart
            title="Correlation: Hangouts vs Consistency"
            data={c.consistencyWithSocial.map((r) => ({ label: r.label, value: r.consistency }))}
            valueSuffix="%"
            colorClass="bg-primary/50"
          />
        </>
      )}
    </div>
  );
}
