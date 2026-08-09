import React, { useCallback, useEffect, useState } from 'react';
import {
  getLegalExtractionDetail,
  getDocumentUrl,
  reviewLegalField,
  reviewLegalProvision,
  reviewAllLegalFields,
  resolveLegalPartyMatch,
  createFamilyMemberFromParty,
  confirmLegalExtraction,
  confidenceBand,
  alwaysReviewable,
  type ConfidenceBand,
  type FamilyMember,
  type LegalDocumentExtraction,
  type LegalExtractionDetail,
  type LegalExtractedField,
  type LegalParty,
  type LegalProvision,
} from '../lib/supabase';
import { legalRoleLabel, legalType } from '../lib/legalTaxonomy';
import {
  AlertTriangle, Check, ExternalLink, Eye, EyeOff, Loader2, Pencil, Quote, UserPlus, X,
} from 'lucide-react';

interface Props {
  extraction: LegalDocumentExtraction;
  filePath: string | null;
  familyMembers: FamilyMember[];
  onConfirmed: () => Promise<void> | void;
}

/**
 * Sensitive identifiers are stored — they are in the document either way — but
 * never rendered in full and never logged. Last four only, which is enough to
 * recognize the value without reproducing it.
 */
function mask(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return '••••';
  return `•••• ${trimmed.slice(-4)}`;
}

function humanize(code: string): string {
  return code.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

const VALUE_TYPE_NOTE: Record<string, string> = {
  explicit: 'Stated in the document',
  calculated: 'Worked out by Command',
  inferred: 'Read from context, not stated outright',
  unknown: 'Not found in these pages',
};

const BAND_NOTE: Record<ConfidenceBand, string> = {
  high: 'High confidence',
  medium: 'Moderate confidence',
  low: 'Low confidence — worth reading closely',
};

const BAND_TONE: Record<ConfidenceBand, string> = {
  high: 'text-emerald-300',
  medium: 'text-cmd-gold',
  low: 'text-amber-300',
};

const btn =
  'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] transition disabled:opacity-40';
const btnIdle = 'border-cmd-border text-cmd-muted hover:border-cmd-gold hover:text-cmd-gold';

/** The citation line. Every extracted value carries one; none is optional. */
function Provenance({
  page, section, evidence, confidence, valueType, onOpenSource,
}: {
  page: number | null;
  section: string | null;
  evidence: string | null;
  confidence: number | null;
  valueType: string;
  onOpenSource: (page: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const band = confidenceBand(confidence);

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {page != null && page > 0 && (
          <button
            type="button"
            onClick={() => onOpenSource(page)}
            className="inline-flex items-center gap-1 text-[11px] text-cmd-muted underline decoration-dotted underline-offset-2 transition hover:text-cmd-gold"
          >
            Page {page} <ExternalLink className="h-3 w-3" />
          </button>
        )}
        {section && <span className="text-[11px] text-cmd-muted">{section}</span>}
        <span className={`text-[11px] ${BAND_TONE[band]}`}>{BAND_NOTE[band]}</span>
        <span className="text-[11px] text-cmd-muted/70">{VALUE_TYPE_NOTE[valueType] ?? valueType}</span>
        {evidence && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] text-cmd-muted transition hover:text-cmd-gold"
          >
            <Quote className="h-3 w-3" /> {open ? 'Hide the wording' : 'Show the wording'}
          </button>
        )}
      </div>
      {open && evidence && (
        <p className="mt-2 border-l-2 border-cmd-gold/40 pl-3 text-xs italic text-cmd-muted">“{evidence}”</p>
      )}
    </div>
  );
}

