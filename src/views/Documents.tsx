import React from 'react';
import { useHousehold } from '../useHousehold';
import { Folder, FileText, Clock } from 'lucide-react';

function formatDate(value: string | null) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function DocumentsView() {
  const { data } = useHousehold();
  const documents = data?.documents ?? [];

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

      {documents.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
          No documents uploaded yet.
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-5 sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-cmd-gold" />
                <div>
                  <p className="text-sm font-semibold text-cmd-offwhite">{doc.name}</p>
                  <p className="text-sm text-cmd-muted">{doc.category ?? 'General document'}</p>
                </div>
              </div>
              <div className="mt-4 text-right sm:mt-0">
                <p className="text-sm text-cmd-muted">Uploaded</p>
                <p className="mt-1 font-semibold text-cmd-offwhite">{formatDate(doc.uploaded_at)}</p>
                <p className="mt-2 text-sm text-cmd-muted">{doc.mime_type ?? 'Unknown format'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
