// A running record of what was spent that might matter at filing.
//
// The point is timing. Reconstructing a year of charitable giving in March means
// missing some of it, and a $250 acknowledgment is far easier to get from a
// charity in November than after the year has closed. So this logs as it
// happens, tracks whether the paperwork exists, and says nothing about whether
// any of it is deductible — that is the preparer's call, and the schema reflects
// it: the column is `category`, not `deduction_amount`.

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Download, Plus, Receipt, Trash2 } from 'lucide-react';
import {
  addDeduction, deleteDeduction, updateDeduction, importCharitableFromCards,
  type CreditTransaction, type DeductionLogEntry,
} from '../lib/supabase';
import { DEDUCTION_CATEGORIES, categoryLabel } from '../lib/taxPlanning';

interface DeductionLogProps {
  householdId: string;
  taxYear: number;
  entries: DeductionLogEntry[];
  transactions: CreditTransaction[];
  onChanged: () => Promise<void> | void;
}

interface DeductionForm {
  spent_on: string;
  category: string;
  amount: string;
  description: string;
  payee: string;
  has_receipt: boolean;
  notes: string;
}

const money = (value: number) => `$${Math.round(value).toLocaleString()}`;

const emptyForm = (): DeductionForm => ({
  spent_on: new Date().toISOString().slice(0, 10),
  category: 'charitable',
  amount: '',
  description: '',
  payee: '',
  has_receipt: false,
  notes: '',
});

