import { SectionIntro } from '../components/SectionIntro';
import { familiarityState, introFor } from '../lib/sectionIntros';
import React, { useState } from 'react';
import { useHousehold } from '../useHousehold';
import { UnfiledDocuments } from '../components/UnfiledDocuments';
import { DocumentLinkBadge } from '../components/DocumentLinkBadge';
import { UploadDropzone } from '../components/UploadDropzone';
import {
  uploadDocumentAsset,
  invokeDocumentExtraction,
  deleteInsurancePolicy,
  type InsurancePolicyExtraction,
} from '../lib/supabase';
import { InsurancePolicyReview, CoverageRow, currency, titleCase } from '../components/InsurancePolicyReview';
import { CoverageHealth } from '../components/CoverageHealth';
import { PremiumReview } from '../components/PremiumReview';
import { AddPolicyForm } from '../components/AddPolicyForm';
import { EditPolicyPanel } from '../components/EditPolicyPanel';
import { RecordHistory } from '../components/RecordHistory';
import { ChevronDown, ChevronRight, FileWarning, History, Pencil, Shield, Trash2 } from 'lucide-react';
import { carrierGroup } from '../lib/carriers';




/**
 * Lienholders, mortgagees and loss payees are recorded as insured parties
 * because they hold an interest in the vehicle — they are not people who drive
 * it. Carriers list them in the same schedule, so they arrive mixed in.
 */
const NON_PERSON_INTEREST = /lienhold|loss ?payee|mortgagee|interested party|additional interest|lender|leasing|financial|\bbank\b|credit union/i;

function isInterestedParty(party: { name: string | null; relationship: string | null }): boolean {
  return NON_PERSON_INTEREST.test(`${party.relationship ?? ''} ${party.name ?? ''}`);
}

/**
 * The same person appears twice on most auto policies: once in the named-insured
 * block as "MITCHELL PETERSON" and again in the rated-driver schedule as
 * "PETERSON, MITCHELL". Sorting the name tokens makes both forms collide, so the
 * two entries merge instead of reading as two drivers.
 */
function personKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

function driversOf(extraction: InsurancePolicyExtraction) {
  const people = extraction.insurance_insured_parties.filter((p) => p.name && !isInterestedParty(p));
  const merged = new Map<string, { name: string; relationship: string | null }>();

  for (const person of people) {
    const key = personKey(person.name as string);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { name: person.name as string, relationship: person.relationship });
      continue;
    }
    // Prefer the readable "First Last" form, and whichever relationship says more.
    const name = existing.name.includes(',') && !(person.name as string).includes(',')
      ? (person.name as string)
      : existing.name;
    const relationship =
      (person.relationship?.length ?? 0) > (existing.relationship?.length ?? 0)
        ? person.relationship
        : existing.relationship;
    merged.set(key, { name, relationship });
  }

  return [...merged.values()];
}

function interestedPartiesOf(extraction: InsurancePolicyExtraction) {
  return extraction.insurance_insured_parties.filter((p) => p.name && isInterestedParty(p));
}

/**
 * Tie a deductible to a specific vehicle. The carrier may label applies_to as
 * "Vehicle 1", a VIN, or "2022 Toyota Highlander", so match on any identifier we
 * hold. A deductible that names no vehicle applies policy-wide and is used only
 * when nothing vehicle-specific was found.
 */
function vehicleDeductible(
  extraction: InsurancePolicyExtraction,
  vehicle: InsurancePolicyExtraction['insurance_insured_assets'][number],
  type: string,
): string | null {
  const identifiers = [vehicle.vin, vehicle.model, vehicle.make, vehicle.year ? String(vehicle.year) : null]
    .filter((v): v is string => Boolean(v))
    .map((v) => v.toLowerCase());

  const candidates = extraction.insurance_deductibles.filter(
    (d) => d.deductible_type === type && (d.amount !== null || d.percent !== null),
  );

  const specific = candidates.find((d) => {
    const applies = (d.applies_to ?? '').toLowerCase();
    return applies !== '' && identifiers.some((id) => applies.includes(id));
  });

  const chosen = specific ?? candidates.find((d) => !d.applies_to);
  if (!chosen) return null;
  return chosen.amount !== null ? currency(chosen.amount) : `${chosen.percent}%`;
}

