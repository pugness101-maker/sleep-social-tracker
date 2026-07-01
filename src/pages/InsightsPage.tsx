import { useState } from 'react';
import { Tabs } from '../components/ui/Tabs';
import { CalendarTab } from '../components/insights/CalendarTab';
import { StatisticsTab } from '../components/insights/StatisticsTab';
import { TimelineTab } from '../components/insights/TimelineTab';
import { MapTab } from '../components/insights/MapTab';

const tabs = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'map', label: 'Map' },
];

export function InsightsPage() {
  const [active, setActive] = useState('calendar');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Insights</h1>
        <p className="text-sm opacity-70 mt-1">Calendar, statistics, timeline, and location history</p>
      </div>
      <div className="mb-6">
        <Tabs tabs={tabs} active={active} onChange={setActive} />
      </div>
      {active === 'calendar' && <CalendarTab />}
      {active === 'statistics' && <StatisticsTab />}
      {active === 'timeline' && <TimelineTab />}
      {active === 'map' && <MapTab />}
    </div>
  );
}
