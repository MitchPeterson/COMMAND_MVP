// The month, top to bottom.
//
// Replaces the four cards the Spending tab used to stack -- cashflow, insights,
// a category breakdown and recurring charges -- which between them showed the
// same month four times with four different framings and no way to move
// between them.
//
// One period is selected and everything on the page is about that period. What
// came in, what went out, what was kept, and what each of those is against the
// month before. Then the categories, ranked, each one opening in place.
//
// The comparison is the point. "$4,301 on groceries" means nothing on its own;
// "$4,301, up $340" is a sentence a household can do something with. Where a
// comparison cannot be made honestly -- either month only partly loaded -- it
// is withheld and says why, rather than printing arithmetic on an incomplete
// number and calling it a trend.

import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronRight, PiggyBank, Wallet } from 'lucide-react';
import type { CreditCard, CreditTransaction, FinanceAccount } from '../lib/supabase';
import type { Cashflow } from '../lib/cashflow';
import { periodDetail, worthMentioning, type Delta } from '../lib/transactions/period';
import type { TransactionCategory } from '../lib/transactions/taxonomy';
import { StatTile } from './StatTile';
import { PeriodSelector } from './PeriodSelector';
import { CategoryDrilldown } from './CategoryDrilldown';

interface Props {
  householdId: string;
  cashflow: Cashflow;
  transactions: CreditTransaction[];
  accounts: FinanceAccount[];
  cards: CreditCard[];
  /** Everything a row can be moved to, defaults plus the household's own. */
  categories: TransactionCategory[];
  onChanged: () => Promise<void> | void;
  now?: Date;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

/** A change, or nothing at all when nothing honest can be said about it. */
function DeltaNote({ delta, invert = false }: { delta: Delta | null; invert?: boolean }) {
  if (!delta) return <span className="text-cmd-muted/70">no month before</span>;
  if (!delta.comparable) return <span className="text-cmd-muted/70" title={delta.reason ?? ''}>not comparable</span>;
  if (Math.abs(delta.change) < 1) return <span className="text-cmd-muted/70">no change</span>;

  const up = delta.change > 0;
  // For spending, up is the unwelcome direction; for income and savings it is
  // the other way round. Tone follows meaning, not sign.
  const good = invert ? !up : up;
  return (
    <span className={good ? 'text-cmd-gold' : 'text-cmd-muted'}>
      {up ? '+' : '−'}{money(Math.abs(delta.change))}
      {delta.changePct != null && Math.abs(delta.changePct) < 1000
        ? ` (${up ? '+' : '−'}${Math.abs(Math.round(delta.changePct))}%)`
        : ''}
    </span>
  );
}

export function PeriodView({
  householdId, cashflow, transactions, accounts, cards, categories, onChanged, now = new Date(),
}: Props) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  const sourceLabel = useMemo(() => {
    const names = new Map<string, string>();
    for (const a of accounts) names.set(a.id, a.account_name);
    for (const c of cards) names.set(c.id, c.card_name || c.issuer || 'Card');
    return (id: string | null) => (id && names.get(id)) || 'Not attached to an account';
  }, [accounts, cards]);

  const detail = useMemo(
    () => periodDetail(cashflow, index, now, sourceLabel),
    [cashflow, index, now, sourceLabel],
  );

  if (!detail) {
    return (
      <section className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
        No transactions on file yet. Import an export below and this fills in.
      </section>
    );
  }

  const { period } = detail;
  const biggest = Math.max(...detail.categories.map((c) => Math.abs(c.amount)), 1);

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">The month</p>
          <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">
            {period.label}
            {detail.inProgress && <span className="ml-2 text-sm font-normal text-cmd-muted">so far</span>}
          </h2>
          <p className="mt-1 text-sm text-cmd-muted">
            {period.transactionCount} transaction{period.transactionCount === 1 ? '' : 's'}
            {period.partial && ' · Command holds only part of this month'}
          </p>
        </div>
        <PeriodSelector periods={cashflow.months} index={index} onChange={(i) => { setIndex(i); setOpen(null); }} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="In" icon={<ArrowDownLeft className="h-3 w-3" />}
          value={money(period.income)} tone={period.income > 0 ? 'gold' : 'default'}
          delta={<DeltaNote delta={detail.income} invert={false} />}
          note={detail.incomeSources.length > 1 ? `${detail.incomeSources.length} sources` : undefined}
        />
        <StatTile
          label="Out" icon={<ArrowUpRight className="h-3 w-3" />}
          value={money(period.expenses)}
          delta={<DeltaNote delta={detail.expenses} invert />}
          note={period.refunds > 0 ? `net of ${money(period.refunds)} refunded` : undefined}
        />
        <StatTile
          label="Saved" icon={<PiggyBank className="h-3 w-3" />}
          value={money(period.savings)}
          delta={<DeltaNote delta={detail.savings} />}
          note="moved somewhere it is kept"
        />
        <StatTile
          label="Left over" icon={<Wallet className="h-3 w-3" />}
          value={money(period.net)} tone={period.net < 0 ? 'critical' : 'default'}
          delta={<DeltaNote delta={detail.net} />}
          note={period.income > 0 ? `${Math.round((period.net / period.income) * 100)}% of what came in` : 'no income in view'}
        />
      </div>

