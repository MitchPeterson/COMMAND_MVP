// The three numbers worth seeing before reading anything.
//
// The liability tower is the centrepiece because it is the only insurance
// visual that shows a relationship rather than a quantity: what each policy
// carries, what the umbrella adds above it, and where the household's net worth
// sits against the total. It is the picture an agent draws on a whiteboard.
//
// It is drawn from the same coverage rows the grade reads, never from
// insurance_policies.coverage_amount. On a home policy that field holds the
// dwelling limit, and rendering $985,000 of "liability" that is really the
// building would be a confident lie sitting next to a card that correctly says
// the liability limit was never found.
//
// A tier whose limit was not read is drawn as an outline rather than omitted.
// The gap is the point: it is exactly what a declarations page would fill in.

import React from 'react';
import { ShieldAlert, Wallet } from 'lucide-react';
import type { InsurancePolicy, InsurancePolicyExtraction, HouseholdProfile } from '../lib/supabase';
import { computeLiabilityStack, type LiabilityTier } from '../lib/coverageHealth';

interface Props {
  policies: InsurancePolicy[];
  extractions: InsurancePolicyExtraction[];
  profile?: HouseholdProfile | null;
}

const money = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
    notation: value >= 1_000_000 ? 'compact' : 'standard',
    maximumSignificantDigits: value >= 1_000_000 ? 3 : undefined,
  }).format(value);

function Tier({ tier, widest }: { tier: LiabilityTier; widest: number }) {
  const pct = tier.limit != null && widest > 0
    ? Math.max((tier.limit / widest) * 100, 6)
    : 100;

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-cmd-muted">{tier.label}</span>
      <div className="h-7 min-w-0 flex-1 overflow-hidden rounded-md bg-cmd-black/50">
        {tier.state === 'found' ? (
          <div
            className="flex h-full items-center rounded-md bg-cmd-gold/80 px-2"
            style={{ width: `${pct}%` }}
          >
            <span className="truncate font-mono text-xs font-semibold text-cmd-black">
              {money(tier.limit as number)}
            </span>
          </div>
        ) : (
          // Outlined, not omitted. The absence is the finding.
          <div className="flex h-full items-center rounded-md border border-dashed border-cmd-border-hi px-2">
            <span className="truncate text-xs text-cmd-muted">Limit not read from a document</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function CoverageGlance({ policies, extractions, profile }: Props) {
  const stack = computeLiabilityStack(policies, extractions, profile);

  // What a household pays before any policy does. Deductibles are unambiguous
  // on a policy row, so this needs no document to be true.
  const deductibles = policies.filter((p) => (p.deductible ?? 0) > 0);
  const deductibleTotal = deductibles.reduce((sum, p) => sum + (p.deductible ?? 0), 0);

  // How much of the cover is backed by a document Command actually read.
  const documented = policies.filter((p) => p.source_extraction_id).length;

  if (policies.length === 0) return null;

  const widest = Math.max(
    ...stack.tiers.map((t) => t.limit ?? 0),
    stack.umbrella.limit ?? 0,
    1,
  );

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">At a glance</p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.5fr_minmax(0,1fr)]">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-cmd-offwhite">Your liability tower</p>
          <p className="mt-1 text-xs leading-5 text-cmd-muted">
            What each policy would pay before the next one starts.
          </p>

          <div className="mt-4 space-y-2">
            {stack.umbrella.state !== 'absent' && <Tier tier={stack.umbrella} widest={widest} />}
            {stack.tiers.map((tier) => <Tier key={tier.key} tier={tier} widest={widest} />)}
          </div>

          <div className="mt-4 border-t border-cmd-border pt-4">
            {stack.incomplete ? (
              <p className="flex items-start gap-2 text-xs leading-5 text-cmd-muted">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cmd-gold" />
                Command will not total a tower with a limit missing from it. Upload the declarations
                page for any line above and the rest of this fills in.
              </p>
            ) : stack.exposed != null && stack.exposed > 0 ? (
              <p className="text-xs leading-5 text-cmd-muted">
                The tower reaches <span className="text-cmd-offwhite">{money(stack.towerTop ?? 0)}</span>.
                Your stated net worth is{' '}
                <span className="text-cmd-offwhite">{money(stack.netWorth ?? 0)}</span>, leaving{' '}
                <span className="text-cmd-gold">{money(stack.exposed)}</span> above it. What that means
                for you is a conversation for your agent.
              </p>
            ) : (
              <p className="text-xs leading-5 text-cmd-muted">
                The tower reaches <span className="text-cmd-offwhite">{money(stack.towerTop ?? 0)}</span>,
                at or above the net worth on file.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-4">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-cmd-muted">
              <Wallet className="h-3.5 w-3.5" /> Before any policy pays
            </p>
            <p className="mt-2 text-2xl font-semibold text-cmd-offwhite">
              {deductibleTotal > 0 ? money(deductibleTotal) : '—'}
            </p>
            <p className="mt-1 text-xs leading-5 text-cmd-muted">
              {deductibleTotal > 0
                ? `Every deductible added together, across ${deductibles.length} of ${policies.length} policies. `
                  + 'You would only meet them all in the worst year of your life, but this is the ceiling.'
                : 'No deductibles are recorded on the policies on file.'}
            </p>
          </div>

          <div className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-cmd-muted">Read from a document</p>
            <p className="mt-2 text-2xl font-semibold text-cmd-offwhite">
              {documented} <span className="text-base font-normal text-cmd-muted">of {policies.length}</span>
            </p>
            <p className="mt-1 text-xs leading-5 text-cmd-muted">
              {documented === policies.length
                ? 'Every policy here came from a document Command read.'
                : `${policies.length - documented} were typed in, so their limits are as remembered rather `
                  + 'than as written. That is what holds the assessment confidence down.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
