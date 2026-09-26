// What the transactions say, and what they cannot.
//
// Findings and opportunities are separated on purpose. A red flag and a saving
// read differently and are acted on differently, and a single list ordered by
// severity buries "$1,880 a year of subscriptions, one of which went up in
// June" underneath an overdraft fee that has already been charged.
//
// The two drawn panels are here rather than in the cashflow card because both
// are about composition rather than time: which categories moved, and where
// the money actually lands. Each is a case CLAUDE.md names -- more than three
// numbers and a relationship between them -- so each is a figure.

import React from 'react';
import { AlertTriangle, Lightbulb, MoveRight } from 'lucide-react';
import type { Cashflow } from '../lib/cashflow';
import type { RecurringSummary } from '../lib/recurring';
import { computeSpendingInsights } from '../lib/spendingInsights';
import { FindingList } from './FindingList';
import { useDismissals } from './useDismissals';

interface Props {
  cashflow: Cashflow;
  recurring: RecurringSummary;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export function SpendingInsights({ cashflow, recurring }: Props) {
  const insights = computeSpendingInsights(cashflow, recurring);
  const flags = useDismissals('spending', insights.findings);
  const wins = useDismissals('spending-opportunities', insights.opportunities);

  const moves = cashflow.categoryMoves.filter((m) => Math.abs(m.change) >= 25).slice(0, 6);
  const biggestMove = Math.max(...moves.map((m) => Math.abs(m.change)), 1);
  const merchants = cashflow.merchants.filter((m) => m.amount > 0).slice(0, 8);
  const biggestMerchant = Math.max(...merchants.map((m) => m.amount), 1);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">What this says</p>
        <p className="mt-2 text-lg leading-7 text-cmd-offwhite">{insights.headline}</p>

        {insights.findings.length > 0 && (
          <div className="mt-5">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-cmd-muted">
              <AlertTriangle className="h-3 w-3" /> Worth knowing
            </p>
            <div className="mt-3">
              <FindingList
                section="spending"
                findings={flags.visible}
                hiddenCount={flags.hiddenCount}
                onDismiss={flags.onDismiss}
                onRestore={flags.onRestore}
              />
            </div>
          </div>
        )}

        {insights.opportunities.length > 0 && (
          <div className="mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-cmd-muted">
                <Lightbulb className="h-3 w-3" /> Where there is money to get back
              </p>
              {insights.recoverable >= 100 && (
                <p className="text-xs text-cmd-muted">
                  about <span className="font-mono text-cmd-gold">{money(insights.recoverable)}</span> a year in total
                </p>
              )}
            </div>
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

        {insights.findings.length === 0 && insights.opportunities.length === 0 && (
          <div className="mt-5 rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
            Nothing in these transactions stands out yet. Most of what this page looks for needs
            two months to compare.
          </div>
        )}

        {insights.limits.length > 0 && (
          <div className="mt-5 rounded-2xl border border-cmd-border bg-cmd-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">What limits this</p>
            <ul className="mt-2 space-y-1.5">
              {insights.limits.map((limit, i) => (
                <li key={i} className="text-sm leading-6 text-cmd-muted">
                  <span className="text-cmd-offwhite">{limit.title}.</span> {limit.detail}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* What moved. A diverging bar around a zero line: right of it is more
          than last month, left is less. Position carries the direction, so the
          two colors are never the only thing saying which way a bar points. */}
      {moves.length > 0 && (
        <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">What changed last month</p>
          <p className="mt-2 text-sm text-cmd-muted">
            {cashflow.wholeMonths[0]?.label} against {cashflow.wholeMonths[1]?.label}, whole months only.
          </p>
          {/* One continuous axis down the middle rather than a fragment of
              one per row. Drawn behind the bars, so a row whose bar is short
              still shows where zero is -- per-row it was hidden under the
              bars that started on it. */}
          <div className="relative mt-4">
            <div className="absolute inset-y-0 left-1/2 w-px bg-cmd-border" aria-hidden="true" />
            <ul className="relative space-y-2.5">
            {moves.map((m) => {
              const up = m.change > 0;
              const width = Math.max((Math.abs(m.change) / biggestMove) * 50, 1);
              // A label outside a near-full bar runs off the card, so past
              // halfway it moves inside the bar's end instead.
              const inside = width > 28;
              const amount = `${up ? '+' : '−'}${money(Math.abs(m.change))}`;
              return (
                <li key={m.code}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-cmd-offwhite">{m.label}</span>
                    <span className="shrink-0 font-mono text-xs text-cmd-muted">
                      {money(m.prior)} <MoveRight className="inline h-3 w-3" /> {money(m.recent)}
                    </span>
                  </div>
                  <div className="relative mt-1 h-3.5">
                    <div
                      className={`absolute top-0 flex h-3.5 items-center ${
                        up ? 'justify-end rounded-r bg-cmd-gold/70' : 'justify-start rounded-l bg-cmd-series-2'
                      }`}
                      style={up
                        ? { left: '50%', width: `${width}%` }
                        : { right: '50%', width: `${width}%` }}
                      role="img"
                      aria-label={`${m.label} ${up ? 'up' : 'down'} ${money(Math.abs(m.change))}`}
                    >
                      {inside && (
                        <span className={`px-1.5 font-mono text-[11px] ${up ? 'text-cmd-black' : 'text-cmd-offwhite'}`}>
                          {amount}
                        </span>
                      )}
                    </div>
                    {!inside && (
                      <span
                        className={`absolute top-0 font-mono text-[11px] leading-[0.875rem] ${up ? 'text-cmd-gold' : 'text-cmd-muted'}`}
                        style={up
                          ? { left: `calc(50% + ${width}% + 6px)` }
                          : { right: `calc(50% + ${width}% + 6px)` }}
                      >
                        {amount}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
            </ul>
          </div>
        </section>
      )}

      {/* Where it actually lands. One series, so no legend -- the heading
          names it. */}
      {merchants.length > 0 && (
        <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Where the money lands</p>
          <p className="mt-2 text-sm text-cmd-muted">
            The merchants taking the most, across every month on file.
          </p>
          <ul className="mt-4 space-y-2.5">
            {merchants.map((m) => (
              <li key={m.merchant}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-cmd-offwhite">{m.merchant}</span>
                  <span className="shrink-0 font-mono text-cmd-offwhite">{money(m.amount)}</span>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-cmd-black/60">
                    <div
                      className="h-full rounded-full bg-cmd-series-2"
                      style={{ width: `${Math.max(1, (m.amount / biggestMerchant) * 100)}%` }}
                      role="img"
                      aria-label={`${m.merchant}, ${money(m.amount)} over ${m.count} transactions`}
                    />
                  </div>
                  <span className="w-28 shrink-0 text-right text-[11px] text-cmd-muted">
                    {m.count} time{m.count === 1 ? '' : 's'} · {m.category}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
