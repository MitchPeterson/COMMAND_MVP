// Is this the right card for what you actually buy?
//
// The existing strategy engine compares the household's cards against each other
// by measured return — rewards divided by purchases. That answers "which of mine
// did best" and cannot answer the question people actually have, which is
// whether the spending is on the right card at all. To answer that you need to
// know what a card earns per category, and nothing in Command knew.
//
// Hence a reference table. Its limits, stated plainly because they matter:
//
//   * These are published headline rates, not the terms of anyone's account.
//     Issuers change them, run promotions, and vary them by product generation.
//     Everything here is framed as "worth checking", never as a promise.
//   * Points are valued at a cent. Transfer partners can beat that and cash
//     redemption often does worse; a single assumption stated once is more
//     honest than a precision nobody can hold.
//   * Category caps are noted where they change the answer, and applied where
//     the cap is a headline part of the product.
//
// It is a reference table maintained by hand, and it will drift. The date is on
// it for that reason.

import type { CreditCard, CreditTransaction } from './supabase';
import { categoryGroup } from './spending';

export const CATALOG_AS_OF = '2026-08';

/** A cent a point. Stated once, used everywhere. */
export const POINT_VALUE = 0.01;

export interface EarnProfile {
  key: string;
  issuer: string;
  /** How the issuer appears on a statement. "AMEX" and "American Express" are
   *  the same bank and neither contains the other. */
  issuerAliases: string[];
  product: string;
  annualFee: number;
  /** Multiplier per spending category, in points or percent — both are ×1%. */
  rates: Record<string, number>;
  base: number;
  /** Annual spend caps that materially change the maths, by category. */
  caps?: Record<string, number>;
  note?: string;
}

// Categories are the ones spending.ts produces, so a statement can be scored
// without a second vocabulary to keep in step.
export const CATALOG: EarnProfile[] = [
  { key: 'csp', issuer: 'Chase', issuerAliases: ['chase', 'jpmorgan'], product: 'Sapphire Preferred', annualFee: 95, base: 1,
    rates: { travel: 2, dining: 3, groceries: 3, entertainment: 1 },
    note: 'Higher on travel booked through the issuer portal.' },
  { key: 'csr', issuer: 'Chase', issuerAliases: ['chase', 'jpmorgan'], product: 'Sapphire Reserve', annualFee: 550, base: 1,
    rates: { travel: 3, dining: 3 },
    note: 'Carries a travel credit that offsets much of the fee if used.' },
  { key: 'freedom-unlimited', issuer: 'Chase', issuerAliases: ['chase', 'jpmorgan'], product: 'Freedom Unlimited', annualFee: 0, base: 1.5,
    rates: { dining: 3, health: 3 } },
  { key: 'bcp', issuer: 'American Express', issuerAliases: ['american express', 'amex'], product: 'Blue Cash Preferred', annualFee: 95, base: 1,
    rates: { groceries: 6, entertainment: 6, gas: 3, transport: 3 },
    caps: { groceries: 6000 },
    note: 'The 6% on supermarkets is capped at $6,000 of spend a year.' },
  { key: 'amex-gold', issuer: 'American Express', issuerAliases: ['american express', 'amex'], product: 'Gold', annualFee: 325, base: 1,
    rates: { dining: 4, groceries: 4, travel: 3 },
    caps: { groceries: 25000 } },
  { key: 'amex-platinum', issuer: 'American Express', issuerAliases: ['american express', 'amex'], product: 'Platinum', annualFee: 695, base: 1,
    rates: { travel: 5 },
    note: 'Built around credits and lounge access rather than everyday earning.' },
  { key: 'double-cash', issuer: 'Citi', issuerAliases: ['citi', 'citibank', 'citigroup'], product: 'Double Cash', annualFee: 0, base: 2, rates: {} },
  { key: 'custom-cash', issuer: 'Citi', issuerAliases: ['citi', 'citibank', 'citigroup'], product: 'Custom Cash', annualFee: 0, base: 1,
    rates: { groceries: 5, dining: 5, gas: 5, travel: 5 },
    caps: { groceries: 6000, dining: 6000, gas: 6000, travel: 6000 },
    note: 'Five percent applies to one top category each month, up to $500 of spend.' },
  { key: 'venture-x', issuer: 'Capital One', issuerAliases: ['capital one', 'capitalone'], product: 'Venture X', annualFee: 395, base: 2,
    rates: { travel: 5 } },
  { key: 'venture', issuer: 'Capital One', issuerAliases: ['capital one', 'capitalone'], product: 'Venture', annualFee: 95, base: 2, rates: {} },
  { key: 'savor', issuer: 'Capital One', issuerAliases: ['capital one', 'capitalone'], product: 'Savor', annualFee: 0, base: 1,
    rates: { dining: 3, entertainment: 3, groceries: 3 } },
  { key: 'active-cash', issuer: 'Wells Fargo', issuerAliases: ['wells fargo', 'wf '], product: 'Active Cash', annualFee: 0, base: 2, rates: {} },
  { key: 'unlimited-cash', issuer: 'Bank of America', issuerAliases: ['bank of america', 'bofa', 'bankamerica'], product: 'Unlimited Cash Rewards', annualFee: 0, base: 1.5, rates: {} },
];

