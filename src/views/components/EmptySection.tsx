import React from 'react';
import { FileMinus, PlusCircle } from 'lucide-react';

interface EmptySectionProps {
  title: string;
  description?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export function EmptySection({ title, description, ctaLabel, onCtaClick }: EmptySectionProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-cmd-border bg-cmd-charcoal/80 p-10 text-center text-cmd-muted">
      <div className="rounded-3xl border border-cmd-border p-5 text-cmd-muted">
        <FileMinus className="h-10 w-10" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-cmd-offwhite">{title}</h3>
        {description ? <p className="max-w-sm text-sm leading-6 text-cmd-muted">{description}</p> : null}
      </div>
      {ctaLabel && onCtaClick ? (
        <button
          type="button"
          onClick={onCtaClick}
          className="inline-flex items-center gap-2 rounded-full bg-cmd-gold px-4 py-2 text-sm font-semibold text-cmd-black transition hover:bg-cmd-gold-hover"
        >
          <PlusCircle className="h-4 w-4" />
          {ctaLabel}
        </button>
      ) : null}
    </div>
  );
}
