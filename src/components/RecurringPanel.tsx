// What renews, what it really costs, and what to do about it.
//
// The number that makes someone act is the yearly one. $14.99 a month is
// invisible -- it is less than lunch and it arrives with forty other emails --
// and $180 a year is a decision. So both are on screen and the yearly figure
// is the one in the subtotal.
//
// Grouped by purpose because a mortgage and a streaming subscription are
// equally recurring and nothing true of one is true of the other. Separating
// them is what lets the page say "$2,991 is committed before anything else"
// without that reading as a suggestion to cancel the house.
//
// Command's reading is deliberately narrow. It cannot see whether a
// subscription is used, and "you do not need this" built on nothing would be
// the least trustworthy sentence on the page. It says only what the
// transactions support: the price went up, the charge stopped, or the
// household cannot stop paying it anyway.

import React, { useMemo, useState } from 'react';
import { Loader2, Repeat } from 'lucide-react';
import { setRecurringDecision, type CounterpartyRuleRow } from '../lib/supabase';
import type { RecurringSummary } from '../lib/recurring';
import { merchantKey } from '../lib/transactions/counterparty';
import {
  buildRecurringView, cadenceLabel, type RecurringItem, type Verdict,
} from '../lib/transactions/recurringDetail';
import { StatTile } from './StatTile';

interface Props {
  householdId: string;
  recurring: RecurringSummary;
  rules: CounterpartyRuleRow[];
  onChanged: () => Promise<void> | void;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const VERDICT: Record<Verdict, { label: string; className: string }> = {
  cut: { label: 'Consider cutting', className: 'border-cmd-bad/40 text-cmd-bad' },
  look: { label: 'Worth a look', className: 'border-cmd-warn/50 text-cmd-warn' },
  keep: { label: 'Keep', className: 'border-cmd-border-hi text-cmd-muted' },
};

function Row({
  item, householdId, onChanged,
}: { item: RecurringItem; householdId: string; onChanged: Props['onChanged'] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verdict = VERDICT[item.verdict];

  const decide = async (decision: 'keep' | 'cut' | null) => {
    setBusy(true); setError(null);
    try {
      await setRecurringDecision(householdId, merchantKey(item.merchant), decision);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    } finally { setBusy(false); }
  };

  return (
    <div className={`border-t border-cmd-border/60 py-3 ${item.decision === 'cut' ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm text-cmd-offwhite ${item.decision === 'cut' ? 'line-through' : ''}`}>
            {item.merchant}
          </p>
          <p className="mt-0.5 text-[11px] text-cmd-muted">
            {cadenceLabel[item.cadence]}
            {item.varies && ' · amount moves'}
            {item.markedAutopay && ' · marked automatic'}
            {` · last seen ${item.lastSeen}`}
          </p>
        </div>

        <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] ${verdict.className}`}>
          {verdict.label}
        </span>
        <p className="w-full text-[11px] text-cmd-muted sm:w-64 sm:shrink-0">{item.verdictReason}</p>

        <span className="w-28 shrink-0 text-right">
          <span className="block font-mono text-sm text-cmd-offwhite">{money(item.perPeriod)}</span>
          <span className="block text-[11px] text-cmd-muted">{money(item.perYear)} a year</span>
        </span>

        <div className="flex shrink-0 items-center gap-1">
          {(['keep', 'cut'] as const).map((choice) => (
            <button
              key={choice}
              type="button"
              disabled={busy}
              onClick={() => decide(item.decision === choice ? null : choice)}
              className={`rounded-xl border px-2.5 py-1.5 text-xs capitalize transition disabled:opacity-40 ${
                item.decision === choice
                  ? 'border-cmd-gold bg-cmd-gold/10 text-cmd-gold'
                  : 'border-cmd-border text-cmd-muted hover:text-cmd-offwhite'
              }`}
            >
              {choice}
            </button>
          ))}
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-cmd-gold" />}
        </div>
      </div>
      {error && <p className="mt-1.5 text-[11px] text-cmd-bad">{error}</p>}
    </div>
  );
}

export function RecurringPanel({ householdId, recurring, rules, onChanged }: Props) {
  const decisions = useMemo(() => {
    const out: Record<string, 'keep' | 'cut'> = {};
    for (const rule of rules) {
      if (rule.recurring_decision) out[rule.counterparty_key] = rule.recurring_decision;
    }
    return out;
  }, [rules]);

  const view = useMemo(
    () => buildRecurringView(recurring.charges, decisions, (c) => merchantKey(c.merchant)),
    [recurring.charges, decisions],
  );

  if (recurring.charges.length === 0) {
    return (
      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">What renews</p>
        <div className="mt-5 rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center">
          <Repeat className="mx-auto h-6 w-6 text-cmd-muted" />
          <p className="mt-3 text-sm text-cmd-offwhite">
            {recurring.singlePeriod
              ? 'Nothing can be seen repeating inside a single period.'
              : 'Nothing on file repeats yet.'}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-cmd-muted">
            {recurring.singlePeriod
              ? 'A second export, from any month, is enough to start finding them.'
              : `${recurring.considered} charges examined across ${recurring.periodsRead} periods.`}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">What renews</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
        Every one of these was found by watching it repeat, not guessed from a merchant's name — so
        this is what is actually being charged, not what was signed up for.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Renewing" value={money(view.totalPerPeriod)}
          note={`${money(view.totalPerYear)} a year, everything included`}
        />
        <StatTile
          label="Could be cancelled" value={money(view.optionalPerPeriod)}
          note={`${money(view.optionalPerYear)} a year in subscriptions`}
        />
        <StatTile
          label="Waiting on you" value={String(view.undecided)}
          tone={view.undecided > 0 ? 'warn' : 'default'}
          note={view.undecided > 0 ? 'raised, and not yet answered' : 'nothing outstanding'}
        />
        <StatTile
          label="Marked to cut" value={money(view.cutPerPeriod)}
          tone={view.cutPerYear > 0 ? 'gold' : 'default'}
          note={view.cutPerYear > 0 ? `${money(view.cutPerYear)} a year once done` : 'nothing marked yet'}
        />
      </div>

      <div className="mt-6 space-y-6">
        {view.groups.map((group) => (
          <div key={group.purpose}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">{group.purpose}</p>
              <p className="text-xs text-cmd-muted">
                <span className="font-mono text-cmd-offwhite">{money(group.perPeriod)}</span> a month ·{' '}
                <span className="font-mono text-cmd-offwhite">{money(group.perYear)}</span> a year
              </p>
            </div>
            <div className="mt-1">
              {group.items.map((item) => (
                <Row key={item.merchant} item={item} householdId={householdId} onChanged={onChanged} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
