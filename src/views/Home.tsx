import React from 'react';
import { useHousehold } from '../useHousehold';
import { Home, Building, Wrench, TrendingUp } from 'lucide-react';

function formatCurrency(value: number | null | undefined) {
  return value == null ? '--' : `$${value.toLocaleString()}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'TBD';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function HomeView() {
  const { data } = useHousehold();
  const profile = data?.profile;
  const assets = data?.assets ?? [];
  const maintenanceRecords = data?.maintenanceRecords ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-8 shadow-sm shadow-black/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Household home</p>
            <h1 className="mt-3 text-3xl font-semibold text-cmd-offwhite">Home</h1>
            <p className="mt-3 max-w-2xl text-sm text-cmd-muted">
              View home value, maintenance, and household asset health in one place.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cmd-border bg-cmd-black/50 px-4 py-2 text-sm text-cmd-muted">
            <Home className="h-4 w-4" /> {assets.length} asset{assets.length === 1 ? '' : 's'}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
          <div className="flex items-center gap-3 text-cmd-gold">
            <Building className="h-5 w-5" />
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Home value</p>
          </div>
          <p className="mt-6 text-3xl font-semibold text-cmd-offwhite">{formatCurrency(profile?.home_value)}</p>
          <p className="mt-2 text-sm text-cmd-muted">Estimated home worth</p>
        </div>
        <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
          <div className="flex items-center gap-3 text-emerald-300">
            <TrendingUp className="h-5 w-5" />
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Net worth</p>
          </div>
          <p className="mt-6 text-3xl font-semibold text-cmd-offwhite">{formatCurrency(profile?.net_worth)}</p>
          <p className="mt-2 text-sm text-cmd-muted">Current household net worth</p>
        </div>
        <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
          <div className="flex items-center gap-3 text-cmd-gold">
            <Wrench className="h-5 w-5" />
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Maintenance due</p>
          </div>
          <p className="mt-6 text-3xl font-semibold text-cmd-offwhite">{maintenanceRecords.length}</p>
          <p className="mt-2 text-sm text-cmd-muted">Upcoming tasks</p>
        </div>
      </section>

      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Household summary</p>
            <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Key home details</h2>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Location</p>
            <p className="mt-3 text-base text-cmd-offwhite">{profile ? `${profile.city}, ${profile.state}` : '--'}</p>
          </div>
          <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Ownership</p>
            <p className="mt-3 text-base text-cmd-offwhite">{profile?.home_ownership ?? '--'}</p>
          </div>
          <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Children</p>
            <p className="mt-3 text-base text-cmd-offwhite">{profile?.num_children ?? 0}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Assets</p>
            <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Tracked household assets</h2>
          </div>
          <span className="rounded-full border border-cmd-border bg-cmd-black/60 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cmd-muted">
            {assets.length} item{assets.length === 1 ? '' : 's'}
          </span>
        </div>
        {assets.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
            No assets have been added yet.
          </div>
        ) : (
          <div className="space-y-4">
            {assets.map((asset) => (
              <div key={asset.id} className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-5 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-cmd-muted">{asset.type}</p>
                  <h3 className="mt-2 text-xl font-semibold text-cmd-offwhite">{asset.name}</h3>
                  <p className="mt-2 text-sm text-cmd-muted">{asset.notes ?? 'No notes available'}</p>
                </div>
                <div className="mt-4 text-right sm:mt-0">
                  <p className="text-sm text-cmd-muted">Value</p>
                  <p className="mt-1 text-xl font-semibold text-cmd-offwhite">{formatCurrency(asset.current_value)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
