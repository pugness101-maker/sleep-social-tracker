import type { AppData } from '../../../types';
import type { StatisticsBundle } from '../../../lib/statistics-analytics';
import {
  SLEEP_CHART_METRICS,
  SLEEP_DEBT_METRICS,
  SLEEP_NAP_METRICS,
  SLEEP_OVERVIEW_METRICS,
  SLEEP_SCHEDULE_METRICS,
} from '../../../lib/statistics-compare';
import { SleepInsightsSection } from '../SleepInsightsSection';
import { StatisticsCollapsibleSection } from './StatisticsCollapsibleSection';
import { AdaptiveMetrics, CompareStatGrid, type StatisticsCompareProps } from './CompareStatGrid';
import { BarChart } from './SimpleCharts';
import type { useStatisticsAccordion } from '../../../hooks/useStatisticsAccordion';

type Accordion = ReturnType<typeof useStatisticsAccordion>;

interface Props {
  stats: StatisticsBundle;
  data: AppData;
  rangeStart?: Date;
  rangeEnd?: Date;
  rangeLabel?: string;
  accordion: Accordion;
  compare?: StatisticsCompareProps | null;
}

export function StatisticsSleepPanel({
  stats,
  data,
  rangeStart,
  rangeEnd,
  rangeLabel,
  accordion,
  compare,
}: Props) {
  const s = stats.sleep;
  const inCompare = Boolean(compare);

  return (
    <div className="space-y-3">
      <StatisticsCollapsibleSection
        title="Overview"
        summary="Totals, averages, goal progress, and consistency"
        open={accordion.isSleepOpen('overview')}
        onToggle={() => accordion.toggleSleep('overview')}
        nested
      >
        <AdaptiveMetrics metrics={SLEEP_OVERVIEW_METRICS} stats={stats} compare={compare ?? null} />
      </StatisticsCollapsibleSection>

      <StatisticsCollapsibleSection
        title="Schedule"
        summary="Average and weekday/weekend bedtime and wake times"
        open={accordion.isSleepOpen('schedule')}
        onToggle={() => accordion.toggleSleep('schedule')}
        nested
      >
        <AdaptiveMetrics metrics={SLEEP_SCHEDULE_METRICS} stats={stats} compare={compare ?? null} columns={3} />
      </StatisticsCollapsibleSection>

      <StatisticsCollapsibleSection
        title="Sleep Debt"
        summary="Daily, weekly, monthly, and lifetime debt"
        open={accordion.isSleepOpen('debt')}
        onToggle={() => accordion.toggleSleep('debt')}
        nested
      >
        <AdaptiveMetrics metrics={SLEEP_DEBT_METRICS} stats={stats} compare={compare ?? null} columns={2} />
        {!inCompare && (
          <SleepInsightsSection
            data={data}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            sectionsToShow={['debtCalendar']}
          />
        )}
      </StatisticsCollapsibleSection>

      <StatisticsCollapsibleSection
        title="Naps"
        summary="Count, total time, and average nap length"
        open={accordion.isSleepOpen('naps')}
        onToggle={() => accordion.toggleSleep('naps')}
        nested
      >
        <AdaptiveMetrics metrics={SLEEP_NAP_METRICS} stats={stats} compare={compare ?? null} columns={3} />
      </StatisticsCollapsibleSection>

      <StatisticsCollapsibleSection
        title="Charts"
        summary="Trends, heatmap, circadian rhythm, and consistency graphs"
        open={accordion.isSleepOpen('charts')}
        onToggle={() => accordion.toggleSleep('charts')}
        nested
      >
        {inCompare && compare ? (
          <CompareStatGrid
            metrics={SLEEP_CHART_METRICS}
            statsA={compare.statsA}
            statsB={compare.statsB}
            labelA={compare.labelA}
            labelB={compare.labelB}
          />
        ) : (
          <>
            <div className="grid lg:grid-cols-2 gap-3">
              <BarChart title="7 Day Sleep Trend" data={s.dailyTrend7} valueSuffix=" min" />
              <BarChart title="Monthly Sleep Trend" data={s.monthlySleepTrend} valueSuffix=" min" />
            </div>
            <SleepInsightsSection
              data={data}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              rangeLabel={rangeLabel}
              sectionsToShow={['consistency', 'circadian', 'heatmap', 'weekdayTrends']}
            />
          </>
        )}
      </StatisticsCollapsibleSection>
    </div>
  );
}
