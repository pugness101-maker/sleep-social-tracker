import type { ReactNode } from 'react';

interface StatisticsCollapsibleSectionProps {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  nested?: boolean;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`shrink-0 mt-0.5 w-4 h-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatisticsCollapsibleSection({
  title,
  summary,
  open,
  onToggle,
  children,
  nested = false,
}: StatisticsCollapsibleSectionProps) {
  return (
    <div
      className={`rounded-xl border overflow-hidden ${nested ? 'border-dashed' : ''}`}
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: nested ? 'none' : 'var(--shadow)' }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`w-full flex items-start gap-3 text-left transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${
          nested ? 'px-3 py-2.5' : 'px-4 py-3 md:px-5'
        }`}
        style={{ outlineColor: 'var(--social)' }}
      >
        <ChevronIcon open={open} />
        <span className="flex-1 min-w-0">
          <span
            className={`block font-semibold ${nested ? 'text-sm' : 'text-base'}`}
            style={{ color: 'var(--text-heading)' }}
          >
            {title}
          </span>
          <span className={`block opacity-70 mt-0.5 ${nested ? 'text-xs' : 'text-sm'} line-clamp-2`}>{summary}</span>
        </span>
      </button>
      <div className={open ? '' : 'hidden'} aria-hidden={!open}>
        <div
          className={`border-t text-left space-y-4 ${nested ? 'px-3 pb-3 pt-2' : 'px-4 pb-4 pt-3 md:px-5 md:pb-5'}`}
          style={{ borderColor: 'var(--border)' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
