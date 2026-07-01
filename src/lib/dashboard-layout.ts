export type DashboardWidgetId =
  | 'awake_timer'
  | 'sleep_goal'
  | 'recommended_bedtime'
  | 'recommended_wake'
  | 'last_night_sleep'
  | 'today_sleep_debt'
  | 'week_sleep_debt'
  | 'sleep_goal_progress'
  | 'today_wake'
  | 'today_naps'
  | 'today_hangouts'
  | 'avg_sleep_week'
  | 'this_week_social'
  | 'top_friends'
  | 'catch_up'
  | 'birthdays'
  | 'recent_activity'
  | 'location_history'
  | 'sleep_goal_streak'
  | 'wake_streak';

export interface DashboardWidgetDef {
  id: DashboardWidgetId;
  label: string;
  kind: 'stat' | 'widget';
}

export const DASHBOARD_WIDGETS: DashboardWidgetDef[] = [
  { id: 'awake_timer', label: 'Current Awake Timer', kind: 'stat' },
  { id: 'sleep_goal', label: 'Sleep Goal', kind: 'stat' },
  { id: 'recommended_bedtime', label: 'Recommended Bedtime', kind: 'stat' },
  { id: 'recommended_wake', label: 'Recommended Wake Time', kind: 'stat' },
  { id: 'last_night_sleep', label: "Last Night's Sleep", kind: 'stat' },
  { id: 'today_sleep_debt', label: "Today's Sleep Debt", kind: 'stat' },
  { id: 'week_sleep_debt', label: "This Week's Sleep Debt", kind: 'stat' },
  { id: 'sleep_goal_progress', label: 'Sleep Goal Progress', kind: 'stat' },
  { id: 'today_wake', label: "Today's Wake-up", kind: 'stat' },
  { id: 'today_naps', label: "Today's Naps", kind: 'stat' },
  { id: 'today_hangouts', label: "Today's Hangouts", kind: 'stat' },
  { id: 'avg_sleep_week', label: 'Avg Sleep This Week', kind: 'stat' },
  { id: 'this_week_social', label: 'This Week Social', kind: 'widget' },
  { id: 'top_friends', label: 'Top Friends This Month', kind: 'widget' },
  { id: 'catch_up', label: 'Need to Catch Up', kind: 'widget' },
  { id: 'birthdays', label: 'Upcoming Birthdays', kind: 'widget' },
  { id: 'recent_activity', label: 'Recent Activity', kind: 'widget' },
  { id: 'location_history', label: 'Location History', kind: 'widget' },
  { id: 'sleep_goal_streak', label: 'Sleep Goal Streak', kind: 'stat' },
  { id: 'wake_streak', label: 'Wake-up Streak', kind: 'stat' },
];

export const DASHBOARD_LAYOUT_KEY = 'sleep-social-tracker-dashboard-layout';
export const DASHBOARD_LAYOUT_CHANGED_EVENT = 'sleep-social-tracker-dashboard-layout-changed';

export interface DashboardLayout {
  order: DashboardWidgetId[];
  hidden: DashboardWidgetId[];
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  order: DASHBOARD_WIDGETS.map((w) => w.id),
  hidden: [],
};

export function loadDashboardLayout(): DashboardLayout {
  try {
    const raw = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
    if (!raw) return { ...DEFAULT_DASHBOARD_LAYOUT, order: [...DEFAULT_DASHBOARD_LAYOUT.order] };
    const parsed = JSON.parse(raw) as DashboardLayout;
    const known = new Set(DASHBOARD_WIDGETS.map((w) => w.id));
    const order = (parsed.order ?? []).filter((id) => known.has(id));
    for (const w of DASHBOARD_WIDGETS) {
      if (!order.includes(w.id)) order.push(w.id);
    }
    const hidden = (parsed.hidden ?? []).filter((id) => known.has(id));
    return { order, hidden };
  } catch {
    return { ...DEFAULT_DASHBOARD_LAYOUT, order: [...DEFAULT_DASHBOARD_LAYOUT.order] };
  }
}

export function saveDashboardLayout(layout: DashboardLayout): void {
  localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layout));
  window.dispatchEvent(new CustomEvent(DASHBOARD_LAYOUT_CHANGED_EVENT));
}

export function visibleDashboardWidgets(layout: DashboardLayout): DashboardWidgetDef[] {
  const hiddenSet = new Set(layout.hidden);
  return layout.order
    .filter((id) => !hiddenSet.has(id))
    .map((id) => DASHBOARD_WIDGETS.find((w) => w.id === id)!)
    .filter(Boolean);
}
