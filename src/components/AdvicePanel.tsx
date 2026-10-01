// What a model made of the household's own figures, and what Command works
// out for itself.
//
// Two sections, in that order, and the second is not a footnote. The automatic
// checks below recompute on every import and are arithmetic on the
// household's own records -- overspending, fees, a category that moved, a
// review queue that is growing. The recommendations above are a reading, drawn
// on a date, that can be wrong in ways arithmetic cannot.
//
// So they are kept visibly apart, the way rewardsStrategy and cardFit are:
// "a number grounded in a statement and a number read off a web page should
// never sit in the same list looking alike."
//
// Asking costs money, so it is a button. The as-of date is next to it because
// advice drawn in August reads as current in November and nothing about it
// looks stale.

import React, { useState } from 'react';
import { AlertTriangle, Check, Loader2, RefreshCw, Scissors, Search, Upload } from 'lucide-react';
import {
  refreshSpendingAdvice, type SpendingAdviceItem, type SpendingAdviceRow,
} from '../lib/supabase';
import type { FinanceFinding } from '../lib/financesHealth';
import { enoughToAdviseOn, type AdviceBasis } from '../lib/transactions/advice';
import { FindingList } from './FindingList';
import { useDismissals } from './useDismissals';

interface Props {
  householdId: string;
  advice: SpendingAdviceRow | null;
  basis: AdviceBasis;
  /** Command's own checks, which recompute on every import. */
  checks: FinanceFinding[];
  opportunities: FinanceFinding[];
  onChanged: () => Promise<void> | void;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const TAG: Record<SpendingAdviceItem['tag'], { label: string; className: string; icon: React.ReactNode }> = {
  cut: { label: 'Cut', className: 'border-cmd-bad/40 text-cmd-bad', icon: <Scissors className="h-3 w-3" /> },
  save: { label: 'Save', className: 'border-cmd-gold/40 text-cmd-gold', icon: <Check className="h-3 w-3" /> },
  review: { label: 'Review', className: 'border-cmd-warn/50 text-cmd-warn', icon: <Search className="h-3 w-3" /> },
  data: { label: 'Load', className: 'border-cmd-border-hi text-cmd-muted', icon: <Upload className="h-3 w-3" /> },
};

const NICE_DATE = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export function AdvicePanel({ householdId, advice, basis, checks, opportunities, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flags = useDismissals('spending', checks);
  const wins = useDismissals('spending-opportunities', opportunities);
  const readiness = enoughToAdviseOn(basis);

  const refresh = async () => {
    setBusy(true); setError(null);
    try {
      await refreshSpendingAdvice(householdId, basis);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work.');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">What to do about it</p>
            {advice ? (
              <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">
                {advice.total_impact > 0
                  ? `Up to ${money(advice.total_impact)} a month identified`
                  : `${advice.items.length} things worth doing`}
              </h2>
            ) : (
              <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Nothing drawn up yet</h2>
            )}
            <p className="mt-1 text-sm text-cmd-muted">
              {advice
                ? `Read on ${NICE_DATE.format(new Date(`${advice.as_of}T00:00:00Z`))}`
                  + `${advice.period ? `, against ${advice.period}` : ''}.`
                : readiness.ready
                  ? 'Command can read your figures and suggest what to do about them.'
                  : readiness.reason}
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={busy || !readiness.ready}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-cmd-gold/40 bg-cmd-gold/10 px-4 py-2 text-sm text-cmd-gold transition hover:bg-cmd-gold/20 disabled:opacity-40"
            title={readiness.ready ? 'Sends your totals — never a transaction' : readiness.reason ?? ''}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {advice ? 'Refresh with latest data' : 'Draw up recommendations'}
          </button>
        </div>

        {error && (
          <p className="mt-4 flex items-start gap-1.5 rounded-2xl border border-cmd-bad/30 bg-cmd-bad/5 p-3 text-sm text-cmd-bad">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        )}

        {advice && advice.items.length > 0 && (
          <ul className="mt-5 space-y-2">
            {advice.items.map((item, i) => {
              const tag = TAG[item.tag];
              return (
                <li key={i} className="rounded-2xl border border-cmd-border bg-cmd-charcoal p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${tag.className}`}>
                          {tag.icon}{tag.label}
                        </span>
                        <p className="text-sm font-semibold text-cmd-offwhite">{item.title}</p>
                      </div>
                      <p className="mt-1.5 text-sm leading-6 text-cmd-muted">{item.body}</p>
                    </div>
                    {item.impact > 0 && (
                      <span className="shrink-0 text-right">
                        <span className="block font-mono text-sm text-cmd-gold">{money(item.impact)}</span>
                        <span className="block text-[11px] text-cmd-muted">a month</span>
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Said once, below the list rather than beside every item. */}
        {advice && (
          <p className="mt-4 text-xs leading-5 text-cmd-muted">
            Drawn from your totals by category, source and month, the list of what renews, and the
            decisions you have already made. No transaction, merchant description or account number
            is ever sent. Command reports what the figures show; whether to act on any of it is
            yours to judge.
          </p>
        )}
      </section>

      {/* Command's own arithmetic, kept visibly apart from the reading above. */}
      {(checks.length > 0 || opportunities.length > 0) && (
        <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">What Command checks every time</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
            These are arithmetic on your own records rather than a reading of them, and they
            recompute whenever a file lands — so they do not go stale between refreshes above.
          </p>

          {checks.length > 0 && (
            <div className="mt-4">
              <FindingList
                section="spending"
                findings={flags.visible}
                hiddenCount={flags.hiddenCount}
                onDismiss={flags.onDismiss}
                onRestore={flags.onRestore}
              />
            </div>
          )}

          {opportunities.length > 0 && (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Where there is money to get back</p>
              <div className="mt-3">
                <FindingList
                  section="spending-opportunities"
                  findings={wins.visible}
                  hiddenCount={wins.hiddenCount}
                  onDismiss={wins.onDismiss}
                  onRestore={wins.onRestore}
                />
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
