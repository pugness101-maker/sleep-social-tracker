import { useApp } from '../../context/AppContext';
import { useAwakeTimer } from '../../hooks/useLiveTimer';
import { Card, StatCard } from '../ui/Card';
import { getAwakeStats, getLastWakeUp } from '../../lib/stats';
import { formatDurationLive, formatDateTime, formatDuration } from '../../lib/dates';

export function AwakeTimeTab() {
  const { data } = useApp();
  const awakeMs = useAwakeTimer(data);
  const stats = getAwakeStats(data);
  const lastWake = getLastWakeUp(data);
  const isSleeping = !!data.activeTimers.sleepStart;
  const warningHours = data.settings.awakeWarningHours;
  const awakeHours = awakeMs / 3600000;
  const isWarning = !isSleeping && awakeHours >= warningHours;

  return (
    <div className="space-y-6">
      <Card className={`${isWarning ? 'border-awake bg-awake/10' : 'border-awake/30 bg-awake/5'}`}>
        <p className="text-sm opacity-70 text-left">Time awake since last wake-up</p>
        <p className="text-4xl font-bold mt-2 text-left" style={{ color: 'var(--text-heading)' }}>
          {isSleeping ? 'Sleeping' : formatDurationLive(awakeMs)}
        </p>
        {lastWake && !isSleeping && (
          <p className="text-sm opacity-70 mt-2 text-left">Last wake-up: {formatDateTime(lastWake)}</p>
        )}
        {isWarning && (
          <div className="mt-4 p-3 rounded-lg bg-awake/20 text-left">
            <p className="font-medium text-awake">⚠️ You've been awake for over {warningHours} hours</p>
            <p className="text-sm mt-1 opacity-80">Consider getting some rest soon.</p>
          </div>
        )}
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Average Awake Time" value={formatDuration(stats.avgAwake)} accent="awake" />
        <StatCard label="Longest Awake Streak" value={formatDuration(stats.longestStreak)} accent="awake" />
        <StatCard label="Awake Before Bed" value={formatDuration(stats.awakeBeforeBed)} sub="Last period before sleep" accent="awake" />
      </div>

      <Card>
        <h3 className="font-semibold mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Last Sleep → Current Timer</h3>
        {isSleeping ? (
          <p className="text-sm opacity-70 text-left">Currently sleeping. Awake timer is paused.</p>
        ) : lastWake ? (
          <div className="text-left space-y-2">
            <p className="text-sm"><span className="opacity-70">Last wake-up:</span> {formatDateTime(lastWake)}</p>
            <p className="text-sm"><span className="opacity-70">Current awake duration:</span> {formatDurationLive(awakeMs)}</p>
            <p className="text-sm"><span className="opacity-70">Warning threshold:</span> {warningHours} hours</p>
          </div>
        ) : (
          <p className="text-sm opacity-70 text-left">No wake-up recorded yet. Log a sleep entry to start tracking.</p>
        )}
      </Card>
    </div>
  );
}
