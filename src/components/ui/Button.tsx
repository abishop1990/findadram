'use client';

import { type ButtonHTMLAttributes, type ReactNode } from 'react';

const variantStyles: Record<string, string> = {
  primary: 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500',
  secondary: 'bg-stone-100 text-stone-800 hover:bg-stone-200 focus:ring-stone-400',
  outline: 'border border-stone-300 text-stone-700 hover:bg-stone-50 focus:ring-stone-400',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
