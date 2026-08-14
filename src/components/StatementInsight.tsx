// What a statement says about how the card is being used.
//
// Shown on an unconfirmed reading on purpose. The transaction list is the most
// informative thing Command ever receives about a household's spending, and all
// of its value used to sit behind a confirmation step whose button said nothing
// about what confirming would produce. A statement could be read successfully
// and feel like it had produced a review chore.

import React from 'react';
import { ArrowRight, Percent, TrendingUp, Wallet } from 'lucide-react';
import type { CreditCard, CreditStatement, CreditTransaction } from '../lib/supabase';
import { analyzeStatementFit, matchProfile, CATALOG_AS_OF } from '../lib/cardFit';
import { CardProfilePanel } from './CardProfilePanel';

interface Props {
  statement: CreditStatement;
  transactions: CreditTransaction[];
  cards: CreditCard[];
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    maximumFractionDigits: value < 100 ? 2 : 0,
  }).format(value);

export function StatementInsight({ statement, transactions, cards }: Props) {
  const rows = transactions.filter((t) => t.statement_id === statement.id);
  const fit = analyzeStatementFit(
    rows,
    statement.institution,
    statement.card_product,
    cards,
    statement.interest_charged ?? 0,
    statement.rewards_earned ?? null,
  );

  if (rows.length === 0 || fit.totalSpend <= 0) return null;

  const topCategories = Object.entries(fit.totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Interest against rewards outranks everything else here. No card selection
  // recovers what a carried balance costs, so it is said first or not at all.
  const interestDominates = fit.interestCharged > 0 && fit.interestCharged > fit.rewardsValue;

  return (
    <div className="mt-4 rounded-2xl border border-cmd-border bg-cmd-black/30 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">What this statement says</p>

      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
        <div>
          <p className="text-xs text-cmd-muted">Purchases</p>
          <p className="text-xl font-semibold text-cmd-offwhite">{money(fit.totalSpend)}</p>
        </div>
        <div>
          <p className="text-xs text-cmd-muted">Rewards this period</p>
          <p className="text-xl font-semibold text-cmd-offwhite">{money(fit.rewardsValue)}</p>
        </div>
        {fit.profile && (
          <div>
            <p className="text-xs text-cmd-muted">Effective return</p>
            <p className="text-xl font-semibold text-cmd-offwhite">{fit.effectiveRate.toFixed(1)}%</p>
          </div>
        )}
        {fit.interestCharged > 0 && (
          <div>
            <p className="text-xs text-cmd-muted">Interest charged</p>
            <p className="text-xl font-semibold text-amber-300">{money(fit.interestCharged)}</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {topCategories.map(([code, amount]) => (
          <span key={code} className="rounded-full border border-cmd-border bg-cmd-black/50 px-3 py-1 text-xs text-cmd-muted">
            {code.replace(/_/g, ' ')} <span className="text-cmd-offwhite">{money(amount)}</span>
          </span>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {interestDominates && (
          <div className="flex gap-3 rounded-2xl border border-red-500/25 bg-red-500/5 px-4 py-3">
            <Percent className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            <div>
              <p className="text-sm font-semibold text-cmd-offwhite">
                Interest cost {money(fit.interestCharged)} against {money(fit.rewardsValue)} of rewards
              </p>
              <p className="mt-1 text-sm text-cmd-muted">
                While a balance carries, no card earns its way past what the interest costs. Nothing
                below matters as much as this.
              </p>
            </div>
          </div>
        )}

        {fit.misallocation.length > 0 && (
          <div className="flex gap-3 rounded-2xl border border-cmd-gold/25 bg-cmd-gold/5 px-4 py-3">
            <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-cmd-gold" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-cmd-offwhite">
                {money(fit.misallocationTotal)} left on the table this period
              </p>
              <ul className="mt-2 space-y-1">
                {fit.misallocation.slice(0, 3).map((m) => (
                  <li key={m.category} className="text-sm text-cmd-muted">
                    {money(m.amount)} of {m.label.toLowerCase()} earned {m.usedRate}× here —{' '}
                    <span className="text-cmd-offwhite">{m.bestHeldCard}</span> earns {m.bestHeldRate}×,
                    worth {money(m.leftOnTable)}.
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}


        {!fit.profile && (
          <div className="rounded-2xl border border-cmd-border bg-cmd-black/40 px-4 py-3">
            <p className="text-sm text-cmd-muted">
              Command does not have published rates for{' '}
              <span className="text-cmd-offwhite">
                {[statement.institution, statement.card_product].filter(Boolean).join(' ') || 'this card'}
              </span>
              , so it can total the spending but not judge what it earned. The categories above still
              stand on their own.
            </p>
          </div>
        )}
      </div>

      <CardProfilePanel
        issuer={statement.institution}
        product={statement.card_product}
        totals={fit.totals}
        heldKeys={cards
          .map((c) => matchProfile(c.issuer, c.card_name)?.key)
          .filter((k): k is string => Boolean(k))}
      />

      <p className="mt-4 text-xs leading-5 text-cmd-muted/70">
        Earning rates are published headline rates as of {CATALOG_AS_OF}, valued at a cent a point.
        Your account&rsquo;s terms, promotions and transfer options can all differ — worth checking
        against your own agreement before moving spending around.
      </p>
    </div>
  );
}
