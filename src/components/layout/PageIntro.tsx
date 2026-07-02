import { type ReactNode } from 'react';

interface PageIntroProps {
  title: string;
  description: string;
  children?: ReactNode;
}

/** Page title + subtitle. On mobile the sticky layout header shows the title, so h1 is desktop-only. */
export function PageIntro({ title, description, children }: PageIntroProps) {
  return (
    <div className="mb-4 md:mb-6">
      <h1 className="hidden md:block text-2xl font-bold tracking-tight" style={{ color: 'var(--text-heading)' }}>
        {title}
      </h1>
      <p className="text-[15px] md:text-sm leading-snug md:mt-1" style={{ color: 'var(--text-muted)' }}>
        {description}
      </p>
      {children}
    </div>
  );
}
