import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`rounded-xl border p-4 md:p-5 ${onClick ? 'cursor-pointer hover:border-primary/40 transition-colors' : ''} ${className}`}
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: 'sleep' | 'nap' | 'awake' | 'social' | 'default';
  icon?: ReactNode;
}

const accentColors = {
  sleep: 'text-sleep border-sleep/30 bg-sleep/5',
  nap: 'text-nap border-nap/30 bg-nap/5',
  awake: 'text-awake border-awake/30 bg-awake/5',
  social: 'text-social border-social/30 bg-social/5',
  default: 'text-primary border-primary/30 bg-primary/5',
};

export function StatCard({ label, value, sub, accent = 'default', icon }: StatCardProps) {
  return (
    <Card className={`${accentColors[accent]} border`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-left min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">{label}</p>
          <p className="text-2xl font-bold truncate" style={{ color: 'var(--text-heading)' }}>{value}</p>
          {sub && <p className="text-sm mt-1 opacity-70">{sub}</p>}
        </div>
        {icon && <div className="text-2xl opacity-80 shrink-0">{icon}</div>}
      </div>
    </Card>
  );
}
