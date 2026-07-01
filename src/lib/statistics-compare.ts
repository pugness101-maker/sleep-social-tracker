import { avgMinutesToTime, formatDuration } from './dates';
import { formatSleepDebt } from './sleep-goals';
import type { StatisticsBundle } from './statistics-analytics';

export type MetricFormat = 'duration' | 'percent' | 'count' | 'hours' | 'debt' | 'time';

export type MetricAccent = 'sleep' | 'nap' | 'awake' | 'social' | 'default';

export interface MetricDef {
  id: string;
  label: string;
  accent?: MetricAccent;
  format: MetricFormat;
  getValue: (s: StatisticsBundle) => number | null;
}

export interface CompareRow {
  id: string;
  label: string;
  accent: MetricAccent;
  formattedA: string;
  formattedB: string;
  formattedDiff: string;
  formattedPct: string;
  direction: 'up' | 'down' | 'flat' | 'na';
  higherIsBetter?: boolean;
}

export function formatMetricValue(value: number | null, format: MetricFormat): string {
  if (value == null || Number.isNaN(value)) return '—';
  switch (format) {
    case 'duration':
      return formatDuration(value);
    case 'percent':
      return `${value.toFixed(0)}%`;
    case 'count':
      return String(Math.round(value));
    case 'hours':
      return `${value.toFixed(1)}h`;
    case 'debt':
      return formatSleepDebt(Math.round(value));
    case 'time':
      return avgMinutesToTime(value);
    default:
      return String(value);
  }
}

export function formatMetricDiff(diff: number | null, format: MetricFormat): string {
  if (diff == null || Number.isNaN(diff)) return '—';
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
  const abs = Math.abs(diff);
  switch (format) {
    case 'duration':
    case 'debt':
      return `${sign}${formatDuration(abs)}`;
    case 'percent':
      return `${sign}${abs.toFixed(0)}%`;
    case 'count':
      return `${sign}${Math.round(abs)}`;
    case 'hours':
      return `${sign}${abs.toFixed(1)}h`;
    case 'time': {
      const formatted = avgMinutesToTime(abs);
      return `${sign}${formatted}`;
    }
    default:
      return `${sign}${abs}`;
  }
}

export function computeCompareRows(
  metrics: MetricDef[],
  statsA: StatisticsBundle,
  statsB: StatisticsBundle,
  options?: { higherIsBetter?: (id: string) => boolean }
): CompareRow[] {
  return metrics.map((m) => {
    const valueA = m.getValue(statsA);
    const valueB = m.getValue(statsB);
    const formattedA = formatMetricValue(valueA, m.format);
    const formattedB = formatMetricValue(valueB, m.format);

    if (valueA == null || valueB == null) {
      return {
        id: m.id,
        label: m.label,
        accent: m.accent ?? 'default',
        formattedA,
        formattedB,
        formattedDiff: '—',
        formattedPct: '—',
        direction: 'na' as const,
      };
    }

    const diff = valueA - valueB;
    const formattedDiff = formatMetricDiff(diff, m.format);
    let pctChange: number | null = null;
    if (valueB !== 0) {
      pctChange = (diff / Math.abs(valueB)) * 100;
    } else if (valueA !== 0) {
      pctChange = 100;
    } else {
      pctChange = 0;
    }
    const formattedPct =
      pctChange == null ? '—' : `${pctChange > 0 ? '+' : pctChange < 0 ? '−' : ''}${Math.abs(pctChange).toFixed(0)}%`;

    const higherIsBetter = options?.higherIsBetter?.(m.id) ?? (!m.id.includes('debt') && !m.id.includes('shortest'));
    let direction: CompareRow['direction'] = 'flat';
    if (Math.abs(diff) < 0.01) direction = 'flat';
    else if (diff > 0) direction = higherIsBetter ? 'up' : 'down';
    else direction = higherIsBetter ? 'down' : 'up';

    return {
      id: m.id,
      label: m.label,
      accent: m.accent ?? 'default',
      formattedA,
      formattedB,
      formattedDiff,
      formattedPct,
      direction,
    };
  });
}

export function sumTrendValues(values: { value: number }[]): number {
  return values.reduce((s, v) => s + v.value, 0);
}

