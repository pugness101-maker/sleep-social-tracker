import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, isSameMonth } from 'date-fns';
import { Card, StatCard } from '../ui/Card';
import { avgMinutesToTime, formatDuration } from '../../lib/dates';
import {
  getSleepInsights,
  formatDebtCalendarShort,
  sleepCalendarCellStyle,
  WEEKDAY_LABELS,
  type HeatmapDay,
  type HeatmapMode,
} from '../../lib/sleep-insights';
import { buildScheduleTrend } from '../../lib/sleep-charts';
import { BedtimeWakeTrendChart } from './SleepCharts';
import type { AppData } from '../../types';

interface SleepInsightsSectionProps {
  data: AppData;
  rangeStart?: Date;
  rangeEnd?: Date;
  rangeLabel?: string;
  /** When set, only render these blocks. Defaults to all. */
  sectionsToShow?: Array<
    'consistency' | 'circadian' | 'heatmap' | 'weekdayTrends' | 'debtCalendar' | 'streaks' | 'bestDays'
  >;
}

const ALL_SECTIONS = [
  'consistency',
  'circadian',
  'heatmap',
  'weekdayTrends',
  'debtCalendar',
  'streaks',
  'bestDays',
] as const;

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

function modePrimaryText(day: HeatmapDay, mode: HeatmapMode): string {
  if (!day.hasData) return 'No sleep';
  if (mode === 'duration') {
    return day.durationMinutes != null ? formatDuration(day.durationMinutes) : '—';
  }
  if (mode === 'debt') {
    return day.debtMinutes != null ? formatDebtCalendarShort(day.debtMinutes) : '—';
  }
  return day.metGoal ? 'Met' : 'Missed';
}

