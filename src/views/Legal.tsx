import React from 'react';
import { useHousehold } from '../useHousehold';
import { FileText, Gavel, ShieldCheck } from 'lucide-react';

export function LegalView() {
  const { data } = useHousehold();
  const documents = data?.legalDocuments ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-8 shadow-sm shadow-black/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Legal documents</p>
            <h1 className="mt-3 text-3xl font-semibold text-cmd-offwhite">Legal</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cmd-border bg-cmd-black/50 px-4 py-2 text-sm text-cmd-muted">
            <Gavel className="h-4 w-4" /> {documents.length} document{documents.length === 1 ? '' : 's'}
          </div>
        </div>
      </section>

      {documents.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
          No legal documents have been added yet.
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-5 sm:flex sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-cmd-gold">
                  <ShieldCheck className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">{doc.type}</p>
                </div>
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
      )}
    </div>
  );
}
