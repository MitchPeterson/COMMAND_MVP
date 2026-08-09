// Rewards strategy, computed from the household's own statements.
//
// Everything in this file is arithmetic on data the user uploaded. No card
// catalog, no market data, no assumptions about what a card "should" earn — the
// effective rate of a card is what its own statements say it earned, and the
// cost of putting spend on the wrong card is the difference between two rates
// the household can verify.
//
// The one thing it will not do is compare a card the household holds against a
// card it does not. That needs outside data, it lives in the research path, and
// it is labeled as unverified there. Keeping the two apart is the point: a
// number grounded in a statement and a number read off a web page should never
// sit in the same list looking alike.

import type { CreditCard, CreditStatement, CreditTransaction } from './supabase';

export interface CategorySpend {
  category: string;
  total: number;
  share: number;
  /** How much of this category was AI-classified rather than issuer-printed. */
  aiClassifiedShare: number;
  transactions: number;
}

export interface CardPerformance {
  card: CreditCard;
  purchases: number;
  rewardsEarned: number;
  /** Rewards earned per dollar spent, from the statements on file. */
  effectiveRate: number | null;
  interestCharged: number;
  feesCharged: number;
  annualFee: number | null;
  statementCount: number;
}

export type StrategySeverity = 'critical' | 'attention' | 'info';

export interface StrategyFinding {
  severity: StrategySeverity;
  title: string;
  detail: string;
  /** Dollars per year, when the finding is quantifiable. */
  annualImpact: number | null;
}

