// What Command could not place, and is saying so about.
//
// The alternative to this screen is the one thing a category breakdown must
// never do: absorb what it could not read into "Everything else" and present
// the result as complete. A household looking at a clean-looking pie has no
// way to know that a tenth of it was a shrug.
//
// So every flagged row says why it is here in its own words -- a check, whose
// payee is not in the description; a payment to a person; a transfer with two
// equally plausible other halves; or an honest "could not tell". Each is
// either corrected or waved through, and waving through is a real answer:
// plenty of these are fine and only look uncertain.

import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import type { CreditTransaction } from '../lib/supabase';
import type { TransactionCategory } from '../lib/transactions/taxonomy';
import { TransactionRow } from './TransactionRow';

interface Props {
  householdId: string;
  flagged: CreditTransaction[];
  categories: TransactionCategory[];
  sourceLabel: (id: string | null) => string;
  onChanged: () => Promise<void> | void;
}

export function ReviewQueue({ householdId, flagged, categories, sourceLabel, onChanged }: Props) {
  // Nothing waiting is not worth a card. An empty queue that announces itself
  // is a permanent reminder of a job already done.
  if (flagged.length === 0) return null;

  const withReason = flagged.filter((t) => t.review_reason);
  const reasons = [...new Set(withReason.map((t) => t.review_reason!))];

  return (
    <section className="rounded-3xl border border-cmd-gold/25 bg-cmd-gold/5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.24em] text-cmd-muted">
            <ClipboardCheck className="h-3 w-3" /> Waiting on you
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">
            {flagged.length} transaction{flagged.length === 1 ? '' : 's'} Command could not place
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
            {reasons.length === 1
              ? `All of them for the same reason: ${reasons[0].toLowerCase()}.`
              : 'Each says why below.'}
            {' '}They are counted in your totals — it is the category that is uncertain, not the amount.
            Correcting one offers to correct every other record from the same place.
          </p>
        </div>
      </div>

      <div className="mt-4">
        {flagged.map((t) => (
          <TransactionRow
            key={t.id}
            householdId={householdId}
            transaction={t}
            categories={categories}
            sourceLabel={sourceLabel}
            onChanged={onChanged}
            showClear
          />
        ))}
      </div>
    </section>
  );
}
