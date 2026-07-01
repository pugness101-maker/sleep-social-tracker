interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <label className="block text-left">
      {label && (
        <span className="block text-sm font-medium mb-1" style={{ color: 'var(--text-heading)' }}>
          {label}
        </span>
      )}
      <input
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 ${className}`}
        style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
        {...props}
      />
    </label>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className = '', ...props }: TextareaProps) {
  return (
    <label className="block text-left">
      {label && (
        <span className="block text-sm font-medium mb-1" style={{ color: 'var(--text-heading)' }}>
          {label}
        </span>
      )}
      <textarea
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px] resize-y ${className}`}
        style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
        {...props}
      />
    </label>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className = '', ...props }: SelectProps) {
  return (
    <label className="block text-left">
      {label && (
        <span className="block text-sm font-medium mb-1" style={{ color: 'var(--text-heading)' }}>
          {label}
        </span>
      )}
      <select
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 ${className}`}
        style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
