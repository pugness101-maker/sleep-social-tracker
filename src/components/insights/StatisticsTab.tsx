import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Card, StatCard } from '../ui/Card';
import { getSleepStats, getNapStats, getSocialStats, getAwakeStats, getMonthlyTrends, getSleepDebtStats } from '../../lib/stats';
import { formatDuration, avgMinutesToTime, weekdayLabel, formatDateTime } from '../../lib/dates';
import { formatSleepDebt, formatGoalProgressPercent } from '../../lib/sleep-goals';
import { getAverageSleepThisWeek } from '../../lib/stats';
import { useStatsDateRange, statsRangeArgs } from '../../hooks/useStatsDateRange';
import { useInsightsFilters } from '../../hooks/useInsightsFilters';
import { StatsDateRangeFilter } from './StatsDateRangeFilter';
import { InsightsFilterBar, useFilteredAppData } from './InsightsFilterBar';
import { getLocationHistory, friendNamesAtLocation, formatLocationDate } from '../../lib/location-history';

export function StatisticsTab() {
  const { data } = useApp();
  const { range, resolved, setPreset, setCustomDates, clearFilter } = useStatsDateRange();
  const { filters, setFilter, clearFilters, removeChip } = useInsightsFilters();
  const { start, end } = statsRangeArgs(resolved);

  const filteredData = useFilteredAppData(data, filters, start, end);

  const sleep = getSleepStats(filteredData, start, end);
  const debtStats = getSleepDebtStats(filteredData, start, end);
  const naps = getNapStats(filteredData, start, end);
  const social = getSocialStats(filteredData, start, end);
  const awake = getAwakeStats(filteredData, start, end);
  const trends = getMonthlyTrends(filteredData, 6, start, end);
  const locations = useMemo(() => getLocationHistory(filteredData.hangouts, 20), [filteredData.hangouts]);

  const weeklyAvg = resolved.isFiltered ? sleep.avg : getAverageSleepThisWeek(filteredData);
  const weeklyVsGoal = weeklyAvg ? weeklyAvg - data.settings.sleepGoalHours * 60 : null;

  const topFriends = Object.entries(social.friendCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => ({
      name: data.friends.find((f) => f.id === id)?.name ?? 'Unknown',
      count,
    }));

  const rangeScope = resolved.isFiltered ? 'in selected range' : 'this week';

  return (
    <div className="space-y-8">
      <StatsDateRangeFilter
        range={range}
        label={resolved.label}
        onPreset={setPreset}
        onCustomDates={setCustomDates}
        onClear={clearFilter}
      />

      <Card>
        <InsightsFilterBar
          filters={filters}
          setFilter={setFilter}
          clearFilters={clearFilters}
          removeChip={removeChip}
        />
      </Card>

      <section>
        <h2 className="text-lg font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>Sleep Statistics</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Sleep" value={formatDuration(sleep.total)} accent="sleep" />
          <StatCard label="Average Duration" value={formatDuration(sleep.avg)} accent="sleep" />
          <StatCard label="Average Bedtime" value={sleep.avgBedtime ? avgMinutesToTime(sleep.avgBedtime) : '—'} accent="sleep" />
          <StatCard label="Average Wake-up" value={sleep.avgWake ? avgMinutesToTime(sleep.avgWake) : '—'} accent="sleep" />
          <StatCard label="Longest Sleep" value={formatDuration(sleep.longest)} accent="sleep" />
          <StatCard label="Shortest Sleep" value={formatDuration(sleep.shortest)} accent="sleep" />
          <StatCard label="Sleep Consistency" value={`${sleep.consistency.toFixed(0)}%`} accent="sleep" />
          <StatCard
            label="Goal Progress"
            value={`${sleep.goalProgress.toFixed(0)}%`}
            sub={`${sleep.nightsAtGoal} of ${sleep.count} nights met goal`}
            accent="sleep"
          />
          <StatCard
            label="Avg vs Goal"
            value={sleep.avg ? formatSleepDebt(-sleep.avgVsGoal) : '—'}
            sub={sleep.avg ? `${formatGoalProgressPercent(sleep.avg, sleep.goalMinutes)} of nightly goal` : 'No sleep data'}
            accent="sleep"
          />
          <StatCard
            label={resolved.isFiltered ? 'Avg Sleep in Range' : 'Weekly Avg vs Goal'}
            value={weeklyAvg ? formatDuration(weeklyAvg) : '—'}
            sub={weeklyVsGoal !== null ? formatSleepDebt(-weeklyVsGoal) : `Goal: ${data.settings.sleepGoalHours}h`}
            accent="sleep"
          />
        </div>
        <Card className="mt-4">
          <h3 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Sleep Debt</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              label={debtStats.isRangeFiltered ? 'Latest Sleep Debt' : 'Daily Sleep Debt'}
              value={debtStats.todaySleepDebt !== null ? formatSleepDebt(debtStats.todaySleepDebt) : '—'}
              sub={debtStats.isRangeFiltered ? 'Most recent wake-up in range' : 'Last logged night vs goal'}
              accent="sleep"
            />
            <StatCard
              label={debtStats.isRangeFiltered ? 'Total Sleep Debt' : 'Weekly Sleep Debt'}
              value={
                debtStats.isRangeFiltered
                  ? debtStats.nightCount > 0
                    ? formatSleepDebt(debtStats.totalDebt)
                    : '—'
                  : debtStats.weekNightCount > 0
                    ? formatSleepDebt(debtStats.weeklyDebt)
                    : '—'
              }
              sub={
                debtStats.isRangeFiltered
                  ? `${debtStats.nightCount} night${debtStats.nightCount === 1 ? '' : 's'} in range`
                  : `${debtStats.weekNightCount} night${debtStats.weekNightCount === 1 ? '' : 's'} ${rangeScope}`
              }
              accent="sleep"
            />
            <StatCard
              label={debtStats.isRangeFiltered ? 'Nights in Range' : 'Monthly Sleep Debt'}
              value={
                debtStats.isRangeFiltered
                  ? String(debtStats.nightCount)
                  : debtStats.monthNightCount > 0
                    ? formatSleepDebt(debtStats.monthlyDebt)
                    : '—'
              }
              sub={
                debtStats.isRangeFiltered
                  ? 'Logged wake-ups in selected range'
                  : `${debtStats.monthNightCount} night${debtStats.monthNightCount === 1 ? '' : 's'} this month`
              }
              accent="sleep"
            />
            <StatCard
              label="Avg Sleep Debt / Night"
              value={debtStats.nightCount > 0 ? formatSleepDebt(Math.round(debtStats.avgDebtPerNight)) : '—'}
              sub={`Across ${debtStats.nightCount} logged night${debtStats.nightCount === 1 ? '' : 's'}`}
              accent="sleep"
            />
            <StatCard
              label="Best Recovery Night"
              value={
                debtStats.bestRecovery
                  ? formatSleepDebt(debtStats.bestRecovery.debt)
                  : '—'
              }
              sub={
                debtStats.bestRecovery
                  ? `${formatDuration(debtStats.bestRecovery.actual)} · ${formatDateTime(debtStats.bestRecovery.entry.wakeUp)}`
                  : 'No sleep data'
              }
              accent="sleep"
            />
            <StatCard
              label="Worst Sleep Debt Night"
              value={
                debtStats.worstDebt
                  ? formatSleepDebt(debtStats.worstDebt.debt)
                  : '—'
              }
              sub={
                debtStats.worstDebt
                  ? `${formatDuration(debtStats.worstDebt.actual)} · ${formatDateTime(debtStats.worstDebt.entry.wakeUp)}`
                  : 'No sleep data'
              }
              accent="sleep"
            />
          </div>
        </Card>
        <Card className="mt-4">
          <h3 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Sleep by Weekday</h3>
          <div className="grid grid-cols-7 gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map((d) => {
              const avg = sleep.weekdayAvgs[d];
              const pct = avg ? Math.min(100, (avg / (data.settings.sleepGoalHours * 60)) * 100) : 0;
              return (
                <div key={d} className="text-center">
                  <p className="text-xs opacity-70 mb-1">{weekdayLabel(d)}</p>
                  <div className="h-20 rounded-lg relative overflow-hidden" style={{ background: 'var(--bg)' }}>
                    <div className="absolute bottom-0 w-full bg-sleep/60 rounded-b-lg transition-all" style={{ height: `${pct}%` }} />
                  </div>
                  <p className="text-xs mt-1 font-medium">{avg ? formatDuration(avg) : '—'}</p>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="mt-4">
          <h3 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>
            {resolved.isFiltered ? 'Sleep Trend in Range' : 'Monthly Sleep Trend'}
          </h3>
          {trends.sleepTrend.length === 0 ? (
            <p className="text-sm opacity-70 text-left">No sleep data for this range.</p>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {trends.sleepTrend.map((t) => {
                const maxMin = Math.max(...trends.sleepTrend.map((x) => x.minutes), 1);
                return (
                  <div key={t.label} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-sleep/60 rounded-t" style={{ height: `${(t.minutes / maxMin) * 100}%`, minHeight: t.minutes ? 4 : 0 }} />
                    <span className="text-[9px] opacity-60 truncate w-full text-center">{t.label.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <div className="mt-6">
          <h3 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Naps (Sleep Log)</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <StatCard label="Total Naps" value={String(naps.totalNaps)} accent="nap" />
            <StatCard label="Total Nap Time" value={formatDuration(naps.totalTime)} accent="nap" />
            <StatCard label="Average Nap Duration" value={formatDuration(naps.avgDuration)} accent="nap" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>Awake Statistics</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard label="Average Awake Time" value={formatDuration(awake.avgAwake)} accent="awake" />
          <StatCard label="Longest Awake Streak" value={formatDuration(awake.longestStreak)} accent="awake" />
          <StatCard label="Avg Time Awake Before Bed" value={formatDuration(awake.awakeBeforeBed)} accent="awake" />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>Social Statistics</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Hangouts" value={String(social.totalHangouts)} accent="social" />
          <StatCard label="Total Social Hours" value={`${social.totalHours.toFixed(1)}h`} accent="social" />
          <StatCard label="Average Hangout Duration" value={formatDuration(social.avgDuration)} accent="social" />
          <StatCard label="Days Since Last Hangout" value={social.daysSinceLast !== null ? String(social.daysSinceLast) : '—'} accent="social" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <Card>
            <h3 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Most-Seen Friends</h3>
            {topFriends.length === 0 ? (
              <p className="text-sm opacity-70 text-left">No hangout data for this range.</p>
            ) : (
              <ul className="space-y-2 text-left">
                {topFriends.map((f) => (
                  <li key={f.name} className="flex justify-between text-sm">
                    <span>{f.name}</span>
                    <span className="font-medium">{f.count} hangouts</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h3 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Activity Count by Type</h3>
            {Object.keys(social.activityCountByType).length === 0 ? (
              <p className="text-sm opacity-70 text-left">No hangout data for this range.</p>
            ) : (
              <ul className="space-y-2 text-left">
                {Object.entries(social.activityCountByType).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                  <li key={type} className="flex justify-between text-sm">
                    <span>{type}</span>
                    <span className="font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h3 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Activity Time by Type</h3>
            {Object.keys(social.activityTimeByType).length === 0 ? (
              <p className="text-sm opacity-70 text-left">No timed activity data for this range.</p>
            ) : (
              <ul className="space-y-2 text-left">
                {Object.entries(social.activityTimeByType).sort(([, a], [, b]) => b - a).map(([type, minutes]) => (
                  <li key={type} className="flex justify-between text-sm">
                    <span>{type}</span>
                    <span className="font-medium">{formatDuration(minutes)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h3 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Hangouts by Type</h3>
            {Object.keys(social.byType).length === 0 ? (
              <p className="text-sm opacity-70 text-left">No hangout data for this range.</p>
            ) : (
              <ul className="space-y-2 text-left">
                {Object.entries(social.byType).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                  <li key={type} className="flex justify-between text-sm">
                    <span>{type}</span>
                    <span className="font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="mt-4">
          <h3 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>
            {resolved.isFiltered ? 'Social Trend in Range' : 'Monthly Social Trend'}
          </h3>
          {trends.socialTrend.length === 0 ? (
            <p className="text-sm opacity-70 text-left">No hangout data for this range.</p>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {trends.socialTrend.map((t) => {
                const maxMin = Math.max(...trends.socialTrend.map((x) => x.minutes), 1);
                return (
                  <div key={t.label} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-social/60 rounded-t" style={{ height: `${(t.minutes / maxMin) * 100}%`, minHeight: t.minutes ? 4 : 0 }} />
                    <span className="text-[9px] opacity-60 truncate w-full text-center">{t.label.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>Location History</h2>
        {locations.length === 0 ? (
          <p className="text-sm opacity-70 text-left">No locations in filtered hangouts.</p>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="opacity-60 border-b" style={{ borderColor: 'var(--border)' }}>
                    <th className="py-2 pr-4">Location</th>
                    <th className="py-2 pr-4">Visits</th>
                    <th className="py-2 pr-4">Hours</th>
                    <th className="py-2 pr-4">Friends</th>
                    <th className="py-2 pr-4">Top Type</th>
                    <th className="py-2">Last Visit</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc) => (
                    <tr key={loc.location} className="border-b" style={{ borderColor: 'var(--border)' }}>
                      <td className="py-2 pr-4 font-medium">{loc.location}</td>
                      <td className="py-2 pr-4">{loc.visitCount}</td>
                      <td className="py-2 pr-4">{loc.totalHours.toFixed(1)}h</td>
                      <td className="py-2 pr-4 max-w-[160px] truncate">{friendNamesAtLocation(loc.friendIds, data.friends)}</td>
                      <td className="py-2 pr-4">{loc.mostCommonType ?? '—'}</td>
                      <td className="py-2">{formatLocationDate(loc.lastVisit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
