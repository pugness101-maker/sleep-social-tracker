import { useMemo, useState, useEffect } from 'react';
import { useAwakeTimer } from '../hooks/useLiveTimer';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/ui/Card';
import { CatchUpWidget } from '../components/dashboard/CatchUpWidget';
import { TopFriendsWidget } from '../components/dashboard/TopFriendsWidget';
import { ThisWeekSocialWidget } from '../components/dashboard/ThisWeekSocialWidget';
import { BirthdaysWidget } from '../components/dashboard/BirthdaysWidget';
import { RecentActivityWidget } from '../components/dashboard/RecentActivityWidget';
import { LocationHistoryWidget } from '../components/dashboard/LocationHistoryWidget';
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
import { getSleepInsights } from '../lib/sleep-insights';
import {
  loadDashboardLayout,
  visibleDashboardWidgets,
  DASHBOARD_LAYOUT_CHANGED_EVENT,
  type DashboardWidgetId,
} from '../lib/dashboard-layout';

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
  const sleepInsights = useMemo(() => getSleepInsights(data.sleepEntries, data.settings), [data.sleepEntries, data.settings]);

  const isSleeping = !!data.activeTimers.sleepStart;
  const weeklyVsGoal = avgSleep ? avgSleep - goalMinutes : null;

  const [layout, setLayout] = useState(() => loadDashboardLayout());

  useEffect(() => {
    const refresh = () => setLayout(loadDashboardLayout());
    window.addEventListener(DASHBOARD_LAYOUT_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DASHBOARD_LAYOUT_CHANGED_EVENT, refresh);
  }, []);

  const widgets = visibleDashboardWidgets(layout);

  const statCards: Record<DashboardWidgetId, React.ReactNode> = {
    awake_timer: (
      <StatCard label="Current Awake Timer" value={isSleeping ? 'Sleeping' : formatDurationLive(awakeMs)} sub={isSleeping ? 'Timer paused while sleeping' : 'Since last wake-up'} accent="awake" icon="⏱️" />
    ),
    sleep_goal: <StatCard label="Sleep Goal" value={`${data.settings.sleepGoalHours}h`} sub="Nightly target" accent="sleep" icon="🎯" />,
    recommended_bedtime: <StatCard label="Recommended Bedtime" value={schedule.recommendedBedtime} sub={schedule.autoCalculateBedtime ? `Wake goal ${schedule.effectiveWakeTime} − ${schedule.goalHours}h` : `Target ${schedule.effectiveBedtime}`} accent="sleep" icon="🌙" />,
    recommended_wake: <StatCard label="Recommended Wake Time" value={schedule.recommendedWakeTime} sub={schedule.autoCalculateWakeTime ? `Bedtime goal ${schedule.effectiveBedtime} + ${schedule.goalHours}h` : `Target ${schedule.effectiveWakeTime}`} accent="sleep" icon="☀️" />,
    last_night_sleep: <StatCard label="Last Night's Sleep" value={lastSleep ? formatDuration(calcDurationMinutes(lastSleep.sleepStart, lastSleep.wakeUp)) : '—'} sub={sleepVsGoal ? formatSleepDebt(sleepVsGoal.debt) : lastSleep ? `${formatTime(lastSleep.wakeUp)} wake-up` : 'No sleep logged'} accent="sleep" icon="😴" />,
    today_sleep_debt: <StatCard label="Today's Sleep Debt" value={debtStats.todaySleepDebt !== null ? formatSleepDebt(debtStats.todaySleepDebt) : '—'} sub={`Goal: ${data.settings.sleepGoalHours}h/night`} accent="sleep" icon="📉" />,
    week_sleep_debt: <StatCard label="This Week's Sleep Debt" value={debtStats.weekNightCount > 0 ? formatSleepDebt(debtStats.weeklyDebt) : '—'} sub={`${debtStats.weekNightCount} night${debtStats.weekNightCount === 1 ? '' : 's'} logged this week`} accent="sleep" icon="📆" />,
    sleep_goal_progress: <StatCard label="Sleep Goal Progress" value={`${debtStats.goalProgress.toFixed(0)}%`} sub={debtStats.nightCount > 0 ? `${debtStats.nightsAtGoal} of ${debtStats.nightCount} nights met goal` : `Target: ${data.settings.sleepGoalHours}h/night`} accent="sleep" icon="✅" />,
    today_wake: <StatCard label="Today's Wake-up" value={todayWake ? formatTime(todayWake) : '—'} sub={todayWake ? formatDateTime(todayWake).split(',')[0] : 'Not yet today'} accent="sleep" />,
    today_naps: <StatCard label="Today's Naps" value={formatDuration(napTotal)} sub={`${data.napEntries.filter((n) => n.napStart.startsWith(new Date().toISOString().slice(0, 10))).length} naps in Sleep Log`} accent="nap" icon="💤" />,
    today_hangouts: <StatCard label="Today's Hangouts" value={String(todayHangouts.length)} sub={todayHangouts.length ? `${formatDuration(todayHangouts.reduce((s, h) => s + calcDurationMinutes(h.startTime, h.endTime), 0))} total` : 'None yet'} accent="social" icon="🤝" />,
    avg_sleep_week: <StatCard label="Avg Sleep This Week" value={avgSleep ? formatDuration(avgSleep) : '—'} sub={weeklyVsGoal !== null ? formatSleepDebt(-weeklyVsGoal) : `Goal: ${data.settings.sleepGoalHours}h`} accent="sleep" icon="📊" />,
    sleep_goal_streak: <StatCard label="Sleep Goal Streak" value={String(sleepInsights.goalStreaks.current)} sub={`Longest: ${sleepInsights.goalStreaks.longest} nights`} accent="sleep" icon="🔥" />,
    wake_streak: <StatCard label="Wake-up Streak" value={String(sleepInsights.wakeStreaks.current)} sub={`Longest: ${sleepInsights.wakeStreaks.longest} days on time`} accent="sleep" icon="⏰" />,
    this_week_social: null,
    top_friends: null,
    catch_up: null,
    birthdays: null,
    recent_activity: null,
    location_history: null,
  };

  const panelWidgets: Partial<Record<DashboardWidgetId, React.ReactNode>> = {
    catch_up: <CatchUpWidget onOpenFriend={setDetailFriendId} />,
    this_week_social: <ThisWeekSocialWidget />,
    top_friends: <TopFriendsWidget onOpenFriend={setDetailFriendId} />,
    birthdays: <BirthdaysWidget onOpenFriend={setDetailFriendId} />,
    recent_activity: <RecentActivityWidget />,
    location_history: <LocationHistoryWidget />,
  };

  const statIds = widgets.filter((w) => w.kind === 'stat').map((w) => w.id);
  const panelIds = widgets.filter((w) => w.kind === 'widget').map((w) => w.id);

  const widePanelIds = new Set<DashboardWidgetId>(['recent_activity', 'location_history']);

  type PanelRow = { ids: DashboardWidgetId[]; wide: boolean };
  const panelRows: PanelRow[] = [];
  for (let i = 0; i < panelIds.length; i++) {
    const id = panelIds[i];
    if (widePanelIds.has(id)) {
      panelRows.push({ ids: [id], wide: true });
      continue;
    }
    const next = panelIds[i + 1];
    if (next && !widePanelIds.has(next)) {
      panelRows.push({ ids: [id, next], wide: false });
      i += 1;
    } else {
      panelRows.push({ ids: [id], wide: false });
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Dashboard</h1>
        <p className="text-sm opacity-70 mt-1">Your daily overview at a glance</p>
      </div>

      {statIds.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statIds.map((id) => (
            <div key={id}>{statCards[id]}</div>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {panelRows.map((row) => {
          const nodes = row.ids.map((id) => panelWidgets[id]).filter(Boolean);
          if (nodes.length === 0) return null;
          if (row.wide) {
            return <div key={row.ids.join('-')}>{nodes[0]}</div>;
          }
          if (nodes.length === 2) {
            return (
              <div key={row.ids.join('-')} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {nodes.map((node, i) => (
                  <div key={row.ids[i]}>{node}</div>
                ))}
              </div>
            );
          }
          return (
            <div key={row.ids[0]} className="max-w-2xl">
              {nodes[0]}
            </div>
          );
        })}
      </div>

      <FriendDetailModal friendId={detailFriendId} onClose={() => setDetailFriendId(null)} onEdit={() => setDetailFriendId(null)} />
    </div>
  );
}
