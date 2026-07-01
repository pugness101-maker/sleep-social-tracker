import type { ReactNode } from 'react';

interface SettingsAccordionSectionProps {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  nested?: boolean;
}

export function SettingsAccordionSection({
  title,
  summary,
  open,
  onToggle,
  children,
  nested = false,
}: SettingsAccordionSectionProps) {
  return (
    <div
      className={`rounded-xl border overflow-hidden ${nested ? 'border-dashed' : ''}`}
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: nested ? 'none' : 'var(--shadow)' }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`w-full flex items-start sm:items-center gap-3 text-left transition-colors hover:opacity-90 ${
          nested ? 'px-3 py-3' : 'px-4 py-4 md:px-5 md:py-4'
        }`}
      >
        <span
          className={`shrink-0 mt-0.5 sm:mt-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          aria-hidden
        >
          ›
        </span>
        <span className="flex-1 min-w-0">
          <span
            className={`block font-semibold ${nested ? 'text-sm' : 'text-base'}`}
            style={{ color: 'var(--text-heading)' }}
          >
            {title}
          </span>
          <span className={`block opacity-70 mt-0.5 ${nested ? 'text-xs' : 'text-sm'} line-clamp-2 sm:line-clamp-1`}>
            {summary}
          </span>
        </span>
      </button>
      <div className={open ? '' : 'hidden'} aria-hidden={!open}>
        <div
          className={`border-t text-left ${nested ? 'px-3 pb-3 pt-2' : 'px-4 pb-4 pt-2 md:px-5 md:pb-5'}`}
          style={{ borderColor: 'var(--border)' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
