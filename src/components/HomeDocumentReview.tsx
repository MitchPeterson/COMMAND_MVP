import React, { useState } from 'react';
import {
  confirmMortgageStatement, discardMortgageStatement,
  confirmApplianceExtraction, discardApplianceExtraction,
  type ApplianceExtraction, type HomeSystem, type MortgageStatement,
} from '../lib/supabase';
import { categoryLabel } from '../lib/homeSystems';
import { Check, FileText, Quote, X } from 'lucide-react';

interface Props {
  mortgageStatements: MortgageStatement[];
  applianceExtractions: ApplianceExtraction[];
  systems: HomeSystem[];
  onChanged: () => Promise<void> | void;
}

const money = (value: number | null | undefined) =>
  value == null
    ? '--'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const btn = 'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-40';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-cmd-border bg-cmd-black/40 p-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-cmd-offwhite">{value}</p>
    </div>
  );
}

/**
 * Read home paperwork, waiting on a decision.
 *
 * Nothing here has touched the mortgage record or the systems inventory —
 * confirming is what does that, same boundary as every other section. The
 * mortgage figures shown are the statement's own; the equity above updates only
 * once they are accepted.
 */
export function HomeDocumentReview({ mortgageStatements, applianceExtractions, systems, onChanged }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<Record<string, string | null>>({});
  const [showEvidence, setShowEvidence] = useState<string | null>(null);

  const pendingMortgage = mortgageStatements.filter((s) => s.review_status === 'pending_review');
  const pendingAppliance = applianceExtractions.filter((a) => a.review_status === 'pending_review');
  if (pendingMortgage.length === 0 && pendingAppliance.length === 0) return null;

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
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
    <section className="rounded-3xl border border-cmd-gold/25 bg-cmd-charcoal p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Read, waiting on you</p>
      <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">
        {pendingMortgage.length + pendingAppliance.length} document
        {pendingMortgage.length + pendingAppliance.length === 1 ? '' : 's'} to confirm
      </h2>
      <p className="mt-1 text-sm text-cmd-muted">
        Nothing below has changed your mortgage or your systems yet.
      </p>

      {error && (
        <p className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      )}

      <div className="mt-5 space-y-4">
        {pendingMortgage.map((statement) => (
          <div key={statement.id} className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">
                  Mortgage statement{statement.loan_number_last4 ? ` · ••••${statement.loan_number_last4}` : ''}
                </p>
                <h3 className="mt-1.5 text-xl font-semibold text-cmd-offwhite">
                  {statement.servicer ?? 'Servicer not read'}
                </h3>
                <p className="mt-1 text-sm text-cmd-muted">
                  {statement.statement_date ? `Statement dated ${statement.statement_date}` : 'No statement date read'}
                  {statement.property_address ? ` · ${statement.property_address}` : ''}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Row label="Balance owed" value={money(statement.principal_balance)} />
              <Row label="Rate" value={statement.interest_rate != null ? `${statement.interest_rate}%` : '--'} />
              <Row label="Monthly payment" value={money(statement.monthly_payment)} />
              <Row label="Escrow in payment" value={money(statement.escrow_portion)} />
              <Row label="Escrow balance" value={money(statement.escrow_balance)} />
              <Row label="Paid off by" value={statement.maturity_date ?? '--'} />
              <Row label="Interest YTD" value={money(statement.interest_paid_ytd)} />
              <Row label="Principal YTD" value={money(statement.principal_paid_ytd)} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy === statement.id}
                onClick={() => run(statement.id, () => confirmMortgageStatement(statement))}
                className={`${btn} border border-cmd-gold bg-cmd-gold/15 text-cmd-gold hover:bg-cmd-gold/25`}
              >
                <Check className="h-4 w-4" /> Use these figures
              </button>
              <button
                type="button"
                disabled={busy === statement.id}
                onClick={() => run(statement.id, () => discardMortgageStatement(statement.id))}
                className={`${btn} border border-cmd-border text-cmd-muted hover:border-red-500/40 hover:text-red-200`}
              >
                <X className="h-4 w-4" /> Discard
              </button>
            </div>
          </div>
        ))}

        {pendingAppliance.map((extraction) => {
          const chosen = target[extraction.id] ?? null;
          return (
            <div key={extraction.id} className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">
                    {extraction.document_kind} · {categoryLabel(extraction.suggested_category)}
                  </p>
                  <h3 className="mt-1.5 text-xl font-semibold text-cmd-offwhite">
                    {extraction.product_name ?? 'Equipment not identified'}
                  </h3>
                  <p className="mt-1 text-sm text-cmd-muted">
                    {[extraction.make, extraction.model].filter(Boolean).join(' ') || 'Make and model not read'}
                    {extraction.serial_number ? ` · serial ${extraction.serial_number}` : ''}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Row label="Warranty from" value={extraction.warranty_provider ?? '--'} />
                <Row label="Runs to" value={extraction.warranty_expires_on ?? '--'} />
                <Row label="Installed" value={extraction.installed_on ?? extraction.purchased_on ?? '--'} />
                <Row label="Price" value={money(extraction.purchase_price)} />
              </div>

              {extraction.coverage_summary && (
                <p className="mt-3 text-sm text-cmd-muted">
                  <span className="text-cmd-offwhite">Covers:</span> {extraction.coverage_summary}
                </p>
              )}
              {extraction.exclusions_summary && (
                <p className="mt-1 text-sm text-cmd-muted">
                  <span className="text-cmd-offwhite">Excludes:</span> {extraction.exclusions_summary}
                </p>
              )}

              {extraction.fields?.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowEvidence(showEvidence === extraction.id ? null : extraction.id)}
                  className="mt-3 inline-flex items-center gap-1 text-[11px] text-cmd-muted transition hover:text-cmd-gold"
                >
                  <Quote className="h-3 w-3" /> {showEvidence === extraction.id ? 'Hide' : 'Show'} where each value came from
                </button>
              )}
              {showEvidence === extraction.id && (
                <div className="mt-2 space-y-1">
                  {extraction.fields.map((field, i) => (
                    <p key={i} className="border-l-2 border-cmd-gold/40 pl-3 text-[11px] text-cmd-muted">
                      <span className="text-cmd-offwhite">{field.field}</span>: {field.value}
                      {field.source_page ? ` · p${field.source_page}` : ''}
                      {field.evidence ? ` — “${field.evidence}”` : ''}
                    </p>
                  ))}
                </div>
              )}

              {/* Which system this belongs to is part of the review, not a guess. */}
              <div className="mt-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">File it against</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTarget({ ...target, [extraction.id]: null })}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] transition ${
                      chosen === null ? 'border-cmd-gold bg-cmd-gold/15 text-cmd-gold' : 'border-cmd-border text-cmd-muted'
                    }`}
                  >
                    A new system
                  </button>
                  {systems.map((system) => (
                    <button
                      key={system.id}
                      type="button"
                      onClick={() => setTarget({ ...target, [extraction.id]: system.id })}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] transition ${
                        chosen === system.id ? 'border-cmd-gold bg-cmd-gold/15 text-cmd-gold' : 'border-cmd-border text-cmd-muted'
                      }`}
                    >
                      {system.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === extraction.id}
                  onClick={() => run(extraction.id, () => confirmApplianceExtraction(extraction, chosen))}
                  className={`${btn} border border-cmd-gold bg-cmd-gold/15 text-cmd-gold hover:bg-cmd-gold/25`}
                >
                  <Check className="h-4 w-4" /> {chosen ? 'Add to that system' : 'Track as a new system'}
                </button>
                <button
                  type="button"
                  disabled={busy === extraction.id}
                  onClick={() => run(extraction.id, () => discardApplianceExtraction(extraction.id))}
                  className={`${btn} border border-cmd-border text-cmd-muted hover:border-red-500/40 hover:text-red-200`}
                >
                  <X className="h-4 w-4" /> Discard
                </button>
              </div>

              {chosen && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-cmd-muted">
                  <FileText className="h-3 w-3" />
                  Fills in only what that system is missing — nothing you already recorded gets overwritten.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
