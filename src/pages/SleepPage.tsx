import { useState } from 'react';
import { Tabs } from '../components/ui/Tabs';
import { SleepLogTab } from '../components/sleep/SleepLogTab';
import { NapsTab } from '../components/sleep/NapsTab';
import { AwakeTimeTab } from '../components/sleep/AwakeTimeTab';

const tabs = [
  { id: 'log', label: 'Sleep Log' },
  { id: 'naps', label: 'Naps' },
  { id: 'awake', label: 'Awake Time' },
];

export function SleepPage() {
  const [active, setActive] = useState('log');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Sleep</h1>
        <p className="text-sm opacity-70 mt-1">Track sleep, naps, and awake time</p>
      </div>
      <div className="mb-6">
        <Tabs tabs={tabs} active={active} onChange={setActive} />
      </div>
      {active === 'log' && <SleepLogTab />}
      {active === 'naps' && <NapsTab />}
      {active === 'awake' && <AwakeTimeTab />}
    </div>
  );
}
