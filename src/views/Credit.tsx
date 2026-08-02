import React from 'react';
import { useHousehold } from '../useHousehold';
import { CreditCard, Percent, Shield, Star } from 'lucide-react';

export function CreditView() {
  const { data } = useHousehold();
  const cards = data?.creditCards ?? [];

  const averageUtilization = cards.length
    ? cards.reduce((sum, card) => sum + (card.utilization_pct ?? 0), 0) / cards.length
    : null;

  const formattedCurrency = (value: number | null | undefined) =>
    value == null ? '--' : `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-8 shadow-sm shadow-black/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Credit snapshot</p>
            <h1 className="mt-3 text-3xl font-semibold text-cmd-offwhite">Credit</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cmd-border bg-cmd-black/50 px-4 py-2 text-sm text-cmd-muted">
            <CreditCard className="h-4 w-4" /> {cards.length} card{cards.length === 1 ? '' : 's'}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
          <div className="flex items-center gap-3 text-cmd-gold">
            <Percent className="h-5 w-5" />
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Avg utilization</p>
          </div>
          <p className="mt-6 text-3xl font-semibold text-cmd-offwhite">
            {averageUtilization != null ? `${averageUtilization.toFixed(0)}%` : '--'}
          </p>
          <p className="mt-2 text-sm text-cmd-muted">Across all tracked cards</p>
        </div>
        <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
          <div className="flex items-center gap-3 text-emerald-300">
            <Shield className="h-5 w-5" />
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Best issuer</p>
          </div>
          <p className="mt-6 text-3xl font-semibold text-cmd-offwhite">{cards[0]?.issuer ?? '--'}</p>
          <p className="mt-2 text-sm text-cmd-muted">Based on available cards</p>
        </div>
        <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
          <div className="flex items-center gap-3 text-cmd-gold">
            <Star className="h-5 w-5" />
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Rewards potential</p>
          </div>
          <p className="mt-6 text-3xl font-semibold text-cmd-offwhite">
            {cards.reduce((sum, card) => sum + (card.rewards_value_ytd ?? 0), 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
          </p>
          <p className="mt-2 text-sm text-cmd-muted">Year-to-date rewards value</p>
        </div>
      </section>

      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Cards</p>
            <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Credit cards</h2>
          </div>
          <span className="rounded-full border border-cmd-border bg-cmd-black/60 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cmd-muted">
            {cards.length} card{cards.length === 1 ? '' : 's'}
          </span>
        </div>
        {cards.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
            No credit cards connected yet. Add cards to monitor utilization and rewards.
          </div>
        ) : (
          <div className="space-y-4">
            {cards.map((card) => (
              <div key={card.id} className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-5 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-cmd-muted">{card.issuer ?? 'Issuer unknown'}</p>
                  <h3 className="mt-2 text-xl font-semibold text-cmd-offwhite">{card.card_name}</h3>
                  <p className="mt-2 text-sm text-cmd-muted">Limit {formattedCurrency(card.credit_limit)} • Balance {formattedCurrency(card.current_balance)}</p>
                </div>
                <div className="mt-4 text-right sm:mt-0">
                  <p className="text-sm text-cmd-muted">Utilization</p>
                  <p className="mt-1 text-2xl font-semibold text-cmd-offwhite">{card.utilization_pct != null ? `${card.utilization_pct.toFixed(0)}%` : '--'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
