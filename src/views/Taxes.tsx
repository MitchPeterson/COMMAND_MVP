import React from 'react';
import { useHousehold } from '../useHousehold';
import { FileText, Shield, Calendar, CheckCircle } from 'lucide-react';

export function TaxesView() {
  const { data } = useHousehold();
  const documents = data?.taxDocuments ?? [];
  const recommendations = data?.taxRecommendations ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-8 shadow-sm shadow-black/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Tax center</p>
            <h1 className="mt-3 text-3xl font-semibold text-cmd-offwhite">Taxes</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cmd-border bg-cmd-black/50 px-4 py-2 text-sm text-cmd-muted">
            <Shield className="h-4 w-4" /> {documents.length} document{documents.length === 1 ? '' : 's'}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Recommended actions</p>
            <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Tax recommendations</h2>
          </div>
          <span className="rounded-full border border-cmd-border bg-cmd-black/60 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cmd-muted">
            {recommendations.length} item{recommendations.length === 1 ? '' : 's'}
          </span>
        </div>
        {recommendations.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
            No tax recommendations available yet.
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((item) => (
              <div key={item.id} className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-cmd-muted">{item.priority ?? 'Standard'}</p>
                    <h3 className="mt-2 text-xl font-semibold text-cmd-offwhite">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-cmd-muted">{item.description ?? 'No description provided.'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-cmd-offwhite">
                      {item.potential_savings != null ? `$${item.potential_savings.toLocaleString()}` : '--'}
                    </p>
                    <p className="mt-1 text-sm text-cmd-muted">Deadline {item.deadline ?? 'TBD'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Tax documents</p>
            <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Recent filings</h2>
          </div>
          <span className="rounded-full border border-cmd-border bg-cmd-black/60 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cmd-muted">
            {documents.length} file{documents.length === 1 ? '' : 's'}
          </span>
        </div>
        {documents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
            No tax documents uploaded yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-5 sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-cmd-gold" />
                  <div>
                    <p className="text-sm font-semibold text-cmd-offwhite">{doc.name}</p>
                    <p className="text-sm text-cmd-muted">{doc.tax_year} · {doc.doc_type}</p>
                  </div>
                </div>
                <div className="mt-4 text-right sm:mt-0">
                  <p className="text-sm text-cmd-muted">Status</p>
                  <p className="mt-1 font-semibold text-cmd-offwhite">{doc.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
