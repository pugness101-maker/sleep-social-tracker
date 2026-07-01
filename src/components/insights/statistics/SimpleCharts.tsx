import { Card } from '../../ui/Card';
import type { LabeledValue, TrendPoint } from '../../../lib/statistics-analytics';

export function BarChart({
  title,
  data,
  valueSuffix = '',
  colorClass = 'bg-sleep/60',
  emptyMessage = 'No data for this range.',
}: {
  title: string;
  data: TrendPoint[] | LabeledValue[];
  valueSuffix?: string;
  colorClass?: string;
  emptyMessage?: string;
}) {
  if (data.length === 0) {
    return (
      <Card>
        <h4 className="font-medium mb-2 text-sm text-left" style={{ color: 'var(--text-heading)' }}>{title}</h4>
        <p className="text-sm opacity-70 text-left">{emptyMessage}</p>
      </Card>
    );
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <Card>
      <h4 className="font-medium mb-3 text-sm text-left" style={{ color: 'var(--text-heading)' }}>{title}</h4>
      <div className="flex items-end gap-1.5 h-28">
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div
              className={`w-full rounded-t ${colorClass}`}
              style={{ height: `${Math.max(4, (d.value / max) * 100)}%`, minHeight: d.value ? 4 : 0 }}
              title={`${d.label}: ${d.value}${valueSuffix}`}
            />
            <span className="text-[9px] opacity-60 truncate w-full text-center">{d.label.split(' ')[0]}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function HorizontalBarList({
  title,
  data,
  formatValue,
  emptyMessage = 'No data for this range.',
}: {
  title: string;
  data: LabeledValue[];
  formatValue?: (v: number) => string;
  emptyMessage?: string;
}) {
  if (data.length === 0) {
    return (
      <Card>
        <h4 className="font-medium mb-2 text-sm text-left" style={{ color: 'var(--text-heading)' }}>{title}</h4>
        <p className="text-sm opacity-70 text-left">{emptyMessage}</p>
      </Card>
    );
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  const fmt = formatValue ?? ((v: number) => String(v));
  return (
    <Card>
      <h4 className="font-medium mb-3 text-sm text-left" style={{ color: 'var(--text-heading)' }}>{title}</h4>
      <ul className="space-y-2">
        {data.slice(0, 8).map((d) => (
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
  emptyMessage = 'No data for this range.',
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
