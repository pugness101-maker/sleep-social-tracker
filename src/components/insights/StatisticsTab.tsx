import { useApp } from '../../context/AppContext';
import { Card, StatCard } from '../ui/Card';
import { getSleepStats, getNapStats, getSocialStats, getAwakeStats, getMonthlyTrends, getSleepDebtStats } from '../../lib/stats';
import { formatDuration, avgMinutesToTime, weekdayLabel, formatDateTime } from '../../lib/dates';
import { formatSleepDebt, formatGoalProgressPercent } from '../../lib/sleep-goals';
import { getAverageSleepThisWeek } from '../../lib/stats';

export function StatisticsTab() {
  const { data } = useApp();
  const sleep = getSleepStats(data);
  const debtStats = getSleepDebtStats(data);
  const naps = getNapStats(data);
  const social = getSocialStats(data);
  const awake = getAwakeStats(data);
  const trends = getMonthlyTrends(data);
  const weeklyAvg = getAverageSleepThisWeek(data);
  const weeklyVsGoal = weeklyAvg ? weeklyAvg - data.settings.sleepGoalHours * 60 : null;

  const topFriends = Object.entries(social.friendCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => ({
      name: data.friends.find((f) => f.id === id)?.name ?? 'Unknown',
      count,
    }));

  return (
    <div className="space-y-8">
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
            label="Weekly Avg vs Goal"
            value={weeklyAvg ? formatDuration(weeklyAvg) : '—'}
            sub={weeklyVsGoal !== null ? formatSleepDebt(-weeklyVsGoal) : `Goal: ${data.settings.sleepGoalHours}h`}
            accent="sleep"
          />
        </div>
        <Card className="mt-4">
          <h3 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Sleep Debt</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              label="Daily Sleep Debt"
              value={debtStats.todaySleepDebt !== null ? formatSleepDebt(debtStats.todaySleepDebt) : '—'}
              sub="Last logged night vs goal"
              accent="sleep"
            />
            <StatCard
              label="Weekly Sleep Debt"
              value={debtStats.weekNightCount > 0 ? formatSleepDebt(debtStats.weeklyDebt) : '—'}
              sub={`${debtStats.weekNightCount} night${debtStats.weekNightCount === 1 ? '' : 's'} this week`}
              accent="sleep"
            />
            <StatCard
              label="Monthly Sleep Debt"
              value={debtStats.monthNightCount > 0 ? formatSleepDebt(debtStats.monthlyDebt) : '—'}
              sub={`${debtStats.monthNightCount} night${debtStats.monthNightCount === 1 ? '' : 's'} this month`}
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
                  ? `${formatDuration(debtStats.bestRecovery.actual)} · ${formatDateTime(debtStats.bestRecovery.entry.sleepStart)}`
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
                  ? `${formatDuration(debtStats.worstDebt.actual)} · ${formatDateTime(debtStats.worstDebt.entry.sleepStart)}`
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
          <h3 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Monthly Sleep Trend</h3>
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <Card>
            <h3 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Most-Seen Friends</h3>
            {topFriends.length === 0 ? (
              <p className="text-sm opacity-70 text-left">No hangout data yet.</p>
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
            <h3 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Activity Time by Type</h3>
            {Object.keys(social.activityTimeByType).length === 0 ? (
              <p className="text-sm opacity-70 text-left">No hangout data yet.</p>
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
              <p className="text-sm opacity-70 text-left">No hangout data yet.</p>
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
          <h3 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Monthly Social Trend</h3>
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
        </Card>
      </section>
    </div>
  );
}
