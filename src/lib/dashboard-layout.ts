export type DashboardWidgetGroup =
  | 'sleep_today'
  | 'social_today'
  | 'planning'
  | 'activity';

export type DashboardWidgetId =
  | 'awake_timer'
  | 'last_night_sleep'
  | 'today_sleep_debt'
  | 'sleep_goal_progress'
  | 'recommended_bedtime'
  | 'recommended_wake'
  | 'total_friends'
  | 'total_hangouts'
  | 'hours_this_week'
  | 'last_seen'
  | 'catch_up'
  | 'upcoming_ideas'
  | 'quick_actions'
  | 'recent_activity';

export interface DashboardWidgetDef {
  id: DashboardWidgetId;
  label: string;
  kind: 'stat' | 'widget';
  group: DashboardWidgetGroup;
}

export const DASHBOARD_WIDGET_GROUPS: { id: DashboardWidgetGroup; label: string }[] = [
  { id: 'sleep_today', label: 'Sleep Today' },
  { id: 'social_today', label: 'Social Today' },
  { id: 'planning', label: 'Planning' },
  { id: 'activity', label: 'Activity' },
];

export const DASHBOARD_WIDGETS: DashboardWidgetDef[] = [
  { id: 'awake_timer', label: 'Current Awake Timer', kind: 'stat', group: 'sleep_today' },
  { id: 'last_night_sleep', label: "Last Night's Sleep", kind: 'stat', group: 'sleep_today' },
  { id: 'today_sleep_debt', label: "Today's Sleep Debt", kind: 'stat', group: 'sleep_today' },
  { id: 'sleep_goal_progress', label: 'Sleep Goal Progress', kind: 'stat', group: 'sleep_today' },
  { id: 'recommended_bedtime', label: 'Recommended Bedtime', kind: 'stat', group: 'sleep_today' },
  { id: 'recommended_wake', label: 'Recommended Wake-up', kind: 'stat', group: 'sleep_today' },
  { id: 'total_friends', label: 'Total Friends', kind: 'stat', group: 'social_today' },
  { id: 'total_hangouts', label: 'Total Hangouts', kind: 'stat', group: 'social_today' },
  { id: 'hours_this_week', label: 'Hours This Week', kind: 'stat', group: 'social_today' },
  { id: 'last_seen', label: 'Last Seen', kind: 'stat', group: 'social_today' },
  { id: 'catch_up', label: 'Need to Catch Up', kind: 'widget', group: 'social_today' },
  { id: 'upcoming_ideas', label: 'Upcoming Ideas', kind: 'widget', group: 'planning' },
  { id: 'quick_actions', label: 'Quick Actions', kind: 'widget', group: 'planning' },
  { id: 'recent_activity', label: 'Recent Activity Feed', kind: 'widget', group: 'activity' },
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

export function visibleWidgetsByGroup(
  layout: DashboardLayout,
  group: DashboardWidgetGroup
): DashboardWidgetDef[] {
  return visibleDashboardWidgets(layout).filter((w) => w.group === group);
}