function SleepCalendar({
  days,
  mode,
  onModeChange,
}: {
  days: HeatmapDay[];
  mode: HeatmapMode;
  onModeChange: (m: HeatmapMode) => void;
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
  const hasAnyData = days.some((d) => d.hasData);

  if (!hasAnyData) {
    return <p className="text-sm opacity-70 text-left">No sleep data for this range.</p>;
  }

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
      <div className="flex flex-wrap gap-3 mb-4 text-[10px] opacity-70">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border" style={{ background: 'rgba(52,211,153,0.14)', borderColor: 'rgba(52,211,153,0.35)' }} /> Met / over goal</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border" style={{ background: 'rgba(234,179,8,0.14)', borderColor: 'rgba(234,179,8,0.35)' }} /> Under &lt;1h</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.35)' }} /> Under 1h+</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }} /> No data</span>
      </div>
      <div className="space-y-6 overflow-x-auto">
        {months.map((monthStart) => {
          const monthEnd = endOfMonth(monthStart);
          const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
          const cells: (HeatmapDay | null)[] = [];
          let cursor = gridStart;
          while (cursor <= monthEnd || cells.length % 7 !== 0) {
            if (isSameMonth(cursor, monthStart)) {
              const key = format(cursor, 'yyyy-MM-dd');
              cells.push(
                dayMap.get(key) ?? {
                  date: cursor,
                  dateKey: key,
                  dateLabel: format(cursor, 'MMM d'),
                  dayOfMonth: cursor.getDate(),
                  durationMinutes: null,
                  debtMinutes: null,
                  metGoal: null,
                  hasData: false,
                  bedtimeLabel: null,
                  wakeLabel: null,
                }
              );
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
              <div className="grid grid-cols-7 gap-1.5 min-w-[320px]">
                {WEEKDAY_LABELS.map((l) => (
                  <div key={l} className="text-[10px] text-center opacity-50 pb-1">{l}</div>
                ))}
                {cells.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} className="min-h-[88px]" />;
                  const style = sleepCalendarCellStyle(day);
                  return (
                    <div
                      key={day.dateKey}
                      className="min-h-[88px] rounded-lg border p-1.5 text-left text-[10px] leading-snug"
                      style={style}
                    >
                      <p className="font-semibold text-[11px]" style={{ color: 'var(--text-heading)' }}>
                        {day.dateLabel}
                      </p>
                      {day.hasData ? (
                        <>
                          <p className="mt-1 font-medium">{modePrimaryText(day, mode)}</p>
                          {mode !== 'debt' && day.debtMinutes != null && (
                            <p className="opacity-75">{formatDebtCalendarShort(day.debtMinutes)}</p>
                          )}
                          {mode !== 'duration' && day.durationMinutes != null && (
                            <p className="opacity-75">{formatDuration(day.durationMinutes)}</p>
                          )}
                          {day.bedtimeLabel && day.wakeLabel && (
                            <p className="opacity-60 mt-1 truncate" title={`${day.bedtimeLabel} → ${day.wakeLabel}`}>
                              {day.bedtimeLabel} → {day.wakeLabel}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="mt-2 opacity-40">—</p>
                      )}
                    </div>
                  );
                })}
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

export function SleepInsightsSection({ data, rangeStart, rangeEnd, rangeLabel, sectionsToShow }: SleepInsightsSectionProps) {
  const [calendarMode, setCalendarMode] = useState<HeatmapMode>('duration');

  const show = new Set(sectionsToShow ?? ALL_SECTIONS);

  const insights = useMemo(
    () => getSleepInsights(data.sleepEntries, data.settings, rangeStart, rangeEnd),
    [data.sleepEntries, data.settings, rangeStart, rangeEnd]
  );

  const scheduleTrend = useMemo(
    () => buildScheduleTrend(data.sleepEntries, insights.goalMinutes, rangeStart, rangeEnd),
    [data.sleepEntries, insights.goalMinutes, rangeStart, rangeEnd]
  );

  const { bestDays } = insights;

  return (
    <div className="space-y-6">
      {show.has('consistency') && (
      <Card>
        <h4 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Sleep Consistency Score</h4>
        <p className="text-xs opacity-60 mb-3 text-left">Based on bedtime and wake-up time variation. Higher = more consistent.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard label="Last 7 Days" value={`${insights.consistency.last7.overall}%`} sub={`Bed ${insights.consistency.last7.bedtime}% · Wake ${insights.consistency.last7.wakeUp}% · Dur ${insights.consistency.last7.duration}%`} accent="sleep" />
          <StatCard label="Last 30 Days" value={`${insights.consistency.last30.overall}%`} sub={`Bed ${insights.consistency.last30.bedtime}% · Wake ${insights.consistency.last30.wakeUp}% · Dur ${insights.consistency.last30.duration}%`} accent="sleep" />
          <StatCard label={rangeLabel ?? 'Selected Range'} value={`${insights.consistency.range.overall}%`} sub={`Bed ${insights.consistency.range.bedtime}% · Wake ${insights.consistency.range.wakeUp}% · Dur ${insights.consistency.range.duration}%`} accent="sleep" />
        </div>
      </Card>
      )}

      {show.has('circadian') && (
        <BedtimeWakeTrendChart
          points={scheduleTrend}
          goalBedtimeMinutes={insights.goalBedtimeMinutes}
          targetWakeMinutes={insights.targetWakeMinutes}
          goalHours={data.settings.sleepGoalHours}
        />
      )}

      {show.has('heatmap') && (
      <Card>
        <h4 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Sleep Calendar</h4>
        <p className="text-xs opacity-60 mb-3 text-left">Each day uses wake-up date. Color reflects goal progress.</p>
        <SleepCalendar
          days={insights.heatmapDays}
          mode={calendarMode}
          onModeChange={setCalendarMode}
        />
      </Card>
      )}

      {show.has('weekdayTrends') && (
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
      )}

      {show.has('debtCalendar') && (
      <Card>
        <h4 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Sleep Debt Calendar</h4>
        <DebtCalendar days={insights.debtCalendarDays} />
      </Card>
      )}

      {show.has('streaks') && (
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
      )}

      {show.has('bestDays') && (
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
      )}
    </div>
  );
}
