import { Card } from '../../ui/Card';
import type { LabeledValue, TrendPoint } from '../../../lib/statistics-analytics';

export const TREND_EMPTY = 'Not enough data for this trend.';
export const CHART_EMPTY = 'No data for this range.';

export function trendHasMeaningfulData(data: TrendPoint[] | LabeledValue[]): boolean {
  if (data.length === 0) return false;
  return data.some((d) => {
    const tp = d as TrendPoint;
    if (tp.count != null) return tp.count > 0;
    return d.value > 0;
  });
}

export function BarChart({
  title,
  data,
  valueSuffix = '',
  colorClass = 'bg-sleep/60',
  emptyMessage = CHART_EMPTY,
  minMeaningfulPoints = 1,
}: {
  title: string;
  data: TrendPoint[] | LabeledValue[];
  valueSuffix?: string;
  colorClass?: string;
  emptyMessage?: string;
  minMeaningfulPoints?: number;
}) {
  const meaningful = trendHasMeaningfulData(data);
  const withValues = data.filter((d) => d.value > 0 || (d as TrendPoint).count);

  if (!meaningful || withValues.length < minMeaningfulPoints) {
    return (
      <Card>
        <h4 className="font-medium mb-2 text-sm text-left" style={{ color: 'var(--text-heading)' }}>{title}</h4>
        <p className="text-sm opacity-70 text-left">{emptyMessage}</p>
      </Card>
    );
  }

  const max = Math.max(...withValues.map((d) => d.value), 0.001);
  const display = withValues.length >= data.length ? data : withValues;

  return (
    <Card>
      <h4 className="font-medium mb-3 text-sm text-left" style={{ color: 'var(--text-heading)' }}>{title}</h4>
      <div className="flex items-end gap-1.5 h-32 overflow-x-auto pb-1">
        {display.map((d) => (
          <div key={d.label} className="flex flex-col items-center gap-1 min-w-[52px] flex-shrink-0">
            <span className="text-[9px] opacity-70 font-medium tabular-nums">
              {Number.isInteger(d.value) ? d.value : d.value.toFixed(1)}{valueSuffix}
            </span>
            <div
              className={`w-10 rounded-t ${colorClass}`}
              style={{ height: `${Math.max(4, (d.value / max) * 100)}%`, minHeight: d.value > 0 ? 4 : 0 }}
              title={`${d.label}: ${d.value}${valueSuffix}`}
            />
            <span className="text-[9px] opacity-60 text-center leading-tight max-w-[52px]">{d.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function LineTrendChart({
  title,
  data,
  valueSuffix = '',
  subtitle,
  emptyMessage = TREND_EMPTY,
}: {
  title: string;
  data: TrendPoint[];
  valueSuffix?: string;
  subtitle?: string;
  emptyMessage?: string;
}) {
  const points = data.filter((d) => (d.count != null ? d.count > 0 : d.value !== 0));
  if (points.length < 2) {
    return (
      <Card>
        <h4 className="font-medium mb-2 text-sm text-left" style={{ color: 'var(--text-heading)' }}>{title}</h4>
        {subtitle && <p className="text-xs opacity-60 mb-2 text-left">{subtitle}</p>}
        <p className="text-sm opacity-70 text-left">{emptyMessage}</p>
      </Card>
    );
  }

  const width = 640;
  const height = 200;
  const pad = { top: 16, right: 16, bottom: 40, left: 40 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const max = Math.max(...points.map((d) => d.value), 0.001);
  const yMax = max * 1.15;

  const yFor = (v: number) => pad.top + chartH - (v / yMax) * chartH;
  const xFor = (i: number) =>
    pad.left + (points.length === 1 ? chartW / 2 : (i / (points.length - 1)) * chartW);

  return (
    <Card>
      <h4 className="font-medium mb-1 text-sm text-left" style={{ color: 'var(--text-heading)' }}>{title}</h4>
      {subtitle && <p className="text-xs opacity-60 mb-3 text-left">{subtitle}</p>}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[280px]" role="img" aria-label={title}>
          <polyline
            fill="none"
            stroke="#818cf8"
            strokeWidth={2}
            points={points.map((d, i) => `${xFor(i)},${yFor(d.value)}`).join(' ')}
          />
          {points.map((d, i) => (
            <g key={d.label}>
              <circle cx={xFor(i)} cy={yFor(d.value)} r={4} fill="#818cf8" />
              <text x={xFor(i)} y={height - 8} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.7}>
                {d.label}
              </text>
              <title>{`${d.label}: ${d.value}${valueSuffix}`}</title>
            </g>
          ))}
        </svg>
      </div>
    </Card>
  );
}

export function HorizontalBarList({
  title,
  data,
  formatValue,
  emptyMessage = CHART_EMPTY,
}: {
  title: string;
  data: LabeledValue[];
  formatValue?: (v: number) => string;
  emptyMessage?: string;
}) {
  const rows = data.filter((d) => d.value > 0);
  if (rows.length === 0) {
    return (
      <Card>
        <h4 className="font-medium mb-2 text-sm text-left" style={{ color: 'var(--text-heading)' }}>{title}</h4>
        <p className="text-sm opacity-70 text-left">{emptyMessage}</p>
      </Card>
    );
  }
  const max = Math.max(...rows.map((d) => d.value), 1);
  const fmt = formatValue ?? ((v: number) => String(v));
  return (
    <Card>
      <h4 className="font-medium mb-3 text-sm text-left" style={{ color: 'var(--text-heading)' }}>{title}</h4>
      <ul className="space-y-2">
        {rows.slice(0, 8).map((d) => (
          <li key={d.label}>
            <div className="flex justify-between text-xs mb-1 gap-2">
              <span className="truncate">{d.label}</span>
              <span className="font-medium shrink-0">{fmt(d.value)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
              <div className="h-full bg-social/60 rounded-full" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function RankingList({
  title,
  rows,
  emptyMessage = CHART_EMPTY,
}: {
  title: string;
  rows: { name: string; primary: string; secondary?: string }[];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <h4 className="font-medium mb-2 text-sm text-left" style={{ color: 'var(--text-heading)' }}>{title}</h4>
        <p className="text-sm opacity-70 text-left">{emptyMessage}</p>
      </Card>
    );
  }
  return (
    <Card>
      <h4 className="font-medium mb-3 text-sm text-left" style={{ color: 'var(--text-heading)' }}>{title}</h4>
      <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {rows.map((row, i) => (
          <li key={`${row.name}-${i}`} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="truncate">
              <span className="opacity-50 mr-2">{i + 1}.</span>
              {row.name}
            </span>
            <span className="text-right shrink-0">
              <span className="font-medium">{row.primary}</span>
              {row.secondary && <span className="block text-xs opacity-60">{row.secondary}</span>}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
