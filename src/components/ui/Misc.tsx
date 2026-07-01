interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }: SearchBarProps) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 text-sm">🔍</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
      />
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <p className="text-lg font-medium mb-1" style={{ color: 'var(--text-heading)' }}>{title}</p>
      {description && <p className="text-sm opacity-70 mb-4">{description}</p>}
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
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: `${color}33`, color: 'var(--text-heading)' }}
    >
      {children}
    </span>
  );
}
