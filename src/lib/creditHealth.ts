// Credit health.
//
// The same question the other scorers ask: how well does this fit THIS
// household? Utilization is scored against the household's own limits and
// income, not against an abstract ideal, and every threshold is stated in the
// finding so the reasoning can be argued with.
//
// What this is not: a credit score, or a prediction of one. Command sees the
// cards on file, not a bureau file — no payment history, no account ages, no
// inquiries, no accounts it has not been told about. Findings say what is
// observable and stop there.

import type { CreditCard, HouseholdProfile } from './supabase';

export type CreditFindingSeverity = 'critical' | 'attention' | 'info';

export interface CreditFinding {
  severity: CreditFindingSeverity;
  title: string;
  detail: string;
}

export interface CreditHealthResult {
  score: number | null;
  grade: string;
  status: 'good' | 'review' | 'action_needed' | 'unknown';
  findings: CreditFinding[];
  dataFindings: CreditFinding[];
  confidence: 'high' | 'moderate' | 'limited';
  confidenceReason: string;
  totalLimit: number;
  totalBalance: number;
  /** Across all cards with a recorded limit. Null when none have one. */
  utilization: number | null;
  annualFees: number;
  rewardsYtd: number;
  cardCount: number;
}

// Utilization thresholds. 30% is the conventional line scoring models are said
// to react to; the rest are graded from there rather than invented.
const UTILIZATION_GOOD = 30;
const UTILIZATION_HIGH = 50;
const UTILIZATION_SEVERE = 80;
const PER_CARD_SEVERE = 90;

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const pct = (value: number) => `${Math.round(value)}%`;

/** Recorded utilization if there is one, otherwise derived from the balance. */
function cardUtilization(card: CreditCard): number | null {
  if (card.utilization_pct != null) return card.utilization_pct;
  if (card.credit_limit && card.credit_limit > 0 && card.current_balance != null) {
    return (card.current_balance / card.credit_limit) * 100;
  }
  return null;
}

