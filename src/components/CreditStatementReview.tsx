import React, { useCallback, useEffect, useState } from 'react';
import {
  getCreditStatementDetail,
  reviewCreditField,
  reviewAllCreditFields,
  confirmCreditStatement,
  matchCreditCard,
  confidenceBand,
  type ConfidenceBand,
  type CreditCard as CreditCardRow,
  type CreditStatement,
  type CreditStatementDetail,
  type CreditStatementField,
} from '../lib/supabase';
import { Check, ChevronDown, ChevronRight, Loader2, Pencil, Quote, X } from 'lucide-react';

interface Props {
  statement: CreditStatement;
  cards: CreditCardRow[];
  onConfirmed: () => Promise<void> | void;
}

const money = (value: number | null | undefined) =>
  value == null ? '--' : `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const FIELD_LABELS: Record<string, string> = {
  institution: 'Institution',
  card_product: 'Card',
  account_nickname: 'Nickname',
  last_four: 'Last four',
  primary_cardholder: 'Cardholder',
  statement_opening_date: 'Opening date',
  statement_closing_date: 'Closing date',
  payment_due_date: 'Payment due',
  previous_balance: 'Previous balance',
  payments_and_credits: 'Payments and credits',
  purchases: 'Purchases',
  cash_advances: 'Cash advances',
  balance_transfers: 'Balance transfers',
  fees_charged: 'Fees charged',
  interest_charged: 'Interest charged',
  statement_balance: 'Statement balance',
  minimum_payment_due: 'Minimum payment',
  past_due_amount: 'Past due',
  credit_limit: 'Credit limit',
  available_credit: 'Available credit',
  current_balance: 'Current balance (as labeled)',
  annual_fee: 'Annual fee',
  rewards_program: 'Rewards program',
  rewards_beginning_balance: 'Rewards at open',
  rewards_earned: 'Rewards earned',
  rewards_redeemed: 'Rewards redeemed',
  rewards_ending_balance: 'Rewards at close',
  rewards_expiration_note: 'Rewards expiration',
};

const APR_LABELS: Record<string, string> = {
  purchase: 'Purchases',
  cash_advance: 'Cash advances',
  balance_transfer: 'Balance transfers',
  penalty: 'Penalty rate',
  promotional: 'Promotional rate',
  other: 'Other',
};

const BAND_TONE: Record<ConfidenceBand, string> = {
  high: 'text-emerald-300',
  medium: 'text-cmd-gold',
  low: 'text-amber-300',
};

const btn = 'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] transition disabled:opacity-40';
const btnIdle = 'border-cmd-border text-cmd-muted hover:border-cmd-gold hover:text-cmd-gold';

function FieldRow({
  field,
  onReview,
}: {
  field: CreditStatementField;
  onReview: (id: string, decision: 'confirmed' | 'edited' | 'rejected', value?: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(field.user_value ?? field.value_text ?? '');
  const [busy, setBusy] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const value = field.user_value ?? field.value_text ?? '';
  const band = confidenceBand(field.confidence);

  const act = async (decision: 'confirmed' | 'edited' | 'rejected', v?: string) => {
    setBusy(true);
    try {
      await onReview(field.id, decision, v);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border p-3 ${
        field.review_state === 'rejected'
          ? 'border-cmd-border bg-cmd-black/20 opacity-60'
          : field.review_state === 'confirmed' || field.review_state === 'edited'
            ? 'border-emerald-500/20 bg-cmd-black/40'
            : 'border-cmd-border bg-cmd-black/40'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">
          {FIELD_LABELS[field.field_code] ?? field.field_code.replace(/_/g, ' ')}
        </p>
        {field.review_state !== 'unreviewed' && (
          <span className="text-[10px] text-cmd-muted">
            {field.review_state === 'edited' ? 'your value' : field.review_state}
          </span>
        )}
      </div>

      {editing ? (
        <input
          className="mt-1.5 w-full rounded-lg border border-cmd-gold/40 bg-cmd-black/60 px-2.5 py-1.5 text-sm text-cmd-offwhite outline-none"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') act('edited', draft);
            if (e.key === 'Escape') setEditing(false);
          }}
        />
      ) : (
        <p className={`mt-1 text-sm font-medium ${field.review_state === 'rejected' ? 'text-cmd-muted line-through' : 'text-cmd-offwhite'}`}>
          {field.field_code === 'last_four' ? `•••• ${value}` : value}
        </p>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {field.source_page != null && field.source_page > 0 && (
          <span className="text-[10px] text-cmd-muted">p{field.source_page}</span>
        )}
        <span className={`text-[10px] ${BAND_TONE[band]}`}>{band}</span>
        {field.evidence && (
          <button
            type="button"
            onClick={() => setShowEvidence((v) => !v)}
            className="inline-flex items-center gap-1 text-[10px] text-cmd-muted transition hover:text-cmd-gold"
          >
            <Quote className="h-2.5 w-2.5" /> source
          </button>
        )}
      </div>
      {showEvidence && field.evidence && (
        <p className="mt-1.5 border-l-2 border-cmd-gold/40 pl-2 text-[11px] italic text-cmd-muted">“{field.evidence}”</p>
      )}

      {!editing && (
        <div className="mt-2 flex flex-wrap gap-1">
          {field.review_state !== 'confirmed' && (
            <button type="button" disabled={busy} onClick={() => act('confirmed')} className={`${btn} border-emerald-500/40 bg-emerald-500/10 text-emerald-200`}>
              <Check className="h-3 w-3" />
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => { setDraft(value); setEditing(true); }} className={`${btn} ${btnIdle}`}>
            <Pencil className="h-3 w-3" />
          </button>
          {field.review_state !== 'rejected' && (
            <button type="button" disabled={busy} onClick={() => act('rejected')} className={`${btn} ${btnIdle} hover:border-red-500/40 hover:text-red-200`}>
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
      {editing && (
        <div className="mt-2 flex gap-1">
          <button type="button" disabled={busy} onClick={() => act('edited', draft)} className={`${btn} border-cmd-gold bg-cmd-gold/15 text-cmd-gold`}>
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className={`${btn} ${btnIdle}`}>Cancel</button>
        </div>
      )}
    </div>
  );
}

/**
 * Review before anything becomes a card. The account this statement belongs to
 * is part of what gets reviewed — an uncertain match is offered as a question,
 * never applied, because silently merging two cards is not recoverable by
 * looking at the screen.
 */
export function CreditStatementReview({ statement, cards, onConfirmed }: Props) {
  const [detail, setDetail] = useState<CreditStatementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);

  const suggestion = matchCreditCard(statement, cards);
  const [targetCardId, setTargetCardId] = useState<string | null>(
    suggestion && suggestion.confidence >= 0.9 ? suggestion.card.id : null,
  );

  const load = useCallback(async () => {
    setDetail(await getCreditStatementDetail(statement.id));
  }, [statement.id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getCreditStatementDetail(statement.id).then((fresh) => {
      if (active) {
        setDetail(fresh);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [statement.id]);

  const review = async (id: string, decision: 'confirmed' | 'edited' | 'rejected', value?: string) => {
    setError(null);
    try {
      await reviewCreditField(id, decision, value);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that decision.');
    }
  };

  const confirmAll = async () => {
    setBusy(true);
    setError(null);
    try {
      const n = await reviewAllCreditFields(statement.id);
      await load();
      setResult(n === 0 ? 'Only low-confidence values are left — those need a look each.' : `Confirmed ${n} value${n === 1 ? '' : 's'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm these values.');
    } finally {
      setBusy(false);
    }
  };

  const addToProfile = async () => {
    setBusy(true);
    setError(null);
    try {
      const outcome = await confirmCreditStatement(statement, targetCardId);
      await load();
      await onConfirmed();
      setResult(
        `${outcome.created ? 'Card added' : 'Card updated'} from ${outcome.fieldsApplied} confirmed value${outcome.fieldsApplied === 1 ? '' : 's'}` +
          `${outcome.partial ? ', with the rest still waiting for you' : ''}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add this card.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <p className="mt-4 flex items-center gap-2 text-sm text-cmd-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading what Command read…
      </p>
    );
  }
  if (!detail) return null;

  const decided = detail.fields.filter((f) => f.review_state === 'confirmed' || f.review_state === 'edited').length;
  const unreviewed = detail.fields.filter((f) => f.review_state === 'unreviewed').length;
  const spendByCategory = new Map<string, number>();
  for (const tx of detail.transactions) {
    if (tx.direction !== 'charge' || tx.amount == null) continue;
    const key = tx.category ?? 'uncategorized';
    spendByCategory.set(key, (spendByCategory.get(key) ?? 0) + tx.amount);
  }
  const topCategories = [...spendByCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const groups: Array<{ label: string; codes: string[] }> = [
    { label: 'Statement', codes: ['institution', 'card_product', 'account_nickname', 'last_four', 'primary_cardholder', 'statement_opening_date', 'statement_closing_date', 'payment_due_date'] },
    { label: 'Balances', codes: ['previous_balance', 'payments_and_credits', 'purchases', 'cash_advances', 'balance_transfers', 'fees_charged', 'interest_charged', 'statement_balance', 'minimum_payment_due', 'past_due_amount', 'credit_limit', 'available_credit', 'current_balance', 'annual_fee'] },
    { label: 'Rewards', codes: ['rewards_program', 'rewards_beginning_balance', 'rewards_earned', 'rewards_redeemed', 'rewards_ending_balance', 'rewards_expiration_note'] },
  ];

  return (
    <div className="mt-5 space-y-5 border-t border-cmd-border pt-5">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-cmd-gold/25 bg-cmd-black/30 p-4">
        <p className="mr-auto text-sm text-cmd-muted">
          {decided} of {detail.fields.length} values confirmed
          {unreviewed > 0 ? ` · ${unreviewed} still to review` : ''}
        </p>
        <button type="button" disabled={busy || unreviewed === 0} onClick={confirmAll} className={`${btn} ${btnIdle} px-3 py-1.5`}>
          <Check className="h-3.5 w-3.5" /> Confirm all
        </button>
        <button
          type="button"
          disabled={busy || decided === 0}
          onClick={addToProfile}
          className="inline-flex items-center gap-1.5 rounded-xl border border-cmd-gold bg-cmd-gold/15 px-4 py-2 text-sm font-semibold text-cmd-gold transition hover:bg-cmd-gold/25 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {targetCardId ? 'Update this card' : 'Add as a new card'}
        </button>
      </div>

      {/* Which account this belongs to is part of the review, not a guess made
          on the user's behalf. */}
      <div className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Which card is this?</p>
        {suggestion && (
          <p className={`mt-2 text-xs ${suggestion.confidence >= 0.9 ? 'text-emerald-300' : 'text-amber-300'}`}>
            {suggestion.reason}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTargetCardId(null)}
            className={`${btn} ${targetCardId === null ? 'border-cmd-gold bg-cmd-gold/15 text-cmd-gold' : btnIdle}`}
          >
            A new card
          </button>
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setTargetCardId(card.id)}
              className={`${btn} ${targetCardId === card.id ? 'border-cmd-gold bg-cmd-gold/15 text-cmd-gold' : btnIdle}`}
            >
              {card.card_name}
              {card.last_four ? ` ••••${card.last_four}` : ''}
            </button>
          ))}
        </div>
      </div>

      {result && <p className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200">{result}</p>}
      {error && <p className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

      {groups.map((group) => {
        const fields = detail.fields.filter((f) => group.codes.includes(f.field_code));
        if (fields.length === 0) return null;
        return (
          <div key={group.label}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">{group.label}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((field) => (
                <FieldRow key={field.id} field={field} onReview={review} />
              ))}
            </div>
          </div>
        );
      })}

      {detail.aprTerms.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Interest rates</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {detail.aprTerms.map((term) => (
              <div key={term.id} className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-cmd-offwhite">{APR_LABELS[term.apr_type] ?? term.apr_type}</p>
                  <p className="text-sm font-semibold text-cmd-gold">
                    {term.apr_percent != null ? `${term.apr_percent}%` : '--'}
                    {term.is_variable ? ' variable' : ''}
                  </p>
                </div>
                <p className="mt-1 text-xs text-cmd-muted">
                  {[
                    term.balance_subject_to_rate != null ? `${money(term.balance_subject_to_rate)} subject to it` : null,
                    term.interest_charged != null ? `${money(term.interest_charged)} charged` : null,
                    term.promotional_expiration_date ? `ends ${term.promotional_expiration_date}` : null,
                  ].filter(Boolean).join(' · ') || 'No balance detail printed'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {detail.transactions.length > 0 && (
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">
              Where this period went — {detail.transactions.length} transactions
            </p>
            <button
              type="button"
              onClick={() => setShowTransactions((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-cmd-muted transition hover:text-cmd-gold"
            >
              {showTransactions ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {showTransactions ? 'Hide' : 'Show'} the list
            </button>
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {topCategories.map(([category, total]) => (
              <div key={category} className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-3">
                <p className="text-xs capitalize text-cmd-muted">{category.replace(/_/g, ' ')}</p>
                <p className="mt-1 text-lg font-semibold text-cmd-offwhite">{money(total)}</p>
              </div>
            ))}
          </div>

          {showTransactions && (
            <div className="mt-3 max-h-80 space-y-1 overflow-y-auto pr-1">
              {detail.transactions.map((tx) => (
                <div key={tx.id} className="flex items-baseline justify-between gap-3 rounded-xl border border-cmd-border bg-cmd-black/30 px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-cmd-offwhite">{tx.merchant_description}</span>
                    <span className="text-[11px] text-cmd-muted">
                      {tx.transaction_date ?? '--'} · {tx.category ?? 'uncategorized'}
                      {tx.category_source === 'ai_classified' && (
                        <span className="text-cmd-muted/60"> (Command's classification)</span>
                      )}
                    </span>
                  </span>
                  <span className={`shrink-0 text-sm ${tx.direction === 'credit' ? 'text-emerald-300' : 'text-cmd-offwhite'}`}>
                    {tx.direction === 'credit' ? '−' : ''}{money(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-cmd-muted/70">
            Categories marked as Command's classification are our reading, not something the issuer
            printed.
          </p>
        </div>
      )}

      <p className="text-xs text-cmd-muted/70">
        Only what you confirm reaches your card. A statement records a closed period — the balance
        here is what it said on its closing date, not what you owe today.
      </p>
    </div>
  );
}
