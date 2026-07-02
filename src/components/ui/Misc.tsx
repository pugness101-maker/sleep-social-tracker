import { type ReactNode } from 'react';
import { Icon } from './Icon';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }: SearchBarProps) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
        <Icon name="search" size={16} />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
      />
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="text-center py-8 px-3">
      {icon && (
        <div
          className="inline-flex items-center justify-center w-11 h-11 rounded-full mb-3"
          style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
        >
          {icon}
        </div>
      )}
      <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>{title}</p>
      {description && (
        <p className="text-[13px] leading-relaxed max-w-[240px] mx-auto mb-4" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
}

export function Badge({ children, color = 'var(--border)' }: BadgeProps) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: `${color}33`, color: 'var(--text-heading)' }}
    >
      {children}
    </span>
  );
}
