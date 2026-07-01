import { useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import { formatDuration } from '../../lib/dates';
import { minutesToDisplayTime } from '../../lib/sleep-goals';
import {
  SCHEDULE_CHART_Y_MAX,
  SCHEDULE_CHART_Y_MIN,
  formatTrendDebtLabel,
  formatTrendHours,
  toScheduleChartMinutes,
  type ScheduleTrendPoint,
  type SleepTrendDayPoint,
  type SleepTrendMonthPoint,
} from '../../lib/sleep-charts';

function chartY(value: number, min: number, max: number, chartH: number, padTop: number): number {
  const clamped = Math.max(min, Math.min(max, value));
  return padTop + chartH - ((clamped - min) / (max - min)) * chartH;
}

export function Sleep7DayTrendChart({
  data,
  goalHours,
  emptyMessage = 'No sleep data for this range.',
}: {
  data: SleepTrendDayPoint[];
  goalHours: number;
  emptyMessage?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const hasAnyData = data.some((d) => d.hasData);
  const maxHours = hasAnyData ? Math.max(goalHours, ...data.map((d) => d.hours), 1) : goalHours;
  const yMax = Math.ceil(maxHours + 1);
  const yTicks = useMemo(() => {
    const step = yMax <= 6 ? 1 : 2;
    const ticks: number[] = [];
    for (let h = 0; h <= yMax; h += step) ticks.push(h);
    return ticks;
  }, [yMax]);

  if (!hasAnyData) {
    return (
      <Card>
        <h4 className="font-medium mb-2 text-sm text-left" style={{ color: 'var(--text-heading)' }}>
          7 Day Sleep Trend
        </h4>
        <p className="text-sm opacity-70 text-left">{emptyMessage}</p>
      </Card>
    );
  }

  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 16, bottom: 36, left: 40 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const goalY = chartY(goalHours, 0, yMax, chartH, pad.top);
  const barWidth = Math.min(48, chartW / Math.max(data.length, 1) - 8);

  return (
    <Card>
      <h4 className="font-medium mb-3 text-sm text-left" style={{ color: 'var(--text-heading)' }}>
        7 Day Sleep Trend
      </h4>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[280px]" role="img" aria-label="7 day sleep trend">
          {yTicks.map((h) => (
            <g key={h}>
              <line
                x1={pad.left}
                y1={chartY(h, 0, yMax, chartH, pad.top)}
                x2={width - pad.right}
                y2={chartY(h, 0, yMax, chartH, pad.top)}
                stroke="var(--border)"
                strokeDasharray="3 3"
              />
              <text x={4} y={chartY(h, 0, yMax, chartH, pad.top) + 4} fontSize={10} fill="currentColor" opacity={0.55}>
                {h}h
              </text>
            </g>
          ))}
          <line
            x1={pad.left}
            y1={goalY}
            x2={width - pad.right}
            y2={goalY}
            stroke="#34d399"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            opacity={0.85}
          />
          <text x={width - pad.right - 4} y={goalY - 4} textAnchor="end" fontSize={9} fill="#34d399">
            Goal {goalHours}h
          </text>
          {data.map((d, i) => {
            const cx = pad.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
            const barH = d.hasData ? (d.hours / yMax) * chartH : 0;
            const barY = pad.top + chartH - barH;
            const isHovered = hovered === i;
            return (
              <g
                key={d.dateKey}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
              >
                <rect
                  x={cx - barWidth / 2}
                  y={barY}
                  width={barWidth}
                  height={Math.max(d.hasData ? 4 : 0, barH)}
                  rx={3}
                  fill={d.hasData ? '#818cf8' : 'transparent'}
                  opacity={isHovered ? 1 : d.hasData ? 0.85 : 0.2}
                />
                {!d.hasData && (
                  <circle cx={cx} cy={pad.top + chartH - 2} r={2} fill="var(--border)" opacity={0.5} />
                )}
                <text
                  x={cx}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize={9}
                  fill="currentColor"
                  opacity={0.7}
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {hovered != null && data[hovered]?.hasData && (
        <div className="mt-2 text-xs rounded-lg border p-2 text-left" style={{ borderColor: 'var(--border)' }}>
          <p className="font-medium" style={{ color: 'var(--text-heading)' }}>{data[hovered].label}</p>
          <p>{formatTrendHours(data[hovered].hours)} slept</p>
          <p>{formatTrendDebtLabel(data[hovered].debtMinutes)}</p>
        </div>
      )}
    </Card>
  );
}

export function SleepMonthlyTrendChart({
  data,
  goalHours,
  emptyMessage = 'No sleep data for this range.',
}: {
  data: SleepTrendMonthPoint[];
  goalHours: number;
  emptyMessage?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const withData = data.filter((d) => d.count > 0);

  if (withData.length === 0) {
    return (
      <Card>
        <h4 className="font-medium mb-2 text-sm text-left" style={{ color: 'var(--text-heading)' }}>
          Monthly Sleep Trend
        </h4>
        <p className="text-sm opacity-70 text-left">{emptyMessage}</p>
      </Card>
    );
  }

  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 16, bottom: 36, left: 40 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const maxHours = Math.max(goalHours, ...withData.map((d) => d.avgHours), 1);
  const yMax = Math.ceil(maxHours + 1);
  const goalY = chartY(goalHours, 0, yMax, chartH, pad.top);

  return (
    <Card>
      <h4 className="font-medium mb-1 text-sm text-left" style={{ color: 'var(--text-heading)' }}>
        Monthly Sleep Trend
      </h4>
      <p className="text-xs opacity-60 mb-3 text-left">Average sleep hours per night</p>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[280px]" role="img" aria-label="Monthly sleep trend">
          {Array.from({ length: yMax + 1 }, (_, h) => h).filter((h) => h % (yMax <= 6 ? 1 : 2) === 0).map((h) => (
            <g key={h}>
              <line
                x1={pad.left}
                y1={chartY(h, 0, yMax, chartH, pad.top)}
                x2={width - pad.right}
                y2={chartY(h, 0, yMax, chartH, pad.top)}
                stroke="var(--border)"
                strokeDasharray="3 3"
              />
              <text x={4} y={chartY(h, 0, yMax, chartH, pad.top) + 4} fontSize={10} fill="currentColor" opacity={0.55}>
                {h}h
              </text>
            </g>
          ))}
          <line x1={pad.left} y1={goalY} x2={width - pad.right} y2={goalY} stroke="#34d399" strokeDasharray="6 4" opacity={0.85} />
          <polyline
            fill="none"
            stroke="#818cf8"
            strokeWidth={2}
            points={data
              .map((d, i) => {
                if (d.count === 0) return null;
                const x = pad.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
                const y = chartY(d.avgHours, 0, yMax, chartH, pad.top);
                return `${x},${y}`;
              })
              .filter(Boolean)
              .join(' ')}
          />
          {data.map((d, i) => {
            if (d.count === 0) return null;
            const cx = pad.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
            const cy = chartY(d.avgHours, 0, yMax, chartH, pad.top);
            return (
              <g
                key={d.label}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <circle cx={cx} cy={cy} r={hovered === i ? 5 : 4} fill="#818cf8" />
                <text x={cx} y={height - 8} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.7}>
                  {d.label.replace(' ', '\u00a0')}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {hovered != null && data[hovered]?.count > 0 && (
        <div className="mt-2 text-xs rounded-lg border p-2 text-left" style={{ borderColor: 'var(--border)' }}>
          <p className="font-medium" style={{ color: 'var(--text-heading)' }}>{data[hovered].label}</p>
          <p>{formatTrendHours(data[hovered].avgHours)} avg · {data[hovered].count} night{data[hovered].count === 1 ? '' : 's'}</p>
        </div>
      )}
    </Card>
  );
}

export function BedtimeWakeTrendChart({
  points,
  goalBedtimeMinutes,
  targetWakeMinutes,
  goalHours,
  emptyMessage = 'No sleep data for this range.',
}: {
  points: ScheduleTrendPoint[];
  goalBedtimeMinutes: number;
  targetWakeMinutes: number;
  goalHours: number;
  emptyMessage?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <Card>
        <h4 className="font-medium mb-2 text-sm text-left" style={{ color: 'var(--text-heading)' }}>
          Bedtime &amp; Wake-up Trend
        </h4>
        <p className="text-sm opacity-70 text-left">{emptyMessage}</p>
      </Card>
    );
  }

  const width = 640;
  const height = 240;
  const pad = { top: 16, right: 16, bottom: 36, left: 44 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const yMin = SCHEDULE_CHART_Y_MIN;
  const yMax = SCHEDULE_CHART_Y_MAX;

  const yFor = (mins: number) => chartY(mins, yMin, yMax, chartH, pad.top);
  const xFor = (i: number) =>
    pad.left + (points.length === 1 ? chartW / 2 : (i / (points.length - 1)) * chartW);

  const yTicks = [18, 21, 0, 3, 6, 9, 12].map((h) => (h === 0 ? 24 : h) * 60);
  const goalBedY = yFor(toScheduleChartMinutes(goalBedtimeMinutes));
  const targetWakeY = yFor(toScheduleChartMinutes(targetWakeMinutes));

  const bedLine = points.map((p, i) => `${xFor(i)},${yFor(p.bedtimeMinutes)}`).join(' ');
  const wakeLine = points.map((p, i) => `${xFor(i)},${yFor(p.wakeMinutes)}`).join(' ');

  return (
    <Card>
      <h4 className="font-medium mb-3 text-sm text-left" style={{ color: 'var(--text-heading)' }}>
        Bedtime &amp; Wake-up Trend
      </h4>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[320px]" role="img" aria-label="Bedtime and wake-up trend">
          {yTicks.map((mins) => (
            <g key={mins}>
              <line x1={pad.left} y1={yFor(mins)} x2={width - pad.right} y2={yFor(mins)} stroke="var(--border)" strokeDasharray="4 4" />
              <text x={4} y={yFor(mins) + 4} fontSize={10} fill="currentColor" opacity={0.55}>
                {minutesToDisplayTime(mins >= 24 * 60 ? mins - 24 * 60 : mins)}
              </text>
            </g>
          ))}
          <line x1={pad.left} y1={goalBedY} x2={width - pad.right} y2={goalBedY} stroke="#818cf8" strokeDasharray="6 4" opacity={0.7} />
          <line x1={pad.left} y1={targetWakeY} x2={width - pad.right} y2={targetWakeY} stroke="#34d399" strokeDasharray="6 4" opacity={0.7} />
          <polyline fill="none" stroke="#6366f1" strokeWidth={2} points={bedLine} />
          <polyline fill="none" stroke="#14b8a6" strokeWidth={2} points={wakeLine} />
          {points.map((p, i) => (
            <g
              key={p.dateKey}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <circle cx={xFor(i)} cy={yFor(p.bedtimeMinutes)} r={hovered === i ? 4 : 3} fill="#6366f1" />
              <circle cx={xFor(i)} cy={yFor(p.wakeMinutes)} r={hovered === i ? 4 : 3} fill="#14b8a6" />
              <text x={xFor(i)} y={height - 8} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.65}>
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {hovered != null && (
        <div className="mt-2 text-xs rounded-lg border p-2 text-left" style={{ borderColor: 'var(--border)' }}>
          <p className="font-medium" style={{ color: 'var(--text-heading)' }}>{points[hovered].label}</p>
          <p>{formatDuration(points[hovered].durationMinutes)} · {formatTrendDebtLabel(points[hovered].debtMinutes)}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-4 mt-2 text-xs opacity-70">
        <span><span className="inline-block w-3 h-0.5 bg-indigo-500 mr-1 align-middle" /> Bedtime</span>
        <span><span className="inline-block w-3 h-0.5 bg-teal-500 mr-1 align-middle" /> Wake-up</span>
        <span><span className="inline-block w-3 h-0.5 border-t border-dashed border-indigo-400 mr-1 align-middle" /> Goal bedtime</span>
        <span><span className="inline-block w-3 h-0.5 border-t border-dashed border-emerald-400 mr-1 align-middle" /> Target wake ({goalHours}h goal)</span>
      </div>
    </Card>
  );
}
