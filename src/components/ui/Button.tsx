import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  secondary: 'border hover:bg-black/5 dark:hover:bg-white/5',
  danger: 'bg-danger text-white hover:bg-red-600',
  ghost: 'hover:bg-black/5 dark:hover:bg-white/5',
  success: 'bg-social text-white hover:bg-emerald-600',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      style={variant === 'secondary' ? { borderColor: 'var(--border)' } : undefined}
      {...props}
    >
      {children}
    </button>
  );
}
