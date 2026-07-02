import { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function DashboardHeader() {
  return (
    <header
      className="ios-header -mx-4 px-4 pb-5 mb-2 md:mx-0 md:px-0 md:pt-0 md:pb-6"
      style={{ background: 'var(--bg)' }}
    >
      <p className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
        {format(new Date(), 'EEEE, MMMM d')}
      </p>
      <h1
        className="text-[26px] sm:text-[28px] font-bold tracking-tight leading-tight mt-0.5"
        style={{ color: 'var(--text-heading)' }}
      >
        {getGreeting()}
      </h1>
      <p className="text-[15px] mt-1.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
        Your sleep & social at a glance
      </p>
    </header>
  );
}

function DashboardSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2
        className="text-[13px] font-semibold mb-2.5 text-left px-0.5 uppercase tracking-wide"
        style={{ color: 'var(--text-muted)' }}
      >
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
          label="Awake timer"
          value={isSleeping ? 'Sleeping' : formatDurationLive(awakeMs)}
          sub={isSleeping ? 'Paused while sleeping' : 'Since last wake-up'}
          accent="awake"
          icon="timer"
        />
      ),
      last_night_sleep: (
        <StatCard
          label="Last night"
          value={lastSleep ? formatDuration(calcDurationMinutes(lastSleep.sleepStart, lastSleep.wakeUp)) : '—'}
          sub={sleepVsGoal ? formatSleepDebt(sleepVsGoal.debt) : lastSleep ? `${formatTime(lastSleep.wakeUp)} wake-up` : 'No sleep logged yet'}
          accent="sleep"
          icon="bed"
        />
      ),
      today_sleep_debt: (
        <StatCard
          label="Sleep debt"
          value={debtStats.todaySleepDebt !== null ? formatSleepDebt(debtStats.todaySleepDebt) : '—'}
          sub={`Goal: ${data.settings.sleepGoalHours}h/night`}
          accent="sleep"
          icon="trend-down"
        />
      ),
      sleep_goal_progress: (
        <StatCard
          label="Goal progress"
          value={`${debtStats.goalProgress.toFixed(0)}%`}
          sub={debtStats.nightCount > 0 ? `${debtStats.nightsAtGoal} of ${debtStats.nightCount} nights` : `Target: ${data.settings.sleepGoalHours}h`}
          accent="sleep"
          icon="check"
        />
      ),
      recommended_bedtime: (
        <StatCard
          label="Bedtime"
          value={schedule.recommendedBedtime}
          sub={schedule.autoCalculateBedtime ? `Wake ${schedule.effectiveWakeTime} − ${schedule.goalHours}h` : `Target ${schedule.effectiveBedtime}`}
          accent="sleep"
          icon="moon"
        />
      ),
      recommended_wake: (
        <StatCard
          label="Wake-up"
          value={schedule.recommendedWakeTime}
          sub={schedule.autoCalculateWakeTime ? `Bed ${schedule.effectiveBedtime} + ${schedule.goalHours}h` : `Target ${schedule.effectiveWakeTime}`}
          accent="sleep"
          icon="sun"
        />
      ),
      total_friends: (
        <StatCard
          label="Friends"
          value={String(getActiveFriendCount(data))}
          sub={`${data.hangouts.length} hangouts logged`}
          accent="social"
          icon="users"
        />
      ),
      total_hangouts: (
        <StatCard
          label="Hangouts"
          value={String(data.hangouts.length)}
          sub={weekSocial.totalHangouts > 0 ? `${weekSocial.totalHangouts} this week` : 'None this week yet'}
          accent="social"
          icon="handshake"
        />
      ),
      hours_this_week: (
        <StatCard
          label="This week"
          value={`${weekSocial.totalHours.toFixed(1)}h`}
          sub={weekSocial.topType ? `Top: ${weekSocial.topType}` : 'Social time logged'}
          accent="social"
          icon="calendar"
        />
      ),
      last_seen: (
        <StatCard
          label="Last seen"
          value={lastSeen ? formatDaysSinceLabel(lastSeen.daysAgo) : '—'}
          sub={lastSeen ? `${lastSeen.friendNames} · ${formatDateTime(lastSeen.timestamp)}` : 'No hangouts logged yet'}
          accent="social"
          icon="wave"
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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 mb-2.5">
            {statIds.map((id) => (
              <div key={id}>{statCards[id]}</div>
            ))}
          </div>
        )}
        {panelIds.length > 0 && (
          <div
            className={
              group === 'activity'
                ? 'space-y-2.5'
                : group === 'planning'
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-2.5'
                  : 'space-y-2.5'
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
      <DashboardHeader />

      {DASHBOARD_WIDGET_GROUPS.map((g) => renderGroup(g.id))}

      <FriendDetailModal
        friendId={detailFriendId}
        onClose={() => setDetailFriendId(null)}
        onEdit={() => setDetailFriendId(null)}
      />
    </div>
  );
}
