// What a card is for, what it carries, and whether it suits this household.
//
// The distinction that makes this worth having: a features list is something any
// comparison site prints. What Command can add is the same list judged against
// what this household actually buys — so a 6% grocery bonus is reported with
// what it returned them, and an annual fee is reported against what it bought.

import React, { useState } from 'react';
import {
  AlertCircle, BadgeCheck, ChevronDown, ChevronRight, Plane, ShieldCheck, Sparkles,
} from 'lucide-react';
import {
  assessCard, rankAlternatives, matchProfile, CATALOG_AS_OF, BASELINE_RATE,
  type CardAssessment, type CategoryTotals, type EarnProfile,
} from '../lib/cardFit';

interface Props {
  issuer: string | null | undefined;
  product: string | null | undefined;
  /** This household's spending mix over one statement period. */
  totals: CategoryTotals;
  /** Catalog keys already held, so alternatives exclude them. */
  heldKeys?: string[];
  defaultOpen?: boolean;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: value < 100 ? 2 : 0,
  }).format(value);

const BENEFIT_ICON: Record<string, React.ElementType> = {
  lounge: Plane, travel_credit: Plane, travel_insurance: ShieldCheck,
  trip_delay: ShieldCheck, baggage: ShieldCheck, rental_car: ShieldCheck,
  extended_warranty: BadgeCheck, purchase_protection: BadgeCheck,
  return_protection: BadgeCheck, cell_phone: BadgeCheck,
  foreign_fee: AlertCircle,
};

function Alternative({ a, rank }: { a: CardAssessment; rank: number }) {
  return (
    <div className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-cmd-offwhite">
          {rank}. {a.profile.issuer} {a.profile.product}
        </p>
        <p className="font-mono text-sm text-cmd-offwhite">
          {money(a.annualNet)}<span className="text-xs text-cmd-muted">/yr net</span>
        </p>
      </div>
      <p className="mt-1 text-sm leading-6 text-cmd-muted">{a.profile.summary}</p>
      <p className="mt-2 text-xs text-cmd-muted">
        {a.profile.annualFee > 0 ? `${money(a.profile.annualFee)} fee` : 'No annual fee'}
        {a.usedBonuses.length > 0
          ? ` · ${a.usedBonuses.slice(0, 2).map((b) => `${b.rate}× ${b.label.toLowerCase()}`).join(', ')}`
          : ''}
        {' · '}
        {a.vsBaseline >= 0
          ? `${money(a.vsBaseline)} better than a no-fee ${BASELINE_RATE}% card`
          : `${money(Math.abs(a.vsBaseline))} worse than a no-fee ${BASELINE_RATE}% card`}
      </p>
    </div>
  );
}

export function CardProfilePanel({ issuer, product, totals, heldKeys = [], defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const profile: EarnProfile | null = matchProfile(issuer, product);
  const spend = Object.values(totals).reduce((a, b) => a + b, 0);

  if (!profile) {
    return (
      <div className="mt-4 rounded-2xl border border-cmd-border bg-cmd-black/30 p-4">
        <p className="text-sm text-cmd-muted">
          Command does not hold published terms for{' '}
          <span className="text-cmd-offwhite">{[issuer, product].filter(Boolean).join(' ') || 'this card'}</span>,
          so it cannot say what the card is good for or what it carries. The spending above still stands.
        </p>
      </div>
    );
  }

  const a = assessCard(profile, totals);
  const alternatives = spend > 0
    ? rankAlternatives(totals, [profile.key, ...heldKeys], 3).filter((x) => x.annualNet > a.annualNet)
    : [];

  return (
    <div className="mt-4 rounded-2xl border border-cmd-border bg-cmd-black/30">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 p-4 text-left">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cmd-gold" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-cmd-offwhite">
            {profile.issuer} {profile.product}
          </span>
          <span className="mt-0.5 block text-sm text-cmd-muted">{profile.summary}</span>
        </span>
        {open ? <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-cmd-muted" />
          : <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-cmd-muted" />}
      </button>

      {open && (
        <div className="space-y-5 border-t border-cmd-border p-4">
          {/* Judged against this household first. The generic list comes after. */}
          {spend > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">On your spending</p>
              <div className="mt-2 space-y-1.5">
                {a.usedBonuses.map((b) => (
                  <p key={b.category} className="text-sm text-cmd-muted">
                    <span className="text-cmd-offwhite">{b.rate}× {b.label.toLowerCase()}</span> —{' '}
                    {money(b.amount)} this period, worth about {money(b.annualValueOverBase)} a year
                    over the card&rsquo;s base rate.
                  </p>
                ))}
                {a.unusedBonuses.length > 0 && (
                  <p className="text-sm text-cmd-muted">
                    Nothing went through its{' '}
                    {a.unusedBonuses.map((b) => `${b.rate}× ${b.label.toLowerCase()}`).join(' or ')} bonus.
                  </p>
                )}
              </div>

              {profile.annualFee > 0 && (
                <p className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
                  a.feeExceedsBonusValue
                    ? 'border-amber-500/30 bg-amber-500/5 text-amber-200'
                    : 'border-cmd-border bg-cmd-black/40 text-cmd-muted'
                }`}>
                  {a.feeExceedsBonusValue
                    ? `Its bonuses returned about ${money(a.bonusValue)} a year on this spending, against a ${money(profile.annualFee)} fee.`
                    : `Its bonuses returned about ${money(a.bonusValue)} a year, covering the ${money(profile.annualFee)} fee.`}
                  {(profile.annualCredits ?? 0) > 0
                    && ` Credits of ${money(profile.annualCredits!)} can bring the fee to ${money(a.netFeeIfCreditsUsed)} — if you use them.`}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Strengths</p>
              <ul className="mt-2 space-y-1.5">
                {profile.strengths.map((t) => (
                  <li key={t} className="text-sm leading-6 text-cmd-muted">— {t}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Trade-offs</p>
              <ul className="mt-2 space-y-1.5">
                {profile.tradeoffs.map((t) => (
                  <li key={t} className="text-sm leading-6 text-cmd-muted">— {t}</li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">What it carries</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {profile.benefits.map((b) => {
                const Icon = BENEFIT_ICON[b.code] ?? BadgeCheck;
                const warn = b.code === 'foreign_fee';
                return (
                  <div key={b.code} className="flex gap-2">
                    <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${warn ? 'text-amber-300' : 'text-cmd-gold/70'}`} />
                    <p className="text-sm text-cmd-muted">
                      <span className={warn ? 'text-amber-200' : 'text-cmd-offwhite'}>{b.label}</span>
                      {' — '}{b.detail}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-5 text-cmd-muted/70">
              Protections carry conditions, limits and exclusions, and issuers change them. Treat this
              as a prompt to read your own benefits guide, not as cover you can rely on.
            </p>
          </div>

          {alternatives.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Worth comparing against</p>
              <p className="mt-1 text-xs text-cmd-muted">
                Ranked on what each would net you after its own fee, on a year of spending like this
                period&rsquo;s — not on headline rates.
              </p>
              <div className="mt-3 space-y-2">
                {alternatives.map((alt, i) => <Alternative key={alt.profile.key} a={alt} rank={i + 1} />)}
              </div>
            </div>
          )}

          <p className="text-xs leading-5 text-cmd-muted/70">
            Published terms as of {CATALOG_AS_OF}, points valued at a cent. Your account may differ —
            worth checking before moving spending or opening anything.
          </p>
        </div>
      )}
    </div>
  );
}