export interface RewardsStrategyResult {
  categories: CategorySpend[];
  cards: CardPerformance[];
  findings: StrategyFinding[];
  totalPurchases: number;
  totalRewardsValue: number;
  totalInterest: number;
  /** Statement periods on file, which bounds how far any of this can be trusted. */
  periodsCovered: number;
  confidence: 'high' | 'moderate' | 'limited';
  confidenceReason: string;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

/**
 * A rewards balance is points, not dollars, and the conversion depends on the
 * program and how they are redeemed. One cent per point is the common floor for
 * cash redemption; it is stated openly wherever it is used rather than being
 * quietly baked into a number.
 */
export const POINT_VALUE_USD = 0.01;

export function rewardsValueOf(points: number | null | undefined): number {
  return (points ?? 0) * POINT_VALUE_USD;
}

export function computeRewardsStrategy(
  cards: CreditCard[],
  statements: CreditStatement[],
  transactions: CreditTransaction[],
): RewardsStrategyResult {
  const findings: StrategyFinding[] = [];

  // Only confirmed statements count. An unreviewed reading is not a fact about
  // the household yet, and strategy built on it would move when they correct it.
  const confirmed = statements.filter(
    (s) => s.review_status === 'confirmed' || s.review_status === 'partially_confirmed',
  );
  const confirmedIds = new Set(confirmed.map((s) => s.id));
  const charges = transactions.filter((t) => t.direction === 'charge' && confirmedIds.has(t.statement_id));

  // ── Where the money goes ───────────────────────────────────────────────────
  const byCategory = new Map<string, { total: number; count: number; ai: number }>();
  for (const tx of charges) {
    if (tx.amount == null) continue;
    const key = tx.category?.toLowerCase() ?? 'uncategorized';
    const entry = byCategory.get(key) ?? { total: 0, count: 0, ai: 0 };
    entry.total += tx.amount;
    entry.count += 1;
    if (tx.category_source === 'ai_classified') entry.ai += tx.amount;
    byCategory.set(key, entry);
  }

  const totalPurchases = [...byCategory.values()].reduce((sum, e) => sum + e.total, 0);
  const categories: CategorySpend[] = [...byCategory.entries()]
    .map(([category, entry]) => ({
      category,
      total: entry.total,
      share: totalPurchases > 0 ? entry.total / totalPurchases : 0,
      aiClassifiedShare: entry.total > 0 ? entry.ai / entry.total : 0,
      transactions: entry.count,
    }))
    .sort((a, b) => b.total - a.total);

  // ── What each card actually earns ──────────────────────────────────────────
  const cardPerformance: CardPerformance[] = cards.map((card) => {
    const own = confirmed.filter((s) => s.credit_card_id === card.id);
    const purchases = own.reduce((sum, s) => sum + (s.purchases ?? 0), 0);
    const rewardsEarned = own.reduce((sum, s) => sum + (s.rewards_earned ?? 0), 0);
    const interestCharged = own.reduce((sum, s) => sum + (s.interest_charged ?? 0), 0);
    const feesCharged = own.reduce((sum, s) => sum + (s.fees_charged ?? 0), 0);

    return {
      card,
      purchases,
      rewardsEarned,
      // Value per dollar, not points per dollar — comparable across programs.
      effectiveRate: purchases > 0 && rewardsEarned > 0 ? rewardsValueOf(rewardsEarned) / purchases : null,
      interestCharged,
      feesCharged,
      annualFee: card.annual_fee ?? null,
      statementCount: own.length,
    };
  });

  const totalRewardsValue = cardPerformance.reduce((sum, c) => sum + rewardsValueOf(c.rewardsEarned), 0);
  const totalInterest = cardPerformance.reduce((sum, c) => sum + c.interestCharged, 0);

  // ── Interest against rewards ───────────────────────────────────────────────
  // The most valuable thing here, and the one nobody selling a rewards card
  // says out loud.
  if (totalInterest > 0 && totalInterest >= totalRewardsValue) {
    const perYear = (totalInterest - totalRewardsValue) * (12 / Math.max(confirmed.length, 1));
    findings.push({
      severity: 'critical',
      title: 'Interest is outrunning rewards',
      detail:
        `Across the statements on file you paid ${money(totalInterest)} in interest and earned about ` +
        `${money(totalRewardsValue)} in rewards. Until the balance is cleared, which card earns the most ` +
        `is the smaller question — carrying it costs more than any card returns.`,
      annualImpact: -Math.round(perYear),
    });
  }

  // ── Spend on the wrong card ────────────────────────────────────────────────
  const rated = cardPerformance.filter((c) => c.effectiveRate != null && c.purchases > 0);
  if (rated.length >= 2) {
    const best = rated.reduce((a, b) => ((a.effectiveRate ?? 0) > (b.effectiveRate ?? 0) ? a : b));
    for (const card of rated) {
      if (card.card.id === best.card.id) continue;
      const gap = (best.effectiveRate ?? 0) - (card.effectiveRate ?? 0);
      // A rounding-error difference is not a finding.
      if (gap < 0.005 || card.purchases < 500) continue;

      const periodGain = gap * card.purchases;
      const annual = periodGain * (12 / Math.max(card.statementCount, 1));
      findings.push({
        severity: annual >= 250 ? 'attention' : 'info',
        title: `${card.card.card_name} earns ${(gap * 100).toFixed(1)}% less than ${best.card.card_name}`,
        detail:
          `${money(card.purchases)} of purchases went on a card returning ` +
          `${((card.effectiveRate ?? 0) * 100).toFixed(1)}%, while ${best.card.card_name} returned ` +
          `${((best.effectiveRate ?? 0) * 100).toFixed(1)}% over the same statements. Moving that spend ` +
          `would have earned about ${money(periodGain)} more.`,
        annualImpact: Math.round(annual),
      });
    }
  }

  // ── Fees against what they returned ────────────────────────────────────────
  for (const card of cardPerformance) {
    if (!card.annualFee || card.annualFee <= 0) continue;
    const annualRewards = rewardsValueOf(card.rewardsEarned) * (12 / Math.max(card.statementCount, 1));
    if (annualRewards < card.annualFee) {
      findings.push({
        severity: 'attention',
        title: `${card.card.card_name} costs more in fees than it returned`,
        detail:
          `A ${money(card.annualFee)} annual fee against roughly ${money(annualRewards)} of rewards a year ` +
          `at this rate of spend. Benefits you use — lounge access, credits, insurance — may still justify ` +
          `it; Command cannot see those.`,
        annualImpact: Math.round(annualRewards - card.annualFee),
      });
    }
  }

  // ── Concentration ──────────────────────────────────────────────────────────
  const uncategorized = categories.find((c) => c.category === 'uncategorized');
  if (uncategorized && uncategorized.share > 0.25) {
    findings.push({
      severity: 'info',
      title: `${Math.round(uncategorized.share * 100)}% of spend is uncategorized`,
      detail:
        'Category-level strategy is only as good as the categories. Correcting these on the statement ' +
        'review screen sharpens everything below.',
      annualImpact: null,
    });
  }

  const aiShare = charges.length > 0
    ? charges.filter((t) => t.category_source === 'ai_classified').length / charges.length
    : 0;

  const confidence: RewardsStrategyResult['confidence'] =
    confirmed.length === 0 ? 'limited' : confirmed.length >= 3 && aiShare < 0.5 ? 'high' : 'moderate';

  const confidenceReason =
    confirmed.length === 0
      ? 'No confirmed statements yet.'
      : `${confirmed.length} statement period${confirmed.length === 1 ? '' : 's'} on file` +
        (aiShare > 0 ? `, ${Math.round(aiShare * 100)}% of transactions categorized by Command rather than the issuer.` : '.');

  return {
    categories,
    cards: cardPerformance,
    findings: findings.sort((a, b) => Math.abs(b.annualImpact ?? 0) - Math.abs(a.annualImpact ?? 0)),
    totalPurchases,
    totalRewardsValue,
    totalInterest,
    periodsCovered: confirmed.length,
    confidence,
    confidenceReason,
  };
}
