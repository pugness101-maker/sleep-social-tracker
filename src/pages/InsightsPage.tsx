import { useState } from 'react';
import { Tabs } from '../components/ui/Tabs';
import { CalendarTab } from '../components/insights/CalendarTab';
import { StatisticsTab } from '../components/insights/StatisticsTab';

const tabs = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'statistics', label: 'Statistics' },
];

export function InsightsPage() {
  const [active, setActive] = useState('calendar');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Insights</h1>
        <p className="text-sm opacity-70 mt-1">Calendar views and detailed statistics</p>
      </div>
      <div className="mb-6">
        <Tabs tabs={tabs} active={active} onChange={setActive} />
      </div>
      {active === 'calendar' && <CalendarTab />}
      {active === 'statistics' && <StatisticsTab />}
    </div>
  );
}