      {/* Income by where it arrived, when there is more than one answer. */}
      {detail.incomeSources.length > 1 && (
        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Where it came in</p>
          <ul className="mt-3 space-y-2">
            {detail.incomeSources.map((s) => (
              <li key={s.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-cmd-offwhite">{s.label}</span>
                <span className="flex shrink-0 items-baseline gap-3">
                  {worthMentioning(s.delta) && <span className="text-[11px]"><DeltaNote delta={s.delta} /></span>}
                  <span className="font-mono text-cmd-offwhite">{money(s.amount)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Where it went. Each row opens in place. */}
      <div className="mt-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Where it went</p>
        {detail.categories.length === 0 ? (
          <p className="mt-3 text-sm text-cmd-muted">No spending Command can see in this month.</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {detail.categories.map((c) => {
              const expanded = open === c.code;
              return (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : c.code)}
                    aria-expanded={expanded}
                    className="w-full rounded-xl px-2 py-2 text-left transition hover:bg-cmd-black/40"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-1.5">
                        {expanded
                          ? <ChevronDown className="h-3 w-3 shrink-0 text-cmd-gold" />
                          : <ChevronRight className="h-3 w-3 shrink-0 text-cmd-muted" />}
                        <span className="truncate text-sm text-cmd-offwhite">{c.label}</span>
                      </span>
                      <span className="flex shrink-0 items-baseline gap-3">
                        {worthMentioning(c.delta) && (
                          <span className="text-[11px]"><DeltaNote delta={c.delta} invert /></span>
                        )}
                        <span className="font-mono text-sm text-cmd-offwhite">{money(c.amount)}</span>
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-cmd-black/60">
                        <div
                          className={`h-full rounded-full ${expanded ? 'bg-cmd-gold' : 'bg-cmd-gold/45'}`}
                          style={{ width: `${Math.max(1, (Math.abs(c.amount) / biggest) * 100)}%` }}
                        />
                      </div>
                      <span className="w-28 shrink-0 text-right text-[11px] text-cmd-muted">
                        {Math.round(c.share)}% · {c.count} item{c.count === 1 ? '' : 's'}
                      </span>
                    </div>
                  </button>

                  {expanded && (
                    <CategoryDrilldown
                      householdId={householdId}
                      categories={categories}
                      onChanged={onChanged}
                      cashflow={cashflow}
                      categoryCode={c.code}
                      selectedMonth={period.month}
                      onSelectMonth={(month) => {
                        const at = cashflow.months.findIndex((m) => m.month === month);
                        if (at >= 0) setIndex(at);
                      }}
                      transactions={transactions}
                      now={now}
                      sourceLabel={sourceLabel}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* What was left out, shown rather than silently applied. */}
      {detail.excluded.length > 0 && (
        <div className="mt-6 rounded-2xl border border-cmd-border bg-cmd-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Not counted</p>
          <p className="mt-2 text-sm leading-6 text-cmd-muted">
            Money moving between your own accounts. It is left out of both sides, because counting
            it would report the same dollars twice.
          </p>
          <ul className="mt-3 space-y-1.5">
            {detail.excluded.map((e) => (
              <li key={e.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-cmd-muted">
                  {e.description}
                  {e.pairedWith && <span className="ml-2 text-[11px] text-cmd-muted/70">matched to its other half</span>}
                </span>
                <span className="shrink-0 font-mono text-cmd-muted">{money(Math.abs(e.amount))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
