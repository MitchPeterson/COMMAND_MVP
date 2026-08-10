import React, { useState } from 'react';
import {
  markTaxFormReceived, unmarkTaxForm,
  type FamilyMember, type FinanceAccount, type HouseholdProfile, type LegalDocument,
  type MortgageStatement, type TaxDocument, type CreditTransaction,
} from '../lib/supabase';
import { expectedForms, taxDeadlines, taxLeads } from '../lib/taxYear';
import { CalendarClock, Check, ClipboardList, Sparkles, Undo2 } from 'lucide-react';

interface Props {
  householdId: string;
  taxYear: number;
  taxDocuments: TaxDocument[];
  profile?: HouseholdProfile | null;
  members: FamilyMember[];
  mortgageStatements: MortgageStatement[];
  financeAccounts: FinanceAccount[];
  legalDocuments: LegalDocument[];
  transactions: CreditTransaction[];
  onChanged: () => Promise<void> | void;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const dayLabel = (iso: string) => {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? iso
    : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
};

/**
 * What has arrived, what has not, and when things are due.
 *
 * The checklist is derived rather than stored — a household that opens an
 * account or starts a business changes what it should expect, and a stored list
 * would go stale silently. Only arrivals are recorded.
 */
export function TaxYearPanel({
  householdId, taxYear, taxDocuments, profile, members,
  mortgageStatements, financeAccounts, legalDocuments, transactions, onChanged,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checklist = expectedForms(
    taxYear, taxDocuments, profile, members, mortgageStatements, financeAccounts, legalDocuments,
  );
  const deadlines = taxDeadlines();
  const leads = taxLeads(taxYear, mortgageStatements, transactions, members, profile);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3 text-cmd-gold">
            <ClipboardList className="h-5 w-5" />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Tax year {taxYear}</p>
              <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Have you got everything?</h2>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-cmd-muted">On file</p>
            <p className="text-3xl font-semibold text-cmd-offwhite">
              {checklist.expected.length - checklist.outstanding.length}
              <span className="text-cmd-muted"> / {checklist.expected.length}</span>
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
        )}

        <div className="mt-5 space-y-2">
          {checklist.expected.map((form) => (
            <div
              key={form.key}
              className={`flex flex-wrap items-start justify-between gap-3 rounded-2xl border px-4 py-3 ${
                form.received ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-cmd-border bg-cmd-black/40'
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-cmd-offwhite">
                  {form.form} — {form.label}
                </p>
                <p className="mt-1 text-sm text-cmd-muted">{form.why}</p>
                <p className="mt-1 text-[11px] text-cmd-muted/70">Expected because: {form.basis}</p>
              </div>
              {form.received ? (
                <button
                  type="button"
                  disabled={busy === form.key}
                  onClick={() => run(form.key, () => unmarkTaxForm(form.received!.id))}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-cmd-border px-2.5 py-1 text-[11px] text-cmd-muted transition hover:text-cmd-offwhite"
                >
                  <Undo2 className="h-3 w-3" /> On file{form.received.received_on ? ` since ${form.received.received_on}` : ''}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy === form.key}
                  onClick={() => run(form.key, () => markTaxFormReceived(householdId, taxYear, form.key, form.form))}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-cmd-gold/40 bg-cmd-gold/10 px-2.5 py-1 text-[11px] text-cmd-gold transition hover:bg-cmd-gold/20"
                >
                  <Check className="h-3 w-3" /> I have this
                </button>
              )}
            </div>
          ))}

          {checklist.expected.length === 0 && (
            <p className="rounded-2xl border border-dashed border-cmd-border bg-cmd-black/40 p-5 text-sm text-cmd-muted">
              Command works out which forms to expect from what it knows about your household — the
              mortgage, your accounts, your children, any business. Add those and this fills in.
            </p>
          )}
        </div>

        {checklist.extras.length > 0 && (
          <div className="mt-4 border-t border-cmd-border pt-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Also on file</p>
            {checklist.extras.map((doc) => (
              <p key={doc.id} className="mt-1 text-sm text-cmd-muted">{doc.name}</p>
            ))}
          </div>
        )}
      </section>

      {leads.length > 0 && (
        <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
          <div className="flex items-center gap-3 text-cmd-gold">
            <Sparkles className="h-5 w-5" />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">From documents you already gave Command</p>
              <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Figures your preparer will ask for</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {leads.map((lead, i) => (
              <div key={i} className="rounded-2xl border border-cmd-border bg-cmd-charcoal p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-cmd-offwhite">{lead.label}</p>
                  {lead.amount != null && (
                    <p className="text-lg font-semibold text-cmd-gold">
                      {lead.label.includes('Children') ? lead.amount : money(lead.amount)}
                    </p>
                  )}
                </div>
                <p className="mt-1 text-sm text-cmd-muted">{lead.detail}</p>
                <p className="mt-1 text-[11px] text-cmd-muted/70">{lead.source}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-cmd-muted/70">
            These are figures, not deductions. Whether any of them reduces what you owe depends on your
            return, and that is your preparer's call rather than Command's.
          </p>
        </section>
      )}

      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <div className="flex items-center gap-3 text-cmd-gold">
          <CalendarClock className="h-5 w-5" />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Dates that carry money</p>
            <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">What's due next</h2>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          {deadlines.map((deadline, i) => (
            <div key={i} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-cmd-border bg-cmd-charcoal px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-cmd-offwhite">
                  {deadline.label}
                  <span className="ml-2 text-xs font-normal text-cmd-muted">tax year {deadline.taxYear}</span>
                </p>
                <p className="mt-1 text-sm text-cmd-muted">{deadline.detail}</p>
              </div>
              <p className="shrink-0 font-mono text-sm text-cmd-gold">{dayLabel(deadline.date)}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-cmd-muted/70">
          Statutory dates. A deadline landing on a weekend or holiday moves, so confirm the exact day
          before relying on one.
        </p>
      </section>
    </>
  );
}