export function avgTrendValues(values: { value: number }[]): number | null {
  if (values.length === 0) return null;
  return sumTrendValues(values) / values.length;
}

function m(
  id: string,
  label: string,
  format: MetricFormat,
  getValue: (s: StatisticsBundle) => number | null,
  accent?: MetricAccent
): MetricDef {
  return { id, label, format, getValue, accent };
}

export const OVERVIEW_METRICS: MetricDef[] = [
  m('overview.totalSleep', 'Total Sleep', 'duration', (s) => s.overview.totalSleepMinutes, 'sleep'),
  m('overview.totalHangouts', 'Total Hangouts', 'count', (s) => s.overview.totalHangouts, 'social'),
  m('overview.totalFriends', 'Total Friends', 'count', (s) => s.overview.totalFriends, 'social'),
  m('overview.totalAwake', 'Total Awake Time', 'duration', (s) => s.overview.totalAwakeMinutes, 'awake'),
  m('overview.sleepGoal', 'Sleep Goal %', 'percent', (s) => s.overview.sleepGoalPercent, 'sleep'),
  m('overview.consistency', 'Sleep Consistency', 'percent', (s) => s.overview.sleepConsistency, 'sleep'),
  m('overview.hangoutHours', 'Total Hangout Hours', 'hours', (s) => s.overview.totalHangoutHours, 'social'),
  m('overview.avgHangout', 'Average Hangout Length', 'duration', (s) => s.overview.avgHangoutMinutes, 'social'),
];

export const SLEEP_OVERVIEW_METRICS: MetricDef[] = [
  m('sleep.total', 'Total Sleep', 'duration', (s) => s.sleep.total, 'sleep'),
  m('sleep.avg', 'Average Sleep', 'duration', (s) => s.sleep.avg, 'sleep'),
  m('sleep.longest', 'Longest Sleep', 'duration', (s) => s.sleep.longest, 'sleep'),
  m('sleep.shortest', 'Shortest Sleep', 'duration', (s) => s.sleep.shortest, 'sleep'),
  m('sleep.goal', 'Sleep Goal %', 'percent', (s) => s.sleep.goalProgress, 'sleep'),
  m('sleep.consistency', 'Sleep Consistency', 'percent', (s) => s.sleep.consistency, 'sleep'),
];

export const SLEEP_SCHEDULE_METRICS: MetricDef[] = [
  m('sleep.avgBed', 'Average Bedtime', 'time', (s) => s.sleep.avgBedtime || null, 'sleep'),
  m('sleep.avgWake', 'Average Wake Time', 'time', (s) => s.sleep.avgWake || null, 'sleep'),
  m('sleep.wdBed', 'Weekday Bedtime', 'time', (s) => s.sleep.weekdayBedtime, 'sleep'),
  m('sleep.weBed', 'Weekend Bedtime', 'time', (s) => s.sleep.weekendBedtime, 'sleep'),
  m('sleep.wdWake', 'Weekday Wake Time', 'time', (s) => s.sleep.weekdayWake, 'sleep'),
  m('sleep.weWake', 'Weekend Wake Time', 'time', (s) => s.sleep.weekendWake, 'sleep'),
];

export const SLEEP_DEBT_METRICS: MetricDef[] = [
  m('sleep.debtDaily', 'Daily Sleep Debt', 'debt', (s) => s.sleep.debtDaily, 'sleep'),
  m('sleep.debtWeekly', 'Weekly Sleep Debt', 'debt', (s) => s.sleep.debtWeekly, 'sleep'),
  m('sleep.debtMonthly', 'Monthly Sleep Debt', 'debt', (s) => s.sleep.debtMonthly, 'sleep'),
  m('sleep.debtLifetime', 'Lifetime Sleep Debt', 'debt', (s) => s.sleep.debtLifetime, 'sleep'),
];

export const SLEEP_NAP_METRICS: MetricDef[] = [
  m('sleep.napCount', 'Nap Count', 'count', (s) => s.sleep.naps.totalNaps, 'nap'),
  m('sleep.napTotal', 'Total Nap Time', 'duration', (s) => s.sleep.naps.totalTime, 'nap'),
  m('sleep.napAvg', 'Average Nap Length', 'duration', (s) => s.sleep.naps.avgDuration, 'nap'),
];

