// Whether this insurance is worth shopping.
//
// The disclaimer is load-bearing rather than decorative: Command has no pricing
// data, so it cannot tell anyone they are overpaying, and this panel says so in
// its own copy rather than burying it. What it offers instead is every reason to
// shop that the household's own paperwork supports, and a way to walk into that
// conversation with the figures already assembled.

import React from 'react';
import { AlertTriangle, ArrowRight, Building2, FileDown, Info, TrendingUp } from 'lucide-react';
import type { InsurancePolicy, InsurancePolicyExtraction } from '../lib/supabase';
import {
  reviewPremiums, shoppingCandidates,
  type MarketShareInput, type PremiumSeverity,
} from '../lib/premiumReview';

interface Props {
  policies: InsurancePolicy[];
  extractions: InsurancePolicyExtraction[];
  /** Public market data. Absent means no recommendation rather than a guess. */
  market?: MarketShareInput[];
  onOpenReport?: () => void;
}

const money = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const TONE: Record<PremiumSeverity, { icon: React.ReactNode; ring: string; label: string }> = {
  act: {
    icon: <TrendingUp className="h-4 w-4" />,
    ring: 'border-cmd-gold/40 bg-cmd-gold/5 text-cmd-gold',
    label: 'Worth doing now',
  },
  consider: {
    icon: <AlertTriangle className="h-4 w-4" />,
    ring: 'border-cmd-border bg-cmd-black/40 text-cmd-offwhite',
    label: 'Worth a look',
  },
  context: {
    icon: <Info className="h-4 w-4" />,
    ring: 'border-cmd-border bg-cmd-black/30 text-cmd-muted',
    label: 'For context',
  },
};

export function PremiumReview({ policies, extractions, market = [], onOpenReport }: Props) {
  const review = reviewPremiums(policies, extractions);
  const candidates = shoppingCandidates(policies, market);

  if (policies.length === 0) return null;

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">What you pay</p>
          <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">
            {review.blind ? 'No premiums on file' : `${money(review.annualTotal)} a year`}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
            Across {review.priced} polic{review.priced === 1 ? 'y' : 'ies'} with a premium recorded.
            Command has no pricing data and cannot tell you whether that is high — what it can do is
            point at every reason your own paperwork gives for getting quotes.
          </p>
        </div>
        {onOpenReport && (
          <button
            type="button"
            onClick={onOpenReport}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-cmd-gold px-4 py-2.5 text-sm font-semibold text-cmd-black transition hover:bg-cmd-gold-hover"
          >
            <FileDown className="h-4 w-4" /> Build a shopping report
          </button>
        )}
      </div>

      {review.findings.length > 0 && (
        <div className="mt-6 space-y-2.5">
          {review.findings.map((finding) => {
            const tone = TONE[finding.severity];
            return (
              <div key={finding.id} className={`rounded-2xl border p-4 ${tone.ring}`}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">{tone.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{finding.title}</p>
                    <p className="mt-1.5 text-sm leading-6 text-cmd-muted">{finding.detail}</p>
                    {finding.action && (
                      <p className="mt-2 text-sm leading-6 text-cmd-offwhite">{finding.action}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {candidates.length > 0 && (
        <div className="mt-6 border-t border-cmd-border pt-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-cmd-muted" />
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Who to get quotes from</p>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
            Ranked by how much of this insurance they actually write, with your own carrier left off.
            That is a measure of presence, not price — a big carrier is not necessarily a cheap one,
            and Command has no pricing data.
          </p>

          <ol className="mt-4 space-y-2">
            {candidates.map((candidate, i) => (
              <li
                key={candidate.naicGroupCode ?? candidate.name}
                className="flex items-start gap-4 rounded-2xl border border-cmd-border bg-cmd-black/40 px-4 py-3"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cmd-gold/40 text-xs font-semibold text-cmd-gold">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-cmd-offwhite">{candidate.name}</p>
                  {/* The verified fact, then Command's own note, kept apart. */}
                  <p className="mt-0.5 text-xs leading-5 text-cmd-muted">
                    {candidate.evidence}
                    {candidate.note ? ` · ${candidate.note}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-3 text-xs leading-5 text-cmd-muted/70">
            Market share from the NAIC Property/Casualty Market Share Report, countrywide rather than
            for your state. An independent agent can quote several of these in one call.
          </p>
        </div>
      )}

      {onOpenReport && (
        <button
          type="button"
          onClick={onOpenReport}
          className="mt-6 flex w-full items-center justify-between gap-4 rounded-2xl border border-cmd-border bg-cmd-black/40 px-4 py-3 text-left transition hover:border-cmd-gold/40"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-cmd-offwhite">
              Take your current cover to them
            </span>
            <span className="mt-0.5 block text-sm leading-6 text-cmd-muted">
              Every limit, deductible, premium and renewal date already assembled, so a quote is
              priced against what you actually carry rather than a guess at it.
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-cmd-gold" />
        </button>
      )}
    </section>
  );
}
