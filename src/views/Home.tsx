import React from 'react';
import { useHousehold } from '../useHousehold';
import { UploadDropzone } from '../components/UploadDropzone';
import { HomeHealth } from '../components/HomeHealth';
import { HomeSystemsPanel } from '../components/HomeSystemsPanel';
import { MortgagePanel } from '../components/MortgagePanel';
import { uploadDocumentAsset, invokeDocumentExtraction } from '../lib/supabase';
import type { HomeSystemRow } from '../lib/homeSystems';
import { Wrench } from 'lucide-react';

export function HomeView() {
  const { data, refresh } = useHousehold();
  const systems = (data?.homeSystems ?? []) as unknown as HomeSystemRow[];
  const mortgage = data?.mortgage ?? null;

  return (
    <div className="space-y-6">
      {/* The grade leads, as it does on every section. */}
      <HomeHealth
        systems={systems}
        profile={data?.profile ?? null}
        mortgagePrincipal={mortgage?.principal_balance ?? null}
      />

      {data?.household?.id && (
        <MortgagePanel
          householdId={data.household.id}
          mortgage={mortgage}
          profile={data?.profile ?? null}
          onChanged={refresh}
        />
      )}

      {data?.household?.id && (
        <HomeSystemsPanel
          householdId={data.household.id}
          systems={data?.homeSystems ?? []}
          systemDocuments={data?.homeSystemDocuments ?? []}
          documents={data?.documents ?? []}
          onChanged={refresh}
        />
      )}

      {data?.maintenanceRecords && data.maintenanceRecords.length > 0 && (
        <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
          <div className="mb-5 flex items-center gap-3">
            <Wrench className="h-4 w-4 text-cmd-gold" />
            <h2 className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Maintenance on the books</h2>
          </div>
          <div className="space-y-3">
            {data.maintenanceRecords.map((record) => (
              <div key={record.id} className="rounded-2xl border border-cmd-border bg-cmd-charcoal p-4 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">{record.category ?? 'General'}</p>
                  <p className="mt-1 text-base font-semibold text-cmd-offwhite">{record.title}</p>
                </div>
                <div className="mt-3 text-right sm:mt-0">
                  <p className="text-sm text-cmd-muted">{record.status.replace('_', ' ')}</p>
                  <p className="mt-0.5 text-sm text-cmd-offwhite">{record.due_date ?? 'No date'}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Demoted: still one click away, no longer the headline. */}
      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <UploadDropzone
          contextLabel="Add a home document"
          buttonLabel="Upload a mortgage statement, warranty or manual"
          onUpload={async (file) => {
            if (!data?.household?.id) return;
            const document = await uploadDocumentAsset(data.household.id, file, 'home');
            await invokeDocumentExtraction(document.id);
            await refresh();
          }}
        />
      </section>
    </div>
  );
}