export function DeductionLog({
  householdId, taxYear, entries, transactions, onChanged,
}: DeductionLogProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<DeductionForm>(emptyForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const forYear = useMemo(
    () => entries.filter((e) => e.tax_year === taxYear)
      .sort((a, b) => b.spent_on.localeCompare(a.spent_on)),
    [entries, taxYear],
  );

  const totals = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const entry of forYear) {
      byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + Number(entry.amount));
    }
    return {
      byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
      total: forYear.reduce((sum, e) => sum + Number(e.amount), 0),
      missingReceipts: forYear.filter((e) => e.needs_receipt && !e.has_receipt),
    };
  }, [forYear]);

  // How many card transactions could be pulled in without being duplicates.
  const importable = useMemo(() => {
    const already = new Set(forYear.map((e) => e.source_transaction_id).filter(Boolean));
    return transactions.filter(
      (t) => t.direction === 'charge'
        && (t.category ?? '').toLowerCase().includes('charit')
        && (t.transaction_date ?? '').startsWith(String(taxYear))
        && !already.has(t.id),
    ).length;
  }, [transactions, forYear, taxYear]);

  const selected = DEDUCTION_CATEGORIES.find((c) => c.code === form.category);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const amount = Number(form.amount.replace(/[^0-9.]/g, ''));
      await addDeduction(householdId, {
        ...form,
        tax_year: taxYear,
        amount,
        // Charitable gifts over $250 need a written acknowledgment. Flagging it
        // now is the whole point of logging during the year.
        needs_receipt: (selected?.needsReceipt ?? false) || (form.category === 'charitable' && amount >= 250),
        source: 'manual',
        source_transaction_id: null,
        payment_method: null,
        receipt_document_id: null,
      });
      setForm(emptyForm());
      setShowForm(false);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log that.');
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    setBusy(true);
    setError(null);
    try {
      const count = await importCharitableFromCards(householdId, taxYear, transactions);
      setNotice(count === 0
        ? 'Nothing new to bring across.'
        : `Brought across ${count} transaction${count === 1 ? '' : 's'}.`);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import those.');
    } finally {
      setBusy(false);
    }
  };

  const toggleReceipt = async (entry: DeductionLogEntry) => {
    try {
      await updateDeduction(entry.id, { has_receipt: !entry.has_receipt });
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    }
  };

  const remove = async (entry: DeductionLogEntry) => {
    try {
      await deleteDeduction(entry.id);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that.');
    }
  };

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Through the year</p>
          <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Deduction log &middot; {taxYear}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
            What was spent, when, and whether there is paperwork for it. Command records; it does not decide
            what qualifies. Arriving at filing with this already written down is the difference between a
            short conversation with a preparer and a long one.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-semibold text-cmd-offwhite">{money(totals.total)}</p>
          <p className="text-xs uppercase tracking-[0.16em] text-cmd-muted">
            {forYear.length} entr{forYear.length === 1 ? 'y' : 'ies'}
          </p>
        </div>
      </div>

      {totals.missingReceipts.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-cmd-gold/40 bg-cmd-gold/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-cmd-gold" />
          <div>
            <p className="text-sm font-semibold text-cmd-offwhite">
              {totals.missingReceipts.length} entr{totals.missingReceipts.length === 1 ? 'y needs' : 'ies need'} an acknowledgment
            </p>
            <p className="mt-1 text-sm leading-6 text-cmd-muted">
              {money(totals.missingReceipts.reduce((s, e) => s + Number(e.amount), 0))} logged without one.
              Charities send them on request and it is far easier now than after the year closes.
            </p>
          </div>
        </div>
      )}

      {totals.byCategory.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {totals.byCategory.map(([code, amount]) => (
            <span key={code}
              className="rounded-full border border-cmd-border bg-cmd-black/50 px-3 py-1 text-xs text-cmd-muted">
              {categoryLabel(code)} <span className="text-cmd-offwhite">{money(amount)}</span>
            </span>
          ))}
        </div>
      )}

      {forYear.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center">
          <Receipt className="mx-auto h-6 w-6 text-cmd-muted" />
          <p className="mt-3 text-sm text-cmd-offwhite">Nothing logged for {taxYear} yet.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-cmd-muted">
            Add things as they happen rather than reconstructing them in March.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-cmd-border text-xs uppercase tracking-[0.16em] text-cmd-muted">
                <th className="py-2 pr-4 font-normal">Date</th>
                <th className="py-2 pr-4 font-normal">What</th>
                <th className="py-2 pr-4 font-normal">Category</th>
                <th className="py-2 pr-4 text-right font-normal">Amount</th>
                <th className="py-2 pr-4 font-normal">Receipt</th>
                <th className="py-2 font-normal" />
              </tr>
            </thead>
            <tbody>
              {forYear.map((entry) => (
                <tr key={entry.id} className="border-b border-cmd-border/40 last:border-0">
                  <td className="py-3 pr-4 font-mono text-xs text-cmd-muted">{entry.spent_on}</td>
                  <td className="py-3 pr-4">
                    <p className="text-cmd-offwhite">{entry.description}</p>
                    {entry.source === 'card_transaction' && (
                      <p className="text-xs text-cmd-muted">From a card statement</p>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-cmd-muted">{categoryLabel(entry.category)}</td>
                  <td className="py-3 pr-4 text-right font-mono text-cmd-offwhite">{money(Number(entry.amount))}</td>
                  <td className="py-3 pr-4">
                    <button type="button" onClick={() => toggleReceipt(entry)}
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                        entry.has_receipt
                          ? 'border-cmd-border text-cmd-offwhite'
                          : entry.needs_receipt
                            ? 'border-cmd-gold/50 text-cmd-gold'
                            : 'border-cmd-border text-cmd-muted'
                      }`}>
                      {entry.has_receipt ? <Check className="h-3 w-3" /> : null}
                      {entry.has_receipt ? 'On file' : entry.needs_receipt ? 'Needed' : 'None'}
                    </button>
                  </td>
                  <td className="py-3 text-right">
                    <button type="button" onClick={() => remove(entry)}
                      className="text-cmd-muted transition hover:text-red-400" aria-label="Remove">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {notice && <p className="mt-4 text-sm text-cmd-muted">{notice}</p>}

      <div className="mt-6 flex flex-wrap gap-3 border-t border-cmd-border pt-6">
        {!showForm && (
          <button type="button" onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-full border border-cmd-border px-4 py-2 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold">
            <Plus className="h-4 w-4" /> Log something
          </button>
        )}
        {importable > 0 && (
          <button type="button" onClick={runImport} disabled={busy}
            className="flex items-center gap-2 rounded-full border border-cmd-border px-4 py-2 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold disabled:opacity-50">
            <Download className="h-4 w-4" />
            Bring across {importable} charitable transaction{importable === 1 ? '' : 's'} from your cards
          </button>
        )}
      </div>

      {showForm && (
        <div className="mt-4 rounded-3xl border border-cmd-border bg-cmd-charcoal p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs uppercase tracking-[0.16em] text-cmd-muted">
              Date
              <input type="date" value={form.spent_on}
                onChange={(e) => setForm((prev: DeductionForm) => ({ ...prev, spent_on: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2 text-sm text-cmd-offwhite" />
            </label>
            <label className="text-xs uppercase tracking-[0.16em] text-cmd-muted">
              Category
              <select value={form.category}
                onChange={(e) => setForm((prev: DeductionForm) => ({ ...prev, category: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2 text-sm text-cmd-offwhite">
                {DEDUCTION_CATEGORIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="text-xs uppercase tracking-[0.16em] text-cmd-muted">
              Amount
              <input value={form.amount} inputMode="decimal" placeholder="250"
                onChange={(e) => setForm((prev: DeductionForm) => ({ ...prev, amount: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2 text-sm text-cmd-offwhite" />
            </label>
            <label className="text-xs uppercase tracking-[0.16em] text-cmd-muted">
              Paid to
              <input value={form.payee}
                onChange={(e) => setForm((prev: DeductionForm) => ({ ...prev, payee: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2 text-sm text-cmd-offwhite" />
            </label>
            <label className="text-xs uppercase tracking-[0.16em] text-cmd-muted sm:col-span-2 lg:col-span-4">
              What it was for
              <input value={form.description}
                onChange={(e) => setForm((prev: DeductionForm) => ({ ...prev, description: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2 text-sm text-cmd-offwhite" />
            </label>
          </div>
          {selected?.note && <p className="mt-3 text-xs leading-5 text-cmd-muted">{selected.note}</p>}
          <label className="mt-3 flex items-center gap-2 text-sm text-cmd-muted">
            <input type="checkbox" checked={form.has_receipt}
              onChange={(e) => setForm((prev: DeductionForm) => ({ ...prev, has_receipt: e.target.checked }))} />
            I already have the receipt or acknowledgment
          </label>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={submit} disabled={busy}
              className="rounded-full bg-cmd-gold px-5 py-2 text-sm font-semibold text-cmd-black transition disabled:opacity-50">
              {busy ? 'Saving…' : 'Log it'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setError(null); }}
              className="rounded-full border border-cmd-border px-5 py-2 text-sm text-cmd-muted transition hover:text-cmd-offwhite">
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
