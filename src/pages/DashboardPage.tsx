import { useMemo, useState, useEffect } from 'react';
import { useAwakeTimer } from '../hooks/useLiveTimer';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/ui/Card';
import { CatchUpWidget } from '../components/dashboard/CatchUpWidget';
import { RecentActivityWidget } from '../components/dashboard/RecentActivityWidget';
import { QuickActionsWidget } from '../components/dashboard/QuickActionsWidget';
import { UpcomingIdeasWidget } from '../components/dashboard/UpcomingIdeasWidget';
import { FriendDetailModal } from '../components/social/FriendDetailModal';
import {
  getLastNightSleep,
  getLastNightSleepVsGoal,
  getSleepDebtStats,
} from '../lib/stats';
import { formatDuration, formatTime, calcDurationMinutes, formatDurationLive, formatDateTime } from '../lib/dates';
import { getSleepSchedule, formatSleepDebt } from '../lib/sleep-goals';
import {
  getActiveFriendCount,
  getLastSocialHangout,
  getThisWeekSocial,
} from '../lib/dashboard-analytics';
import { formatDaysSinceLabel } from '../lib/friend-activity';
import {
  loadDashboardLayout,
  visibleWidgetsByGroup,
  DASHBOARD_LAYOUT_CHANGED_EVENT,
  DASHBOARD_WIDGET_GROUPS,
  type DashboardWidgetId,
  type DashboardWidgetGroup,
} from '../lib/dashboard-layout';

function DashboardSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60 mb-3 text-left">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function DashboardPage() {
  const { data } = useApp();
  const [detailFriendId, setDetailFriendId] = useState<string | null>(null);
  const awakeMs = useAwakeTimer(data);
  const schedule = getSleepSchedule(data.settings);

  const lastSleep = getLastNightSleep(data);
  const sleepVsGoal = getLastNightSleepVsGoal(data);
  const debtStats = getSleepDebtStats(data);
  const weekSocial = getThisWeekSocial(data);
  const lastSeen = getLastSocialHangout(data);

  const isSleeping = !!data.activeTimers.sleepStart;

  const [layout, setLayout] = useState(() => loadDashboardLayout());

  useEffect(() => {
    const refresh = () => setLayout(loadDashboardLayout());
    window.addEventListener(DASHBOARD_LAYOUT_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DASHBOARD_LAYOUT_CHANGED_EVENT, refresh);
  }, []);

  const statCards: Record<DashboardWidgetId, React.ReactNode> = useMemo(
    () => ({
      awake_timer: (
        <StatCard
          label="Current Awake Timer"
          value={isSleeping ? 'Sleeping' : formatDurationLive(awakeMs)}
          sub={isSleeping ? 'Timer paused while sleeping' : 'Since last wake-up'}
          accent="awake"
          icon="⏱️"
        />
      ),
      last_night_sleep: (
        <StatCard
          label="Last Night's Sleep"
          value={lastSleep ? formatDuration(calcDurationMinutes(lastSleep.sleepStart, lastSleep.wakeUp)) : '—'}
          sub={sleepVsGoal ? formatSleepDebt(sleepVsGoal.debt) : lastSleep ? `${formatTime(lastSleep.wakeUp)} wake-up` : 'No sleep logged'}
          accent="sleep"
          icon="😴"
        />
      ),
      today_sleep_debt: (
        <StatCard
          label="Today's Sleep Debt"
          value={debtStats.todaySleepDebt !== null ? formatSleepDebt(debtStats.todaySleepDebt) : '—'}
          sub={`Goal: ${data.settings.sleepGoalHours}h/night`}
          accent="sleep"
          icon="📉"
        />
      ),
      sleep_goal_progress: (
        <StatCard
          label="Sleep Goal Progress"
          value={`${debtStats.goalProgress.toFixed(0)}%`}
          sub={debtStats.nightCount > 0 ? `${debtStats.nightsAtGoal} of ${debtStats.nightCount} nights met goal` : `Target: ${data.settings.sleepGoalHours}h/night`}
          accent="sleep"
          icon="✅"
        />
      ),
      recommended_bedtime: (
        <StatCard
          label="Recommended Bedtime"
          value={schedule.recommendedBedtime}
          sub={schedule.autoCalculateBedtime ? `Wake goal ${schedule.effectiveWakeTime} − ${schedule.goalHours}h` : `Target ${schedule.effectiveBedtime}`}
          accent="sleep"
          icon="🌙"
        />
      ),
      recommended_wake: (
        <StatCard
          label="Recommended Wake-up"
          value={schedule.recommendedWakeTime}
          sub={schedule.autoCalculateWakeTime ? `Bedtime goal ${schedule.effectiveBedtime} + ${schedule.goalHours}h` : `Target ${schedule.effectiveWakeTime}`}
          accent="sleep"
          icon="☀️"
        />
      ),
      total_friends: (
        <StatCard
          label="Total Friends"
          value={String(getActiveFriendCount(data))}
          sub={`${data.hangouts.length} hangouts logged`}
          accent="social"
          icon="👥"
        />
      ),
      total_hangouts: (
        <StatCard
          label="Total Hangouts"
          value={String(data.hangouts.length)}
          sub={weekSocial.totalHangouts > 0 ? `${weekSocial.totalHangouts} this week` : 'None this week yet'}
          accent="social"
          icon="🤝"
        />
      ),
      hours_this_week: (
        <StatCard
          label="Hours This Week"
          value={`${weekSocial.totalHours.toFixed(1)}h`}
          sub={weekSocial.topType ? `Top: ${weekSocial.topType}` : 'Social time logged'}
          accent="social"
          icon="📅"
        />
      ),
      last_seen: (
        <StatCard
          label="Last Seen"
          value={lastSeen ? formatDaysSinceLabel(lastSeen.daysAgo) : '—'}
          sub={lastSeen ? `${lastSeen.friendNames} · ${formatDateTime(lastSeen.timestamp)}` : 'No hangouts logged yet'}
          accent="social"
          icon="👋"
        />
      ),
      catch_up: null,
      upcoming_ideas: null,
      quick_actions: null,
      recent_activity: null,
    }),
    [awakeMs, data, debtStats, isSleeping, lastSeen, lastSleep, schedule, sleepVsGoal, weekSocial]
  );

  const panelWidgets: Partial<Record<DashboardWidgetId, React.ReactNode>> = {
    catch_up: <CatchUpWidget onOpenFriend={setDetailFriendId} />,
    upcoming_ideas: <UpcomingIdeasWidget />,
    quick_actions: <QuickActionsWidget />,
    recent_activity: <RecentActivityWidget limit={8} />,
  };

  const renderGroup = (group: DashboardWidgetGroup) => {
    const widgets = visibleWidgetsByGroup(layout, group);
    if (widgets.length === 0) return null;

    const statIds = widgets.filter((w) => w.kind === 'stat').map((w) => w.id);
    const panelIds = widgets.filter((w) => w.kind === 'widget').map((w) => w.id);

    return (
      <DashboardSection key={group} title={DASHBOARD_WIDGET_GROUPS.find((g) => g.id === group)!.label}>
        {statIds.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-3">
            {statIds.map((id) => (
              <div key={id}>{statCards[id]}</div>
            ))}
          </div>
        )}
        {panelIds.length > 0 && (
          <div
            className={
              group === 'activity'
                ? 'space-y-3'
                : group === 'planning'
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-3'
                  : 'space-y-3'
            }
          >
            {panelIds.map((id) => (
              <div key={id}>{panelWidgets[id]}</div>
            ))}
          </div>
        )}
      </DashboardSection>
    );
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Dashboard</h1>
        <p className="text-sm opacity-70 mt-1">Today at a glance — sleep, social, and quick actions</p>
      </div>

      {DASHBOARD_WIDGET_GROUPS.map((g) => renderGroup(g.id))}

      <FriendDetailModal
        friendId={detailFriendId}
        onClose={() => setDetailFriendId(null)}
        onEdit={() => setDetailFriendId(null)}
      />
    </div>
  );
}
