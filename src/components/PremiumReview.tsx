// Whether this insurance is worth shopping.
//
// The disclaimer is load-bearing rather than decorative: Command has no pricing
// data, so it cannot tell anyone they are overpaying, and this panel says so in
// its own copy rather than burying it. What it offers instead is every reason to
// shop that the household's own paperwork supports, and a way to walk into that
// conversation with the figures already assembled.

import React from 'react';
import { ArrowRight, Building2, FileDown } from 'lucide-react';
import type { InsurancePolicy, InsurancePolicyExtraction } from '../lib/supabase';
import { DonutChart } from './DonutChart';
import { FindingList } from './FindingList';
import { useDismissals } from './useDismissals';
import {
  reviewPremiums, shoppingCandidates,
  type MarketShareInput,
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


/** The premium panel's own severities, mapped onto the shared renderer's. */
const SEVERITY_MAP: Record<string, string> = {
  act: 'attention', consider: 'info', context: 'info',
};

export function PremiumReview({ policies, extractions, market = [], onOpenReport }: Props) {
  const review = reviewPremiums(policies, extractions);
  // The action line is part of what makes a finding dismissible-worthy, so it
  // is folded into the detail rather than dropped.
  const withAction = review.findings.map((f) => ({
    ...f,
    detail: f.action ? `${f.detail} ${f.action}` : f.detail,
  }));
  const { visible, hiddenCount, onDismiss, onRestore } = useDismissals('premium', withAction);
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

      {/* The mix, drawn. A list of five figures separated by interpuncts was a
          table pretending to be a sentence. */}
      {review.mix.length >= 2 && (
        <div className="mt-6 rounded-2xl border border-cmd-border bg-cmd-black/30 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Where your premium goes</p>
          <div className="mt-4">
            <DonutChart
              segments={review.mix.map((m) => ({
                label: m.label,
                value: m.amount,
                display: `${money(m.amount)} · ${m.share}%`,
              }))}
              centerValue={money(review.annualTotal)}
              centerLabel="A year"
              summary={`Annual premium of ${money(review.annualTotal)}, split as `
                + review.mix.map((m) => `${m.label} ${m.share} percent`).join(', ')}
            />
          </div>
          <p className="mt-4 text-xs text-cmd-muted/70">
            Covers {review.priced} of {policies.length} policies on file
            {review.unpriced > 0 ? ', the rest having no premium recorded.' : '.'}
          </p>
        </div>
      )}

      <div className="mt-6">
        <FindingList
          section="premium"
          findings={visible.map((f) => ({ ...f, severity: SEVERITY_MAP[f.severity] }))}
          hiddenCount={hiddenCount}
          onDismiss={onDismiss}
          onRestore={onRestore}
        />
      </div>

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
