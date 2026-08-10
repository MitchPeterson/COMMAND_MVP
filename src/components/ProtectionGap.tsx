import React, { useState } from 'react';
import type { FamilyMember, HouseholdProfile, InsurancePolicy, MortgageAccount } from '../lib/supabase';
import { computeProtectionGap } from '../lib/protectionGap';
import { ChevronDown, ChevronRight, ShieldAlert, Umbrella } from 'lucide-react';

interface Props {
  members: FamilyMember[];
  profile?: HouseholdProfile | null;
  policies: InsurancePolicy[];
  mortgage?: MortgageAccount | null;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

/**
 * The gap, with its own arithmetic on display.
 *
 * A single confident number here would be the most misleading thing in Command,
 * so the components are shown by default rather than behind a disclosure, and
 * every line that rests on an assumption rather than the household's own data
 * is marked. The figure is a method, and the user can disagree with any step of it.
 */
export function ProtectionGap({ members, profile, policies, mortgage }: Props) {
  const [showWorking, setShowWorking] = useState(false);
  const result = computeProtectionGap(members, profile, policies, mortgage);

  if (result.need == null) {
    return (
      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
        <div className="flex items-center gap-3 text-cmd-gold">
          <Umbrella className="h-5 w-5" />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">If something happened to a parent</p>
            <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Protection</h2>
          </div>
        </div>
        <p className="mt-4 text-sm text-cmd-muted">
          No children recorded, so there is no dependency period to size cover against. Add them on your
          profile and this fills in from their birth dates.
        </p>
      </section>
    );
  }

  const short = (result.gap ?? 0) > 0;

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3 text-cmd-gold">
          <Umbrella className="h-5 w-5" />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">If something happened to a parent</p>
            <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Protection</h2>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-cmd-muted">{short ? 'Short by' : 'Covered, with headroom of'}</p>
          <p className={`text-3xl font-semibold ${short ? 'text-amber-300' : 'text-emerald-300'}`}>
            {money(Math.abs(result.gap ?? 0))}
          </p>
          <p className="mt-1 text-xs text-cmd-muted">
            {money(result.need)} needed · {money(result.coverage)} of life cover on file
          </p>
        </div>
      </div>

      {short && result.coverage === 0 && (
        <div className="mt-5 flex gap-3 rounded-2xl border border-red-500/25 bg-red-500/5 px-4 py-3">
          <ShieldAlert className="h-4 w-4 shrink-0 text-red-300" />
          <p className="text-sm text-cmd-muted">
            No life policies are on file at all. Cover through an employer is the piece most often
            forgotten — and it usually ends when the job does, which is exactly when it would be needed.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowWorking((v) => !v)}
        className="mt-5 inline-flex items-center gap-1.5 text-sm text-cmd-muted transition hover:text-cmd-gold"
      >
        {showWorking ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {showWorking ? 'Hide the arithmetic' : 'Show how this is worked out'}
      </button>

      {showWorking && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">What would be needed</p>
            <div className="mt-3 space-y-3">
              {result.needComponents.map((component, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm text-cmd-offwhite">{component.label}</span>
                    <span className="text-sm font-medium text-cmd-offwhite">{money(component.amount)}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-cmd-muted">
                    {component.basis}
                    {component.assumed && <span className="text-amber-300/80"> · assumption</span>}
                  </p>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-2 border-t border-cmd-border pt-2">
                <span className="text-sm font-semibold text-cmd-offwhite">Total</span>
                <span className="text-sm font-semibold text-cmd-offwhite">{money(result.need)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">What already covers it</p>
            <div className="mt-3 space-y-3">
              {result.offsetComponents.map((component, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm text-cmd-offwhite">{component.label}</span>
                    <span className="text-sm font-medium text-cmd-offwhite">{money(component.amount)}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-cmd-muted">
                    {component.basis}
                    {component.assumed && <span className="text-amber-300/80"> · assumption</span>}
                  </p>
                </div>
              ))}
            </div>

            {result.policies.length > 0 && (
              <div className="mt-4 border-t border-cmd-border pt-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Policies counted</p>
                {result.policies.map((policy) => (
                  <p key={policy.id} className="mt-1 text-xs text-cmd-muted">
                    {policy.carrier ?? 'Carrier not recorded'} · {money(policy.coverage_amount ?? 0)}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-cmd-border bg-cmd-black/20 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">What this does not account for</p>
        <ul className="mt-2 space-y-1.5">
          {result.caveats.map((caveat, i) => (
            <li key={i} className="text-sm text-cmd-muted">{caveat}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
