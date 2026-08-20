import React, { useState } from 'react';
import { useHousehold } from '../useHousehold';
import { signOut, updateHouseholdProfile } from '../lib/supabase';
import { HouseholdHistory } from '../components/HouseholdHistory';
import { PeopleEditor } from '../components/PeopleEditor';
import { VersionHistory } from '../components/VersionHistory';
import { ApiUsageReport } from '../components/ApiUsageReport';
import { YourData } from '../components/YourData';
import { UserCircle2, ArrowLeftRight, MapPin, Shield, Sparkles } from 'lucide-react';
import { SecurityPosture } from '../components/SecurityPosture';

function formatCurrency(value: number | null | undefined) {
  return value == null ? '--' : `$${value.toLocaleString()}`;
}

const input =
  'w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2.5 text-sm text-cmd-offwhite ' +
  'placeholder-cmd-muted/50 outline-none transition focus:border-cmd-gold/50';
const fieldLabel = 'text-[11px] uppercase tracking-[0.16em] text-cmd-muted';

export function ProfileView() {
  const { data, refresh } = useHousehold();
  const [signingOut, setSigningOut] = useState(false);
  const [editingFinancials, setEditingFinancials] = useState(false);
  const [form, setForm] = useState({ household_income: '', net_worth: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    // Same as App: don't depend on the SIGNED_OUT listener firing. Re-init from
    // scratch so a failed revoke can't leave the user sitting on the dashboard.
    window.location.replace('/');
  };

  const profile = data?.profile;
  const household = data?.household;
  const members = data?.familyMembers ?? [];

  const startEditFinancials = () => {
    setError(null);
    setForm({
      household_income: profile?.household_income?.toString() ?? '',
      net_worth: profile?.net_worth?.toString() ?? '',
    });
    setEditingFinancials(true);
  };

  const saveFinancials = async () => {
    if (!household?.id) return;
    setSaving(true);
    setError(null);
    try {
      await updateHouseholdProfile(household.id, {
        household_income: form.household_income,
        net_worth: form.net_worth,
      });
      await refresh();
      setEditingFinancials(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save these figures.');
    } finally {
      setSaving(false);
    }
  };

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

      {household?.id && (
        <PeopleEditor householdId={household.id} members={members} profile={profile ?? null} onSaved={refresh} />
      )}

      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3 text-cmd-gold">
            <Sparkles className="h-5 w-5" />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Financials</p>
              <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Household summary</h2>
            </div>
          </div>
          {!editingFinancials && (
            <button
              type="button"
              onClick={startEditFinancials}
              className="rounded-xl border border-cmd-border px-3.5 py-2 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
            >
              Edit
            </button>
          )}
        </div>

        {editingFinancials ? (
          <div className="mt-6 rounded-2xl border border-cmd-gold/25 bg-cmd-black/30 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={fieldLabel}>Household income</label>
                <input
                  className={`${input} mt-1.5`}
                  inputMode="decimal"
                  placeholder="325000"
                  value={form.household_income}
                  onChange={(e) => setForm((f) => ({ ...f, household_income: e.target.value }))}
                />
              </div>
              <div>
                <label className={fieldLabel}>Net worth</label>
                <input
                  className={`${input} mt-1.5`}
                  inputMode="decimal"
                  placeholder="2800000"
                  value={form.net_worth}
                  onChange={(e) => setForm((f) => ({ ...f, net_worth: e.target.value }))}
                />
              </div>
            </div>
            {error && (
              <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
                {error}
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={saveFinancials}
                className="rounded-xl border border-cmd-gold bg-cmd-gold/15 px-4 py-2 text-sm font-semibold text-cmd-gold transition hover:bg-cmd-gold/25 disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingFinancials(false);
                  setError(null);
                }}
                className="rounded-xl border border-cmd-border px-4 py-2 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
              >
                Cancel
              </button>
            </div>
            <p className="mt-4 text-xs text-cmd-muted/70">
              Coverage health grades your liability limits against net worth — keeping these current
              changes what Command flags.
            </p>
          </div>
        ) : (
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
        )}
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
            <div className="mt-3">
              <VersionHistory />
            </div>
            <p className="mt-2 text-xs text-cmd-muted/70">Click for the release history</p>
          </div>
        </div>
      </section>
      {household?.id && <HouseholdHistory householdId={household.id} />}

      {/* Collapsed by default and last on the page: a tool for whoever pays the
          bill, not part of what Command is for. */}
      {/* The statement sits beside the controls it describes, one click from
          the page rather than nested inside another panel. */}
      <SecurityPosture />

      <YourData />

      <ApiUsageReport />

    </div>
  );
}
