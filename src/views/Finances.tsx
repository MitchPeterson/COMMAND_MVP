import React from 'react';
import { useHousehold } from '../useHousehold';
import { UploadDropzone } from '../components/UploadDropzone';
import { Wallet, PieChart, TrendingUp, FileText } from 'lucide-react';

export function FinancesView() {
  const { data } = useHousehold();
  const accounts = data?.financeAccounts ?? [];
  const budget = data?.budgetSummary;

  const formattedCurrency = (value: number | null | undefined) =>
    value == null ? '--' : `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-8 shadow-sm shadow-black/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Financial overview</p>
            <h1 className="mt-3 text-3xl font-semibold text-cmd-offwhite">Finances</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cmd-border bg-cmd-black/50 px-4 py-2 text-sm text-cmd-muted">
            <Wallet className="h-4 w-4" /> Current accounts
            <span className="ml-2 rounded-full bg-cmd-border px-2 py-1 text-xs text-cmd-offwhite">{accounts.length}</span>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <UploadDropzone
          contextLabel="Finance document upload"
          buttonLabel="Upload finance document"
          className="mb-6"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
          <div className="flex items-center gap-3 text-cmd-gold">
            <PieChart className="h-5 w-5" />
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Monthly income</p>
          </div>
          <p className="mt-6 text-3xl font-semibold text-cmd-offwhite">{formattedCurrency(budget?.monthly_income)}</p>
          <p className="mt-2 text-sm text-cmd-muted">Latest budget summary</p>
        </div>
        <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
          <div className="flex items-center gap-3 text-emerald-300">
            <TrendingUp className="h-5 w-5" />
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Monthly expenses</p>
          </div>
          <p className="mt-6 text-3xl font-semibold text-cmd-offwhite">{formattedCurrency(budget?.monthly_expenses)}</p>
          <p className="mt-2 text-sm text-cmd-muted">Latest budget summary</p>
        </div>
        <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
          <div className="flex items-center gap-3 text-cmd-gold">
            <FileText className="h-5 w-5" />
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Savings rate</p>
          </div>
          <p className="mt-6 text-3xl font-semibold text-cmd-offwhite">{budget?.savings_rate != null ? `${budget.savings_rate.toFixed(1)}%` : '--'}</p>
          <p className="mt-2 text-sm text-cmd-muted">Emergency fund: {budget?.emergency_fund_months ?? '--'} months</p>
        </div>
      </section>

      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Accounts</p>
            <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Connected accounts</h2>
          </div>
          <span className="rounded-full border border-cmd-border bg-cmd-black/60 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cmd-muted">
            {accounts.length} account{accounts.length === 1 ? '' : 's'}
          </span>
        </div>
        {accounts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
            No finance accounts connected yet. Add your first account to start tracking balances.
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-cmd-muted">{account.account_type}</p>
                    <h3 className="mt-2 text-xl font-semibold text-cmd-offwhite">{account.account_name}</h3>
                    <p className="mt-1 text-sm text-cmd-muted">{account.institution ?? 'Unknown institution'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-cmd-offwhite">{formattedCurrency(account.balance)}</p>
                    <p className="mt-1 text-sm text-cmd-muted">As of {account.as_of_date ?? 'latest'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
