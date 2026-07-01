import { Badge } from './Misc';

interface TagPickerProps {
  label?: string;
  options: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
  orphanTags?: string[];
}

export function TagPicker({ label, options, selected, onChange, orphanTags = [] }: TagPickerProps) {
  const allOptions = [
    ...orphanTags.filter((t) => !options.includes(t)),
    ...options,
  ];

  const toggle = (tag: string) => {
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);
  };

  return (
    <div>
      {label && (
        <span className="block text-sm font-medium mb-2 text-left" style={{ color: 'var(--text-heading)' }}>
          {label}
        </span>
      )}
      {allOptions.length === 0 ? (
        <p className="text-sm opacity-70 text-left">Add tags in Settings → Social Customization.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {allOptions.map((tag) => {
            const active = selected.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  active ? 'bg-primary text-white border-primary' : ''
                }`}
                style={!active ? { borderColor: 'var(--border)' } : undefined}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selected.map((tag) => (
            <Badge key={tag} color="#6366f1">{tag}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
