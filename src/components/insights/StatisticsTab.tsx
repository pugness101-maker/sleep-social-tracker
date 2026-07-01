import { useApp } from '../../context/AppContext';
import { Card, StatCard } from '../ui/Card';
import { getSleepStats, getNapStats, getSocialStats, getAwakeStats, getMonthlyTrends } from '../../lib/stats';
import { formatDuration, avgMinutesToTime, weekdayLabel } from '../../lib/dates';

export function StatisticsTab() {
  const { data } = useApp();
  const sleep = getSleepStats(data);
  const naps = getNapStats(data);
  const social = getSocialStats(data);
  const awake = getAwakeStats(data);
  const trends = getMonthlyTrends(data);

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
          <StatCard label="Sleep Debt" value={formatDuration(sleep.sleepDebt)} sub={`Goal: ${data.settings.sleepGoalHours}h/night`} accent="sleep" />
        </div>
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
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>Nap Statistics</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard label="Total Naps" value={String(naps.totalNaps)} accent="nap" />
          <StatCard label="Total Nap Time" value={formatDuration(naps.totalTime)} accent="nap" />
          <StatCard label="Average Nap Duration" value={formatDuration(naps.avgDuration)} accent="nap" />
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

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
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
