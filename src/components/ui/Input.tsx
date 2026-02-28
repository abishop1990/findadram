'use client';

import { type InputHTMLAttributes, forwardRef } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { className?: string }>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-lg border border-oak-300 bg-white px-4 py-2 text-whiskey-900 placeholder:text-oak-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