const normalize = (value: string | null | undefined) =>
  (value ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Matches a household card against the table. Deliberately conservative: a wrong
 * match produces confident nonsense about rates the user does not have, which is
 * worse than admitting the card is unrecognized.
 */
export function matchProfile(issuer: string | null | undefined, product: string | null | undefined): EarnProfile | null {
  const hay = `${normalize(issuer)} ${normalize(product)}`.trim();
  if (!hay) return null;

  let best: { profile: EarnProfile; score: number } | null = null;
  for (const profile of CATALOG) {
    // The issuer must match. Product names alone are far too generic — a credit
    // union's "Platinum Visa" matched American Express Platinum on one word and
    // would have been scored against rates the household does not have. A card
    // is identified by who issues it and what it is called, never the second
    // alone.
    if (!profile.issuerAliases.some((alias) => hay.includes(alias))) continue;

    const words = normalize(profile.product).split(' ').filter((w) => w.length > 2);
    if (words.length === 0) continue;
    if (!words.every((w) => hay.includes(w))) continue;

    // Longer product names are more specific, so Sapphire Reserve beats a
    // hypothetical bare "Sapphire" rather than the order of the table deciding.
    const score = words.length;
    if (!best || score > best.score) best = { profile, score };
  }
  return best?.profile ?? null;
}

export interface CategoryTotals { [category: string]: number }

/** What a profile would return on a given mix, in dollars. */
export function earnOn(profile: EarnProfile, totals: CategoryTotals, months = 1): number {
  let value = 0;
  for (const [category, amount] of Object.entries(totals)) {
    if (amount <= 0) continue;
    const rate = profile.rates[category] ?? profile.base;
    const cap = profile.caps?.[category];
    if (cap != null) {
      // Caps are annual; a single statement gets its share of the allowance.
      const allowed = Math.min(amount, (cap / 12) * months);
      value += allowed * (rate / 100) + (amount - allowed) * (profile.base / 100);
    } else {
      value += amount * (rate / 100);
    }
  }
  return value;
}

export interface CategoryFit {
  category: string;
  label: string;
  amount: number;
  /** Rate on the card it was actually put on. */
  usedRate: number;
  /** The best rate among cards the household already holds. */
  bestHeldRate: number;
  bestHeldCard: string | null;
  /** What the difference is worth over this statement. */
  leftOnTable: number;
}

export interface CardFitResult {
  /** Null when the card is not in the reference table. */
  profile: EarnProfile | null;
  totals: CategoryTotals;
  totalSpend: number;
  /** What this statement earned on the card it was on. */
  earnedHere: number;
  effectiveRate: number;
  /** Per category, whether a card already in the wallet would have done better. */
  misallocation: CategoryFit[];
  misallocationTotal: number;
  /** The best alternative in the reference table, net of its fee. */
  betterCard: { profile: EarnProfile; earns: number; gainPerYear: number } | null;
  /** Interest charged against rewards earned — the finding that outranks all of them. */
  interestCharged: number;
  rewardsValue: number;
}

/**
 * Analyses one statement's transactions. Works on an unconfirmed reading, which
 * is the point: the transaction list is the most informative thing Command gets
 * about a household's spending, and holding all of its value behind a
 * confirmation step is why a statement could be read and feel like it produced
 * nothing.
 */
export function analyzeStatementFit(
  transactions: CreditTransaction[],
  issuer: string | null | undefined,
  product: string | null | undefined,
  heldCards: CreditCard[] = [],
  interestCharged = 0,
  rewardsEarnedPoints: number | null = null,
): CardFitResult {
  const totals: CategoryTotals = {};
  for (const t of transactions) {
    if (t.direction !== 'charge' || t.amount == null) continue;
    const group = categoryGroup(t.category);
    // Fees, interest and cash advances are not purchases and earn nothing.
    if (['fees', 'cash'].includes(group.code)) continue;
    totals[group.code] = (totals[group.code] ?? 0) + Number(t.amount);
  }
  const totalSpend = Object.values(totals).reduce((a, b) => a + b, 0);

  const profile = matchProfile(issuer, product);
  const earnedHere = profile ? earnOn(profile, totals) : 0;

  // What the rest of the wallet could have earned, category by category.
  const heldProfiles = heldCards
    .map((c) => ({ card: c, profile: matchProfile(c.issuer, c.card_name) }))
    .filter((x): x is { card: CreditCard; profile: EarnProfile } => Boolean(x.profile));

  const misallocation: CategoryFit[] = [];
  if (profile) {
    for (const [category, amount] of Object.entries(totals)) {
      const usedRate = profile.rates[category] ?? profile.base;
      let bestHeldRate = usedRate;
      let bestHeldCard: string | null = null;
      for (const held of heldProfiles) {
        if (held.profile.key === profile.key) continue;
        const rate = held.profile.rates[category] ?? held.profile.base;
        if (rate > bestHeldRate) {
          bestHeldRate = rate;
          bestHeldCard = held.card.card_name;
        }
      }
      if (bestHeldCard && bestHeldRate > usedRate) {
        misallocation.push({
          category,
          label: categoryGroup(category).label,
          amount,
          usedRate,
          bestHeldRate,
          bestHeldCard,
          leftOnTable: amount * ((bestHeldRate - usedRate) / 100),
        });
      }
    }
  }
  misallocation.sort((a, b) => b.leftOnTable - a.leftOnTable);

  // Is there a better card for this mix? Judged over a year and net of the fee
  // difference, because a card that earns more and costs more may not be better.
  let betterCard: CardFitResult['betterCard'] = null;
  if (totalSpend > 0) {
    const heldKeys = new Set(heldProfiles.map((h) => h.profile.key));
    const currentAnnual = (profile ? earnOn(profile, totals, 1) : 0) * 12 - (profile?.annualFee ?? 0);
    for (const candidate of CATALOG) {
      if (candidate.key === profile?.key || heldKeys.has(candidate.key)) continue;
      const annual = earnOn(candidate, totals, 1) * 12 - candidate.annualFee;
      const gain = annual - currentAnnual;
      if (gain > 0 && (!betterCard || gain > betterCard.gainPerYear)) {
        betterCard = { profile: candidate, earns: annual, gainPerYear: gain };
      }
    }
  }

  return {
    profile,
    totals,
    totalSpend,
    earnedHere,
    effectiveRate: totalSpend > 0 ? (earnedHere / totalSpend) * 100 : 0,
    misallocation,
    misallocationTotal: misallocation.reduce((sum, m) => sum + m.leftOnTable, 0),
    betterCard,
    interestCharged,
    rewardsValue: rewardsEarnedPoints != null ? rewardsEarnedPoints * POINT_VALUE : earnedHere,
  };
}
