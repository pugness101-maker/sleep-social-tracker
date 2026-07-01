import { formatDuration } from '../../../lib/dates';
import type { StatisticsBundle } from '../../../lib/statistics-analytics';
import { StatGrid } from './StatGrid';

export function StatisticsOverviewPanel({ stats }: { stats: StatisticsBundle }) {
  const o = stats.overview;
  return (
    <StatGrid
      items={[
        { label: 'Total Sleep', value: formatDuration(o.totalSleepMinutes), accent: 'sleep' },
        { label: 'Total Hangouts', value: String(o.totalHangouts), accent: 'social' },
        { label: 'Total Friends', value: String(o.totalFriends), accent: 'social' },
        { label: 'Total Awake Time', value: formatDuration(o.totalAwakeMinutes), accent: 'awake' },
        { label: 'Sleep Goal %', value: `${o.sleepGoalPercent.toFixed(0)}%`, accent: 'sleep' },
        { label: 'Sleep Consistency', value: `${o.sleepConsistency.toFixed(0)}%`, accent: 'sleep' },
        { label: 'Total Hangout Hours', value: `${o.totalHangoutHours.toFixed(1)}h`, accent: 'social' },
        { label: 'Average Hangout Length', value: formatDuration(o.avgHangoutMinutes), accent: 'social' },
      ]}
    />
  );
}
