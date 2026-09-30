// One transaction, correctable.
//
// Shared by the category drill-down and the review queue, because the two want
// exactly the same row and a second copy would be a second set of rules about
// what a correction does.
//
// The shape of the interaction is the point. Changing a category saves
// immediately -- no Save button, no dialog, nothing to forget to press --
// and then an inline bar appears offering to do the same to every other record
// from that merchant. It appears *after* the change rather than as a question
// before it, so the household is never blocked on a decision about fourteen
// rows while trying to fix one.
//
// The offer names a number. "Also move 14 other Starbucks records?" is a
// decision; "apply to all?" is a gamble.

import React, { useState } from 'react';
import { Check, Loader2, Plus, X } from 'lucide-react';
import {
  updateTransactionCategory, clearTransactionReview, countMatchingCounterparty,
  applyCounterpartyRule, addTransactionCategory, StaleRowError,
  type CreditTransaction,
} from '../lib/supabase';
import type { CategoryKind, TransactionCategory } from '../lib/transactions/taxonomy';

interface Props {
  householdId: string;
  transaction: CreditTransaction;
  categories: TransactionCategory[];
  sourceLabel: (id: string | null) => string;
  onChanged: () => Promise<void> | void;
  /** The review queue offers this; the drill-down has nothing to clear. */
  showClear?: boolean;
}

const exact = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const KINDS: Array<{ value: CategoryKind; label: string; hint: string }> = [
  { value: 'expense', label: 'Spending', hint: 'counted as money out' },
  { value: 'income', label: 'Income', hint: 'counted as money in' },
  { value: 'savings', label: 'Savings', hint: 'counted as kept, not spent' },
  { value: 'transfer', label: 'Transfer', hint: 'left out of both sides' },
];

const NEW = '__new__';

