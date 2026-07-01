import { useState } from 'react';
import { useAwakeTimer } from '../hooks/useLiveTimer';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/ui/Card';
import { CatchUpWidget } from '../components/dashboard/CatchUpWidget';
import { TopFriendsWidget } from '../components/dashboard/TopFriendsWidget';
import { ThisWeekSocialWidget } from '../components/dashboard/ThisWeekSocialWidget';
import { BirthdaysWidget } from '../components/dashboard/BirthdaysWidget';
import { RecentActivityWidget } from '../components/dashboard/RecentActivityWidget';
import { FriendDetailModal } from '../components/social/FriendDetailModal';
import {
  getLastNightSleep,
  getTodayWakeUp,
  getTodayNapTotal,
  getTodayHangouts,
  getAverageSleepThisWeek,
  getLastNightSleepVsGoal,
  getSleepDebtStats,
} from '../lib/stats';
import { formatDuration, formatTime, calcDurationMinutes, formatDurationLive, formatDateTime } from '../lib/dates';
import { getSleepSchedule, formatSleepDebt } from '../lib/sleep-goals';

export function DashboardPage() {
  const { data } = useApp();
  const [detailFriendId, setDetailFriendId] = useState<string | null>(null);
  const awakeMs = useAwakeTimer(data);
  const schedule = getSleepSchedule(data.settings);

  const lastSleep = getLastNightSleep(data);
  const sleepVsGoal = getLastNightSleepVsGoal(data);
  const todayWake = getTodayWakeUp(data);
  const napTotal = getTodayNapTotal(data);
  const todayHangouts = getTodayHangouts(data);
  const avgSleep = getAverageSleepThisWeek(data);
  const debtStats = getSleepDebtStats(data);
  const goalMinutes = data.settings.sleepGoalHours * 60;

  const isSleeping = !!data.activeTimers.sleepStart;
  const weeklyVsGoal = avgSleep ? avgSleep - goalMinutes : null;

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
        <StatCard label="Sleep Goal" value={`${data.settings.sleepGoalHours}h`} sub="Nightly target" accent="sleep" icon="🎯" />
        <StatCard
          label="Recommended Bedtime"
          value={schedule.recommendedBedtime}
          sub={schedule.autoCalculateBedtime ? `Wake goal ${schedule.effectiveWakeTime} − ${schedule.goalHours}h` : `Target ${schedule.effectiveBedtime}`}
          accent="sleep"
          icon="🌙"
        />
        <StatCard
          label="Recommended Wake Time"
          value={schedule.recommendedWakeTime}
          sub={schedule.autoCalculateWakeTime ? `Bedtime goal ${schedule.effectiveBedtime} + ${schedule.goalHours}h` : `Target ${schedule.effectiveWakeTime}`}
          accent="sleep"
          icon="☀️"
        />
        <StatCard
          label="Last Night's Sleep"
          value={lastSleep ? formatDuration(calcDurationMinutes(lastSleep.sleepStart, lastSleep.wakeUp)) : '—'}
          sub={sleepVsGoal ? formatSleepDebt(sleepVsGoal.debt) : lastSleep ? `${formatTime(lastSleep.wakeUp)} wake-up` : 'No sleep logged'}
          accent="sleep"
          icon="😴"
        />
        <StatCard
          label="Today's Sleep Debt"
          value={debtStats.todaySleepDebt !== null ? formatSleepDebt(debtStats.todaySleepDebt) : '—'}
          sub={`Goal: ${data.settings.sleepGoalHours}h/night`}
          accent="sleep"
          icon="📉"
        />
        <StatCard
          label="This Week's Sleep Debt"
          value={debtStats.weekNightCount > 0 ? formatSleepDebt(debtStats.weeklyDebt) : '—'}
          sub={`${debtStats.weekNightCount} night${debtStats.weekNightCount === 1 ? '' : 's'} logged this week`}
          accent="sleep"
          icon="📆"
        />
        <StatCard
          label="Sleep Goal Progress"
          value={`${debtStats.goalProgress.toFixed(0)}%`}
          sub={debtStats.nightCount > 0 ? `${debtStats.nightsAtGoal} of ${debtStats.nightCount} nights met goal` : `Target: ${data.settings.sleepGoalHours}h/night`}
          accent="sleep"
          icon="✅"
        />
        <StatCard label="Today's Wake-up" value={todayWake ? formatTime(todayWake) : '—'} sub={todayWake ? formatDateTime(todayWake).split(',')[0] : 'Not yet today'} accent="sleep" />
        <StatCard label="Today's Nap Total" value={formatDuration(napTotal)} sub={`${data.napEntries.filter((n) => n.napStart.startsWith(new Date().toISOString().slice(0, 10))).length} naps in Sleep Log`} accent="nap" icon="💤" />
        <StatCard label="Today's Hangouts" value={String(todayHangouts.length)} sub={todayHangouts.length ? `${formatDuration(todayHangouts.reduce((s, h) => s + calcDurationMinutes(h.startTime, h.endTime), 0))} total` : 'None yet'} accent="social" icon="🤝" />
        <StatCard label="Avg Sleep This Week" value={avgSleep ? formatDuration(avgSleep) : '—'} sub={weeklyVsGoal !== null ? formatSleepDebt(-weeklyVsGoal) : `Goal: ${data.settings.sleepGoalHours}h`} accent="sleep" icon="📊" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <CatchUpWidget onOpenFriend={setDetailFriendId} />
        <ThisWeekSocialWidget />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <TopFriendsWidget onOpenFriend={setDetailFriendId} />
        <BirthdaysWidget onOpenFriend={setDetailFriendId} />
      </div>

      <RecentActivityWidget />

      <FriendDetailModal friendId={detailFriendId} onClose={() => setDetailFriendId(null)} onEdit={() => setDetailFriendId(null)} />
    </div>
  );
}
