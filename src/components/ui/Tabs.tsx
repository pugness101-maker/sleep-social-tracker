interface TabsProps {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div
      className="flex gap-1 overflow-x-auto p-1 rounded-xl scrollbar-none -mx-0.5"
      style={{ background: 'var(--border)' }}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`shrink-0 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all ${
            active === tab.id
              ? 'bg-primary text-white shadow-sm'
              : ''
          }`}
          style={active === tab.id ? undefined : { color: 'var(--text-muted)' }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
