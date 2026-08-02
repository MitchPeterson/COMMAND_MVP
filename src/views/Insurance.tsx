import React from 'react';
import { useHousehold } from '../useHousehold';
import { UploadDropzone } from '../components/UploadDropzone';
import { uploadDocumentAsset, invokeDocumentExtraction } from '../lib/supabase';
import { Shield, HeartPulse, Sparkles } from 'lucide-react';

function formatCurrency(value: number | null | undefined) {
  return value == null ? '--' : `$${value.toLocaleString()}`;
}

export function InsuranceView() {
  const { data, refresh } = useHousehold();
  const policies = data?.insurancePolicies ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-8 shadow-sm shadow-black/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Insurance</p>
            <h1 className="mt-3 text-3xl font-semibold text-cmd-offwhite">Policies</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cmd-border bg-cmd-black/50 px-4 py-2 text-sm text-cmd-muted">
            <Shield className="h-4 w-4" /> {policies.length} policy{policies.length === 1 ? '' : 'ies'}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <UploadDropzone
          contextLabel="Insurance document upload"
          buttonLabel="Upload insurance document"
          className="mb-6"
          onUpload={async (file) => {
            if (!data?.household?.id) return;
            const document = await uploadDocumentAsset(data.household.id, file, 'insurance');
            if (document) {
              await invokeDocumentExtraction(document.id);
              await refresh();
            }
          }}
        />
        {policies.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
            No insurance policies connected yet.
          </div>
        ) : (
          <div className="space-y-4">
            {policies.map((policy) => (
              <div key={policy.id} className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-5 sm:flex sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-cmd-gold">
                    <HeartPulse className="h-4 w-4" />
                    <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">{policy.type}</p>
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-cmd-offwhite">{policy.carrier ?? 'Unknown carrier'}</h3>
                  <p className="mt-2 text-sm text-cmd-muted">Policy #{policy.policy_number ?? 'N/A'}</p>
                </div>
                <div className="mt-4 text-right sm:mt-0">
                  <p className="text-sm text-cmd-muted">Renewal</p>
                  <p className="mt-1 font-semibold text-cmd-offwhite">{policy.renewal_date ?? 'TBD'}</p>
                  <p className="mt-3 text-sm text-cmd-muted">Premium {formatCurrency(policy.annual_premium)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
        <div className="flex items-center gap-3 text-cmd-gold">
          <Sparkles className="h-5 w-5" />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Action status</p>
            <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Coverage health</h2>
          </div>
        </div>
        <p className="mt-4 text-sm text-cmd-muted">Insurance coverage and renewal dates are shown here for easy review.</p>
      </section>
    </div>
  );
}