function StateBadge({ state }: { state: string }) {
  if (state === 'unreviewed') return null;
  const tone: Record<string, string> = {
    confirmed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    edited: 'border-cmd-gold/30 bg-cmd-gold/10 text-cmd-gold',
    rejected: 'border-red-500/30 bg-red-500/10 text-red-200',
    unresolved: 'border-cmd-border bg-cmd-black/50 text-cmd-muted',
  };
  const label: Record<string, string> = {
    confirmed: 'Confirmed',
    edited: 'Your value',
    rejected: 'Rejected',
    unresolved: 'Left unresolved',
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${tone[state] ?? tone.unresolved}`}>
      {label[state] ?? state}
    </span>
  );
}

function FieldRow({
  field, onOpenSource, onReview,
}: {
  field: LegalExtractedField;
  onOpenSource: (page: number | null) => void;
  onReview: (id: string, decision: 'confirmed' | 'edited' | 'rejected' | 'unresolved', value?: string) => Promise<void>;
}) {
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(field.user_value ?? field.value_text ?? '');
  const [busy, setBusy] = useState(false);

  const value = field.user_value ?? field.value_text ?? '';
  const shown = field.is_sensitive && !revealed ? mask(value) : value;
  const band = confidenceBand(field.confidence);

  const act = async (decision: 'confirmed' | 'edited' | 'rejected' | 'unresolved', v?: string) => {
    setBusy(true);
    try {
      await onReview(field.id, decision, v);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border p-4 ${
        field.review_state === 'rejected'
          ? 'border-cmd-border bg-cmd-black/20 opacity-60'
          : field.review_state === 'confirmed' || field.review_state === 'edited'
            ? 'border-emerald-500/20 bg-cmd-black/40'
            : 'border-cmd-border bg-cmd-black/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">{humanize(field.field_code)}</p>
            <StateBadge state={field.review_state} />
            {alwaysReviewable(field.field_code) && field.review_state === 'unreviewed' && (
              <span className="text-[10px] text-cmd-muted/70">worth checking</span>
            )}
          </div>
          {editing ? (
            <input
              className="mt-1.5 w-full rounded-lg border border-cmd-gold/40 bg-cmd-black/60 px-2.5 py-1.5 text-sm text-cmd-offwhite outline-none"
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') act('edited', draft);
                if (e.key === 'Escape') setEditing(false);
              }}
            />
          ) : (
            <p
              className={`mt-1.5 break-words text-sm font-medium ${
                field.review_state === 'rejected' ? 'text-cmd-muted line-through' : 'text-cmd-offwhite'
              }`}
            >
              {shown}
            </p>
          )}
        </div>
        {field.is_sensitive && !editing && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="shrink-0 rounded-lg border border-cmd-border p-1.5 text-cmd-muted transition hover:text-cmd-gold"
            aria-label={revealed ? 'Hide this value' : 'Reveal this value'}
          >
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      <Provenance
        page={field.source_page}
        section={field.source_section}
        evidence={field.evidence}
        confidence={field.confidence}
        valueType={field.value_type}
        onOpenSource={onOpenSource}
      />

      <div className="mt-3 flex flex-wrap gap-1.5">
        {editing ? (
          <>
            <button type="button" disabled={busy} onClick={() => act('edited', draft)} className={`${btn} border-cmd-gold bg-cmd-gold/15 text-cmd-gold`}>
              <Check className="h-3 w-3" /> Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className={`${btn} ${btnIdle}`}>Cancel</button>
          </>
        ) : (
          <>
            {field.review_state !== 'confirmed' && (
              <button type="button" disabled={busy} onClick={() => act('confirmed')} className={`${btn} border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20`}>
                <Check className="h-3 w-3" /> {band === 'low' ? 'Confirm anyway' : 'Confirm'}
              </button>
            )}
            <button type="button" disabled={busy} onClick={() => { setDraft(value); setEditing(true); }} className={`${btn} ${btnIdle}`}>
              <Pencil className="h-3 w-3" /> Edit
            </button>
            {field.review_state !== 'rejected' && (
              <button type="button" disabled={busy} onClick={() => act('rejected')} className={`${btn} ${btnIdle} hover:border-red-500/40 hover:text-red-200`}>
                <X className="h-3 w-3" /> Reject
              </button>
            )}
            {field.review_state === 'unreviewed' && (
              <button type="button" disabled={busy} onClick={() => act('unresolved')} className={`${btn} ${btnIdle}`}>
                Leave for later
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PartyCard({
  party, roles, familyMembers, householdId, onOpenSource, onChanged,
}: {
  party: LegalParty;
  roles: Array<{ role_code: string; priority: number | null }>;
  familyMembers: FamilyMember[];
  householdId: string;
  onOpenSource: (page: number | null) => void;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const matched = familyMembers.find((m) => m.id === party.matched_family_member_id);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await onChanged();
      setPicking(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-4">
      <p className="text-sm font-medium text-cmd-offwhite">{party.name}</p>
      <p className="mt-1 text-xs text-cmd-gold">
        {roles.map((r) => legalRoleLabel(r.role_code) + (r.priority ? ` (${r.priority})` : '')).join(' · ') ||
          'Role not stated'}
      </p>
      {party.relationship && <p className="mt-1 text-xs text-cmd-muted">{party.relationship}</p>}

      {party.match_state === 'confirmed' && matched && (
        <p className="mt-2 text-[11px] text-emerald-300">Linked to {matched.name} in your household</p>
      )}
      {party.match_state === 'suggested' && (
        <p className="mt-2 text-[11px] text-cmd-muted">
          Looks like {matched?.name ?? 'someone'} in your household.
        </p>
      )}
      {party.match_state === 'conflict' && party.match_conflict && (
        <p className="mt-2 text-[11px] text-amber-300">{party.match_conflict}</p>
      )}

      <Provenance
        page={party.source_page}
        section={null}
        evidence={party.evidence}
        confidence={party.confidence}
        valueType="explicit"
        onOpenSource={onOpenSource}
      />

      {party.party_kind === 'person' && party.match_state !== 'confirmed' && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {party.matched_family_member_id && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => resolveLegalPartyMatch(party.id, 'confirmed', party.matched_family_member_id))}
              className={`${btn} border-emerald-500/40 bg-emerald-500/10 text-emerald-200`}
            >
              <Check className="h-3 w-3" /> Same person
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => setPicking((v) => !v)} className={`${btn} ${btnIdle}`}>
            Match to someone
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => createFamilyMemberFromParty(householdId, party, 'Other'))}
            className={`${btn} ${btnIdle}`}
          >
            <UserPlus className="h-3 w-3" /> Add to household
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => resolveLegalPartyMatch(party.id, 'rejected'))}
            className={`${btn} ${btnIdle}`}
          >
            Not in my household
          </button>
        </div>
      )}

      {picking && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {familyMembers.length === 0 ? (
            <p className="text-[11px] text-cmd-muted">No household members recorded yet.</p>
          ) : (
            familyMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                disabled={busy}
                onClick={() => run(() => resolveLegalPartyMatch(party.id, 'confirmed', member.id))}
                className={`${btn} ${btnIdle}`}
              >
                {member.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ProvisionRow({
  provision, onOpenSource, onReview,
}: {
  provision: LegalProvision;
  onOpenSource: (page: number | null) => void;
  onReview: (id: string, decision: 'confirmed' | 'rejected') => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const act = async (decision: 'confirmed' | 'rejected') => {
    setBusy(true);
    try {
      await onReview(provision.id, decision);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-2xl border p-4 ${provision.review_state === 'rejected' ? 'border-cmd-border bg-cmd-black/20 opacity-60' : 'border-cmd-border bg-cmd-black/40'}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-cmd-offwhite">
          {provision.label || humanize(provision.provision_code)}
        </p>
        <div className="flex items-center gap-2">
          <StateBadge state={provision.review_state} />
          {provision.is_present === false && (
            <span className="rounded-full border border-cmd-border px-2 py-0.5 text-[11px] text-cmd-muted">
              The document states this is not included
            </span>
          )}
          {provision.is_present === null && (
            <span className="rounded-full border border-cmd-border px-2 py-0.5 text-[11px] text-cmd-muted">
              These pages do not settle it
            </span>
          )}
        </div>
      </div>
      {provision.summary && <p className="mt-2 text-sm text-cmd-muted">{provision.summary}</p>}
      {(provision.applies_to || provision.amount != null || provision.percentage != null) && (
        <p className="mt-2 text-xs text-cmd-muted">
          {[
            provision.applies_to,
            provision.amount != null ? `$${provision.amount.toLocaleString()}` : null,
            provision.percentage != null ? `${provision.percentage}%` : null,
            provision.effective_condition,
          ].filter(Boolean).join(' · ')}
        </p>
      )}
      {provision.document_language && (
        <p className="mt-3 border-l-2 border-cmd-border pl-3 text-xs italic text-cmd-muted/80">
          “{provision.document_language}”
        </p>
      )}
      <Provenance
        page={provision.source_page}
        section={provision.source_section}
        evidence={provision.evidence}
        confidence={provision.confidence}
        valueType={provision.value_type}
        onOpenSource={onOpenSource}
      />
      {provision.review_state === 'unreviewed' && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button type="button" disabled={busy} onClick={() => act('confirmed')} className={`${btn} border-emerald-500/40 bg-emerald-500/10 text-emerald-200`}>
            <Check className="h-3 w-3" /> Confirm
          </button>
          <button type="button" disabled={busy} onClick={() => act('rejected')} className={`${btn} ${btnIdle} hover:border-red-500/40 hover:text-red-200`}>
            <X className="h-3 w-3" /> Reject
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The review screen. Everything on it is a reading until a person says
 * otherwise — confirming is what moves a value onto the household's record, and
 * nothing else does.
 */
export function LegalDocumentDetail({ extraction, filePath, familyMembers, onConfirmed }: Props) {
  const [detail, setDetail] = useState<LegalExtractionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    const fresh = await getLegalExtractionDetail(extraction.id);
    setDetail(fresh);
  }, [extraction.id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getLegalExtractionDetail(extraction.id).then((fresh) => {
      if (active) {
        setDetail(fresh);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [extraction.id]);

  const openSource = async (page: number | null) => {
    if (!filePath) return;
    const url = await getDocumentUrl(filePath);
    // The page fragment is a hint the browser's PDF viewer honors; a viewer that
    // ignores it still opens the right document.
    if (url) window.open(page ? `${url}#page=${page}` : url, '_blank', 'noopener,noreferrer');
  };

  const reviewField = async (
    id: string,
    decision: 'confirmed' | 'edited' | 'rejected' | 'unresolved',
    value?: string,
  ) => {
    setError(null);
    try {
      await reviewLegalField(id, decision, value);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that decision.');
    }
  };

  const reviewProvision = async (id: string, decision: 'confirmed' | 'rejected') => {
    setError(null);
    try {
      await reviewLegalProvision(id, decision);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that decision.');
    }
  };

  const confirmAll = async () => {
    setBusy(true);
    setError(null);
    try {
      const n = await reviewAllLegalFields(extraction.id, 'confirmed');
      await load();
      setResult(
        n === 0
          ? 'Nothing left to confirm in bulk — the remaining values are low confidence, so they need a look each.'
          : `Confirmed ${n} detail${n === 1 ? '' : 's'}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm these details.');
    } finally {
      setBusy(false);
    }
  };

  const addToProfile = async () => {
    setBusy(true);
    setError(null);
    try {
      const extractorKey = legalType(extraction.user_document_type ?? extraction.document_type)?.extractor ?? 'generic';
      const outcome = await confirmLegalExtraction(extraction, extractorKey);
      await load();
      await onConfirmed();
      setResult(
        `Added to your profile — ${outcome.fieldsApplied} confirmed detail${outcome.fieldsApplied === 1 ? '' : 's'}` +
          `${outcome.partial ? ', with the rest still waiting for you' : ''}.` +
          (outcome.conflicts.length > 0 ? ` ${outcome.conflicts.join(' ')}` : ''),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add this to your profile.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <p className="mt-4 flex items-center gap-2 text-sm text-cmd-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading what Command read…
      </p>
    );
  }
  if (!detail) return null;

  const rolesByParty = new Map<string, typeof detail.roles>();
  for (const role of detail.roles) {
    const list = rolesByParty.get(role.party_id) ?? [];
    list.push(role);
    rolesByParty.set(role.party_id, list);
  }

  const unreviewed = detail.fields.filter((f) => f.review_state === 'unreviewed').length;
  const decided = detail.fields.filter((f) => f.review_state === 'confirmed' || f.review_state === 'edited').length;
  const nothingFound =
    detail.fields.length === 0 && detail.parties.length === 0 && detail.provisions.length === 0;

  return (
    <div className="mt-5 space-y-5 border-t border-cmd-border pt-5">
      {extraction.plain_language_summary && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">In plain language</p>
          <p className="mt-2 text-sm text-cmd-offwhite">{extraction.plain_language_summary}</p>
        </div>
      )}

      {nothingFound && (
        <p className="rounded-2xl border border-dashed border-cmd-border bg-cmd-black/40 p-5 text-sm text-cmd-muted">
          Command classified this document but could not read details from it. The original is
          untouched in your vault — retry it there, or upload a clearer scan.
        </p>
      )}

      {!nothingFound && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-cmd-gold/25 bg-cmd-black/30 p-4">
          <p className="mr-auto text-sm text-cmd-muted">
            {decided} of {detail.fields.length} details confirmed
            {unreviewed > 0 ? ` · ${unreviewed} still to review` : ''}
          </p>
          <button type="button" disabled={busy || unreviewed === 0} onClick={confirmAll} className={`${btn} ${btnIdle} px-3 py-1.5`}>
            <Check className="h-3.5 w-3.5" /> Confirm all
          </button>
          <button
            type="button"
            disabled={busy || decided === 0}
            onClick={addToProfile}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cmd-gold bg-cmd-gold/15 px-4 py-2 text-sm font-semibold text-cmd-gold transition hover:bg-cmd-gold/25 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Add to my profile
          </button>
        </div>
      )}

      {result && (
        <p className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200">{result}</p>
      )}
      {error && (
        <p className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      )}

      {detail.flags.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">What Command noticed</p>
          <ul className="mt-2 space-y-2">
            {detail.flags.map((flag) => (
              <li key={flag.id} className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <div>
                    <p className="text-sm text-cmd-offwhite">{flag.explanation}</p>
                    {flag.suggested_action && <p className="mt-1 text-xs text-cmd-muted">{flag.suggested_action}</p>}
                    {flag.attorney_review_suggested && (
                      <p className="mt-1 text-xs text-cmd-gold">Worth raising with an attorney.</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {detail.parties.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Who is named</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {detail.parties.map((party) => (
              <PartyCard
                key={party.id}
                party={party}
                roles={rolesByParty.get(party.id) ?? []}
                familyMembers={familyMembers}
                householdId={extraction.household_id}
                onOpenSource={openSource}
                onChanged={load}
              />
            ))}
          </div>
        </div>
      )}

      {detail.provisions.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">What it provides for</p>
          <div className="mt-2 space-y-3">
            {detail.provisions.map((provision) => (
              <ProvisionRow key={provision.id} provision={provision} onOpenSource={openSource} onReview={reviewProvision} />
            ))}
          </div>
        </div>
      )}

      {detail.fields.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Details on the page</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {detail.fields.map((field) => (
              <FieldRow key={field.id} field={field} onOpenSource={openSource} onReview={reviewField} />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-cmd-muted/70">
        Only what you confirm reaches your profile. Rejecting a value leaves the document and its
        reading untouched — Command simply stops treating it as true.
      </p>
    </div>
  );
}
