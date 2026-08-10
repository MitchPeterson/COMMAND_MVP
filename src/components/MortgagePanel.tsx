import React, { useState } from 'react';
import { saveMortgage, type MortgageAccount, type HouseholdProfile } from '../lib/supabase';
import { computeEquity } from '../lib/homeSystems';
import { Building2, Pencil, TrendingUp } from 'lucide-react';

interface Props {
  householdId: string;
  mortgage: MortgageAccount | null;
  profile?: HouseholdProfile | null;
  onChanged: () => Promise<void> | void;
}

const money = (value: number | null | undefined) =>
  value == null
    ? '--'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const input =
  'w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2.5 text-sm text-cmd-offwhite ' +
  'placeholder-cmd-muted/50 outline-none transition focus:border-cmd-gold/50';
const label = 'text-[11px] uppercase tracking-[0.16em] text-cmd-muted';

/**
 * Equity is the one number here Command computes rather than reads: home value
 * minus what is owed. Both inputs are stated beside it, because an equity
 * figure resting on a home value someone guessed at during onboarding is worth
 * exactly as much as that guess.
 */
export function MortgagePanel({ householdId, mortgage, profile, onChanged }: Props) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    servicer: '', loan_number_last4: '', principal_balance: '', interest_rate: '',
    rate_type: 'fixed', monthly_payment: '', escrow_payment: '', original_amount: '',
    maturity_date: '', payment_due_date: '', pmi_amount: '',
  });

  const equity = computeEquity(profile?.home_value ?? null, mortgage?.principal_balance ?? null);

  const startEdit = () => {
    setError(null);
    setForm({
      servicer: mortgage?.servicer ?? '',
      loan_number_last4: mortgage?.loan_number_last4 ?? '',
      principal_balance: mortgage?.principal_balance?.toString() ?? '',
      interest_rate: mortgage?.interest_rate?.toString() ?? '',
      rate_type: mortgage?.rate_type ?? 'fixed',
      monthly_payment: mortgage?.monthly_payment?.toString() ?? '',
      escrow_payment: mortgage?.escrow_payment?.toString() ?? '',
      original_amount: mortgage?.original_amount?.toString() ?? '',
      maturity_date: mortgage?.maturity_date ?? '',
      payment_due_date: mortgage?.payment_due_date ?? '',
      pmi_amount: mortgage?.pmi_amount?.toString() ?? '',
    });
    setEditing(true);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveMortgage(householdId, { ...form, balance_as_of: new Date().toISOString().slice(0, 10) });
      await onChanged();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the mortgage.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3 text-cmd-gold">
          <Building2 className="h-5 w-5" />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">The house itself</p>
            <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Equity and the mortgage</h2>
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cmd-border px-3.5 py-2 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
          >
            <Pencil className="h-3.5 w-3.5" /> {mortgage ? 'Edit' : 'Add the loan'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-5 rounded-2xl border border-cmd-gold/25 bg-cmd-black/30 p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={label}>Servicer</label>
              <input className={`${input} mt-1.5`} value={form.servicer} placeholder="Rocket Mortgage"
                onChange={(e) => setForm({ ...form, servicer: e.target.value })} />
            </div>
            <div>
              <label className={label}>Loan number, last four</label>
              <input className={`${input} mt-1.5`} inputMode="numeric" maxLength={4} value={form.loan_number_last4}
                onChange={(e) => setForm({ ...form, loan_number_last4: e.target.value })} />
            </div>
            <div>
              <label className={label}>Balance owed</label>
              <input className={`${input} mt-1.5`} inputMode="decimal" value={form.principal_balance}
                onChange={(e) => setForm({ ...form, principal_balance: e.target.value })} />
            </div>
            <div>
              <label className={label}>Interest rate %</label>
              <input className={`${input} mt-1.5`} inputMode="decimal" placeholder="6.25" value={form.interest_rate}
                onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} />
            </div>
            <div>
              <p className={label}>Rate type</p>
              <select className={`${input} mt-1.5`} value={form.rate_type}
                onChange={(e) => setForm({ ...form, rate_type: e.target.value })}>
                <option value="fixed">Fixed</option>
                <option value="arm">Adjustable</option>
              </select>
            </div>
            <div>
              <label className={label}>Monthly payment</label>
              <input className={`${input} mt-1.5`} inputMode="decimal" value={form.monthly_payment}
                onChange={(e) => setForm({ ...form, monthly_payment: e.target.value })} />
            </div>
            <div>
              <label className={label}>Of which escrow</label>
              <input className={`${input} mt-1.5`} inputMode="decimal" value={form.escrow_payment}
                onChange={(e) => setForm({ ...form, escrow_payment: e.target.value })} />
            </div>
            <div>
              <label className={label}>Original amount</label>
              <input className={`${input} mt-1.5`} inputMode="decimal" value={form.original_amount}
                onChange={(e) => setForm({ ...form, original_amount: e.target.value })} />
            </div>
            <div>
              <label className={label}>Paid off by</label>
              <input className={`${input} mt-1.5`} type="date" value={form.maturity_date}
                onChange={(e) => setForm({ ...form, maturity_date: e.target.value })} />
            </div>
          </div>
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">{error}</div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={save}
              className="rounded-xl border border-cmd-gold bg-cmd-gold/15 px-4 py-2 text-sm font-semibold text-cmd-gold transition hover:bg-cmd-gold/25 disabled:opacity-40">
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="rounded-xl border border-cmd-border px-4 py-2 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-5">
              <div className="flex items-center gap-2 text-emerald-300">
                <TrendingUp className="h-4 w-4" />
                <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Equity</p>
              </div>
              <p className="mt-3 text-2xl font-semibold text-cmd-offwhite">{money(equity.equity)}</p>
              <p className="mt-1 text-xs text-cmd-muted">
                {equity.homeValue == null || equity.principal == null
                  ? 'Needs a home value and a balance'
                  : `${money(equity.homeValue)} value less ${money(equity.principal)} owed`}
              </p>
            </div>
            <div className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Rate</p>
              <p className="mt-3 text-2xl font-semibold text-cmd-offwhite">
                {mortgage?.interest_rate != null ? `${mortgage.interest_rate}%` : '--'}
              </p>
              <p className="mt-1 text-xs text-cmd-muted">{mortgage?.rate_type === 'arm' ? 'Adjustable' : 'Fixed'}</p>
            </div>
            <div className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Owed</p>
              <p className="mt-3 text-2xl font-semibold text-cmd-offwhite">{money(mortgage?.principal_balance)}</p>
              <p className="mt-1 text-xs text-cmd-muted">
                {equity.loanToValue != null ? `${Math.round(equity.loanToValue)}% of value` : 'Loan-to-value unknown'}
              </p>
            </div>
            <div className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Monthly</p>
              <p className="mt-3 text-2xl font-semibold text-cmd-offwhite">{money(mortgage?.monthly_payment)}</p>
              <p className="mt-1 text-xs text-cmd-muted">
                {mortgage?.escrow_payment != null ? `${money(mortgage.escrow_payment)} of it escrow` : 'Escrow not recorded'}
              </p>
            </div>
          </div>

          {mortgage && (
            <p className="mt-4 text-xs text-cmd-muted/70">
              {mortgage.servicer ?? 'Servicer not recorded'}
              {mortgage.loan_number_last4 ? ` ••••${mortgage.loan_number_last4}` : ''}
              {mortgage.balance_as_of ? ` · balance as of ${mortgage.balance_as_of}` : ''}
              {mortgage.entry_source === 'manual' ? ' · entered by you' : ' · read from a statement'}
            </p>
          )}
          {!mortgage && (
            <p className="mt-4 text-sm text-cmd-muted">
              No loan on file. Add it above, or upload a mortgage statement at the foot of this page and
              Command will read it.
            </p>
          )}
        </>
      )}
    </section>
  );
}
