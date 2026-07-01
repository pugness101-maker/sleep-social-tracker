import { useState } from 'react';
import { Button } from '../ui/Button';
import {
  DASHBOARD_WIDGETS,
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
    <div className="space-y-3 text-left">
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={reset}>Reset to Default</Button>
      </div>
      <ul className="space-y-2">
        {layout.order.map((id) => {
          const def = DASHBOARD_WIDGETS.find((w) => w.id === id)!;
          const visible = !layout.hidden.includes(id);
          return (
            <li key={id} className="flex flex-wrap items-center gap-2 border rounded-lg p-2" style={{ borderColor: 'var(--border)' }}>
              <label className="flex items-center gap-2 text-sm flex-1 min-w-[180px]">
                <input type="checkbox" checked={visible} onChange={() => toggle(id)} className="rounded" />
                {def.label}
              </label>
              <Button size="sm" variant="ghost" onClick={() => move(id, -1)}>↑</Button>
              <Button size="sm" variant="ghost" onClick={() => move(id, 1)}>↓</Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
