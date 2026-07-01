import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, isSameMonth } from 'date-fns';
import { Card, StatCard } from '../ui/Card';
import { avgMinutesToTime, formatDuration } from '../../lib/dates';
import {
  getSleepInsights,
  heatmapCellColor,
  formatDebtCalendarShort,
  WEEKDAY_LABELS,
  type HeatmapMode,
} from '../../lib/sleep-insights';
import { minutesToDisplayTime } from '../../lib/sleep-goals';
import type { AppData } from '../../types';

interface SleepInsightsSectionProps {
  data: AppData;
  rangeStart?: Date;
  rangeEnd?: Date;
  rangeLabel?: string;
}

function WeekdayTimeChart({
  title,
  values,
  formatValue,
}: {
  title: string;
  values: Record<number, number | null>;
  formatValue: (m: number) => string;
}) {
  return (
    <Card>
      <h3 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>{title}</h3>
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAY_LABELS.map((label, d) => {
          const val = values[d];
          const display = val != null ? formatValue(val > 24 * 60 ? val - 24 * 60 : val) : '—';
          const heightPct = val != null ? Math.min(100, ((val % (24 * 60)) / (24 * 60)) * 100) : 0;
          return (
            <div key={label} className="text-center">
              <p className="text-xs opacity-70 mb-1">{label}</p>
              <div className="h-16 rounded-lg relative overflow-hidden" style={{ background: 'var(--bg)' }}>
                {val != null && (
                  <div
                    className="absolute bottom-0 w-full bg-sleep/60 rounded-b-lg"
                    style={{ height: `${Math.max(8, heightPct)}%` }}
                  />
                )}
              </div>
              <p className="text-xs mt-1 font-medium">{display}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CircadianGraph({
  points,
  goalBedtimeMinutes,
  targetWakeMinutes,
  goalMinutes,
}: {
  points: ReturnType<typeof getSleepInsights>['circadian'];
  goalBedtimeMinutes: number;
  targetWakeMinutes: number;
  goalMinutes: number;
}) {
  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 16, bottom: 28, left: 44 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  if (points.length === 0) {
    return <p className="text-sm opacity-70 text-left">No sleep entries in this range.</p>;
  }

  const yForMinutes = (mins: number) => {
    const normalized = mins % (24 * 60);
    return pad.top + chartH - (normalized / (24 * 60)) * chartH;
  };

  const xForIndex = (i: number) =>
    pad.left + (points.length === 1 ? chartW / 2 : (i / (points.length - 1)) * chartW);

  const bedPoints = points.map((p, i) => `${xForIndex(i)},${yForMinutes(p.bedtimeMinutes)}`).join(' ');
  const wakePoints = points.map((p, i) => `${xForIndex(i)},${yForMinutes(p.wakeMinutes)}`).join(' ');

  const yTicks = [0, 6, 12, 18].map((h) => h * 60);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[320px]" role="img" aria-label="Circadian rhythm chart">
        {yTicks.map((mins) => (
          <g key={mins}>
            <line
              x1={pad.left}
              y1={yForMinutes(mins)}
              x2={width - pad.right}
              y2={yForMinutes(mins)}
              stroke="var(--border)"
              strokeDasharray="4 4"
            />
            <text x={4} y={yForMinutes(mins) + 4} fontSize={10} fill="currentColor" opacity={0.6}>
              {minutesToDisplayTime(mins)}
            </text>
          </g>
        ))}
        <line
          x1={pad.left}
          y1={yForMinutes(goalBedtimeMinutes)}
          x2={width - pad.right}
          y2={yForMinutes(goalBedtimeMinutes)}
          stroke="#818cf8"
          strokeDasharray="6 4"
          opacity={0.7}
        />
        <line
          x1={pad.left}
          y1={yForMinutes(targetWakeMinutes)}
          x2={width - pad.right}
          y2={yForMinutes(targetWakeMinutes)}
          stroke="#34d399"
          strokeDasharray="6 4"
          opacity={0.7}
        />
        <polyline fill="none" stroke="#6366f1" strokeWidth={2} points={bedPoints} />
        <polyline fill="none" stroke="#14b8a6" strokeWidth={2} points={wakePoints} />
        {points.map((p, i) => (
          <g key={p.dateKey}>
            <circle cx={xForIndex(i)} cy={yForMinutes(p.bedtimeMinutes)} r={3} fill="#6366f1" />
            <circle cx={xForIndex(i)} cy={yForMinutes(p.wakeMinutes)} r={3} fill="#14b8a6" />
            <text
              x={xForIndex(i)}
              y={height - 6}
              textAnchor="middle"
              fontSize={9}
              fill="currentColor"
              opacity={0.65}
            >
              {p.dateLabel}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-4 mt-2 text-xs opacity-70">
        <span><span className="inline-block w-3 h-0.5 bg-indigo-500 mr-1 align-middle" /> Bedtime</span>
        <span><span className="inline-block w-3 h-0.5 bg-teal-500 mr-1 align-middle" /> Wake-up</span>
        <span><span className="inline-block w-3 h-0.5 border-t border-dashed border-indigo-400 mr-1 align-middle" /> Goal bedtime</span>
        <span><span className="inline-block w-3 h-0.5 border-t border-dashed border-emerald-400 mr-1 align-middle" /> Target wake ({formatDuration(goalMinutes)} goal)</span>
      </div>
    </div>
  );
}

function SleepHeatmap({
  days,
  mode,
  onModeChange,
  goalMinutes,
}: {
  days: ReturnType<typeof getSleepInsights>['heatmapDays'];
  mode: HeatmapMode;
  onModeChange: (m: HeatmapMode) => void;
  goalMinutes: number;
}) {
  const months = useMemo(() => {
    if (days.length === 0) return [];
    const first = days[0].date;
    const last = days[days.length - 1].date;
    const result: Date[] = [];
    let cursor = startOfMonth(first);
    while (cursor <= last) {
      result.push(cursor);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return result;
  }, [days]);

  const dayMap = useMemo(() => new Map(days.map((d) => [d.dateKey, d])), [days]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {(['duration', 'debt', 'goal_met'] as HeatmapMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={`px-3 py-1 rounded-md text-xs border ${mode === m ? 'bg-primary text-white border-primary' : ''}`}
            style={mode !== m ? { borderColor: 'var(--border)' } : undefined}
          >
            {m === 'duration' ? 'Duration' : m === 'debt' ? 'Sleep debt' : 'Goal met'}
          </button>
        ))}
      </div>
      <div className="space-y-6 overflow-x-auto">
        {months.map((monthStart) => {
          const monthEnd = endOfMonth(monthStart);
          const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
          const cells: (ReturnType<typeof getSleepInsights>['heatmapDays'][number] | null)[] = [];
          let cursor = gridStart;
          while (cursor <= monthEnd || cells.length % 7 !== 0) {
            if (isSameMonth(cursor, monthStart)) {
              const key = format(cursor, 'yyyy-MM-dd');
              cells.push(dayMap.get(key) ?? {
                date: cursor,
                dateKey: key,
                dayOfMonth: cursor.getDate(),
                durationMinutes: null,
                debtMinutes: null,
                metGoal: null,
                hasData: false,
              });
            } else {
              cells.push(null);
            }
            cursor = addDays(cursor, 1);
            if (cells.length > 42) break;
          }

          return (
            <div key={monthStart.toISOString()}>
              <p className="text-sm font-medium mb-2 text-left" style={{ color: 'var(--text-heading)' }}>
                {format(monthStart, 'MMMM yyyy')}
              </p>
              <div className="grid grid-cols-7 gap-1 min-w-[280px]">
                {WEEKDAY_LABELS.map((l) => (
                  <div key={l} className="text-[10px] text-center opacity-50 pb-1">{l}</div>
                ))}
                {cells.map((day, i) =>
                  day ? (
                    <div
                      key={day.dateKey}
                      title={
                        day.hasData
                          ? `${day.dateKey}: ${day.durationMinutes != null ? formatDuration(day.durationMinutes) : ''}`
                          : day.dateKey
                      }
                      className="aspect-square rounded text-[10px] flex items-center justify-center"
                      style={{
                        background: heatmapCellColor(day, mode, goalMinutes),
                        color: day.hasData ? 'var(--text)' : 'transparent',
                      }}
                    >
                      {isSameMonth(day.date, monthStart) ? day.dayOfMonth : ''}
                    </div>
                  ) : (
                    <div key={`empty-${i}`} className="aspect-square" />
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DebtCalendar({ days }: { days: ReturnType<typeof getSleepInsights>['debtCalendarDays'] }) {
  if (days.length === 0) {
    return <p className="text-sm opacity-70 text-left">No sleep entries in this range.</p>;
  }

  const reversed = [...days].reverse().slice(0, 35);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {reversed.map((day) => (
        <div
          key={day.dateKey}
          className="rounded-lg p-2 text-left border text-xs"
          style={{
            borderColor: 'var(--border)',
            background: day.debtMinutes != null && day.debtMinutes <= 0 ? 'rgba(52,211,153,0.12)' : day.debtMinutes != null && day.debtMinutes > 0 ? 'rgba(239,68,68,0.08)' : 'var(--bg)',
          }}
        >
          <p className="font-medium opacity-80">{day.dateLabel}</p>
          <p className="mt-1 font-semibold" style={{ color: 'var(--text-heading)' }}>
            {day.debtMinutes != null ? formatDebtCalendarShort(day.debtMinutes) : '—'}
          </p>
        </div>
      ))}
    </div>
  );
}

export function SleepInsightsSection({ data, rangeStart, rangeEnd, rangeLabel }: SleepInsightsSectionProps) {
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('duration');

  const insights = useMemo(
    () => getSleepInsights(data.sleepEntries, data.settings, rangeStart, rangeEnd),
    [data.sleepEntries, data.settings, rangeStart, rangeEnd]
  );

  const { bestDays } = insights;

  return (
    <div className="mt-8 space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-1 text-left" style={{ color: 'var(--text-heading)' }}>
          Advanced Sleep Insights
        </h3>
        <p className="text-sm opacity-70 text-left">
          Schedule analysis using your {data.settings.sleepGoalHours}h goal and {data.settings.targetWakeUpTime} wake target
          {rangeLabel ? ` · ${rangeLabel}` : ''}.
        </p>
      </div>

      <Card>
        <h4 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Sleep Consistency Score</h4>
        <p className="text-xs opacity-60 mb-3 text-left">Based on bedtime and wake-up time variation. Higher = more consistent.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard label="Last 7 Days" value={`${insights.consistency.last7.overall}%`} sub={`Bed ${insights.consistency.last7.bedtime}% · Wake ${insights.consistency.last7.wakeUp}% · Dur ${insights.consistency.last7.duration}%`} accent="sleep" />
          <StatCard label="Last 30 Days" value={`${insights.consistency.last30.overall}%`} sub={`Bed ${insights.consistency.last30.bedtime}% · Wake ${insights.consistency.last30.wakeUp}% · Dur ${insights.consistency.last30.duration}%`} accent="sleep" />
          <StatCard label={rangeLabel ?? 'Selected Range'} value={`${insights.consistency.range.overall}%`} sub={`Bed ${insights.consistency.range.bedtime}% · Wake ${insights.consistency.range.wakeUp}% · Dur ${insights.consistency.range.duration}%`} accent="sleep" />
        </div>
      </Card>

      <Card>
        <h4 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Circadian Rhythm</h4>
        <CircadianGraph
          points={insights.circadian}
          goalBedtimeMinutes={insights.goalBedtimeMinutes}
          targetWakeMinutes={insights.targetWakeMinutes}
          goalMinutes={insights.goalMinutes}
        />
      </Card>

      <Card>
        <h4 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Sleep Schedule Heatmap</h4>
        <SleepHeatmap
          days={insights.heatmapDays}
          mode={heatmapMode}
          onModeChange={setHeatmapMode}
          goalMinutes={insights.goalMinutes}
        />
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <WeekdayTimeChart
          title="Average Bedtime by Weekday"
          values={insights.bedtimeByWeekday}
          formatValue={(m) => avgMinutesToTime(m)}
        />
        <WeekdayTimeChart
          title="Average Wake-up by Weekday"
          values={insights.wakeByWeekday}
          formatValue={(m) => avgMinutesToTime(m)}
        />
      </div>

      <Card>
        <h4 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Sleep Debt Calendar</h4>
        <DebtCalendar days={insights.debtCalendarDays} />
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <h4 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Sleep Goal Streaks</h4>
          <p className="text-xs opacity-60 mb-3 text-left">Nights with sleep ≥ {data.settings.sleepGoalHours}h goal.</p>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Current Streak" value={`${insights.goalStreaks.current} nights`} accent="sleep" />
            <StatCard label="Longest Streak" value={`${insights.goalStreaks.longest} nights`} accent="sleep" />
          </div>
        </Card>
        <Card>
          <h4 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Wake-up Streaks</h4>
          <p className="text-xs opacity-60 mb-3 text-left">Mornings waking at or before {data.settings.targetWakeUpTime}.</p>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Current Streak" value={`${insights.wakeStreaks.current} mornings`} accent="sleep" />
            <StatCard label="Longest Streak" value={`${insights.wakeStreaks.longest} mornings`} accent="sleep" />
          </div>
        </Card>
      </div>

      <Card>
        <h4 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Best Sleep Days Analysis</h4>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="opacity-60 block">Best sleep day overall</span>
            <span className="font-medium">
              {bestDays.bestSleepDay ? `${bestDays.bestSleepDay.date} · ${formatDuration(bestDays.bestSleepDay.durationMinutes)}` : '—'}
            </span>
          </div>
          <div>
            <span className="opacity-60 block">Best weekday for sleep</span>
            <span className="font-medium">
              {bestDays.bestWeekday ? `${bestDays.bestWeekday.label} · ${formatDuration(bestDays.bestWeekday.avgMinutes)} avg` : '—'}
            </span>
          </div>
          <div>
            <span className="opacity-60 block">Longest sleep</span>
            <span className="font-medium">
              {bestDays.longestSleep ? `${bestDays.longestSleep.date} · ${formatDuration(bestDays.longestSleep.durationMinutes)}` : '—'}
            </span>
          </div>
          <div>
            <span className="opacity-60 block">Most consistent week</span>
            <span className="font-medium">
              {bestDays.mostConsistentWeek ? `${bestDays.mostConsistentWeek.weekLabel} · ±${bestDays.mostConsistentWeek.stdDevMinutes}m` : '—'}
            </span>
          </div>
          <div>
            <span className="opacity-60 block">Most recovered day</span>
            <span className="font-medium">
              {bestDays.mostRecoveredDay ? `${bestDays.mostRecoveredDay.date} · ${formatDuration(bestDays.mostRecoveredDay.surplusMinutes)} over` : '—'}
            </span>
          </div>
          <div>
            <span className="opacity-60 block">Lowest sleep debt</span>
            <span className="font-medium">
              {bestDays.lowestDebtDay ? `${bestDays.lowestDebtDay.date} · ${formatDebtCalendarShort(bestDays.lowestDebtDay.debtMinutes)}` : '—'}
            </span>
          </div>
          <div>
            <span className="opacity-60 block">Highest sleep debt</span>
            <span className="font-medium">
              {bestDays.highestDebtDay ? `${bestDays.highestDebtDay.date} · ${formatDebtCalendarShort(bestDays.highestDebtDay.debtMinutes)}` : '—'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
