import React, { useEffect, useState } from 'react';
import { useHousehold } from '../useHousehold';
import {
  getDocumentUrl, invokeDocumentExtraction, deleteDocument, getDocumentImpact,
  isStalled, FORCEABLE_TYPES, type ForceableType, type StallableRow,
} from '../lib/supabase';
import { Folder, FileText, ExternalLink, RefreshCw, AlertCircle, CheckCircle2, Clock, Trash2, CornerDownRight, Shuffle } from 'lucide-react';
import { usesOf } from '../lib/documentLinks';

function formatDate(value: string | null) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

/**
 * Extraction outcome per document. Previously the vault showed only a filename,
 * so a document whose extraction had failed looked identical to one that
 * succeeded — the single most confusing thing about the upload flow.
 */
function StatusBadge({ status }: { status: string | null | undefined }) {
  const config = {
    processed: { icon: CheckCircle2, label: 'Extracted', className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200' },
    error: { icon: AlertCircle, label: 'Extraction failed', className: 'border-red-500/25 bg-red-500/10 text-red-200' },
    uploaded: { icon: Clock, label: 'Awaiting extraction', className: 'border-cmd-border bg-cmd-black/60 text-cmd-muted' },
  }[status ?? 'uploaded'] ?? {
    icon: Clock,
    label: status ?? 'Unknown',
    className: 'border-cmd-border bg-cmd-black/60 text-cmd-muted',
  };

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${config.className}`}>
      <Icon className="h-3.5 w-3.5" /> {config.label}
    </span>
  );
}

interface DocumentsViewProps {
  onNavigate?: (view: string) => void;
  /** A document to scroll to and mark, when arrived at from search. */
  focusId?: string | null;
}

export function DocumentsView({ onNavigate, focusId = null }: DocumentsViewProps = {}) {
  const { data, refresh } = useHousehold();
  const documents = data?.documents ?? [];
  const extractions = data?.documentExtractions ?? [];
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Delete is confirmed inline rather than via window.confirm, so the impact on
  // the profile can be shown before anything is destroyed.
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  // Which document is having its type corrected. Classification is right most of
  // the time and wrong occasionally, and when it is wrong re-reading changes
  // nothing — the same classifier reaches the same conclusion.
  const [retypingId, setRetypingId] = useState<string | null>(null);
  const [impact, setImpact] = useState<{ policies: number; accounts: number; cards: number; taxDocs: number } | null>(null);
  const [removeImported, setRemoveImported] = useState(true);

  // Landing on the vault from a search should land on the file, not the top of a
  // list of forty. The ring fades on its own so it does not become permanent.
  const [highlighted, setHighlighted] = useState<string | null>(focusId);
  useEffect(() => {
    if (!focusId) return;
    setHighlighted(focusId);
    const scroll = window.setTimeout(() => {
      document.getElementById(`doc-${focusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
    const fade = window.setTimeout(() => setHighlighted(null), 2600);
    return () => { window.clearTimeout(scroll); window.clearTimeout(fade); };
  }, [focusId]);

  const openDocument = async (filePath: string | null, id: string) => {
    if (!filePath) return;
    setError(null);
    setBusyId(id);
    try {
      const url = await getDocumentUrl(filePath);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      else setError('Could not open that file.');
    } finally {
      setBusyId(null);
    }
  };

  const startDelete = async (id: string) => {
    setError(null);
    setRemoveImported(true);
    setImpact(null);
    setPendingDelete(id);
    setImpact(await getDocumentImpact(id));
  };

  const confirmDelete = async (id: string, filePath: string | null) => {
    setError(null);
    setBusyId(id);
    try {
      await deleteDocument(id, filePath, removeImported);
      setPendingDelete(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the document.');
    } finally {
      setBusyId(null);
    }
  };

  const retryExtraction = async (id: string, forceType?: ForceableType) => {
    setError(null);
    setBusyId(id);
    setRetypingId(null);
    try {
      await invokeDocumentExtraction(id, forceType);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-8 shadow-sm shadow-black/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Document vault</p>
            <h1 className="mt-3 text-3xl font-semibold text-cmd-offwhite">Documents</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cmd-border bg-cmd-black/50 px-4 py-2 text-sm text-cmd-muted">
            <Folder className="h-4 w-4" /> {documents.length} file{documents.length === 1 ? '' : 's'}
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      {documents.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
          No documents uploaded yet.
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => {
            const extraction = extractions.find((item) => item.document_id === doc.id);
            const busy = busyId === doc.id;
            // What this file is actually responsible for. Nothing is a real
            // answer: the file is here and no part of the app depends on it,
            // which is exactly the state a user cannot otherwise see.
            // The document's own status and its staging row's processing_state are
            // set independently and can disagree — a document can read 'processed'
            // while the statement it produced is stuck mid-read. The staging row is
            // the one that knows, so it wins where there is one.
            const staging: StallableRow[] = [
              ...(data?.creditStatements ?? []).filter((r) => r.document_id === doc.id),
              ...(data?.mortgageStatements ?? []).filter((r) => r.document_id === doc.id),
              ...(data?.legalExtractions ?? []).filter((r) => r.document_id === doc.id),
              ...(data?.insuranceExtractions ?? []).filter((r) => r.document_id === doc.id),
            ];
            const stalled = staging.some((r) => isStalled(r));

            const uses = usesOf(doc.id, {
              legalDocuments: data?.legalDocuments, legalExtractions: data?.legalExtractions,
              insurancePolicies: data?.insurancePolicies, insuranceExtractions: data?.insuranceExtractions,
              financeAccounts: data?.financeAccounts, creditCards: data?.creditCards,
              creditStatements: data?.creditStatements, mortgageStatements: data?.mortgageStatements,
              taxDocuments: data?.taxDocuments, taxReturns: data?.taxReturns,
            });

            return (
              <div
                key={doc.id}
                id={`doc-${doc.id}`}
                className={`rounded-3xl border bg-cmd-black/40 p-5 transition ${
                  highlighted === doc.id ? 'border-cmd-gold ring-1 ring-cmd-gold/40' : 'border-cmd-border'
                }`}
              >
                <div className="sm:flex sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-cmd-gold" />
                    <div>
                      <p className="text-sm font-semibold text-cmd-offwhite">{doc.name}</p>
                      <p className="text-sm text-cmd-muted">
                        {doc.category ?? 'General document'} · {doc.mime_type ?? 'Unknown format'}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusBadge status={stalled ? 'error' : doc.status} />
                        {extraction && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-cmd-gold/25 bg-cmd-gold/10 px-3 py-1 text-xs text-cmd-gold">
                            {extraction.detected_type.replace(/_/g, ' ')} · {extraction.confidence} confidence
                            {extraction.status === 'pending_review' ? ' · needs review' : ` · ${extraction.status}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 shrink-0 text-left sm:mt-0 sm:text-right">
                    <p className="text-sm text-cmd-muted">Uploaded</p>
                    <p className="mt-1 font-semibold text-cmd-offwhite">{formatDate(doc.uploaded_at)}</p>
                  </div>
                </div>

                {/* What this file produced. A document the user believes is
                    "in Command" while nothing depends on it is the gap between
                    the vault and a section's inventory, and it was invisible
                    from both sides. */}
                <div className="mt-4 border-t border-cmd-border pt-4">
                  {stalled ? (
                    <p className="flex items-start gap-2 text-xs text-amber-200">
                      <CornerDownRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      This reading never finished — it was cut off by the server rather than failing,
                      so nothing was saved and nothing said so. Read it again.
                    </p>
                  ) : uses.length === 0 ? (
                    <p className="flex items-center gap-2 text-xs text-cmd-muted">
                      <CornerDownRight className="h-3.5 w-3.5 shrink-0" />
                      {doc.status === 'processed'
                        ? 'Read, but nothing in your sections depends on it yet — the reading may still be waiting for you to confirm it.'
                        : 'Not filed to a section yet.'}
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-cmd-muted" />
                      {uses.map((use, index) => (
                        <button
                          key={`${use.section}-${index}`}
                          type="button"
                          onClick={() => onNavigate?.(use.section)}
                          disabled={!onNavigate}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                            use.pending
                              ? 'border-cmd-gold/40 bg-cmd-gold/10 text-cmd-gold hover:bg-cmd-gold/20'
                              : 'border-cmd-border bg-cmd-black/60 text-cmd-offwhite hover:border-cmd-gold hover:text-cmd-gold'
                          } ${onNavigate ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          {use.label} · {use.detail}{use.pending ? ' · needs review' : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {retypingId === doc.id && (
                  <div className="mt-4 rounded-2xl border border-cmd-gold/30 bg-cmd-gold/5 p-4">
                    <p className="text-sm font-semibold text-cmd-offwhite">What is this document?</p>
                    <p className="mt-1 text-xs leading-5 text-cmd-muted">
                      Command will read it again down the path you pick instead of the one it chose.
                      What it originally decided is kept, so a correction shows where the reading
                      needs work.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {FORCEABLE_TYPES.map((type) => (
                        <button
                          key={type.code}
                          type="button"
                          onClick={() => retryExtraction(doc.id, type.code)}
                          className="rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-1.5 text-xs text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
                        >
                          {type.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setRetypingId(null)}
                        className="rounded-xl px-3 py-1.5 text-xs text-cmd-muted transition hover:text-cmd-offwhite"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-cmd-border pt-4">
                  <button
                    type="button"
                    disabled={!doc.file_path || busy}
                    onClick={() => openDocument(doc.file_path, doc.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-cmd-border bg-cmd-black/60 px-4 py-2 text-sm font-medium text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold disabled:opacity-40"
                  >
                    <ExternalLink className="h-4 w-4" /> View file
                  </button>

                  {/* Always available, including on a document already read.
                      Extraction is idempotent — content hashes and upserts mean a
                      second run updates the same rows rather than duplicating
                      them — and re-reading is the only way to pick up an
                      improvement to how a document type is handled. Hiding this
                      once a document was 'processed' left the earlier readings
                      stranded on whatever the pipeline did at the time. */}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => retryExtraction(doc.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-cmd-gold/40 bg-cmd-gold/10 px-4 py-2 text-sm font-medium text-cmd-gold transition hover:bg-cmd-gold/20 disabled:opacity-40"
                    title={
                      doc.status === 'processed'
                        ? 'Reads the document again and replaces what it found before, rather than adding a second entry.'
                        : 'Reads the document and files what it finds.'
                    }
                  >
                    <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                    {busy
                      ? 'Extracting…'
                      : doc.status === 'processed'
                        ? 'Read it again'
                        : 'Run extraction'}
                  </button>

                  {/* Re-reading runs the same classifier and reaches the same
                      conclusion, so a misread document cannot be recovered by
                      trying again — which is exactly what it invites you to do. */}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setRetypingId(retypingId === doc.id ? null : doc.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-cmd-border bg-cmd-black/60 px-4 py-2 text-sm font-medium text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold disabled:opacity-40"
                    title="Tell Command what this document is and read it again down that path."
                  >
                    <Shuffle className="h-4 w-4" /> Wrong type?
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => startDelete(doc.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-cmd-border px-4 py-2 text-sm font-medium text-cmd-muted transition hover:border-red-500/40 hover:text-red-200 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>

                  {extraction?.status === 'pending_review' && (
                    <span className="inline-flex items-center px-2 py-2 text-sm text-cmd-muted">
                      Review the extracted details on the Dashboard to add them to your profile.
                    </span>
                  )}
                </div>

                {pendingDelete === doc.id && (
                  <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/5 p-4">
                    <p className="text-sm font-semibold text-cmd-offwhite">Delete “{doc.name}”?</p>
                    <p className="mt-1 text-sm text-cmd-muted">
                      The file and anything extracted from it will be removed. This cannot be undone.
                    </p>

                    {impact && (impact.policies + impact.accounts + impact.cards + impact.taxDocs) > 0 ? (
                      <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-cmd-muted">
                        <input
                          type="checkbox"
                          checked={removeImported}
                          onChange={(e) => setRemoveImported(e.target.checked)}
                          className="mt-1"
                        />
                        <span>
                          Also remove what this document added to my profile
                          {impact.policies > 0 && ` · ${impact.policies} polic${impact.policies === 1 ? 'y' : 'ies'}`}
                          {impact.accounts > 0 && ` · ${impact.accounts} account${impact.accounts === 1 ? '' : 's'}`}
                          {impact.cards > 0 && ` · ${impact.cards} card${impact.cards === 1 ? '' : 's'}`}
                          {impact.taxDocs > 0 && ` · ${impact.taxDocs} tax record${impact.taxDocs === 1 ? '' : 's'}`}
                          <span className="block text-xs text-cmd-muted/70">
                            Leave unticked to keep those records and delete only the file.
                          </span>
                        </span>
                      </label>
                    ) : (
                      <p className="mt-2 text-xs text-cmd-muted/70">
                        Nothing from this document has been added to your profile yet.
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => confirmDelete(doc.id, doc.file_path)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/25 disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" /> {busy ? 'Deleting…' : 'Delete permanently'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(null)}
                        className="rounded-xl border border-cmd-border px-4 py-2 text-sm font-medium text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
