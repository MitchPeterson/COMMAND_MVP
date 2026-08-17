// What leaves the account without anyone deciding.
//
// Shown as an annual figure first. $14.99 a month is invisible and $180 a year
// is a decision, and the whole reason a forgotten subscription survives is that
// nobody ever sees it added up.
//
// Each row says why Command believes it recurs, because "we noticed this twice"
// and "your statement says AUTOPAY" are different strengths of claim and the
// user should be able to tell which they are looking at.

import React from 'react';
import { RefreshCw, Repeat } from 'lucide-react';
import type { CreditStatement, CreditTransaction } from '../lib/supabase';
import { findRecurringCharges } from '../lib/recurring';

interface Props {
  transactions: CreditTransaction[];
  statements: CreditStatement[];
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: value < 100 ? 2 : 0,
  }).format(value);

export function RecurringCharges({ transactions, statements }: Props) {
  const { charges, annualTotal, monthsObserved, considered, periodsRead, singlePeriod } =
    findRecurringCharges(transactions, statements);

  // Nothing read yet — the section's uploader is the thing to say, not this.
  if (considered === 0) return null;

  // Read, but nothing repeats. Worth saying out loud: silence here looks like the
  // feature is missing, and a second statement is what turns it on.
  if (charges.length === 0) {
    return (
      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-cmd-muted" />
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">On automatic</p>
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Nothing repeating yet</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
          {singlePeriod
            ? `Command has read one statement, so nothing has had the chance to appear twice. Upload
               another month and anything charged in both — a subscription, a utility, an insurance
               premium — is listed here with what it costs over a year.`
            : `Across ${periodsRead} statements, no merchant charged the household in more than one of
               them, and none was marked automatic. Anything paid from a card or account Command has
               not read would not show here.`}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-cmd-gold" />
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">On automatic</p>
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">
            {charges.length === 1 ? '1 charge that repeats' : `${charges.length} charges that repeat`}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
            These leave the account without anyone deciding each month. Found across{' '}
            {periodsRead} statement{periodsRead === 1 ? '' : 's'} covering {monthsObserved}{' '}
            month{monthsObserved === 1 ? '' : 's'}.
          </p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-xs text-cmd-muted">A year of these</p>
          <p className="text-3xl font-semibold text-cmd-offwhite">{money(annualTotal)}</p>
        </div>
      </div>

      {singlePeriod && (
        <p className="mt-4 rounded-2xl border border-cmd-border bg-cmd-black/40 px-4 py-3 text-sm leading-6 text-cmd-muted">
          Only one statement has been read, so Command can only show what the statement itself marked
          as automatic. Upload another month and anything that repeats will appear here too.
        </p>
      )}

      <div className="mt-5 space-y-2">
        {charges.map((charge) => (
          <div
            key={charge.merchant + charge.lastSeen}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-cmd-border bg-cmd-charcoal px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-cmd-offwhite">
                {charge.merchant}
                {charge.markedAutopay && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-cmd-gold/30 bg-cmd-gold/10 px-2 py-0.5 text-[11px] text-cmd-gold">
                    <RefreshCw className="h-2.5 w-2.5" /> autopay
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-cmd-muted">{charge.basis}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm text-cmd-offwhite">
                {charge.varies ? '~' : ''}{money(charge.amount)}
                <span className="text-xs text-cmd-muted"> each</span>
              </p>
              <p className="font-mono text-xs text-cmd-muted">{money(charge.annualCost)} a year</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 text-xs leading-5 text-cmd-muted/70">
        Worked out from the statements on file, so anything paid from a card or account Command has
        not read is not here. Cancelling is done with the merchant, not in Command.
      </p>
    </section>
  );
}