export const SLEEP_CHART_METRICS: MetricDef[] = [
  m('sleep.trend7', '7 Day Sleep Total', 'duration', (s) => sumTrendValues(s.sleep.dailyTrend7), 'sleep'),
  m('sleep.trendMonth', 'Monthly Sleep Total', 'duration', (s) => sumTrendValues(s.sleep.monthlySleepTrend), 'sleep'),
  m('sleep.trend7avg', '7 Day Sleep Avg', 'duration', (s) => avgTrendValues(s.sleep.dailyTrend7), 'sleep'),
];

export const SOCIAL_FRIENDS_METRICS: MetricDef[] = [
  m('social.friendsTotal', 'Total Friends', 'count', (s) => s.social.friends.total, 'social'),
  m('social.friendsActive', 'Active Friends', 'count', (s) => s.social.friends.active, 'social'),
  m('social.friendsArchived', 'Archived Friends', 'count', (s) => s.social.friends.archived, 'social'),
  m('social.friendsNew', 'New Friends', 'count', (s) => s.social.friends.newInRange, 'social'),
  m('social.friendsSeenMonth', 'Friends Seen This Month', 'count', (s) => s.social.friends.seenThisMonth, 'social'),
  m('social.friendsNotSeen', 'Friends Not Seen Recently', 'count', (s) => s.social.friends.notSeenRecently, 'social'),
];

export const SOCIAL_HANGOUT_METRICS: MetricDef[] = [
  m('social.hangoutsTotal', 'Total Hangouts', 'count', (s) => s.social.hangouts.total, 'social'),
  m('social.hoursWeek', 'Hours This Week', 'hours', (s) => s.social.hangouts.hoursThisWeek, 'social'),
  m('social.hoursMonth', 'Hours This Month', 'hours', (s) => s.social.hangouts.hoursThisMonth, 'social'),
  m('social.hangoutAvg', 'Average Duration', 'duration', (s) => s.social.hangouts.avgDuration, 'social'),
  m('social.hangoutLongest', 'Longest Hangout', 'duration', (s) => s.social.hangouts.longest, 'social'),
  m('social.hangoutShortest', 'Shortest Hangout', 'duration', (s) => s.social.hangouts.shortest, 'social'),
];

export const SOCIAL_PEOPLE_METRICS: MetricDef[] = [
  m('social.groupPct', 'Group Hangout %', 'percent', (s) => s.social.people.groupHangoutPct, 'social'),
  m('social.soloPct', 'Solo Hangout %', 'percent', (s) => s.social.people.soloHangoutPct, 'social'),
];

export const SOCIAL_LOCATION_METRICS: MetricDef[] = [
  m('social.locUnique', 'Total Unique Locations', 'count', (s) => s.social.locations.uniqueCount, 'social'),
];

export const SOCIAL_CHART_METRICS: MetricDef[] = [
  m('social.hoursWeekTrend', 'Hours by Week Total', 'hours', (s) => sumTrendValues(s.social.hoursByWeek), 'social'),
  m('social.hoursMonthTrend', 'Hours by Month Total', 'hours', (s) => sumTrendValues(s.social.hoursByMonth), 'social'),
];

export const COMBINED_METRICS: MetricDef[] = [
  m('combined.sleepAfterHangout', 'Avg Sleep After Hangout', 'duration', (s) => s.combined.avgSleepAfterHangout, 'sleep'),
  m('combined.sleepAfterNone', 'Avg Sleep After No Hangout', 'duration', (s) => s.combined.avgSleepAfterNoHangout, 'sleep'),
  m('combined.awakeBefore', 'Avg Awake Before Hangouts', 'duration', (s) => s.combined.avgAwakeBeforeHangout, 'awake'),
  m('combined.awakeBeforeMax', 'Longest Awake Before Social', 'duration', (s) => s.combined.longestAwakeBeforeHangout, 'awake'),
  m('combined.sleepLate', 'Sleep After Late-Night Hangouts', 'duration', (s) => s.combined.avgSleepAfterLateHangout, 'sleep'),
  m('combined.sleepExercise', 'Sleep After Exercise', 'duration', (s) => s.combined.avgSleepAfterExercise, 'sleep'),
];

