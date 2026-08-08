import React, { useState } from 'react';
import {
  confirmInsuranceExtraction,
  discardInsuranceExtraction,
  type InsurancePolicyExtraction,
  type InsuranceCoverageRow,
  type ExtractionValueType,
} from '../lib/supabase';
import { AlertTriangle, Check, ChevronDown, ChevronRight, FileWarning, Info, X } from 'lucide-react';

interface Props {
  extractions: InsurancePolicyExtraction[];
  onChange?: () => void;
}

export const currency = (value: number | null | undefined) =>
  value === null || value === undefined
    ? '—'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * value_type is the honesty signal. An explicit value came off the page; a
 * calculated one is our arithmetic; unknown means we looked and did not find it,
 * which is emphatically not the same as "not covered".
 */
export function ValueTypeTag({ type }: { type: ExtractionValueType }) {
  if (type === 'explicit') return null;
  const styles: Record<string, string> = {
    calculated: 'border-sky-500/25 bg-sky-500/10 text-sky-200',
    inferred: 'border-amber-500/25 bg-amber-500/10 text-amber-200',
    unknown: 'border-cmd-border bg-cmd-black/60 text-cmd-muted',
  };
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] ${styles[type]}`}>{type}</span>;
}

function Confidence({ value }: { value: number | null }) {
  if (value === null || value === undefined) return null;
  const pct = Math.round(value * 100);
  const tone = pct >= 90 ? 'text-emerald-300' : pct >= 70 ? 'text-amber-300' : 'text-red-300';
  return <span className={`text-[11px] ${tone}`}>{pct}%</span>;
}

export function CoverageRow({ coverage }: { coverage: InsuranceCoverageRow }) {
  const [open, setOpen] = useState(false);
  const notFound = coverage.included_status === 'not_found';

  return (
    <div className={`rounded-xl border px-4 py-3 ${notFound ? 'border-cmd-border/50 bg-cmd-black/20' : 'border-cmd-border bg-cmd-black/40'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-semibold ${notFound ? 'text-cmd-muted' : 'text-cmd-offwhite'}`}>
              {titleCase(coverage.coverage_code)}
            </span>
            <ValueTypeTag type={coverage.value_type} />
            <Confidence value={coverage.confidence} />
          </div>
          {coverage.coverage_name_raw && (
            // The carrier's own wording sits next to our label, never replacing it.
            <p className="mt-1 truncate text-xs text-cmd-muted">“{coverage.coverage_name_raw}”</p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className={`font-semibold ${notFound ? 'text-cmd-muted' : 'text-cmd-offwhite'}`}>
            {notFound ? 'Not in this document' : currency(coverage.limit_amount)}
          </p>
          {coverage.limit_basis && coverage.limit_basis !== 'not_stated' && (
            <p className="text-xs text-cmd-muted">{titleCase(coverage.limit_basis)}</p>
          )}
        </div>
      </div>

      {(coverage.evidence || coverage.coverage_basis || coverage.notes) && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-xs text-cmd-muted hover:text-cmd-gold"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />} Evidence
        </button>
      )}

      {open && (
        <div className="mt-2 space-y-1 rounded-lg border border-cmd-border/60 bg-cmd-black/50 px-3 py-2 text-xs text-cmd-muted">
          {coverage.evidence && <p className="italic text-cmd-offwhite/80">“{coverage.evidence}”</p>}
          <p>
            {coverage.source_page ? `Page ${coverage.source_page}` : 'Page unknown'}
            {coverage.source_section ? ` · ${coverage.source_section}` : ''}
          </p>
          {coverage.coverage_basis && coverage.coverage_basis !== 'not_stated' && (
            <p>Valuation: {titleCase(coverage.coverage_basis)}</p>
          )}
          {coverage.notes && <p>{coverage.notes}</p>}
        </div>
      )}
    </div>
  );
}

export function InsurancePolicyReview({ extractions, onChange }: Props) {
  const pending = extractions.filter((e) => e.review_status === 'pending_review');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllCoverages, setShowAllCoverages] = useState<Record<string, boolean>>({});

  if (pending.length === 0) return null;

  const act = async (id: string, fn: () => Promise<boolean>) => {
    setBusy(id);
    setError(null);
    try {
      const ok = await fn();
      if (ok && onChange) await onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {pending.map((extraction) => {
        const found = extraction.insurance_coverages.filter((c) => c.included_status !== 'not_found');
        const missing = extraction.insurance_coverages.filter((c) => c.included_status === 'not_found');
        const showAll = showAllCoverages[extraction.id];
        const severeExclusions = extraction.insurance_exclusions.filter(
          (e) => e.severity === 'significant' || e.severity === 'critical',
        );

        return (
          <section key={extraction.id} className="rounded-3xl border border-cmd-gold/30 bg-cmd-charcoal p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cmd-gold">Needs review</p>
                <h3 className="mt-2 text-2xl font-semibold text-cmd-offwhite">
                  {extraction.carrier ?? 'Unknown carrier'}
                </h3>
                <p className="mt-1 text-sm text-cmd-muted">
                  {titleCase(extraction.insurance_type)} · {titleCase(extraction.document_class)}
                  {extraction.policy_number ? ` · #${extraction.policy_number}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-cmd-muted">Annual premium</p>
                <p className="text-xl font-semibold text-cmd-offwhite">{currency(extraction.annual_premium)}</p>
                {extraction.expiration_date && (
                  <p className="mt-1 text-xs text-cmd-muted">Renews {extraction.expiration_date}</p>
                )}
              </div>
            </div>

            {/* What this document can and cannot support. Shown before the data so
                nobody reads a dec page as a complete picture of coverage. */}
            {extraction.declarations_only && (
              <div className="mt-5 flex gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <div className="text-sm text-amber-100/90">
                  <p className="font-semibold">Declarations page only</p>
                  <p className="mt-1 text-amber-100/70">
                    {String(extraction.extraction_quality?.limitations_summary ?? '')}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6">
              <h4 className="text-xs uppercase tracking-[0.2em] text-cmd-muted">
                Coverages found ({found.length})
              </h4>
              <div className="mt-3 space-y-2">
                {found.map((c) => <CoverageRow key={c.id} coverage={c} />)}
              </div>

              {missing.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowAllCoverages((s) => ({ ...s, [extraction.id]: !showAll }))}
                    className="mt-3 inline-flex items-center gap-1 text-xs text-cmd-muted hover:text-cmd-gold"
                  >
                    {showAll ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    {missing.length} coverage{missing.length === 1 ? '' : 's'} not found in this document
                  </button>
                  {showAll && (
                    <div className="mt-2 space-y-2">
                      {missing.map((c) => <CoverageRow key={c.id} coverage={c} />)}
                      <p className="px-1 text-xs text-cmd-muted">
                        Not found is not the same as not covered — these simply do not appear in the
                        pages provided.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {extraction.insurance_deductibles.length > 0 && (
              <div className="mt-6">
                <h4 className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Deductibles</h4>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {extraction.insurance_deductibles.map((d) => (
                    <div key={d.id} className="rounded-xl border border-cmd-border bg-cmd-black/40 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-cmd-offwhite">{titleCase(d.deductible_type)}</span>
                        <ValueTypeTag type={d.value_type} />
                      </div>
                      <p className="mt-1 font-semibold text-cmd-offwhite">
                        {d.amount !== null
                          ? currency(d.amount)
                          : d.percent !== null
                          ? `${d.percent}%`
                          : 'Not in this document'}
                      </p>
                      {/* Calculated exposure shown beside the stated percentage, never instead of it. */}
                      {d.calculated_amount !== null && (
                        <p className="mt-1 text-xs text-sky-200">
                          ≈ {currency(d.calculated_amount)} on {d.calculation_basis}
                          <span className="text-cmd-muted"> (calculated)</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {severeExclusions.length > 0 && (
              <div className="mt-6">
                <h4 className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Material limitations</h4>
                <div className="mt-3 space-y-2">
                  {severeExclusions.map((e) => (
                    <div key={e.id} className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-300" />
                        <span className="text-sm font-semibold text-cmd-offwhite">{titleCase(e.category)}</span>
                        <span className="rounded-full border border-red-500/25 px-2 py-0.5 text-[11px] text-red-200">
                          {e.severity}
                        </span>
                      </div>
                      {e.summary && <p className="mt-1 text-sm text-cmd-muted">{e.summary}</p>}
                      {e.policy_language && (
                        <p className="mt-1 text-xs italic text-cmd-muted">“{e.policy_language}”</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {extraction.unresolved_items.length > 0 && (
              <div className="mt-6 rounded-2xl border border-cmd-border bg-cmd-black/30 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-cmd-muted" />
                  <h4 className="text-xs uppercase tracking-[0.2em] text-cmd-muted">
                    Still needed for a confident review
                  </h4>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-cmd-muted">
                  {extraction.unresolved_items.slice(0, 5).map((u, i) => (
                    <li key={i}>
                      • {u.item}
                      {u.needed_document ? <span className="text-cmd-muted/70"> — {u.needed_document}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3 border-t border-cmd-border pt-5">
              <button
                type="button"
                disabled={busy === extraction.id}
                onClick={() => act(extraction.id, () => confirmInsuranceExtraction(extraction))}
                className="inline-flex items-center gap-2 rounded-xl border border-cmd-gold bg-cmd-gold/15 px-5 py-2.5 text-sm font-semibold text-cmd-gold transition hover:bg-cmd-gold/25 disabled:opacity-40"
              >
                <Check className="h-4 w-4" />
                {busy === extraction.id ? 'Adding…' : 'Add to my profile'}
              </button>
              <button
                type="button"
                disabled={busy === extraction.id}
                onClick={() => act(extraction.id, () => discardInsuranceExtraction(extraction.id))}
                className="inline-flex items-center gap-2 rounded-xl border border-cmd-border px-5 py-2.5 text-sm font-medium text-cmd-muted transition hover:border-red-500/40 hover:text-red-200 disabled:opacity-40"
              >
                <X className="h-4 w-4" /> Discard
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
