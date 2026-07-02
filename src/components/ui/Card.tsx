import { type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`rounded-2xl border p-3.5 sm:p-4 ${onClick ? 'cursor-pointer active:opacity-80 transition-opacity' : ''} ${className}`}
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
  icon?: IconName;
}

const accentStyles = {
  sleep: { text: 'text-sleep', bg: 'bg-sleep/8', border: 'border-sleep/20' },
  nap: { text: 'text-nap', bg: 'bg-nap/8', border: 'border-nap/20' },
  awake: { text: 'text-awake', bg: 'bg-awake/8', border: 'border-awake/20' },
  social: { text: 'text-social', bg: 'bg-social/8', border: 'border-social/20' },
  default: { text: 'text-primary', bg: 'bg-primary/8', border: 'border-primary/20' },
};

export function StatCard({ label, value, sub, accent = 'default', icon }: StatCardProps) {
  const styles = accentStyles[accent];

  return (
    <Card className={`${styles.bg} ${styles.border} border min-h-[100px] flex flex-col p-3 sm:p-3.5`}>
      {icon && (
        <div className={`mb-2 ${styles.text}`}>
          <Icon name={icon} size={16} />
        </div>
      )}
      <p
        className="text-[22px] sm:text-[26px] md:text-[28px] font-bold tracking-tight leading-none truncate tabular-nums"
        style={{ color: 'var(--text-heading)' }}
      >
        {value}
      </p>
      <p className="text-[12px] font-medium mt-2 leading-snug" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      {sub && (
        <p className="text-[11px] mt-0.5 leading-snug line-clamp-2" style={{ color: 'var(--text-muted)' }}>
          {sub}
        </p>
      )}
    </Card>
  );
}
