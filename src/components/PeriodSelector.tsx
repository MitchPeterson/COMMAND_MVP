// Stepping through periods, newest first.
//
// Extracted from MonthlySpending, where it was inline, because the period view
// and every drill-down below it need the same control and the same index
// convention.
//
// That convention is the one thing to be careful about: **index 0 is the most
// recent period**, because the list it indexes is sorted newest-first
// everywhere in this codebase. So "earlier" increments and "later" decrements,
// which reads backwards until you remember why.

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  /** Newest first, matching every period list in the app. */
  periods: Array<{ month: string; label: string }>;
  /** Index into that list. 0 is the newest. */
  index: number;
  onChange: (index: number) => void;
  /** What one step means, for the button labels. Defaults to "month". */
  unit?: string;
}

export function PeriodSelector({ periods, index, onChange, unit = 'month' }: Props) {
  // Nothing to step through. Rendering a pair of dead arrows would suggest
  // there is more data than there is.
  if (periods.length <= 1) return null;

  const atEarliest = index >= periods.length - 1;
  const atLatest = index <= 0;

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.min(periods.length - 1, index + 1))}
        disabled={atEarliest}
        className="rounded-xl border border-cmd-border p-2 text-cmd-muted transition hover:text-cmd-gold disabled:opacity-30"
        aria-label={`Earlier ${unit}`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, index - 1))}
        disabled={atLatest}
        className="rounded-xl border border-cmd-border p-2 text-cmd-muted transition hover:text-cmd-gold disabled:opacity-30"
        aria-label={`Later ${unit}`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
