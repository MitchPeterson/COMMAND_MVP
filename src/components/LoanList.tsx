// The loans a household carries, and the form for adding one.
//
// A loan can be tied to the asset it is secured against, which is how "this is
// the loan on the Subaru" gets recorded without vehicles needing a section of
// their own. Rate and APR are separate fields because a car loan quotes both and
// they are not the same number.

import React, { useState } from 'react';
import { Landmark, Plus, Trash2, Link2 } from 'lucide-react';
import {
  addLoan, deleteLoan, LOAN_TYPES, loanTypeLabel,
  type Asset, type Loan, type LoanType,
} from '../lib/supabase';

interface Props {
  householdId: string;
  loans: Loan[];
  assets: Asset[];
  onChanged: () => Promise<void> | void;
}

interface LoanForm {
  name: string;
  loan_type: LoanType;
  lender: string;
  current_balance: string;
  original_amount: string;
  interest_rate: string;
  monthly_payment: string;
  maturity_date: string;
  secured_by_asset_id: string;
  is_federal: boolean;
  notes: string;
}

const EMPTY: LoanForm = {
  name: '', loan_type: 'auto', lender: '', current_balance: '', original_amount: '',
  interest_rate: '', monthly_payment: '', maturity_date: '', secured_by_asset_id: '',
  is_federal: false, notes: '',
};

const money = (value: number | null) =>
  value == null ? '--' : new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(value);

