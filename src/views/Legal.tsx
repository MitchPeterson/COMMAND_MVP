import React, { useState } from 'react';
import { useHousehold } from '../useHousehold';
import { UploadDropzone } from '../components/UploadDropzone';
import {
  uploadDocumentAsset,
  invokeDocumentExtraction,
  correctLegalDocumentType,
  type LegalDocumentExtraction,
} from '../lib/supabase';
import {
  LEGAL_CATEGORIES,
  LEGAL_DOCUMENT_STATUSES,
  legalCategoryLabel,
  legalType,
  legalTypeLabel,
  typesInCategory,
  type LegalCategory,
} from '../lib/legalTaxonomy';
import { LegalDocumentDetail } from '../components/LegalDocumentDetail';
import { LegalHealth } from '../components/LegalHealth';
import { AlertTriangle, ChevronDown, ChevronRight, FileText, Gavel, Info, Scale, ShieldCheck } from 'lucide-react';

function statusLabel(code: string | null | undefined): string {
  return LEGAL_DOCUMENT_STATUSES.find((s) => s.code === code)?.label ?? 'Not stated in the document';
}

/** Confidence as a plain phrase. A bare 0.82 tells a user nothing useful. */
function confidencePhrase(value: number | null): string {
  if (value == null) return 'Confidence not recorded';
  if (value >= 0.85) return 'High confidence';
  if (value >= 0.6) return 'Moderate confidence';
  return 'Low confidence';
}

function confidenceTone(value: number | null): string {
  if (value == null) return 'border-cmd-border text-cmd-muted';
  if (value >= 0.85) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (value >= 0.6) return 'border-cmd-gold/30 bg-cmd-gold/10 text-cmd-gold';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
}

interface TypeCorrectorProps {
  extraction: LegalDocumentExtraction;
  onSaved: () => Promise<void> | void;
}

