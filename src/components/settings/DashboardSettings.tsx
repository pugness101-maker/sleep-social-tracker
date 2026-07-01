import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import {
  DASHBOARD_WIDGETS,
  DASHBOARD_WIDGET_GROUPS,
  DEFAULT_DASHBOARD_LAYOUT,
  loadDashboardLayout,
  saveDashboardLayout,
  type DashboardLayout,
  type DashboardWidgetId,
} from '../../lib/dashboard-layout';

interface DashboardSettingsProps {
  onMessage: (msg: string) => void;
}

export function DashboardSettings({ onMessage }: DashboardSettingsProps) {
  const { data, updateSettings } = useApp();
  const [layout, setLayout] = useState<DashboardLayout>(() => loadDashboardLayout());

  const persist = (next: DashboardLayout) => {
    setLayout(next);
    saveDashboardLayout(next);
  };

  const toggle = (id: DashboardWidgetId) => {
    const hidden = layout.hidden.includes(id)
      ? layout.hidden.filter((h) => h !== id)
      : [...layout.hidden, id];
    persist({ ...layout, hidden });
  };

  const move = (id: DashboardWidgetId, dir: -1 | 1) => {
    const order = [...layout.order];
    const idx = order.indexOf(id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= order.length) return;
    [order[idx], order[nextIdx]] = [order[nextIdx], order[idx]];
    persist({ ...layout, order });
  };

  const reset = () => {
    persist({ order: [...DEFAULT_DASHBOARD_LAYOUT.order], hidden: [] });
    onMessage('Dashboard layout reset to default.');
  };

  return (
    <div className="space-y-4 text-left">
      <p className="text-sm opacity-70">
        Customize your daily dashboard. Deep analytics and charts live on the Insights page.
      </p>
      <label className="flex items-start gap-3 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={data.settings.includeArchivedInDashboard}
          onChange={(e) => updateSettings({ includeArchivedInDashboard: e.target.checked })}
          className="rounded mt-0.5 shrink-0"
        />
        <span>
          Include archived friends in Need to Catch Up
          <span className="block text-xs opacity-70 mt-0.5">
            Archived friends are hidden from other dashboard stats by default.
          </span>
        </span>
      </label>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={reset}>Reset to Default</Button>
      </div>
      {DASHBOARD_WIDGET_GROUPS.map((group) => {
        const groupWidgets = layout.order
          .map((id) => DASHBOARD_WIDGETS.find((w) => w.id === id)!)
          .filter((w) => w && w.group === group.id);
        if (groupWidgets.length === 0) return null;
        return (
          <div key={group.id}>
            <h3 className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">{group.label}</h3>
            <ul className="space-y-2">
              {groupWidgets.map((def) => {
                const visible = !layout.hidden.includes(def.id);
                return (
                  <li
                    key={def.id}
                    className="flex flex-wrap items-center gap-2 border rounded-lg p-2"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <label className="flex items-center gap-2 text-sm flex-1 min-w-[180px]">
                      <input type="checkbox" checked={visible} onChange={() => toggle(def.id)} className="rounded" />
                      {def.label}
                    </label>
                    <Button size="sm" variant="ghost" onClick={() => move(def.id, -1)}>↑</Button>
                    <Button size="sm" variant="ghost" onClick={() => move(def.id, 1)}>↓</Button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
