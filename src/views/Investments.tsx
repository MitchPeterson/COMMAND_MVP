// What the household holds.
//
// A panel inside Finances rather than a section of its own. Its balances feed
// the same net worth the grade above it reports, so splitting them would mean
// two places computing one number -- and the sidebar does not need an
// eleventh item for something that belongs to "what I own".
//
// It deliberately carries no grade, which every section leads with.
// A letter on an allocation is investment advice however it is worded, and
// Command has no market data and no business having a view on whether anyone's
// portfolio is right. It leads with the picture instead.
//
// What it will say: how the money splits by asset class, which tax bucket each
// dollar sits in, and when one company is a large share of the whole. That last
// one is a fact about concentration, not a suggestion to sell.

import React from 'react';
import { PieChart, TrendingUp } from 'lucide-react';
import { useHousehold } from '../useHousehold';
import { DonutChart } from '../components/DonutChart';
import { buildInvestmentPicture, type Holding } from '../lib/investments';

const money = (value: number, compact = false): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
    ...(compact && value >= 1_000_000 ? { notation: 'compact', maximumSignificantDigits: 3 } : {}),
  }).format(value);

const asDate = (iso: string | null): string => {
  if (!iso) return 'no date recorded';
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(d);
};

export function InvestmentsPanel() {
  const { data } = useHousehold();
  const picture = buildInvestmentPicture(
    (data?.financeAccounts ?? []) as never,
    (data?.investmentHoldings ?? []) as Holding[],
  );

  if (picture.accounts.length === 0) {
    return (
      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-8 text-center text-cmd-muted">
        <PieChart className="mx-auto h-6 w-6 text-cmd-gold" />
        <h2 className="mt-4 text-2xl font-semibold text-cmd-offwhite">Nothing invested on file</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6">
          Add a brokerage, retirement, 529 or HSA account in Finances and it appears here. Command
          does not need a statement to start — a balance is enough for the totals.
        </p>
      </section>
    );
  }

  const uncovered = Math.max(picture.total - picture.holdingsCovered, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Invested</p>
        <h2 className="mt-2 text-3xl font-semibold text-cmd-offwhite">{money(picture.total)}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
          Across {picture.accounts.length} accounts, as last recorded on {asDate(picture.oldestAsOf)}.
          Command holds no market data, so nothing here is marked to today's prices and no figure is a
          projection.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Where it is invested</p>
          {picture.allocation.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-cmd-border p-6 text-sm leading-6 text-cmd-muted">
              No holdings are recorded, so Command can total these accounts but cannot say what is
              inside them. Adding what each account holds is what turns a balance into an allocation.
            </p>
          ) : (
            <>
              <div className="mt-4">
                <DonutChart
                  segments={picture.allocation.map((a) => ({
                    label: a.label, value: a.value, display: `${money(a.value)} · ${a.share}%`,
                  }))}
                  centerValue={money(picture.holdingsCovered, true)}
                  centerLabel="Held"
                  summary={`Allocation across ${picture.allocation.map((a) => `${a.label} ${a.share} percent`).join(', ')}`}
                />
              </div>
              {uncovered > 0 && (
                <p className="mt-4 text-xs leading-5 text-cmd-muted/70">
                  {money(uncovered)} of the {money(picture.total)} on file has no holdings recorded
                  against it, so it is not in this split.
                </p>
              )}
            </>
          )}
        </section>

        <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">How it is taxed</p>
          <div className="mt-4">
            <DonutChart
              segments={picture.taxBuckets.map((b) => ({
                label: b.label, value: b.value, display: `${money(b.value)} · ${b.share}%`,
              }))}
              centerValue={money(picture.total, true)}
              centerLabel="Invested"
              summary={`Split by tax treatment across ${picture.taxBuckets.map((b) => `${b.label} ${b.share} percent`).join(', ')}`}
            />
          </div>
          {picture.anyInferredTax && (
            <p className="mt-4 text-xs leading-5 text-cmd-muted/70">
              Some of these were worked out from the account's type and name rather than recorded
              directly — a 401(k) and a Roth are both &ldquo;retirement&rdquo; and are taxed in
              opposite directions. Set it on the account to be sure.
            </p>
          )}
        </section>
      </div>

      {picture.concentrations.length > 0 && (
        <section className="rounded-3xl border border-cmd-gold/30 bg-cmd-gold/5 p-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-cmd-gold" />
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-gold">Concentration</p>
          </div>
          <div className="mt-4 space-y-3">
            {picture.concentrations.map((c) => (
              <div key={c.name}>
                <p className="text-sm font-semibold text-cmd-offwhite">
                  {c.symbol ? `${c.symbol} — ` : ''}{money(c.value)} is {c.share}% of everything you have invested
                </p>
                <p className="mt-1 text-sm leading-6 text-cmd-muted">
                  A single company rather than a fund. Whether that is too much depends on things
                  Command cannot see — how the rest of your income depends on the same employer, and
                  what selling would cost in tax. It is worth raising with a planner.
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Your accounts</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {['Account', 'Where', 'Tax treatment', 'Balance', 'As of'].map((h) => (
                  <th key={h} className="border-b border-cmd-border pb-2 pr-4 text-left text-[11px] uppercase tracking-[0.14em] text-cmd-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {picture.accounts.map((account) => {
                const bucket = picture.taxBuckets.find(
                  (b) => b.treatment === (account.tax_treatment
                    ?? picture.taxBuckets.find((x) => x.value > 0)?.treatment),
                );
                return (
                  <tr key={account.id}>
                    <td className="border-b border-cmd-border/60 py-2.5 pr-4 text-cmd-offwhite">{account.account_name}</td>
                    <td className="border-b border-cmd-border/60 py-2.5 pr-4 text-cmd-muted">{account.institution ?? '—'}</td>
                    <td className="border-b border-cmd-border/60 py-2.5 pr-4 text-cmd-muted">
                      {account.tax_treatment ? bucket?.label ?? account.tax_treatment : 'Inferred'}
                    </td>
                    <td className="border-b border-cmd-border/60 py-2.5 pr-4 font-mono text-cmd-offwhite">
                      {money(account.balance ?? 0)}
                    </td>
                    <td className="border-b border-cmd-border/60 py-2.5 pr-4 font-mono text-xs text-cmd-muted">
                      {account.as_of_date ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
