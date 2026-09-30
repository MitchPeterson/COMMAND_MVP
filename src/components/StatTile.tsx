// One figure, labeled.
//
// Extracted from CashflowOverview, where it was a private function, because
// the same four lines of markup are hand-rolled in four other places --
// HomeDocumentReview's Row, CoverageGlance's right rail, CreditStatementReview's
// top-categories strip, and the Import panel's flow summary. The label style
// alone (`text-[11px] uppercase tracking-[0.16em] text-cmd-muted`) appears in
// eighty-odd places across thirty files.
//
// A stat tile rather than a chart is the right answer more often than it
// looks: a single number with a comparison beside it is not a shape, and
// drawing it as one wastes the reader's attention on geometry that carries
// nothing.

import React from 'react';

export type TileTone = 'default' | 'gold' | 'warn' | 'critical';

const VALUE_TONE: Record<TileTone, string> = {
  default: 'text-cmd-offwhite',
  gold: 'text-cmd-gold',
  warn: 'text-amber-300',
  critical: 'text-red-300',
};

interface Props {
  label: string;
  /** Pre-formatted. The tile does no arithmetic and no rounding. */
  value: string;
  /** The line under the figure: what it covers, or what moved. */
  note?: string;
  icon?: React.ReactNode;
  tone?: TileTone;
  /**
   * A period-over-period change, usually.
   *
   * Rendered under the figure rather than beside the label. Beside it, a long
   * change like "−$3,864 (−53%)" pushed "Left over" out of its own tile and
   * left it reading "LEFT …" -- the two were competing for one line, and the
   * label lost.
   */
  delta?: React.ReactNode;
}

export function StatTile({ label, value, note, icon, tone = 'default', delta }: Props) {
  return (
    <div className="rounded-2xl border border-cmd-border bg-cmd-charcoal p-4">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-cmd-muted">
        {icon}{label}
      </p>
      <p className={`mt-2 font-mono text-xl ${VALUE_TONE[tone]}`}>{value}</p>
      {(delta != null || note) && (
        <p className="mt-1 text-[11px] leading-4 text-cmd-muted">
          {delta}
          {delta != null && note ? ' · ' : ''}
          {note}
        </p>
      )}
    </div>
  );
}