function TypeCorrector({ extraction, onSaved }: TypeCorrectorProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async (code: string) => {
    setSaving(true);
    setError(null);
    try {
      await correctLegalDocumentType(extraction.id, code);
      await onSaved();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the type.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-cmd-border px-3 py-1.5 text-xs text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
      >
        {extraction.user_document_type ? 'Change type' : 'Set the type'}
      </button>
    );
  }

  return (
    <div className="mt-4 w-full rounded-2xl border border-cmd-gold/25 bg-cmd-black/30 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-cmd-gold">What is this document?</p>
      <div className="mt-4 space-y-4 max-h-72 overflow-y-auto pr-1">
        {LEGAL_CATEGORIES.filter((c) => c.code !== 'unclassified').map((category) => (
          <div key={category.code}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">{category.label}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {typesInCategory(category.code as LegalCategory).map((type) => (
                <button
                  key={type.code}
                  type="button"
                  disabled={saving}
                  onClick={() => apply(type.code)}
                  className="rounded-lg border border-cmd-border bg-cmd-black/40 px-2.5 py-1 text-xs text-cmd-muted transition hover:border-cmd-gold hover:text-cmd-gold disabled:opacity-40"
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {error && (
        <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-4 rounded-lg border border-cmd-border px-3 py-1.5 text-xs text-cmd-muted transition hover:text-cmd-offwhite"
      >
        Cancel
      </button>
    </div>
  );
}

export function LegalView() {
  const { data, refresh } = useHousehold();
  const [openId, setOpenId] = useState<string | null>(null);
  const documents = data?.legalDocuments ?? [];
  const extractions = data?.legalExtractions ?? [];
  const flags = data?.legalIssueFlags ?? [];
  const storedDocuments = data?.documents ?? [];

  // The user's correction wins over the model's answer for display; both are
  // kept, so the reason text below still explains what Command originally saw.
  const effectiveType = (e: LegalDocumentExtraction) => e.user_document_type ?? e.document_type;

  const grouped = LEGAL_CATEGORIES.map((category) => ({
    category,
    items: extractions.filter((e) => (legalType(effectiveType(e))?.category ?? 'unclassified') === category.code),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-8 shadow-sm shadow-black/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Legal documents</p>
            <h1 className="mt-3 text-3xl font-semibold text-cmd-offwhite">Legal</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cmd-border bg-cmd-black/50 px-4 py-2 text-sm text-cmd-muted">
            <Gavel className="h-4 w-4" /> {extractions.length + documents.length} document
            {extractions.length + documents.length === 1 ? '' : 's'}
          </div>
        </div>
        <p className="mt-6 flex items-start gap-2 text-xs text-cmd-muted/80">
          <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Command organizes and reads your documents. It does not give legal advice, and nothing here
          says whether a document is valid or currently in force — an attorney does that.
        </p>
      </section>

      <LegalHealth
        extractions={extractions}
        documents={documents}
        profile={data?.profile ?? null}
        familyMembers={data?.familyMembers ?? []}
        assets={data?.assets ?? []}
      />

      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <UploadDropzone
          contextLabel="Add a legal document"
          buttonLabel="Upload a will, trust, directive or deed"
          onUpload={async (file) => {
            if (!data?.household?.id) return;
            const document = await uploadDocumentAsset(data.household.id, file, 'legal');
            await invokeDocumentExtraction(document.id);
            await refresh();
          }}
        />
      </section>

      {flags.length > 0 && (
        <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
          <div className="flex items-center gap-3 text-cmd-gold">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Observations</p>
              <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Worth a look</h2>
            </div>
          </div>
          <ul className="mt-5 space-y-3">
            {flags.map((flag) => (
              <li key={flag.id} className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-4">
                <p className="text-sm text-cmd-offwhite">{flag.explanation}</p>
                {flag.suggested_action && (
                  <p className="mt-2 text-sm text-cmd-muted">{flag.suggested_action}</p>
                )}
                {flag.attorney_review_suggested && (
                  <p className="mt-2 text-xs text-cmd-gold">An attorney is the right person to weigh in on this.</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {extractions.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center">
          <FileText className="mx-auto h-6 w-6 text-cmd-muted" />
          <p className="mt-4 text-cmd-muted">
            No legal documents read yet. Upload a will, trust, power of attorney, healthcare
            directive, deed or business agreement and Command will tell you what it is, who is named
            in it, and which dates matter — with the page each answer came from.
          </p>
          <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
            {LEGAL_CATEGORIES.filter((c) => c.code !== 'unclassified').map((category) => (
              <div key={category.code} className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-4">
                <p className="text-sm font-semibold text-cmd-offwhite">{category.label}</p>
                <p className="mt-1 text-xs text-cmd-muted">{category.blurb}</p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        grouped.map((group) => (
          <section key={group.category.code} className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">{group.category.label}</p>
                <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">{group.category.blurb}</h2>
              </div>
              <span className="rounded-full border border-cmd-border bg-cmd-black/60 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cmd-muted">
                {group.items.length}
              </span>
            </div>

            <div className="space-y-4">
              {group.items.map((extraction) => {
                const source = storedDocuments.find((d) => d.id === extraction.document_id);
                const corrected = Boolean(extraction.user_document_type);

                return (
                  <div key={extraction.id} className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-cmd-gold">
                          <ShieldCheck className="h-4 w-4" />
                          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">
                            {legalTypeLabel(effectiveType(extraction))}
                            {corrected && ' · you set this'}
                          </p>
                        </div>
                        <h3 className="mt-2 truncate text-xl font-semibold text-cmd-offwhite">
                          {extraction.document_title || source?.name || 'Untitled document'}
                        </h3>
                        <p className="mt-2 text-sm text-cmd-muted">
                          {statusLabel(extraction.document_status)}
                          {extraction.page_count ? ` · ${extraction.page_count} page${extraction.page_count === 1 ? '' : 's'}` : ''}
                          {extraction.document_subtype ? ` · ${extraction.document_subtype}` : ''}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs ${confidenceTone(extraction.classification_confidence)}`}
                      >
                        {confidencePhrase(extraction.classification_confidence)}
                      </span>
                    </div>

                    {extraction.classification_reason && (
                      <p className="mt-4 flex items-start gap-2 rounded-2xl border border-cmd-border bg-cmd-black/40 p-4 text-sm text-cmd-muted">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-cmd-gold" />
                        <span>
                          {corrected ? 'Command originally read this as ' : ''}
                          {corrected && <strong className="text-cmd-offwhite">{legalTypeLabel(extraction.document_type)}</strong>}
                          {corrected ? '. ' : ''}
                          {extraction.classification_reason}
                        </span>
                      </p>
                    )}

                    {extraction.recognition === 'possibly_legal' && (
                      <p className="mt-3 text-sm text-amber-200">
                        Command is not certain this is a legal document. It has been kept exactly as
                        uploaded and nothing has been added to your profile.
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-lg border border-cmd-border px-2.5 py-1 text-xs text-cmd-muted">
                        {legalCategoryLabel(legalType(effectiveType(extraction))?.category)}
                      </span>
                      <span className="rounded-lg border border-cmd-border px-2.5 py-1 text-xs text-cmd-muted">
                        Reading v{extraction.extraction_version}
                      </span>
                      <TypeCorrector extraction={extraction} onSaved={refresh} />
                      <button
                        type="button"
                        onClick={() => setOpenId((id) => (id === extraction.id ? null : extraction.id))}
                        className="inline-flex items-center gap-1 rounded-lg border border-cmd-border px-3 py-1.5 text-xs text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
                      >
                        {openId === extraction.id ? (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" /> Hide what Command read
                          </>
                        ) : (
                          <>
                            <ChevronRight className="h-3.5 w-3.5" /> See what Command read
                          </>
                        )}
                      </button>
                    </div>

                    {openId === extraction.id && (
                      <LegalDocumentDetail extraction={extraction} filePath={source?.file_path ?? null} />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      {documents.length > 0 && (
        <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Recorded by hand</p>
          <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Your legal profile</h2>
          <div className="mt-5 space-y-4">
            {documents.map((doc) => (
              <div key={doc.id} className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-5 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">{doc.type}</p>
                  <h3 className="mt-2 text-xl font-semibold text-cmd-offwhite">{doc.name}</h3>
                  <p className="mt-2 text-sm text-cmd-muted">Attorney: {doc.attorney ?? 'Not set'}</p>
                </div>
                <div className="mt-4 text-right sm:mt-0">
                  <p className="text-sm text-cmd-muted">Last reviewed</p>
                  <p className="mt-1 font-semibold text-cmd-offwhite">{doc.last_reviewed ?? 'Unknown'}</p>
                  <p className="mt-3 text-sm text-cmd-muted">Status {doc.status}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