export function LoanList({ householdId, loans, assets, onChanged }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<LoanForm>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = loans.filter((l) => l.status === 'active' || l.status === 'deferred');
  const closed = loans.filter((l) => l.status !== 'active' && l.status !== 'deferred');
  const set = <K extends keyof LoanForm>(key: K, value: LoanForm[K]) =>
    setForm((prev: LoanForm) => ({ ...prev, [key]: value }));

  // Only types that can sensibly be secured offer the asset picker.
  const securable = LOAN_TYPES.find((t) => t.code === form.loan_type)?.securable ?? false;
  const assetName = (id: string | null) => assets.find((a) => a.id === id)?.name ?? null;

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await addLoan(householdId, {
        ...form,
        secured_by_asset_id: form.secured_by_asset_id || null,
        is_federal: form.loan_type === 'student' ? form.is_federal : null,
        status: 'active',
      });
      setForm(EMPTY);
      setShowForm(false);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (loan: Loan) => {
    try {
      await deleteLoan(loan.id);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that.');
    }
  };

  const row = (loan: Loan) => {
    const securedTo = assetName(loan.secured_by_asset_id);
    const rate = loan.interest_rate ?? loan.apr;
    return (
      <div key={loan.id} className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-5 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">
            {loanTypeLabel(loan.loan_type)}
            {loan.is_federal ? ' · federal' : ''}
            {loan.in_deferment ? ' · in deferment' : ''}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-cmd-offwhite">{loan.name}</h3>
          <p className="mt-1 text-sm text-cmd-muted">
            {[
              loan.lender,
              rate != null ? `${rate}%` : null,
              loan.monthly_payment != null ? `${money(loan.monthly_payment)}/mo` : null,
              loan.maturity_date ? `through ${loan.maturity_date}` : null,
            ].filter(Boolean).join(' · ') || 'No terms recorded'}
          </p>
          {securedTo && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-cmd-border bg-cmd-black/50 px-3 py-1 text-xs text-cmd-muted">
              <Link2 className="h-3 w-3" /> Secured by {securedTo}
            </p>
          )}
        </div>
        <div className="mt-4 flex items-center gap-4 sm:mt-0">
          <div className="text-right">
            <p className="text-sm text-cmd-muted">Balance</p>
            <p className="mt-1 text-xl font-semibold text-cmd-offwhite">{money(loan.current_balance)}</p>
            {loan.original_amount != null && (
              <p className="text-xs text-cmd-muted">of {money(loan.original_amount)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => remove(loan)}
            className="text-cmd-muted transition hover:text-red-400"
            aria-label={`Remove ${loan.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Your loans</p>
          <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">
            Car, student, personal and everything else owed
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
            The mortgage lives in Home with the house and card balances live in Credit. Everything
            else belongs here, and all three are counted in the net worth above.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-cmd-border bg-cmd-black/60 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cmd-muted">
          {active.length} active
        </span>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {active.length === 0 && closed.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center">
          <Landmark className="mx-auto h-6 w-6 text-cmd-muted" />
          <p className="mt-3 text-sm text-cmd-offwhite">No loans recorded.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-cmd-muted">
            Until a car or student loan is added, it is not counted against your net worth and the
            debt figures above are understated.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {active.map(row)}
          {closed.length > 0 && (
            <>
              <p className="pt-2 text-xs uppercase tracking-[0.24em] text-cmd-muted">Closed</p>
              {closed.map(row)}
            </>
          )}
        </div>
      )}

      <div className="mt-6 border-t border-cmd-border pt-6">
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-full border border-cmd-border px-4 py-2 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
          >
            <Plus className="h-4 w-4" /> Add a loan
          </button>
        ) : (
          <div className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs uppercase tracking-[0.16em] text-cmd-muted">
                What is it
                <input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Subaru Outback loan"
                  className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2 text-sm text-cmd-offwhite"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.16em] text-cmd-muted">
                Type
                <select
                  value={form.loan_type}
                  onChange={(e) => set('loan_type', e.target.value as LoanType)}
                  className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2 text-sm text-cmd-offwhite"
                >
                  {LOAN_TYPES.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
                </select>
              </label>
              <label className="text-xs uppercase tracking-[0.16em] text-cmd-muted">
                Lender
                <input
                  value={form.lender}
                  onChange={(e) => set('lender', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2 text-sm text-cmd-offwhite"
                />
              </label>
              {([
                ['current_balance', 'Balance owed'],
                ['original_amount', 'Original amount'],
                ['interest_rate', 'Interest rate %'],
                ['monthly_payment', 'Monthly payment'],
              ] as Array<[keyof LoanForm, string]>).map(([key, label]) => (
                <label key={key} className="text-xs uppercase tracking-[0.16em] text-cmd-muted">
                  {label}
                  <input
                    value={String(form[key])}
                    inputMode="decimal"
                    onChange={(e) => set(key, e.target.value as never)}
                    className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2 text-sm text-cmd-offwhite"
                  />
                </label>
              ))}
              <label className="text-xs uppercase tracking-[0.16em] text-cmd-muted">
                Paid off by
                <input
                  type="date"
                  value={form.maturity_date}
                  onChange={(e) => set('maturity_date', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2 text-sm text-cmd-offwhite"
                />
              </label>
              {securable && assets.length > 0 && (
                <label className="text-xs uppercase tracking-[0.16em] text-cmd-muted">
                  Secured by
                  <select
                    value={form.secured_by_asset_id}
                    onChange={(e) => set('secured_by_asset_id', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2 text-sm text-cmd-offwhite"
                  >
                    <option value="">Nothing in particular</option>
                    {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </label>
              )}
            </div>

            {form.loan_type === 'student' && (
              <label className="mt-3 flex items-center gap-2 text-sm text-cmd-muted">
                <input
                  type="checkbox"
                  checked={form.is_federal}
                  onChange={(e) => set('is_federal', e.target.checked)}
                />
                This is a federal loan
                <span className="text-xs text-cmd-muted/70">
                  — federal loans carry repayment options private ones do not
                </span>
              </label>
            )}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="rounded-full bg-cmd-gold px-5 py-2 text-sm font-semibold text-cmd-black transition disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save the loan'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null); }}
                className="rounded-full border border-cmd-border px-5 py-2 text-sm text-cmd-muted transition hover:text-cmd-offwhite"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
