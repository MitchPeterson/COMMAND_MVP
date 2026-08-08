import React, { useState } from 'react';
import { useHousehold } from '../useHousehold';
import { UploadDropzone } from '../components/UploadDropzone';
import {
  uploadDocumentAsset,
  invokeDocumentExtraction,
  deleteInsurancePolicy,
  type InsurancePolicyExtraction,
} from '../lib/supabase';
import { InsurancePolicyReview, CoverageRow, currency, titleCase } from '../components/InsurancePolicyReview';
import { CoverageHealth } from '../components/CoverageHealth';
import { ChevronDown, ChevronRight, FileWarning, Shield, Trash2 } from 'lucide-react';

/** The extracted detail behind a confirmed policy, revealed on demand. */
function PolicyDetail({ extraction }: { extraction: InsurancePolicyExtraction }) {
  const found = extraction.insurance_coverages.filter((c) => c.included_status !== 'not_found');
  const deductibles = extraction.insurance_deductibles.filter(
    (d) => d.amount !== null || d.percent !== null,
  );
  const notable = extraction.insurance_exclusions.filter(
    (e) => e.severity === 'significant' || e.severity === 'critical',
  );

  return (
    <div className="mt-5 space-y-5 border-t border-cmd-border pt-5">
      {extraction.declarations_only && (
        <div className="flex gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-sm text-amber-100/80">
            Based on a declarations page only — exclusions and endorsements were not available in
            the documents provided.
          </p>
        </div>
      )}

      {found.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Coverages</h4>
          <div className="mt-3 space-y-2">
            {found.map((c) => <CoverageRow key={c.id} coverage={c} />)}
          </div>
        </div>
      )}

      {deductibles.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Deductibles</h4>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {deductibles.map((d) => (
              <div key={d.id} className="rounded-xl border border-cmd-border bg-cmd-black/40 px-4 py-3">
                <p className="text-sm text-cmd-muted">{titleCase(d.deductible_type)}</p>
                <p className="mt-1 font-semibold text-cmd-offwhite">
                  {d.amount !== null ? currency(d.amount) : `${d.percent}%`}
                </p>
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

      {extraction.insurance_insured_assets.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Covered assets</h4>
          <ul className="mt-2 space-y-1 text-sm text-cmd-muted">
            {extraction.insurance_insured_assets.map((a) => (
              <li key={a.id}>
                • {[a.year, a.make, a.model].filter(Boolean).join(' ') || a.description}
                {a.vin ? <span className="text-cmd-muted/60"> · VIN {a.vin}</span> : null}
                {a.address ? <span className="text-cmd-muted/60"> · {a.address}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {notable.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Material limitations</h4>
          <div className="mt-2 space-y-2">
            {notable.map((e) => (
              <div key={e.id} className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2">
                <p className="text-sm font-medium text-cmd-offwhite">{titleCase(e.category)}</p>
                {e.summary && <p className="text-sm text-cmd-muted">{e.summary}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {extraction.plain_language_summary && (
        <div className="rounded-2xl border border-cmd-border bg-cmd-black/30 px-4 py-3">
          <p className="text-sm text-cmd-muted">{extraction.plain_language_summary}</p>
        </div>
      )}
    </div>
  );
}

export function InsuranceView() {
  const { data, refresh } = useHousehold();
  const policies = data?.insurancePolicies ?? [];
  const insuranceExtractions = data?.insuranceExtractions ?? [];
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const removePolicy = async (policyId: string) => {
    setError(null);
    setBusy(policyId);
    try {
      await deleteInsurancePolicy(policyId);
      setPendingRemove(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the policy.');
    } finally {
      setBusy(null);
    }
  };

  const extractionFor = (extractionId: string | null | undefined) =>
    extractionId ? insuranceExtractions.find((e) => e.id === extractionId) : undefined;

  return (
    <div className="space-y-6">
      {/* Coverage first. The upload is a means to this, not the point of the page. */}
      <CoverageHealth policies={policies} extractions={insuranceExtractions} />

      <InsurancePolicyReview extractions={insuranceExtractions} onChange={refresh} />

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Shield className="h-4 w-4 text-cmd-gold" />
          <h2 className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Your policies</h2>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {policies.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
            No insurance policies yet. Upload a declarations page below to get started.
          </div>
        ) : (
          policies.map((policy) => {
            // source_extraction_id is added by the provenance migration; older
            // rows simply have no detail to show.
            const extraction = extractionFor((policy as { source_extraction_id?: string }).source_extraction_id);
            const open = expanded === policy.id;

            return (
              <div key={policy.id} className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-5">
                <button
                  type="button"
                  disabled={!extraction}
                  onClick={() => setExpanded(open ? null : policy.id)}
                  className="w-full text-left disabled:cursor-default"
                >
                  <div className="sm:flex sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs uppercase tracking-[0.24em] text-cmd-gold">{policy.type}</p>
                        {extraction?.declarations_only && (
                          <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">
                            dec page only
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 text-xl font-semibold text-cmd-offwhite">
                        {policy.carrier ?? 'Unknown carrier'}
                      </h3>
                      <p className="mt-1 text-sm text-cmd-muted">
                        Policy #{policy.policy_number ?? 'N/A'}
                        {policy.coverage_amount ? ` · ${currency(policy.coverage_amount)} limit` : ''}
                      </p>
                    </div>
                    <div className="mt-4 text-right sm:mt-0">
                      <p className="text-sm text-cmd-muted">Renewal</p>
                      <p className="mt-1 font-semibold text-cmd-offwhite">{policy.renewal_date ?? 'TBD'}</p>
                      <p className="mt-2 text-sm text-cmd-muted">
                        Premium {currency(policy.annual_premium)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-1 text-xs text-cmd-muted">
                    {extraction ? (
                      <>
                        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        {open ? 'Hide' : 'Show'} extracted coverage detail
                      </>
                    ) : (
                      <span className="text-cmd-muted/60">
                        Added without a document — no extracted detail available
                      </span>
                    )}
                  </div>
                </button>

                {open && extraction && <PolicyDetail extraction={extraction} />}

                <div className="mt-4 flex justify-end border-t border-cmd-border pt-3">
                  {pendingRemove === policy.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-cmd-muted">Remove this policy from your profile?</span>
                      <button
                        type="button"
                        disabled={busy === policy.id}
                        onClick={() => removePolicy(policy.id)}
                        className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/25 disabled:opacity-40"
                      >
                        {busy === policy.id ? 'Removing…' : 'Remove'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingRemove(null)}
                        className="rounded-lg border border-cmd-border px-3 py-1.5 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPendingRemove(policy.id)}
                      className="inline-flex items-center gap-1.5 text-xs text-cmd-muted transition hover:text-red-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove policy
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Demoted: still one click away, no longer the headline. */}
      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <UploadDropzone
          contextLabel="Add coverage"
          buttonLabel="Upload a policy or declarations page"
          onUpload={async (file) => {
            if (!data?.household?.id) return;
            const document = await uploadDocumentAsset(data.household.id, file, 'insurance');
            await invokeDocumentExtraction(document.id);
            await refresh();
          }}
        />
      </section>
    </div>
  );
}
