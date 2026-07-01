interface TabsProps {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            active === tab.id
              ? 'bg-primary text-white'
              : 'hover:bg-black/5'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