export function computeCreditHealth(
  cards: CreditCard[],
  profile?: HouseholdProfile | null,
): CreditHealthResult {
  const findings: CreditFinding[] = [];
  const dataFindings: CreditFinding[] = [];

  const withLimits = cards.filter((c) => c.credit_limit != null && c.credit_limit > 0);
  const totalLimit = withLimits.reduce((sum, c) => sum + (c.credit_limit ?? 0), 0);
  const totalBalance = withLimits.reduce((sum, c) => sum + (c.current_balance ?? 0), 0);
  const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : null;
  const annualFees = cards.reduce((sum, c) => sum + (c.annual_fee ?? 0), 0);
  const rewardsYtd = cards.reduce((sum, c) => sum + (c.rewards_value_ytd ?? 0), 0);
  const income = profile?.household_income ?? null;

  // ── Overall utilization ────────────────────────────────────────────────────
  if (utilization != null) {
    if (utilization >= UTILIZATION_SEVERE) {
      findings.push({
        severity: 'critical',
        title: `Overall utilization is ${pct(utilization)}`,
        detail:
          `${money(totalBalance)} against ${money(totalLimit)} of limits. Above ${UTILIZATION_SEVERE}% is the ` +
          `range where balances are usually costing the most in interest and doing the most damage to a score.`,
      });
    } else if (utilization >= UTILIZATION_HIGH) {
      findings.push({
        severity: 'attention',
        title: `Overall utilization is ${pct(utilization)}`,
        detail:
          `${money(totalBalance)} against ${money(totalLimit)} of limits. Conventional guidance is to stay ` +
          `under ${UTILIZATION_GOOD}%.`,
      });
    } else if (utilization >= UTILIZATION_GOOD) {
      findings.push({
        severity: 'info',
        title: `Overall utilization is ${pct(utilization)}`,
        detail: `Just above the ${UTILIZATION_GOOD}% mark that scoring models are generally said to react to.`,
      });
    }
  }

  // ── Per card ───────────────────────────────────────────────────────────────
  for (const card of cards) {
    const cardPct = cardUtilization(card);
    if (cardPct != null && cardPct >= PER_CARD_SEVERE) {
      findings.push({
        severity: 'attention',
        title: `${card.card_name} is at ${pct(cardPct)} of its limit`,
        detail:
          'A single card near its limit can weigh on a score even when the overall picture is healthy, ' +
          'because per-card utilization is looked at separately.',
      });
    }
  }

  // ── Balances against income ────────────────────────────────────────────────
  if (income && income > 0 && totalBalance > income * 0.1) {
    findings.push({
      severity: totalBalance > income * 0.2 ? 'attention' : 'info',
      title: `Card balances are ${pct((totalBalance / income) * 100)} of household income`,
      detail:
        `${money(totalBalance)} against ${money(income)} of income. Revolving balances at this level are ` +
        `usually worth a payoff plan rather than a minimum payment.`,
    });
  }

  // ── Fees against rewards ───────────────────────────────────────────────────
  if (annualFees > 0 && rewardsYtd > 0 && annualFees > rewardsYtd) {
    findings.push({
      severity: 'info',
      title: 'Annual fees exceed the rewards recorded this year',
      detail:
        `${money(annualFees)} in fees against ${money(rewardsYtd)} of rewards year to date. Worth checking ` +
        `whether the benefits you actually use cover the difference.`,
    });
  }

  // ── What limits the assessment ─────────────────────────────────────────────
  const missingLimits = cards.length - withLimits.length;
  if (missingLimits > 0) {
    dataFindings.push({
      severity: 'info',
      title: `${missingLimits} card${missingLimits === 1 ? ' has' : 's have'} no credit limit recorded`,
      detail: 'Utilization cannot be worked out without a limit, so those cards are left out of the total.',
    });
  }
  if (cards.length > 0 && cards.every((c) => c.current_balance == null)) {
    dataFindings.push({
      severity: 'info',
      title: 'No balances recorded',
      detail: 'Utilization is the core of this assessment and it needs balances to calculate.',
    });
  }
  if (!income) {
    dataFindings.push({
      severity: 'info',
      title: 'Household income is not recorded',
      detail: 'Balances are weighed against income; without it that check is skipped. Add it on your profile.',
    });
  }
  dataFindings.push({
    severity: 'info',
    title: 'Command sees the cards on file, not your credit report',
    detail:
      'Payment history, account ages, inquiries and any account not recorded here are not part of this. ' +
      'This is a view of what you have told Command, not a credit score.',
  });

  if (cards.length === 0) {
    return {
      score: null,
      grade: '—',
      status: 'unknown',
      findings,
      dataFindings: [],
      confidence: 'limited',
      confidenceReason: 'No cards on file yet.',
      totalLimit: 0,
      totalBalance: 0,
      utilization: null,
      annualFees: 0,
      rewardsYtd: 0,
      cardCount: 0,
    };
  }

  // Same weighting as the other scorers: fit drives the grade, documentation
  // gaps move confidence instead.
  const weights: Record<CreditFindingSeverity, number> = { critical: 30, attention: 12, info: 4 };
  const penalty = findings.reduce((sum, f) => sum + weights[f.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const status = score >= 75 ? 'good' : score >= 60 ? 'review' : 'action_needed';

  // The bureau caveat is always present, so it does not count against confidence.
  const realGaps = dataFindings.length - 1;
  const confidence: CreditHealthResult['confidence'] =
    realGaps <= 0 ? 'high' : realGaps <= 2 ? 'moderate' : 'limited';
  const confidenceReason =
    realGaps <= 0
      ? 'Limits, balances and household income are all on file.'
      : `${realGaps} gap${realGaps === 1 ? '' : 's'} limit how much could be checked.`;

  return {
    score,
    grade,
    status,
    findings,
    dataFindings,
    confidence,
    confidenceReason,
    totalLimit,
    totalBalance,
    utilization,
    annualFees,
    rewardsYtd,
    cardCount: cards.length,
  };
}
