import { SleepLogPanel } from '../components/sleep/SleepLogPanel';

export function SleepPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Sleep</h1>
        <p className="text-sm opacity-70 mt-1">Track sleep, naps, and awake time in one log</p>
      </div>
      <SleepLogPanel />
    </div>
  );
}
