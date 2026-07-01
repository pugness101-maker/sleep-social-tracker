import { Card } from '../../ui/Card';
import type { StatisticsBundle } from '../../../lib/statistics-analytics';
import type { CompareRow, MetricDef } from '../../../lib/statistics-compare';
import { computeCompareRows, metricsToStatItems } from '../../../lib/statistics-compare';
import { StatGrid } from './StatGrid';

export interface StatisticsCompareProps {
  statsA: StatisticsBundle;
  statsB: StatisticsBundle;
  labelA: string;
  labelB: string;
}

const accentBorder: Record<string, string> = {
  sleep: 'border-sleep/30',
  nap: 'border-nap/30',
  awake: 'border-awake/30',
  social: 'border-social/30',
  default: 'border-primary/30',
};

function DirectionIcon({ direction }: { direction: CompareRow['direction'] }) {
  if (direction === 'na') return <span className="opacity-40">—</span>;
  const icon = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '●';
  const color =
    direction === 'up' ? '#34d399' : direction === 'down' ? '#f87171' : 'var(--text-muted, #888)';
  return (
    <span style={{ color }} className="text-xs font-bold" aria-hidden>
      {icon}
    </span>
  );
}

export function CompareStatGrid({
  metrics,
  statsA,
  statsB,
  labelA,
  labelB,
  columns = 2,
}: {
  metrics: MetricDef[];
  statsA: StatisticsBundle;
  statsB: StatisticsBundle;
  labelA: string;
  labelB: string;
  columns?: 2 | 3 | 4;
}) {
  const rows = computeCompareRows(metrics, statsA, statsB);
  const colClass =
    columns === 3 ? 'lg:grid-cols-3' : columns === 4 ? 'lg:grid-cols-2 xl:grid-cols-4' : 'lg:grid-cols-2';

  return (
    <div>
      <div className="flex flex-wrap gap-4 text-xs opacity-70 mb-3">
        <span><strong>A:</strong> {labelA}</span>
        <span><strong>B:</strong> {labelB}</span>
      </div>
      <div className={`grid grid-cols-1 ${colClass} gap-3`}>
        {rows.map((row) => (
          <CompareStatCard key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
}

export function CompareStatCard({ row }: { row: CompareRow }) {
  return (
    <Card className={`border ${accentBorder[row.accent] ?? accentBorder.default} !p-3`}>
      <p className="text-xs opacity-70 mb-2">{row.label}</p>
      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
        <div>
          <span className="text-[10px] uppercase opacity-50 block">A</span>
          <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>{row.formattedA}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase opacity-50 block">B</span>
          <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>{row.formattedB}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <DirectionIcon direction={row.direction} />
        <span className="font-medium">{row.formattedDiff}</span>
        <span className="opacity-60">/ {row.formattedPct}</span>
      </div>
    </Card>
  );
}

export function CompareBreakdownTable({
  title,
  rows,
  labelA,
  labelB,
}: {
  title: string;
  rows: CompareRow[];
  labelA: string;
  labelB: string;
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <h4 className="font-medium mb-2 text-sm text-left" style={{ color: 'var(--text-heading)' }}>{title}</h4>
        <p className="text-sm opacity-70 text-left">No data for this range.</p>
      </Card>
    );
  }
  return (
    <Card>
      <h4 className="font-medium mb-1 text-sm text-left" style={{ color: 'var(--text-heading)' }}>{title}</h4>
      <p className="text-xs opacity-60 mb-3">A: {labelA} · B: {labelB}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="opacity-60 border-b" style={{ borderColor: 'var(--border)' }}>
              <th className="py-2 pr-3">Item</th>
              <th className="py-2 pr-3">A</th>
              <th className="py-2 pr-3">B</th>
              <th className="py-2 pr-3">Change</th>
              <th className="py-2">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 12).map((row) => (
              <tr key={row.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                <td className="py-2 pr-3 font-medium max-w-[120px] truncate">{row.label}</td>
                <td className="py-2 pr-3">{row.formattedA}</td>
                <td className="py-2 pr-3">{row.formattedB}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    <DirectionIcon direction={row.direction} />
                    {row.formattedDiff}
                  </span>
                </td>
                <td className="py-2 opacity-70">{row.formattedPct}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function AdaptiveMetrics({
  metrics,
  stats,
  compare,
  columns,
}: {
  metrics: MetricDef[];
  stats: StatisticsBundle;
  compare: StatisticsCompareProps | null;
  columns?: 2 | 3 | 4;
}) {
  if (compare) {
    return (
      <CompareStatGrid
        metrics={metrics}
        statsA={compare.statsA}
        statsB={compare.statsB}
        labelA={compare.labelA}
        labelB={compare.labelB}
        columns={columns}
      />
    );
  }
  return <StatGrid items={metricsToStatItems(metrics, stats)} columns={columns} />;
}
