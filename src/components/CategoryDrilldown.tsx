// One category, across every period, with the rows behind it.
//
// Opened in place under the row it belongs to. No page change and no overlay:
// the whole value of a drill-down is that the thing you drilled from is still
// on screen, and every overlay in this app is chrome rather than data.
//
// The chart leads because the question a household actually has is never "what
// was groceries in August" -- it is "is that a lot". A figure answers the first
// and only the shape answers the second.
//
// Three things it refuses to do quietly:
//   a period Command holds only part of is drawn hatched and labelled, never
//   averaged in, and never compared against;
//   the period still running says "so far", because its figure is real and not
//   yet final;
//   the average line covers complete periods only, or a half-loaded month
//   drags it down and makes every finished month look like an overspend.

import React, { useMemo, useState } from 'react';
import type { CreditTransaction } from '../lib/supabase';
import type { Cashflow } from '../lib/cashflow';
import { categorySeries } from '../lib/transactions/period';
import { categoryFromLabel, type TransactionCategory } from '../lib/transactions/taxonomy';
import { TransactionRow } from './TransactionRow';

interface Props {
  householdId: string;
  cashflow: Cashflow;
  categoryCode: string;
  /** Everything a row can be moved to, defaults plus the household's own. */
  categories: TransactionCategory[];
  onChanged: () => Promise<void> | void;
  /** The period the page is showing, emphasized in the chart. */
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  transactions: CreditTransaction[];
  now?: Date;
  /** Resolves a source id to something a person would recognise. */
  sourceLabel?: (id: string | null) => string;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const exact = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const TICK = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const tick = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return TICK.format(new Date(Date.UTC(y, m - 1, 1))) + (m === 1 ? ` ’${String(y).slice(2)}` : '');
};

/** 45-degree hatching for a period that is only partly covered. */
const HATCH = 'repeating-linear-gradient(45deg, rgb(var(--cmd-gold)) 0 2px, rgb(var(--cmd-gold) / 0.25) 2px 5px)';

const H = 132;

export function CategoryDrilldown({
  householdId, cashflow, categoryCode, categories, onChanged,
  selectedMonth, onSelectMonth, transactions,
  now = new Date(), sourceLabel = () => 'Not attached',
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const series = useMemo(() => categorySeries(cashflow, categoryCode, now), [cashflow, categoryCode, now]);

  const rows = useMemo(() => transactions
    .filter((t) => (t.transaction_date ?? '').startsWith(selectedMonth)
      && categoryFromLabel(t.category_code ?? t.category).code === categoryCode)
    .sort((a, b) => (b.transaction_date ?? '').localeCompare(a.transaction_date ?? '')),
  [transactions, selectedMonth, categoryCode]);

  const peak = Math.max(...series.points.map((p) => Math.abs(p.amount)), 1);
  const active = series.points.find((p) => p.month === hovered) ?? null;

  return (
    <div className="mt-3 rounded-2xl border border-cmd-border bg-cmd-black/30 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Month to month</p>
        {active ? (
          <p className="text-xs text-cmd-offwhite">
            <span className="text-cmd-muted">{active.label}</span> · {exact(active.amount)}
            {active.partial && <span className="text-cmd-muted"> · only partly loaded</span>}
            {active.inProgress && <span className="text-cmd-muted"> · still running</span>}
          </p>
        ) : series.average != null ? (
          <p className="text-xs text-cmd-muted">
            {money(series.average)} on average, over {series.completeCount} complete
            month{series.completeCount === 1 ? '' : 's'}
          </p>
        ) : (
          <p className="text-xs text-cmd-muted">No complete month yet to average</p>
        )}
      </div>

      <div className="relative mt-4" style={{ height: `${H}px` }}>
        {/* The average, over complete periods only. */}
        {series.average != null && series.average > 0 && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-cmd-gold/50"
            style={{ bottom: `${Math.min((series.average / peak) * H, H)}px` }}
            aria-hidden="true"
          />
        )}

        <div
          className="flex h-full items-end gap-2"
          role="img"
          aria-label={`${categoryCode} by month. ${series.points.map((p) =>
            `${p.label}: ${money(p.amount)}${p.partial ? ', only partly loaded' : ''}${p.inProgress ? ', still running' : ''}`,
          ).join('. ')}.`}
        >
          {series.points.map((p) => {
            const selected = p.month === selectedMonth;
            const dim = hovered != null && hovered !== p.month;
            return (
              <button
                key={p.month}
                type="button"
                onClick={() => onSelectMonth(p.month)}
                onMouseEnter={() => setHovered(p.month)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(p.month)}
                onBlur={() => setHovered(null)}
                className={`flex h-full min-w-0 flex-1 flex-col justify-end gap-1 transition-opacity ${
                  dim ? 'opacity-50' : 'opacity-100'
                }`}
                title={`${p.label} · ${exact(p.amount)}`}
              >
                {/* Every bar carries its own value. The gold measures below
                    3:1 on a light page, and a visible label is the relief
                    that makes it legible anyway. */}
                <span className={`truncate text-[11px] ${selected ? 'text-cmd-offwhite' : 'text-cmd-muted'}`}>
                  {p.amount === 0 ? '—' : money(p.amount)}
                </span>
                <div
                  className={`w-full rounded-t ${
                    p.partial ? '' : selected ? 'bg-cmd-gold' : 'bg-cmd-gold/45'
                  }`}
                  style={{
                    height: `${Math.max(p.amount > 0 ? 2 : 0, (Math.abs(p.amount) / peak) * (H - 22))}px`,
                    ...(p.partial ? { backgroundImage: HATCH, opacity: selected ? 1 : 0.55 } : {}),
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
      <div className="h-px bg-cmd-border" />

      <div className="mt-2 flex gap-2">
        {series.points.map((p) => (
          <div key={p.month} className="min-w-0 flex-1 text-center">
            <span className={`block truncate text-[11px] ${p.month === selectedMonth ? 'text-cmd-gold' : 'text-cmd-muted'}`}>
              {tick(p.month)}
            </span>
            {(p.partial || p.inProgress) && (
              <span className="block truncate text-[10px] text-cmd-muted/80">
                {p.inProgress ? 'so far' : 'partial'}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* The rows behind the bar. Newest first. */}
      <div className="mt-5 border-t border-cmd-border pt-4">
        <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">
          {rows.length} transaction{rows.length === 1 ? '' : 's'} in this month
        </p>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-cmd-muted">Nothing in this category this month.</p>
        ) : (
          <div className="mt-2">
            {rows.map((t) => (
              <TransactionRow
                key={t.id}
                householdId={householdId}
                transaction={t}
                categories={categories}
                sourceLabel={sourceLabel}
                onChanged={onChanged}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
