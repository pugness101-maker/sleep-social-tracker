import { avgMinutesToTime, formatDuration } from '../../../lib/dates';
import { formatSleepDebt } from '../../../lib/sleep-goals';
import type { AppData } from '../../../types';
import type { StatisticsBundle } from '../../../lib/statistics-analytics';
import { SleepInsightsSection } from '../SleepInsightsSection';
import { StatisticsCollapsibleSection } from './StatisticsCollapsibleSection';
import { StatGrid } from './StatGrid';
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
}

export function StatisticsSleepPanel({ stats, data, rangeStart, rangeEnd, rangeLabel, accordion }: Props) {
  const s = stats.sleep;

  return (
    <div className="space-y-3">
      <StatisticsCollapsibleSection
        title="Overview"
        summary="Totals, averages, goal progress, and consistency"
        open={accordion.isSleepOpen('overview')}
        onToggle={() => accordion.toggleSleep('overview')}
        nested
      >
        <StatGrid
          items={[
            { label: 'Total Sleep', value: formatDuration(s.total), accent: 'sleep' },
            { label: 'Average Sleep', value: formatDuration(s.avg), accent: 'sleep' },
            { label: 'Longest Sleep', value: formatDuration(s.longest), accent: 'sleep' },
            { label: 'Shortest Sleep', value: formatDuration(s.shortest), accent: 'sleep' },
            { label: 'Sleep Goal %', value: `${s.goalProgress.toFixed(0)}%`, accent: 'sleep' },
            { label: 'Sleep Consistency', value: `${s.consistency.toFixed(0)}%`, accent: 'sleep' },
          ]}
        />
      </StatisticsCollapsibleSection>

      <StatisticsCollapsibleSection
        title="Schedule"
        summary="Average and weekday/weekend bedtime and wake times"
        open={accordion.isSleepOpen('schedule')}
        onToggle={() => accordion.toggleSleep('schedule')}
        nested
      >
        <StatGrid
          columns={3}
          items={[
            { label: 'Average Bedtime', value: s.avgBedtime ? avgMinutesToTime(s.avgBedtime) : '—', accent: 'sleep' },
            { label: 'Average Wake Time', value: s.avgWake ? avgMinutesToTime(s.avgWake) : '—', accent: 'sleep' },
            { label: 'Weekday Bedtime', value: s.weekdayBedtime != null ? avgMinutesToTime(s.weekdayBedtime) : '—', accent: 'sleep' },
            { label: 'Weekend Bedtime', value: s.weekendBedtime != null ? avgMinutesToTime(s.weekendBedtime) : '—', accent: 'sleep' },
            { label: 'Weekday Wake Time', value: s.weekdayWake != null ? avgMinutesToTime(s.weekdayWake) : '—', accent: 'sleep' },
            { label: 'Weekend Wake Time', value: s.weekendWake != null ? avgMinutesToTime(s.weekendWake) : '—', accent: 'sleep' },
          ]}
        />
      </StatisticsCollapsibleSection>

      <StatisticsCollapsibleSection
        title="Sleep Debt"
        summary="Daily, weekly, monthly, and lifetime debt"
        open={accordion.isSleepOpen('debt')}
        onToggle={() => accordion.toggleSleep('debt')}
        nested
      >
        <StatGrid
          columns={2}
          items={[
            { label: 'Daily', value: s.debtDaily != null ? formatSleepDebt(s.debtDaily) : '—', accent: 'sleep' },
            { label: 'Weekly', value: formatSleepDebt(s.debtWeekly), accent: 'sleep' },
            { label: 'Monthly', value: formatSleepDebt(s.debtMonthly), accent: 'sleep' },
            { label: 'Lifetime', value: formatSleepDebt(s.debtLifetime), accent: 'sleep' },
          ]}
        />
        <SleepInsightsSection
          data={data}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          sectionsToShow={['debtCalendar']}
        />
      </StatisticsCollapsibleSection>

      <StatisticsCollapsibleSection
        title="Naps"
        summary="Count, total time, and average nap length"
        open={accordion.isSleepOpen('naps')}
        onToggle={() => accordion.toggleSleep('naps')}
        nested
      >
        <StatGrid
          columns={3}
          items={[
            { label: 'Count', value: String(s.naps.totalNaps), accent: 'nap' },
            { label: 'Total Nap Time', value: formatDuration(s.naps.totalTime), accent: 'nap' },
            { label: 'Average Nap Length', value: formatDuration(s.naps.avgDuration), accent: 'nap' },
          ]}
        />
      </StatisticsCollapsibleSection>

      <StatisticsCollapsibleSection
        title="Charts"
        summary="Trends, heatmap, circadian rhythm, and consistency graphs"
        open={accordion.isSleepOpen('charts')}
        onToggle={() => accordion.toggleSleep('charts')}
        nested
      >
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
      </StatisticsCollapsibleSection>
    </div>
  );
}
