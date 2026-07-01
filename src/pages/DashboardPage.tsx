import { useAwakeTimer } from '../hooks/useLiveTimer';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/ui/Card';
import { Card } from '../components/ui/Card';
import {
  getLastNightSleep,
  getTodayWakeUp,
  getTodayNapTotal,
  getTodayHangouts,
  getSocialHoursThisWeek,
  getAverageSleepThisWeek,
  getRecentActivity,
} from '../lib/stats';
import { formatDuration, formatTime, calcDurationMinutes } from '../lib/dates';
import { formatDurationLive } from '../lib/dates';
import { formatDateTime } from '../lib/dates';

export function DashboardPage() {
  const { data } = useApp();
  const awakeMs = useAwakeTimer(data);

  const lastSleep = getLastNightSleep(data);
  const todayWake = getTodayWakeUp(data);
  const napTotal = getTodayNapTotal(data);
  const todayHangouts = getTodayHangouts(data);
  const socialHours = getSocialHoursThisWeek(data);
  const avgSleep = getAverageSleepThisWeek(data);
  const recent = getRecentActivity(data);

  const isSleeping = !!data.activeTimers.sleepStart;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Dashboard</h1>
        <p className="text-sm opacity-70 mt-1">Your daily overview at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Current Awake Timer"
          value={isSleeping ? 'Sleeping' : formatDurationLive(awakeMs)}
          sub={isSleeping ? 'Timer paused while sleeping' : 'Since last wake-up'}
          accent="awake"
          icon="⏱️"
        />
        <StatCard
          label="Last Night's Sleep"
          value={lastSleep ? formatDuration(calcDurationMinutes(lastSleep.sleepStart, lastSleep.wakeUp)) : '—'}
          sub={lastSleep ? formatTime(lastSleep.wakeUp) + ' wake-up' : 'No sleep logged'}
          accent="sleep"
          icon="🌙"
        />
        <StatCard
          label="Today's Wake-up"
          value={todayWake ? formatTime(todayWake) : '—'}
          sub={todayWake ? formatDateTime(todayWake).split(',')[0] : 'Not yet today'}
          accent="sleep"
          icon="☀️"
        />
        <StatCard
          label="Today's Nap Total"
          value={formatDuration(napTotal)}
          sub={data.activeTimers.napStart ? 'Nap in progress...' : `${data.napEntries.filter(n => n.napStart.startsWith(new Date().toISOString().slice(0,10))).length} naps`}
          accent="nap"
          icon="💤"
        />
        <StatCard
          label="Today's Hangouts"
          value={String(todayHangouts.length)}
          sub={todayHangouts.length ? formatDuration(todayHangouts.reduce((s, h) => s + calcDurationMinutes(h.startTime, h.endTime), 0)) + ' total' : 'None yet'}
          accent="social"
          icon="🤝"
        />
        <StatCard
          label="Social Hours This Week"
          value={`${socialHours.toFixed(1)}h`}
          sub={`${data.hangouts.length} total hangouts`}
          accent="social"
          icon="📅"
        />
        <StatCard
          label="Avg Sleep This Week"
          value={avgSleep ? formatDuration(avgSleep) : '—'}
          sub={`Goal: ${data.settings.sleepGoalHours}h`}
          accent="sleep"
          icon="📊"
        />
      </div>

      <Card>
        <h2 className="text-lg font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>
          Recent Activity
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm opacity-70 text-left">No activity yet. Start tracking sleep or hangouts!</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {recent.map((item) => (
              <li key={`${item.type}-${item.id}`} className="flex items-center gap-3 py-3 text-left">
                <span className="text-xl">
                  {item.type === 'sleep' ? '😴' : item.type === 'nap' ? '💤' : '👥'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>{item.title}</p>
                  <p className="text-xs opacity-70">{item.detail}</p>
                </div>
                <span className="text-xs opacity-60 shrink-0">{formatDateTime(item.timestamp)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
