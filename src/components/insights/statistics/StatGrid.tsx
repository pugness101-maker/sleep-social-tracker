import { StatCard } from '../../ui/Card';

export interface StatItem {
  label: string;
  value: string;
  sub?: string;
  accent?: 'sleep' | 'nap' | 'awake' | 'social' | 'default';
}

export function StatGrid({ items, columns = 4 }: { items: StatItem[]; columns?: 2 | 3 | 4 }) {
  const colClass =
    columns === 2 ? 'sm:grid-cols-2' : columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4';
  return (
    <div className={`grid grid-cols-1 ${colClass} gap-3`}>
      {items.map((item) => (
        <StatCard key={item.label} label={item.label} value={item.value} sub={item.sub} accent={item.accent ?? 'default'} />
      ))}
    </div>
  );
}
