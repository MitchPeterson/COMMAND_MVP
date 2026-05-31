import React from 'react';

type StatusVariant = 'success' | 'warn' | 'critical' | 'info' | 'neutral';

const variantStyles: Record<StatusVariant, string> = {
  success: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
  warn: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
  critical: 'bg-red-500/10 text-red-300 border border-red-500/20',
  info: 'bg-sky-500/10 text-sky-300 border border-sky-500/20',
  neutral: 'bg-slate-500/10 text-slate-300 border border-slate-500/20',
};

interface StatusBadgeProps {
  variant?: StatusVariant;
  children: React.ReactNode;
}

export function StatusBadge({ variant = 'neutral', children }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase ${variantStyles[variant]}`}
    >
      {children}
    </span>
  );
}
