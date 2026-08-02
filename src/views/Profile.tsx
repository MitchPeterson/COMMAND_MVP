import React, { useState } from 'react';
import { useHousehold } from '../useHousehold';
import { signOut } from '../lib/supabase';
import pkg from '../../package.json';
import { UserCircle2, ArrowLeftRight, MapPin, Shield, Sparkles } from 'lucide-react';

function formatCurrency(value: number | null | undefined) {
  return value == null ? '--' : `$${value.toLocaleString()}`;
}

export function ProfileView() {
  const { data } = useHousehold();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  };

  const profile = data?.profile;
  const household = data?.household;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-8 shadow-sm shadow-black/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Your profile</p>
            <h1 className="mt-3 text-3xl font-semibold text-cmd-offwhite">Profile</h1>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-2xl border border-cmd-border bg-cmd-black/70 px-5 py-3 text-sm font-semibold text-cmd-gold transition hover:bg-cmd-black"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
          <div className="flex items-center gap-3 text-cmd-gold">
            <UserCircle2 className="h-5 w-5" />
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Household owner</p>
          </div>
          <p className="mt-6 text-3xl font-semibold text-cmd-offwhite">{profile?.primary_name ?? household?.name ?? 'Unnamed household'}</p>
          <p className="mt-2 text-sm text-cmd-muted">{profile?.partner_name ? `Partner: ${profile.partner_name}` : 'No partner listed'}</p>
        </div>
        <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
          <div className="flex items-center gap-3 text-emerald-300">
            <MapPin className="h-5 w-5" />
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Location</p>
          </div>
          <p className="mt-6 text-3xl font-semibold text-cmd-offwhite">{profile ? `${profile.city}, ${profile.state}` : '--'}</p>
          <p className="mt-2 text-sm text-cmd-muted">Household city and state</p>
        </div>
      </section>

      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
        <div className="flex items-center gap-3 text-cmd-gold">
          <Sparkles className="h-5 w-5" />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Financials</p>
            <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Household summary</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Income</p>
            <p className="mt-3 text-xl font-semibold text-cmd-offwhite">{formatCurrency(profile?.household_income)}</p>
          </div>
          <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Net worth</p>
            <p className="mt-3 text-xl font-semibold text-cmd-offwhite">{formatCurrency(profile?.net_worth)}</p>
          </div>
          <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Children</p>
            <p className="mt-3 text-xl font-semibold text-cmd-offwhite">{profile?.num_children ?? '--'}</p>
          </div>
          <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Home owner?</p>
            <p className="mt-3 text-xl font-semibold text-cmd-offwhite">{profile?.home_ownership ?? '--'}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <div className="flex items-center gap-3 text-cmd-gold">
          <ArrowLeftRight className="h-5 w-5" />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Session</p>
            <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Manage your account</h2>
          </div>
        </div>
        <p className="mt-4 text-sm text-cmd-muted">Use the sign-out button above to return to the auth screen and start a fresh household.</p>
      </section>

      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <div className="flex items-center gap-3 text-cmd-gold">
          <Shield className="h-5 w-5" />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">About</p>
            <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">App version</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Current version</p>
            <p className="mt-3 text-xl font-semibold text-cmd-offwhite">{pkg.version}</p>
          </div>
          <div className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Legacy mode</p>
            <p className="mt-3 text-xl font-semibold text-cmd-offwhite">Old interface still available</p>
          </div>
        </div>
      </section>
    </div>
  );
}
