import { useState } from 'react';
import { Tabs } from '../ui/Tabs';
import { SleepLogTab } from './SleepLogTab';
import { NapsTab } from './NapsTab';

const logTabs = [
  { id: 'sleep', label: 'Sleep' },
  { id: 'naps', label: 'Naps' },
];

export function SleepLogPanel() {
  const [active, setActive] = useState('sleep');

  return (
    <div>
      <div className="mb-6">
        <Tabs tabs={logTabs} active={active} onChange={setActive} />
      </div>
      {active === 'sleep' && <SleepLogTab />}
      {active === 'naps' && <NapsTab />}
    </div>
  );
}
