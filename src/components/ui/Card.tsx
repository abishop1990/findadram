import { type ReactNode } from 'react';

export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-xl border border-oak-200 bg-white p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 ${className}`} style={style}>
      {children}
    </div>
  );
}
