import React, { useEffect, useState } from 'react';
import {
  getLegalExtractionDetail,
  getDocumentUrl,
  type LegalDocumentExtraction,
  type LegalExtractionDetail,
  type LegalExtractedField,
  type LegalProvision,
} from '../lib/supabase';
import { legalRoleLabel } from '../lib/legalTaxonomy';
import { AlertTriangle, ExternalLink, Eye, EyeOff, Loader2, Quote } from 'lucide-react';

interface Props {
  extraction: LegalDocumentExtraction;
  filePath: string | null;
}

/**
 * Sensitive identifiers are stored — they are in the document either way — but
 * never rendered in full and never logged. Last four only, which is enough to
 * recognise the value without reproducing it.
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

function Confidence({ value }: { value: number | null }) {
  if (value == null) return null;
  const label = value >= 0.85 ? 'High' : value >= 0.6 ? 'Moderate' : 'Low';
  const tone =
    value >= 0.85
      ? 'text-emerald-300'
      : value >= 0.6
        ? 'text-cmd-gold'
        : 'text-amber-300';
  return <span className={`text-[11px] ${tone}`}>{label} confidence</span>;
}

/** The citation line. Every extracted value carries one; none is optional. */
function Provenance({
  page,
  section,
  evidence,
  confidence,
  valueType,
  onOpenSource,
}: {
  page: number | null;
  section: string | null;
  evidence: string | null;
  confidence: number | null;
  valueType: string;
  onOpenSource: (page: number | null) => void;
}) {
  const [open, setOpen] = useState(false);

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
        <Confidence value={confidence} />
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

function FieldRow({
  field,
  onOpenSource,
}: {
  field: LegalExtractedField;
  onOpenSource: (page: number | null) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const value = field.user_value ?? field.value_text ?? '';
  const shown = field.is_sensitive && !revealed ? mask(value) : value;

  return (
    <div className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">{humanize(field.field_code)}</p>
          <p className="mt-1.5 break-words text-sm font-medium text-cmd-offwhite">{shown}</p>
        </div>
        {field.is_sensitive && (
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
    </div>
  );
}

function ProvisionRow({
  provision,
  onOpenSource,
}: {
  provision: LegalProvision;
  onOpenSource: (page: number | null) => void;
}) {
  return (
    <div className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-cmd-offwhite">
          {provision.label || humanize(provision.provision_code)}
        </p>
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
      {provision.summary && <p className="mt-2 text-sm text-cmd-muted">{provision.summary}</p>}
      {(provision.applies_to || provision.amount != null || provision.percentage != null) && (
        <p className="mt-2 text-xs text-cmd-muted">
          {[
            provision.applies_to,
            provision.amount != null ? `$${provision.amount.toLocaleString()}` : null,
            provision.percentage != null ? `${provision.percentage}%` : null,
            provision.effective_condition,
          ]
            .filter(Boolean)
            .join(' · ')}
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
    </div>
  );
}

/**
 * Everything one reading found, with the page behind each answer. Read-only for
 * now: confirming, editing and rejecting arrive with the review workflow, and
 * until then nothing here has touched the household profile.
 */
export function LegalDocumentDetail({ extraction, filePath }: Props) {
  const [detail, setDetail] = useState<LegalExtractionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getLegalExtractionDetail(extraction.id).then((result) => {
      if (active) {
        setDetail(result);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [extraction.id]);

  const openSource = async (page: number | null) => {
    if (!filePath) return;
    const url = await getDocumentUrl(filePath);
    // The page fragment is a hint the browser's PDF viewer honours; a viewer
    // that ignores it still opens the right document.
    if (url) window.open(page ? `${url}#page=${page}` : url, '_blank', 'noopener,noreferrer');
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
                    {flag.suggested_action && (
                      <p className="mt-1 text-xs text-cmd-muted">{flag.suggested_action}</p>
                    )}
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
              <div key={party.id} className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-4">
                <p className="text-sm font-medium text-cmd-offwhite">{party.name}</p>
                <p className="mt-1 text-xs text-cmd-gold">
                  {(rolesByParty.get(party.id) ?? [])
                    .map((r) => legalRoleLabel(r.role_code) + (r.priority ? ` (${r.priority})` : ''))
                    .join(' · ') || 'Role not stated'}
                </p>
                {party.relationship && <p className="mt-1 text-xs text-cmd-muted">{party.relationship}</p>}
                {party.match_state === 'suggested' && (
                  <p className="mt-2 text-[11px] text-cmd-muted">
                    Looks like someone in your household. Confirm when reviewing.
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
                  onOpenSource={openSource}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {detail.provisions.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">What it provides for</p>
          <div className="mt-2 space-y-3">
            {detail.provisions.map((provision) => (
              <ProvisionRow key={provision.id} provision={provision} onOpenSource={openSource} />
            ))}
          </div>
        </div>
      )}

      {detail.fields.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Details on the page</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {detail.fields.map((field) => (
              <FieldRow key={field.id} field={field} onOpenSource={openSource} />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-cmd-muted/70">
        Read from the document, not confirmed by you — none of it has changed your profile.
      </p>
    </div>
  );
}