export function TransactionRow({
  householdId, transaction, categories, sourceLabel, onChanged, showClear = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<{ label: string; kind: CategoryKind }>({ label: '', kind: 'expense' });
  /** The offer to apply the same correction to everything else from this merchant. */
  const [offer, setOffer] = useState<{ code: string; label: string; count: number } | null>(null);

  const current = transaction.category_code
    ?? categories.find((c) => c.label === transaction.category)?.code
    ?? '';

  /** Save one row, then work out whether there is an offer worth making. */
  const assign = async (code: string, label: string) => {
    setBusy(true); setError(null); setOffer(null);
    try {
      await updateTransactionCategory(transaction, code, label);
      await onChanged();

      const key = transaction.counterparty_key;
      if (key) {
        const count = await countMatchingCounterparty(householdId, key, transaction.id);
        if (count > 0) setOffer({ code, label, count });
      }
    } catch (err) {
      setError(err instanceof StaleRowError
        ? err.message
        : err instanceof Error ? err.message : 'Could not change that.');
    } finally {
      setBusy(false);
    }
  };

  const applyToAll = async () => {
    if (!offer || !transaction.counterparty_key) return;
    setBusy(true); setError(null);
    try {
      await applyCounterpartyRule(householdId, {
        counterpartyKey: transaction.counterparty_key,
        categoryCode: offer.code,
        label: offer.label,
      });
      setOffer(null);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply that to the others.');
    } finally {
      setBusy(false);
    }
  };

  const createAndAssign = async () => {
    setBusy(true); setError(null);
    try {
      const made = await addTransactionCategory(householdId, draft);
      setCreating(false);
      setDraft({ label: '', kind: 'expense' });
      await assign(made.code, made.label);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that category.');
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true); setError(null);
    try {
      await clearTransactionReview(transaction.id);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear that.');
    } finally {
      setBusy(false);
    }
  };

  const name = transaction.counterparty_name || transaction.merchant_description;

  return (
    <div className="border-t border-cmd-border/60 py-3">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <span className="w-20 shrink-0 font-mono text-xs text-cmd-muted">{transaction.transaction_date}</span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-cmd-offwhite">{name}</p>
          {/* The raw text under the cleaned name: the cleaning is a guess, and
              the household may need to see what the bank actually wrote. */}
          {name !== transaction.merchant_description && (
            <p className="mt-0.5 truncate text-[11px] text-cmd-muted">{transaction.merchant_description}</p>
          )}
          <p className="mt-0.5 text-[11px] text-cmd-muted">
            {sourceLabel(transaction.finance_account_id ?? transaction.credit_card_id ?? null)}
            {transaction.review_reason && (
              <span className="text-amber-700"> · {transaction.review_reason}</span>
            )}
          </p>
        </div>

        <span className={`w-28 shrink-0 text-right font-mono text-sm ${
          transaction.direction === 'credit' ? 'text-cmd-gold' : 'text-cmd-offwhite'
        }`}>
          {transaction.direction === 'credit' ? '+' : ''}{exact(Number(transaction.amount) || 0)}
        </span>

        <div className="flex shrink-0 items-center gap-2">
          <select
            value={current}
            disabled={busy}
            onChange={(e) => {
              if (e.target.value === NEW) { setCreating(true); return; }
              const chosen = categories.find((c) => c.code === e.target.value);
              if (chosen) void assign(chosen.code, chosen.label);
            }}
            className="w-44 rounded-xl border border-cmd-border bg-cmd-black px-2.5 py-1.5 text-xs text-cmd-offwhite focus:border-cmd-gold focus:outline-none disabled:opacity-50"
            aria-label={`Category for ${name}`}
          >
            {current === '' && <option value="">Not categorized</option>}
            {categories.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            <option value={NEW}>+ New category…</option>
          </select>

          {showClear && (
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              className="rounded-xl border border-cmd-border px-2.5 py-1.5 text-xs text-cmd-muted transition hover:border-cmd-gold/50 hover:text-cmd-gold disabled:opacity-50"
            >
              Looks right
            </button>
          )}
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-cmd-gold" />}
        </div>
      </div>

      {/* A new category, made and assigned in one step. Inline, because a
          dialog for two fields is a dialog for two fields. */}
      {creating && (
        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-xl border border-cmd-gold/30 bg-cmd-gold/5 p-3">
          <label className="min-w-0 flex-1">
            <span className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">New category</span>
            <input
              autoFocus
              value={draft.label}
              onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter' && draft.label.trim()) void createAndAssign(); }}
              placeholder="Boat"
              className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black px-3 py-1.5 text-sm text-cmd-offwhite placeholder:text-cmd-muted/60 focus:border-cmd-gold focus:outline-none"
            />
          </label>
          <label>
            <span className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">How it counts</span>
            <select
              value={draft.kind}
              onChange={(e) => setDraft((p) => ({ ...p, kind: e.target.value as CategoryKind }))}
              className="mt-1 rounded-xl border border-cmd-border bg-cmd-black px-3 py-1.5 text-sm text-cmd-offwhite focus:border-cmd-gold focus:outline-none"
            >
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label} — {k.hint}</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={createAndAssign}
            disabled={busy || !draft.label.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-cmd-gold px-3 py-1.5 text-xs font-medium text-cmd-black transition hover:bg-cmd-gold/90 disabled:opacity-40"
          >
            <Plus className="h-3 w-3" /> Add and use it
          </button>
          <button
            type="button"
            onClick={() => { setCreating(false); setError(null); }}
            className="rounded-xl px-2 py-1.5 text-xs text-cmd-muted transition hover:text-cmd-offwhite"
          >
            Cancel
          </button>
        </div>
      )}

      {/* The offer, after the change rather than before it. */}
      {offer && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-cmd-gold/30 bg-cmd-gold/5 px-3 py-2">
          <Check className="h-3.5 w-3.5 shrink-0 text-cmd-gold" />
          <span className="min-w-0 flex-1 text-xs text-cmd-offwhite">
            Moved to {offer.label}. Also move {offer.count} other{' '}
            <span className="text-cmd-muted">{name}</span> record{offer.count === 1 ? '' : 's'},
            and anything imported from now on?
          </span>
          <button
            type="button"
            onClick={applyToAll}
            disabled={busy}
            className="shrink-0 rounded-xl bg-cmd-gold px-3 py-1.5 text-xs font-medium text-cmd-black transition hover:bg-cmd-gold/90 disabled:opacity-40"
          >
            Apply to all
          </button>
          <button
            type="button"
            onClick={() => setOffer(null)}
            className="shrink-0 rounded-xl px-2 py-1.5 text-xs text-cmd-muted transition hover:text-cmd-offwhite"
          >
            Only this one
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-red-500">
          <X className="mt-0.5 h-3 w-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
