import React, { useState } from 'react';
import { useHousehold } from '../useHousehold';
import { getDocumentUrl, invokeDocumentExtraction } from '../lib/supabase';
import { Folder, FileText, ExternalLink, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

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

export function DocumentsView() {
  const { data, refresh } = useHousehold();
  const documents = data?.documents ?? [];
  const extractions = data?.documentExtractions ?? [];
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const retryExtraction = async (id: string) => {
    setError(null);
    setBusyId(id);
    try {
      await invokeDocumentExtraction(id);
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
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Document center</p>
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

            return (
              <div key={doc.id} className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-5">
                <div className="sm:flex sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-cmd-gold" />
                    <div>
                      <p className="text-sm font-semibold text-cmd-offwhite">{doc.name}</p>
                      <p className="text-sm text-cmd-muted">
                        {doc.category ?? 'General document'} · {doc.mime_type ?? 'Unknown format'}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusBadge status={doc.status} />
                        {extraction && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-cmd-gold/25 bg-cmd-gold/10 px-3 py-1 text-xs text-cmd-gold">
                            {extraction.detected_type.replace(/_/g, ' ')} · {extraction.confidence} confidence
                            {extraction.status === 'pending_review' ? ' · needs review' : ` · ${extraction.status}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 shrink-0 text-right sm:mt-0">
                    <p className="text-sm text-cmd-muted">Uploaded</p>
                    <p className="mt-1 font-semibold text-cmd-offwhite">{formatDate(doc.uploaded_at)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-cmd-border pt-4">
                  <button
                    type="button"
                    disabled={!doc.file_path || busy}
                    onClick={() => openDocument(doc.file_path, doc.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-cmd-border bg-cmd-black/60 px-4 py-2 text-sm font-medium text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold disabled:opacity-40"
                  >
                    <ExternalLink className="h-4 w-4" /> View file
                  </button>

                  {doc.status !== 'processed' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => retryExtraction(doc.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-cmd-gold/40 bg-cmd-gold/10 px-4 py-2 text-sm font-medium text-cmd-gold transition hover:bg-cmd-gold/20 disabled:opacity-40"
                    >
                      <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                      {busy ? 'Extracting…' : 'Run extraction'}
                    </button>
                  )}

                  {extraction?.status === 'pending_review' && (
                    <span className="inline-flex items-center px-2 py-2 text-sm text-cmd-muted">
                      Review the extracted details on the Dashboard to add them to your profile.
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