export const TRENDS_METRICS: MetricDef[] = [
  m('trends.sleepMonth', 'Monthly Sleep Total', 'hours', (s) => sumTrendValues(s.trends.monthlySleep), 'sleep'),
  m('trends.hangoutMonth', 'Monthly Hangout Count', 'count', (s) => sumTrendValues(s.trends.monthlyHangouts), 'social'),
  m('trends.friendGrowth', 'Friend Growth (latest)', 'count', (s) => {
    const last = s.trends.friendGrowth[s.trends.friendGrowth.length - 1];
    return last?.value ?? null;
  }, 'social'),
  m('trends.hangoutFreq', 'Hangout Frequency Total', 'count', (s) => sumTrendValues(s.trends.hangoutFrequency), 'social'),
  m('trends.consistency', 'Sleep Consistency Avg', 'percent', (s) => avgTrendValues(s.trends.consistencyTrend), 'sleep'),
  m('trends.debt', 'Sleep Debt Trend Avg', 'debt', (s) => avgTrendValues(s.trends.debtTrend), 'sleep'),
  m('trends.timeFriends', 'Time With Friends Total', 'hours', (s) => sumTrendValues(s.trends.timeWithFriends), 'social'),
];

export function metricsToStatItems(metrics: MetricDef[], stats: StatisticsBundle) {
  return metrics.map((m) => ({
    label: m.label,
    value: formatMetricValue(m.getValue(stats), m.format),
    accent: m.accent,
  }));
}

export function mergeBreakdownCompare(
  label: string,
  dataA: { label: string; value: number }[],
  dataB: { label: string; value: number }[]
): CompareRow[] {
  const labels = new Set([...dataA.map((d) => d.label), ...dataB.map((d) => d.label)]);
  const mapA = Object.fromEntries(dataA.map((d) => [d.label, d.value]));
  const mapB = Object.fromEntries(dataB.map((d) => [d.label, d.value]));
  return [...labels].map((l) => {
    const valueA = mapA[l] ?? 0;
    const valueB = mapB[l] ?? 0;
    const diff = valueA - valueB;
    const pct = valueB !== 0 ? (diff / Math.abs(valueB)) * 100 : valueA !== 0 ? 100 : 0;
    return {
      id: `${label}:${l}`,
      label: l,
      accent: 'social' as const,
      formattedA: String(valueA),
      formattedB: String(valueB),
      formattedDiff: `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${Math.abs(diff)}`,
      formattedPct: `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct).toFixed(0)}%`,
      direction: (Math.abs(diff) < 0.01 ? 'flat' : diff > 0 ? 'up' : 'down') as CompareRow['direction'],
    };
  }).sort((a, b) => {
    const av = parseFloat(a.formattedA) || 0;
    const bv = parseFloat(b.formattedB) || 0;
    return Math.max(av, bv) - Math.min(av, bv);
  }).reverse();
}

export function mergeFriendRankingCompare(
  statsA: StatisticsBundle,
  statsB: StatisticsBundle,
  limit = 8
): CompareRow[] {
  const mapA = Object.fromEntries(statsA.social.people.ranking.map((r) => [r.name, r.hangouts]));
  const mapB = Object.fromEntries(statsB.social.people.ranking.map((r) => [r.name, r.hangouts]));
  const names = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
  const rows = [...names].map((name) => {
    const valueA = mapA[name] ?? 0;
    const valueB = mapB[name] ?? 0;
    const diff = valueA - valueB;
    const pct = valueB !== 0 ? (diff / valueB) * 100 : valueA !== 0 ? 100 : 0;
    return {
      id: `friend:${name}`,
      label: name,
      accent: 'social' as const,
      formattedA: `${valueA} hangouts`,
      formattedB: `${valueB} hangouts`,
      formattedDiff: `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${Math.abs(diff)}`,
      formattedPct: `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct).toFixed(0)}%`,
      direction: (Math.abs(diff) < 0.01 ? 'flat' : diff > 0 ? 'up' : 'down') as CompareRow['direction'],
      sortKey: Math.max(valueA, valueB),
    };
  });
  return rows
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, limit)
    .map(({ sortKey: _s, ...row }) => row);
}
