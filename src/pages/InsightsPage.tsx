import { useState } from 'react';
import { Tabs } from '../components/ui/Tabs';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { PageIntro } from '../components/layout/PageIntro';
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
  const [resetKey, setResetKey] = useState(0);

  return (
    <div>
      <PageIntro
        title="Insights"
        description="Deep analytics, charts, trends, and historical metrics"
      />
      <div className="mb-4 md:mb-6">
        <Tabs tabs={tabs} active={active} onChange={setActive} />
      </div>
      <ErrorBoundary key={resetKey} onReset={() => setResetKey((k) => k + 1)}>
        {active === 'calendar' && <CalendarTab />}
        {active === 'statistics' && <StatisticsTab />}
        {active === 'timeline' && <TimelineTab />}
        {active === 'map' && <MapTab />}
      </ErrorBoundary>
    </div>
  );
}
