// Where the money went, on the cards Command has read.
//
// The coverage line is not a disclaimer bolted on — it is the first thing shown,
// because a category breakdown of a third of the household's outgoings looks
// exactly like a category breakdown of all of them, and the user has no way to
// tell which they are looking at.

import React, { useMemo, useState } from 'react';
import { PieChart, ChevronLeft, ChevronRight } from 'lucide-react';
import type { BudgetSummary, CreditCard, CreditTransaction } from '../lib/supabase';
import { monthlySpending, coverageAgainstBudget } from '../lib/spending';

interface Props {
  transactions: CreditTransaction[];
  cards: CreditCard[];
  budget?: BudgetSummary | null;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

// Enough distinct steps that adjacent bars read apart, all within the gold
// accent rather than a rainbow — 80% neutral, 20% gold.
const TONES = [
  'bg-cmd-gold/80', 'bg-cmd-gold/60', 'bg-cmd-gold/45', 'bg-cmd-gold/35',
  'bg-cmd-gold/25', 'bg-white/20', 'bg-white/15', 'bg-white/10',
];

export function MonthlySpending({ transactions, cards, budget }: Props) {
  const coverage = useMemo(() => monthlySpending(transactions, cards), [transactions, cards]);
  const [index, setIndex] = useState(0);
  const month = coverage.months[index] ?? null;
  const against = coverageAgainstBudget(month, budget?.monthly_expenses);

  if (coverage.months.length === 0) {
    return (
      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Where the money went</p>
        <div className="mt-5 rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center">
          <PieChart className="mx-auto h-6 w-6 text-cmd-muted" />
          <p className="mt-3 text-sm text-cmd-offwhite">No spending Command can see yet.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-cmd-muted">
            This is built from card statements that have been uploaded and read. Add one from the
            Credit section and the months will fill in.
          </p>
        </div>
      </section>
    );
  }

  const max = Math.max(...month!.categories.map((c) => Math.abs(c.amount)), 1);

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Where the money went</p>
          <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">{month!.label}</h2>
          <p className="mt-1 text-sm text-cmd-muted">
            {month!.transactionCount} transaction{month!.transactionCount === 1 ? '' : 's'}
            {month!.refunds > 0 ? ` · ${money(month!.refunds)} refunded` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-3xl font-semibold text-cmd-offwhite">{money(month!.total)}</p>
            <p className="text-xs text-cmd-muted">on cards Command has read</p>
          </div>
          {coverage.months.length > 1 && (
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => setIndex(Math.min(coverage.months.length - 1, index + 1))}
                disabled={index >= coverage.months.length - 1}
                className="rounded-xl border border-cmd-border p-2 text-cmd-muted transition hover:text-cmd-gold disabled:opacity-30"
                aria-label="Earlier month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIndex(Math.max(0, index - 1))}
                disabled={index === 0}
                className="rounded-xl border border-cmd-border p-2 text-cmd-muted transition hover:text-cmd-gold disabled:opacity-30"
                aria-label="Later month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* First, not last: a breakdown of part of the spending is
          indistinguishable from a breakdown of all of it. */}
      <div className="mt-5 rounded-2xl border border-cmd-border bg-cmd-black/30 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">What this covers</p>
        <p className="mt-2 text-sm leading-6 text-cmd-muted">
          {coverage.cardsSeen} of {coverage.cardsOnFile || coverage.cardsSeen} card
          {(coverage.cardsOnFile || coverage.cardsSeen) === 1 ? '' : 's'} on file, over{' '}
          {coverage.months.length} month{coverage.months.length === 1 ? '' : 's'}.
          {against
            ? ` It accounts for ${Math.round(against.share)}% of the ${money(budget!.monthly_expenses!)} of monthly
               expenses on your profile — the other ${money(against.unexplained)} went somewhere Command
               cannot see.`
            : ' Cash, checks, debit cards and anything paid straight from checking are not here.'}
          {coverage.inferredShare > 0.2
            && ` About ${Math.round(coverage.inferredShare * 100)}% of these were categorized by Command
                 rather than by the card issuer.`}
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {month!.categories.map((c, i) => (
          <div key={c.category}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-cmd-offwhite">
                {c.label}
                {c.inferred && (
                  <span className="ml-2 text-[11px] text-cmd-muted" title="Categorized by Command, not the issuer">
                    inferred
                  </span>
                )}
              </span>
              <span className="shrink-0 font-mono text-sm text-cmd-offwhite">{money(c.amount)}</span>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-cmd-black/60">
                <div
                  className={`h-full rounded-full ${TONES[i % TONES.length]}`}
                  style={{ width: `${Math.max(1, (Math.abs(c.amount) / max) * 100)}%` }}
                />
              </div>
              <span className="w-24 shrink-0 text-right text-[11px] text-cmd-muted">
                {Math.round(c.share)}% · {c.count} item{c.count === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {coverage.months.length > 1 && (
        <div className="mt-6 border-t border-cmd-border pt-5">
          <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Month to month</p>
          <div className="mt-3 flex items-end gap-2">
            {[...coverage.months].reverse().map((m, i) => {
              const peak = Math.max(...coverage.months.map((x) => x.total), 1);
              const selected = coverage.months.length - 1 - i === index;
              return (
                <button
                  key={m.month}
                  type="button"
                  onClick={() => setIndex(coverage.months.length - 1 - i)}
                  className="group flex flex-1 flex-col items-center gap-1"
                  title={`${m.label} · ${money(m.total)}`}
                >
                  <span className="text-[11px] text-cmd-muted">{money(m.total)}</span>
                  <div
                    className={`w-full rounded-t transition ${selected ? 'bg-cmd-gold/70' : 'bg-white/15 group-hover:bg-white/25'}`}
                    style={{ height: `${Math.max(4, (m.total / peak) * 88)}px` }}
                  />
                  <span className={`text-[11px] ${selected ? 'text-cmd-gold' : 'text-cmd-muted'}`}>
                    {m.month.slice(5)}/{m.month.slice(2, 4)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