/**
 * Column groups for the collapsed policy card. Grouping rather than a flat list
 * so related facts sit together — vehicles with their own deductibles, drivers,
 * then the liability stack — instead of wrapping arbitrarily across a grid.
 */
interface SummaryColumn {
  heading: string;
  entries: Array<{ primary: string; secondary?: string }>;
}

function executiveSummary(extraction: InsurancePolicyExtraction): SummaryColumn[] {
  const coverage = (code: string) =>
    extraction.insurance_coverages.find((c) => c.coverage_code === code && c.included_status !== 'not_found');
  const deductible = (type: string) =>
    extraction.insurance_deductibles.find((d) => d.deductible_type === type && (d.amount !== null || d.percent !== null));
  const dedText = (type: string) => {
    const d = deductible(type);
    if (!d) return null;
    return d.amount !== null ? currency(d.amount) : `${d.percent}%`;
  };
  const limitOf = (code: string) => {
    const c = coverage(code);
    if (!c || c.limit_amount === null) return null;
    return c.secondary_limit_amount
      ? `${currency(c.limit_amount)} / ${currency(c.secondary_limit_amount)}`
      : currency(c.limit_amount);
  };

  const assets = extraction.insurance_insured_assets;
  const vehicles = assets.filter((a) => a.asset_type === 'vehicle');
  const properties = assets.filter((a) => a.asset_type === 'property' || a.asset_type === 'rental_property');
  const people = extraction.insurance_insured_parties.filter((p) => p.name);
  const drivers = driversOf(extraction);

  const column = (heading: string, entries: Array<{ primary: string; secondary?: string } | null>): SummaryColumn | null => {
    const kept = entries.filter((e): e is { primary: string; secondary?: string } => e !== null);
    return kept.length ? { heading, entries: kept } : null;
  };
  const line = (primary: string | null, secondary?: string | null) =>
    primary ? { primary, secondary: secondary ?? undefined } : null;

  const columns: Array<SummaryColumn | null> = [];

  switch (extraction.insurance_type) {
    case 'auto':
    case 'motorcycle':
    case 'rv': {
      columns.push(
        column(
          vehicles.length === 1 ? 'Vehicle' : 'Vehicles',
          vehicles.length
            ? vehicles.map((v) => {
                const name = [v.year, v.make, v.model].filter(Boolean).join(' ') || v.description || 'Vehicle';
                const parts = [
                  vehicleDeductible(extraction, v, 'collision') ? `Collision ${vehicleDeductible(extraction, v, 'collision')}` : null,
                  vehicleDeductible(extraction, v, 'comprehensive') ? `Comp ${vehicleDeductible(extraction, v, 'comprehensive')}` : null,
                ].filter(Boolean);
                return { primary: name, secondary: parts.length ? parts.join(' · ') : 'Deductibles not stated' };
              })
            : [
                line('Not listed in this document',
                  [dedText('collision') ? `Collision ${dedText('collision')}` : null,
                   dedText('comprehensive') ? `Comp ${dedText('comprehensive')}` : null].filter(Boolean).join(' · ') || undefined),
              ],
        ),
        column('Drivers', drivers.length
          ? drivers.map((p) => ({ primary: p.name, secondary: p.relationship ?? undefined }))
          : [line('Not listed in this document')]),
        column('Liability', [
          line(limitOf('bodily_injury_liability') ?? limitOf('combined_single_limit'), 'Bodily injury'),
          line(limitOf('property_damage_liability'), 'Property damage'),
          line(limitOf('uninsured_motorist'), 'Uninsured motorist'),
          line(limitOf('underinsured_motorist'), 'Underinsured motorist'),
        ]),
      );
      break;
    }

    case 'homeowners':
    case 'renters':
    case 'flood':
      columns.push(
        column('Property', [
          line(properties.map((p) => p.address || p.description || '').filter(Boolean)[0] ?? null),
          line(limitOf('dwelling'), 'Dwelling'),
          line(limitOf('personal_property'), 'Personal property'),
        ]),
        column('Deductibles', [
          line(dedText('standard'), 'Standard'),
          line(dedText('wind_hail') ?? dedText('wind') ?? dedText('hail'), 'Wind / hail'),
        ]),
        column('Liability', [
          line(limitOf('personal_liability'), 'Personal liability'),
          line(limitOf('medical_payments'), 'Medical payments'),
        ]),
      );
      break;

    case 'umbrella':
      columns.push(
        column('Coverage', [
          line(limitOf('umbrella_liability'), 'Umbrella limit'),
          line(limitOf('retained_limit'), 'Retained limit'),
        ]),
        column('Requires underlying', extraction.insurance_underlying_requirements
          .filter((r) => r.required_limit !== null)
          .map((r) => ({ primary: currency(r.required_limit), secondary: r.requirement_type.replace('_liability', '') }))),
        column('Covered people', drivers.map((p) => ({ primary: p.name, secondary: p.relationship ?? undefined }))),
      );
      break;

    case 'life':
      columns.push(
        column('Insured', [line(people.find((p) => p.role === 'insured')?.name ?? people[0]?.name ?? null)]),
        column('Benefit', [
          line(limitOf('death_benefit'), 'Death benefit'),
          line(limitOf('cash_value'), 'Cash value'),
        ]),
        column('Beneficiaries', extraction.insurance_beneficiaries
          .filter((b) => b.designation === 'primary' && b.name)
          .map((b) => ({ primary: b.name as string, secondary: b.percentage ? `${b.percentage}%` : b.relationship ?? undefined }))),
      );
      break;

    case 'disability':
      columns.push(
        column('Insured', [line(people.find((p) => p.role === 'insured')?.name ?? people[0]?.name ?? null)]),
        column('Benefit', [line(limitOf('monthly_benefit'), 'Monthly benefit')]),
      );
      break;

    default: {
      const top = extraction.insurance_coverages
        .filter((c) => c.limit_amount !== null && c.included_status !== 'not_found')
        .sort((a, b) => (b.limit_amount ?? 0) - (a.limit_amount ?? 0))
        .slice(0, 4);
      columns.push(
        column('Coverage', top.map((c) => ({ primary: currency(c.limit_amount), secondary: titleCase(c.coverage_code) }))),
        column('Deductible', [line(dedText('standard'))]),
      );
    }
  }

  return columns.filter((c): c is SummaryColumn => c !== null);
}

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
            Based on the summary page only — exclusions and endorsements were not available in
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

      {interestedPartiesOf(extraction).length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Lienholders & interested parties</h4>
          <ul className="mt-2 space-y-1 text-sm text-cmd-muted">
            {interestedPartiesOf(extraction).map((p) => (
              <li key={p.id}>
                • <span className="text-cmd-offwhite">{p.name}</span>
                {p.relationship ? <span className="text-cmd-muted/70"> — {p.relationship}</span> : null}
              </li>
            ))}
          </ul>
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

export function InsuranceView({ onNavigate }: { onNavigate?: (view: string, focusId?: string) => void } = {}) {
  const { data, refresh } = useHousehold();
  const policies = data?.insurancePolicies ?? [];
  const insuranceExtractions = data?.insuranceExtractions ?? [];
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
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


  const familiarity = familiarityState(policies.length, insuranceExtractions.length);
  // The uploader stays on the page; the intro's action takes you to it.
  const goToUploader = () =>
    document.getElementById('section-uploader')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return (
    <div className="space-y-6">
      {/* Coverage first. The upload is a means to this, not the point of the page. */}
      {familiarity === 'unstarted' ? (
        <SectionIntro
          intro={introFor('insurance')!}
          icon={<Shield className="h-5 w-5" />}
          onAction={goToUploader}
        />
      ) : (
        <CoverageHealth policies={policies} extractions={insuranceExtractions} profile={data?.profile} />
      )}

      {/* The grade says whether the cover fits. This says whether it is worth
          shopping, which is a different question and the one people act on. */}
      <PremiumReview
        policies={policies}
        extractions={insuranceExtractions}
        onOpenReport={() => onNavigate?.('reports', 'insurance')}
      />

      <InsurancePolicyReview extractions={insuranceExtractions} onChange={refresh} />

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Shield className="h-4 w-4 text-cmd-gold" />
          <h2 className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Your policies</h2>
        </div>

        {/* Full width: collapsed this is a single button, expanded it is a form. */}
        {data?.household?.id && <AddPolicyForm householdId={data.household.id} onAdded={refresh} />}

        {error && (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {policies.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
            No insurance policies yet. Upload a policy below to get started.
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
                      {/* Large insurers write through member companies whose
                          names never appear in their advertising, which reads
                          as two insurers when it is one. The document's own
                          wording stays; this only says who is behind it. */}
                      {(() => {
                        const group = carrierGroup(policy.carrier);
                        return group.known && group.label !== (policy.carrier ?? '').trim() ? (
                          <p className="mt-1 text-xs text-cmd-muted">Part of {group.label}</p>
                        ) : null;
                      })()}
                      <p className="mt-1 text-sm text-cmd-muted">
                        Policy #{policy.policy_number ?? 'N/A'}
                        {policy.coverage_amount ? ` · ${currency(policy.coverage_amount)} limit` : ''}
                      </p>
                      <div className="mt-3">
                        <DocumentLinkBadge
                          sourceDocumentId={policy.source_document_id}
                          documents={data?.documents ?? []}
                          everHadDocument={Boolean(policy.source_extraction_id)}
                        />
                      </div>
                    </div>
                    <div className="mt-4 text-left sm:mt-0 sm:text-right">
                      <p className="text-sm text-cmd-muted">Renewal</p>
                      <p className="mt-1 font-semibold text-cmd-offwhite">{policy.renewal_date ?? 'TBD'}</p>
                      <p className="mt-2 text-sm text-cmd-muted">
                        Premium {currency(policy.annual_premium)}
                      </p>
                    </div>
                  </div>

                  {extraction && executiveSummary(extraction).length > 0 && (
                    <div className="mt-4 grid gap-6 border-t border-cmd-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
                      {executiveSummary(extraction).map((col) => (
                        <div key={col.heading}>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">{col.heading}</p>
                          <ul className="mt-1.5 space-y-1">
                            {col.entries.map((entry, i) => (
                              <li key={i} className="flex gap-2 text-sm">
                                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-cmd-gold/60" />
                                <span>
                                  <span className="text-cmd-offwhite">{entry.primary}</span>
                                  {entry.secondary && (
                                    <span className="block text-xs text-cmd-muted">{entry.secondary}</span>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

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

                {historyFor === policy.id && (
                  <RecordHistory tableName="insurance_policies" recordId={policy.id} />
                )}

                {editing === policy.id && (
                  <EditPolicyPanel
                    policy={policy}
                    onCancel={() => setEditing(null)}
                    onSaved={async () => { setEditing(null); await refresh(); }}
                  />
                )}

                <div className="mt-4 flex justify-end gap-4 border-t border-cmd-border pt-3">
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
                    <>
                      <button
                        type="button"
                        onClick={() => setHistoryFor(historyFor === policy.id ? null : policy.id)}
                        className="inline-flex items-center gap-1.5 text-xs text-cmd-muted transition hover:text-cmd-gold"
                      >
                        <History className="h-3.5 w-3.5" /> {historyFor === policy.id ? 'Hide history' : 'History'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(editing === policy.id ? null : policy.id)}
                        className="inline-flex items-center gap-1.5 text-xs text-cmd-muted transition hover:text-cmd-gold"
                      >
                        <Pencil className="h-3.5 w-3.5" /> {editing === policy.id ? 'Close editor' : 'Edit policy'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingRemove(policy.id)}
                        className="inline-flex items-center gap-1.5 text-xs text-cmd-muted transition hover:text-red-200"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove policy
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      <UnfiledDocuments
        section="insurance"
        documents={data?.documents ?? []}
        data={{
          legalDocuments: data?.legalDocuments, legalExtractions: data?.legalExtractions,
          insurancePolicies: data?.insurancePolicies, insuranceExtractions: data?.insuranceExtractions,
          financeAccounts: data?.financeAccounts, creditCards: data?.creditCards,
          creditStatements: data?.creditStatements, mortgageStatements: data?.mortgageStatements,
          taxDocuments: data?.taxDocuments, taxReturns: data?.taxReturns,
        }}
        onChanged={refresh}
      />

      {/* Demoted: still one click away, no longer the headline. */}
      <section id="section-uploader" className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <UploadDropzone
          contextLabel="Add coverage"
          buttonLabel="Upload an insurance policy"
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
