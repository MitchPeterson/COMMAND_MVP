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
  /** One line on what the card is for. */
  summary: string;
  strengths: string[];
  /** What it costs you to hold it, beyond the fee. */
  tradeoffs: string[];
  /** Protections and perks that are not earning. */
  benefits: CardBenefit[];
  /**
   * Statement credits the card gives back each year. Subtracted from the fee
   * only when the user says they use them — an unused credit is not money.
   */
  annualCredits?: number;
}

export type BenefitCode =
  | 'extended_warranty' | 'purchase_protection' | 'return_protection'
  | 'travel_insurance' | 'trip_delay' | 'baggage' | 'rental_car'
  | 'lounge' | 'travel_credit' | 'statement_credit' | 'global_entry'
  | 'cell_phone' | 'no_foreign_fee' | 'foreign_fee';

export interface CardBenefit {
  code: BenefitCode;
  label: string;
  detail: string;
}

// Categories are the ones spending.ts produces, so a statement can be scored
// without a second vocabulary to keep in step.
export const CATALOG: EarnProfile[] = [
  { key: 'csp', benefits: [{"code": "extended_warranty", "label": "Extended warranty", "detail": "Adds a year to manufacturer warranties of three years or less"}, {"code": "purchase_protection", "label": "Purchase protection", "detail": "Covers new purchases against damage or theft for a limited window"}, {"code": "travel_insurance", "label": "Trip cancellation and interruption", "detail": "Reimburses prepaid travel when a covered reason stops the trip"}, {"code": "trip_delay", "label": "Trip delay cover", "detail": "Pays for meals and lodging when a delay runs long"}, {"code": "baggage", "label": "Baggage delay and loss", "detail": "Covers essentials when bags arrive late or not at all"}, {"code": "rental_car", "label": "Primary rental car cover", "detail": "Applies before your own auto policy, so a claim need not touch it"}, {"code": "no_foreign_fee", "label": "No foreign transaction fee", "detail": "Nothing added on purchases abroad"}], annualCredits: 50, summary: "A travel and dining card with a small fee and points that leave the ecosystem.", strengths: ["Points transfer to airline and hotel partners, which is where they beat a cent each", "Travel protections most no-fee cards do not carry", "A $95 fee is easy to cover for a household that travels at all"], tradeoffs: ["Best value needs you to transfer points rather than take cash", "Earns only 1\u00d7 outside its bonus categories"], issuer: 'Chase', issuerAliases: ['chase', 'jpmorgan'], product: 'Sapphire Preferred', annualFee: 95, base: 1,
    rates: { travel: 2, dining: 3, groceries: 3, entertainment: 1 },
    note: 'Higher on travel booked through the issuer portal.' },
  { key: 'csr', benefits: [{"code": "extended_warranty", "label": "Extended warranty", "detail": "Adds a year to manufacturer warranties of three years or less"}, {"code": "purchase_protection", "label": "Purchase protection", "detail": "Covers new purchases against damage or theft for a limited window"}, {"code": "travel_insurance", "label": "Trip cancellation and interruption", "detail": "Reimburses prepaid travel when a covered reason stops the trip"}, {"code": "trip_delay", "label": "Trip delay cover", "detail": "Pays for meals and lodging when a delay runs long"}, {"code": "baggage", "label": "Baggage delay and loss", "detail": "Covers essentials when bags arrive late or not at all"}, {"code": "rental_car", "label": "Primary rental car cover", "detail": "Applies before your own auto policy, so a claim need not touch it"}, {"code": "lounge", "label": "Airport lounge access", "detail": "Membership covering a wide lounge network"}, {"code": "travel_credit", "label": "Annual travel credit", "detail": "A statement credit against travel spending each year"}, {"code": "global_entry", "label": "Global Entry or TSA PreCheck credit", "detail": "Covers the application fee every few years"}, {"code": "no_foreign_fee", "label": "No foreign transaction fee", "detail": "Nothing added on purchases abroad"}], annualCredits: 300, summary: "Built for frequent travel, and priced like it.", strengths: ["Highest travel and dining earning in the Chase range", "Travel credit and lounge access can cover much of the fee", "Strongest travel insurance of the mainstream cards"], tradeoffs: ["$550 a year, which only works if the credits and lounges get used", "Overkill for a household that flies once or twice a year"], issuer: 'Chase', issuerAliases: ['chase', 'jpmorgan'], product: 'Sapphire Reserve', annualFee: 550, base: 1,
    rates: { travel: 3, dining: 3 },
    note: 'Carries a travel credit that offsets much of the fee if used.' },
  { key: 'freedom-unlimited', benefits: [{"code": "extended_warranty", "label": "Extended warranty", "detail": "Adds a year to manufacturer warranties of three years or less"}, {"code": "purchase_protection", "label": "Purchase protection", "detail": "Covers new purchases against damage or theft for a limited window"}, {"code": "foreign_fee", "label": "Foreign transaction fee", "detail": "A percentage is added to purchases abroad"}], summary: "A no-fee everyday card that earns 1.5\u00d7 on everything.", strengths: ["No annual fee and nothing to track", "Pairs with a Sapphire card, which lets its points transfer out"], tradeoffs: ["No standout category", "On its own the points are worth about a cent"], issuer: 'Chase', issuerAliases: ['chase', 'jpmorgan'], product: 'Freedom Unlimited', annualFee: 0, base: 1.5,
    rates: { dining: 3, health: 3 } },
  { key: 'bcp', benefits: [{"code": "purchase_protection", "label": "Purchase protection", "detail": "Covers new purchases against damage or theft for a limited window"}, {"code": "return_protection", "label": "Return protection", "detail": "Refunds an eligible item a retailer will not take back"}, {"code": "statement_credit", "label": "Category statement credits", "detail": "Monthly or annual credits against named merchants"}, {"code": "foreign_fee", "label": "Foreign transaction fee", "detail": "A percentage is added to purchases abroad"}], annualCredits: 84, summary: "The supermarket card. Little else comes close on groceries.", strengths: ["6% at US supermarkets is among the highest rates available anywhere", "6% on streaming and 3% on fuel and transit alongside it"], tradeoffs: ["The 6% stops after $6,000 of groceries a year, then drops to 1%", "$95 fee", "Cash back, so it cannot be transferred for outsized value", "American Express is not accepted everywhere"], issuer: 'American Express', issuerAliases: ['american express', 'amex'], product: 'Blue Cash Preferred', annualFee: 95, base: 1,
    rates: { groceries: 6, entertainment: 6, gas: 3, transport: 3 },
    caps: { groceries: 6000 },
    note: 'The 6% on supermarkets is capped at $6,000 of spend a year.' },
  { key: 'amex-gold', benefits: [{"code": "baggage", "label": "Baggage delay and loss", "detail": "Covers essentials when bags arrive late or not at all"}, {"code": "statement_credit", "label": "Category statement credits", "detail": "Monthly or annual credits against named merchants"}, {"code": "no_foreign_fee", "label": "No foreign transaction fee", "detail": "Nothing added on purchases abroad"}], annualCredits: 240, summary: "Dining and groceries at 4\u00d7, for households that spend heavily on both.", strengths: ["4\u00d7 on two of the largest everyday categories", "Points transfer to partners"], tradeoffs: ["The fee is only offset by credits that have to be actively used", "American Express acceptance", "Weak on travel booked directly"], issuer: 'American Express', issuerAliases: ['american express', 'amex'], product: 'Gold', annualFee: 325, base: 1,
    rates: { dining: 4, groceries: 4, travel: 3 },
    caps: { groceries: 25000 } },
  { key: 'amex-platinum', benefits: [{"code": "lounge", "label": "Airport lounge access", "detail": "Membership covering a wide lounge network"}, {"code": "travel_credit", "label": "Annual travel credit", "detail": "A statement credit against travel spending each year"}, {"code": "statement_credit", "label": "Category statement credits", "detail": "Monthly or annual credits against named merchants"}, {"code": "global_entry", "label": "Global Entry or TSA PreCheck credit", "detail": "Covers the application fee every few years"}, {"code": "travel_insurance", "label": "Trip cancellation and interruption", "detail": "Reimburses prepaid travel when a covered reason stops the trip"}, {"code": "baggage", "label": "Baggage delay and loss", "detail": "Covers essentials when bags arrive late or not at all"}, {"code": "no_foreign_fee", "label": "No foreign transaction fee", "detail": "Nothing added on purchases abroad"}], annualCredits: 600, summary: "A travel benefits card, not an earning card.", strengths: ["Lounge access and elite status that nothing else matches", "5\u00d7 on flights booked through the issuer"], tradeoffs: ["$695 a year", "Earns 1\u00d7 on almost all everyday spending", "Only worth holding if the credits are genuinely used"], issuer: 'American Express', issuerAliases: ['american express', 'amex'], product: 'Platinum', annualFee: 695, base: 1,
    rates: { travel: 5 },
    note: 'Built around credits and lounge access rather than everyday earning.' },
  { key: 'double-cash', benefits: [{"code": "foreign_fee", "label": "Foreign transaction fee", "detail": "A percentage is added to purchases abroad"}], summary: "2% on everything, no fee, nothing to think about.", strengths: ["No annual fee and no categories to track", "A sensible floor for any spending that has no bonus elsewhere"], tradeoffs: ["No category bonuses", "No travel protections"], issuer: 'Citi', issuerAliases: ['citi', 'citibank', 'citigroup'], product: 'Double Cash', annualFee: 0, base: 2, rates: {} },
  { key: 'custom-cash', benefits: [{"code": "foreign_fee", "label": "Foreign transaction fee", "detail": "A percentage is added to purchases abroad"}], summary: "5% on whichever category you spend most in that month.", strengths: ["Adapts automatically to where the spending goes", "No annual fee"], tradeoffs: ["The 5% applies to only $500 of spend a month", "Only one category benefits at a time"], issuer: 'Citi', issuerAliases: ['citi', 'citibank', 'citigroup'], product: 'Custom Cash', annualFee: 0, base: 1,
    rates: { groceries: 5, dining: 5, gas: 5, travel: 5 },
    caps: { groceries: 6000, dining: 6000, gas: 6000, travel: 6000 },
    note: 'Five percent applies to one top category each month, up to $500 of spend.' },
  { key: 'venture-x', benefits: [{"code": "lounge", "label": "Airport lounge access", "detail": "Membership covering a wide lounge network"}, {"code": "travel_credit", "label": "Annual travel credit", "detail": "A statement credit against travel spending each year"}, {"code": "rental_car", "label": "Primary rental car cover", "detail": "Applies before your own auto policy, so a claim need not touch it"}, {"code": "cell_phone", "label": "Cell phone protection", "detail": "Covers a damaged or stolen handset when the bill is on the card"}, {"code": "travel_insurance", "label": "Trip cancellation and interruption", "detail": "Reimburses prepaid travel when a covered reason stops the trip"}, {"code": "global_entry", "label": "Global Entry or TSA PreCheck credit", "detail": "Covers the application fee every few years"}, {"code": "no_foreign_fee", "label": "No foreign transaction fee", "detail": "Nothing added on purchases abroad"}], annualCredits: 300, summary: "Flat 2\u00d7 everywhere with travel benefits that offset the fee.", strengths: ["2\u00d7 on everything, so nothing needs sorting by category", "Travel credit and lounge access", "Miles transfer to partners"], tradeoffs: ["$395 a year, which needs the travel credit used to make sense"], issuer: 'Capital One', issuerAliases: ['capital one', 'capitalone'], product: 'Venture X', annualFee: 395, base: 2,
    rates: { travel: 5 } },
  { key: 'venture', benefits: [{"code": "global_entry", "label": "Global Entry or TSA PreCheck credit", "detail": "Covers the application fee every few years"}, {"code": "baggage", "label": "Baggage delay and loss", "detail": "Covers essentials when bags arrive late or not at all"}, {"code": "no_foreign_fee", "label": "No foreign transaction fee", "detail": "Nothing added on purchases abroad"}], summary: "Simple travel earning at 2\u00d7 with a small fee.", strengths: ["2\u00d7 on everything", "Miles transfer to partners"], tradeoffs: ["$95 fee for what a no-fee 2% card does on raw earning"], issuer: 'Capital One', issuerAliases: ['capital one', 'capitalone'], product: 'Venture', annualFee: 95, base: 2, rates: {} },
  { key: 'savor', benefits: [{"code": "extended_warranty", "label": "Extended warranty", "detail": "Adds a year to manufacturer warranties of three years or less"}, {"code": "no_foreign_fee", "label": "No foreign transaction fee", "detail": "Nothing added on purchases abroad"}], summary: "Dining and entertainment at 3%, with no fee.", strengths: ["No annual fee", "3% across dining, entertainment and groceries"], tradeoffs: ["Cash back rather than transferable points"], issuer: 'Capital One', issuerAliases: ['capital one', 'capitalone'], product: 'Savor', annualFee: 0, base: 1,
    rates: { dining: 3, entertainment: 3, groceries: 3 } },
  { key: 'active-cash', benefits: [{"code": "cell_phone", "label": "Cell phone protection", "detail": "Covers a damaged or stolen handset when the bill is on the card"}, {"code": "purchase_protection", "label": "Purchase protection", "detail": "Covers new purchases against damage or theft for a limited window"}, {"code": "foreign_fee", "label": "Foreign transaction fee", "detail": "A percentage is added to purchases abroad"}], summary: "2% on everything, no fee.", strengths: ["No annual fee", "Flat rate with nothing to track"], tradeoffs: ["No category bonuses"], issuer: 'Wells Fargo', issuerAliases: ['wells fargo', 'wf '], product: 'Active Cash', annualFee: 0, base: 2, rates: {} },
  { key: 'unlimited-cash', benefits: [{"code": "foreign_fee", "label": "Foreign transaction fee", "detail": "A percentage is added to purchases abroad"}], summary: "A flat-rate card that improves with a banking relationship.", strengths: ["Rate rises meaningfully with enough deposits at the same bank"], tradeoffs: ["1.5% base is below what several no-fee cards pay", "Only compelling alongside the bank's other accounts"], issuer: 'Bank of America', issuerAliases: ['bank of america', 'bofa', 'bankamerica'], product: 'Unlimited Cash Rewards', annualFee: 0, base: 1.5, rates: {} },
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

// ─────────────────────────────────────────────────────────────
// Judging a card against this household's spending
// ─────────────────────────────────────────────────────────────

/** The universally available floor: 2% on everything, no fee. Any card with an
 *  annual fee has to beat this to be worth holding, and most comparisons people
 *  read never make it. */
export const BASELINE_RATE = 2;

export interface BonusUse {
  category: string;
  label: string;
  /** Spend in this category over the statement. */
  amount: number;
  rate: number;
  /** What the bonus is worth over a year against the card's own base rate. */
  annualValueOverBase: number;
}

export interface CardAssessment {
  profile: EarnProfile;
  /** Earnings over a year, projecting this mix forward. */
  annualEarn: number;
  annualFee: number;
  /** Fee less the credits, which only counts if the credits get used. */
  netFeeIfCreditsUsed: number;
  annualNet: number;
  /** What a no-fee 2% card would net on the same spending. */
  baselineNet: number;
  vsBaseline: number;
  /** Bonus categories this household actually spends in, with what each is worth. */
  usedBonuses: BonusUse[];
  /** Bonus categories with no spending behind them at all. */
  unusedBonuses: Array<{ category: string; label: string; rate: number }>;
  /** What the bonuses are worth a year, against the fee they are behind. */
  bonusValue: number;
  /** True when the bonuses actually used do not cover the annual fee. */
  feeExceedsBonusValue: boolean;
}

const labelFor = (code: string) => categoryGroup(code).label;

export function assessCard(profile: EarnProfile, totals: CategoryTotals): CardAssessment {
  const monthly = earnOn(profile, totals, 1);
  const annualEarn = monthly * 12;
  const spendTotal = Object.values(totals).reduce((a, b) => a + b, 0);

  // Whether a bonus is "used" is the wrong question — $120 a month of groceries
  // is a real share of a small statement and still worth less than the fee it
  // sits behind. So each bonus carries what it is actually worth over a year
  // against the card's own base rate, and the judgement is left to that figure.
  const usedBonuses: BonusUse[] = [];
  const unusedBonuses: Array<{ category: string; label: string; rate: number }> = [];
  for (const [category, rate] of Object.entries(profile.rates)) {
    if (rate <= profile.base) continue;
    const amount = totals[category] ?? 0;
    if (amount <= 0) {
      unusedBonuses.push({ category, label: labelFor(category), rate });
      continue;
    }
    const cap = profile.caps?.[category];
    const bonused = cap != null ? Math.min(amount, cap / 12) : amount;
    usedBonuses.push({
      category, label: labelFor(category), amount, rate,
      annualValueOverBase: bonused * ((rate - profile.base) / 100) * 12,
    });
  }
  usedBonuses.sort((a, b) => b.annualValueOverBase - a.annualValueOverBase);
  const bonusValue = usedBonuses.reduce((sum, b) => sum + b.annualValueOverBase, 0);

  const netFeeIfCreditsUsed = Math.max(0, profile.annualFee - (profile.annualCredits ?? 0));
  const baselineNet = spendTotal * 12 * (BASELINE_RATE / 100);

  return {
    profile,
    annualEarn,
    annualFee: profile.annualFee,
    netFeeIfCreditsUsed,
    annualNet: annualEarn - profile.annualFee,
    baselineNet,
    vsBaseline: annualEarn - profile.annualFee - baselineNet,
    usedBonuses,
    unusedBonuses,
    bonusValue,
    feeExceedsBonusValue: profile.annualFee > 0 && bonusValue < profile.annualFee,
  };
}

/**
 * The cards worth considering for this mix, best first. Ranked on what the
 * household would net after the fee, not on the headline rate — a 5% category
 * behind a $695 fee loses to 2% and no fee for most people.
 */
export function rankAlternatives(
  totals: CategoryTotals,
  excludeKeys: string[] = [],
  limit = 3,
): CardAssessment[] {
  const skip = new Set(excludeKeys);
  return CATALOG
    .filter((c) => !skip.has(c.key))
    .map((c) => assessCard(c, totals))
    .sort((a, b) => b.annualNet - a.annualNet)
    .slice(0, limit);
}
