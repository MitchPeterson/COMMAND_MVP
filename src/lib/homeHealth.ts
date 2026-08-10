// Home health.
//
// Same question as the other scorers: how well does what this household has in
// place fit this household? Graded on what is about to need money and whether
// the house is a known quantity — not on how many appliances have been logged.
//
// Every threshold is stated in its finding. A furnace past its typical life is
// not a failure, it is a thing to have a number ready for, and the wording says
// that rather than implying the boiler is about to explode.

import type { HouseholdProfile } from './supabase';
import { outlookFor, replacementTimeline, computeEquity, type HomeSystemRow } from './homeSystems';

export type HomeFindingSeverity = 'critical' | 'attention' | 'info';

export interface HomeFinding {
  severity: HomeFindingSeverity;
  title: string;
  detail: string;
}

export interface HomeHealthResult {
  score: number | null;
  grade: string;
  status: 'good' | 'review' | 'action_needed' | 'unknown';
  findings: HomeFinding[];
  dataFindings: HomeFinding[];
  confidence: 'high' | 'moderate' | 'limited';
  confidenceReason: string;
  /** Likely replacement spend over the next five years. */
  fiveYearExposure: number;
  systemsTracked: number;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export function computeHomeHealth(
  systems: HomeSystemRow[],
  profile?: HouseholdProfile | null,
  mortgagePrincipal?: number | null,
): HomeHealthResult {
  const findings: HomeFinding[] = [];
  const dataFindings: HomeFinding[] = [];

  const outlooks = systems.map(outlookFor);
  const thisYear = new Date().getFullYear();
  const timeline = replacementTimeline(systems);
  const fiveYearExposure = timeline
    .filter((year) => year.year <= thisYear + 5)
    .reduce((sum, year) => sum + year.total, 0);

  // ── Past their service life ────────────────────────────────────────────────
  const past = outlooks.filter((o) => o.state === 'past_life');
  if (past.length > 0) {
    const total = past.reduce((sum, o) => sum + o.cost, 0);
    findings.push({
      severity: past.length >= 3 || total >= 20000 ? 'critical' : 'attention',
      title: `${past.length} system${past.length === 1 ? ' is' : 's are'} past typical service life`,
      detail:
        `${past.map((o) => o.system.name).join(', ')}. Together they would cost roughly ${money(total)} ` +
        `to replace at typical prices. Past its life does not mean about to fail — it means the money ` +
        `should be a known number rather than a surprise.`,
    });
  }

  // ── Landing soon ───────────────────────────────────────────────────────────
  const soon = outlooks.filter((o) => o.state === 'due_soon');
  if (soon.length > 0) {
    const total = soon.reduce((sum, o) => sum + o.cost, 0);
    findings.push({
      severity: 'attention',
      title: `${soon.length} system${soon.length === 1 ? '' : 's'} within two years of replacement`,
      detail: `${soon.map((o) => o.system.name).join(', ')} — roughly ${money(total)} at typical prices.`,
    });
  }

  // ── A single expensive year ────────────────────────────────────────────────
  const worstYear = timeline
    .filter((y) => y.year <= thisYear + 10)
    .reduce<{ year: number; total: number } | null>(
      (worst, y) => (worst === null || y.total > worst.total ? { year: y.year, total: y.total } : worst),
      null,
    );
  if (worstYear && worstYear.total >= 15000 && worstYear.year > thisYear) {
    findings.push({
      severity: 'info',
      title: `${worstYear.year} looks like an expensive year`,
      detail:
        `About ${money(worstYear.total)} of replacements land together. Staggering one of them, or ` +
        `setting money aside now, turns it into a plan rather than an emergency.`,
    });
  }

  // ── Warranties ─────────────────────────────────────────────────────────────
  const expiredWarranty = outlooks.filter((o) => o.warrantyState === 'expired' && o.state !== 'past_life');
  if (expiredWarranty.length > 0) {
    findings.push({
      severity: 'info',
      title: `${expiredWarranty.length} warrant${expiredWarranty.length === 1 ? 'y has' : 'ies have'} expired`,
      detail: `${expiredWarranty.map((o) => o.system.name).join(', ')} — repairs are now out of pocket.`,
    });
  }

  // ── Equity ─────────────────────────────────────────────────────────────────
  const equity = computeEquity(profile?.home_value ?? null, mortgagePrincipal ?? null);
  if (equity.loanToValue != null && equity.loanToValue > 80) {
    findings.push({
      severity: 'attention',
      title: `Loan-to-value is ${Math.round(equity.loanToValue)}%`,
      detail:
        'Above 80% is the range where private mortgage insurance usually applies. If it is on this loan ' +
        'and the value has risen, it may be worth asking the servicer to review it.',
    });
  }

  // ── What limits the assessment ─────────────────────────────────────────────
  const unknownAge = outlooks.filter((o) => o.state === 'unknown_age');
  if (unknownAge.length > 0) {
    dataFindings.push({
      severity: 'info',
      title: `${unknownAge.length} system${unknownAge.length === 1 ? '' : 's'} without an age`,
      detail:
        `${unknownAge.map((o) => o.system.name).join(', ')} cannot be placed on the timeline. An ` +
        `approximate age is enough.`,
    });
  }
  if (systems.length === 0) {
    dataFindings.push({
      severity: 'info',
      title: 'No systems recorded yet',
      detail: 'Add the furnace, water heater and roof first — they carry most of the cost.',
    });
  }
  if (!profile?.home_value) {
    dataFindings.push({
      severity: 'info',
      title: 'Home value is not recorded',
      detail: 'Equity and loan-to-value need it. It lives on your profile.',
    });
  }
  if (mortgagePrincipal == null) {
    dataFindings.push({
      severity: 'info',
      title: 'No mortgage on file',
      detail: 'Upload a statement, or add the loan by hand, and Command can show equity and the rate.',
    });
  }
  const userPriced = outlooks.filter((o) => o.costIsUserSet).length;
  if (systems.length > 0 && userPriced === 0) {
    dataFindings.push({
      severity: 'info',
      title: 'Replacement costs are typical figures, not quotes',
      detail:
        'Local labor moves these more than the equipment does. Any figure you enter yourself replaces ' +
        'the estimate everywhere it appears.',
    });
  }

  if (systems.length === 0 && mortgagePrincipal == null) {
    return {
      score: null, grade: '—', status: 'unknown', findings, dataFindings,
      confidence: 'limited', confidenceReason: 'Nothing recorded for the home yet.',
      fiveYearExposure: 0, systemsTracked: 0,
    };
  }

  const weights: Record<HomeFindingSeverity, number> = { critical: 30, attention: 12, info: 4 };
  const penalty = findings.reduce((sum, f) => sum + weights[f.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const status = score >= 75 ? 'good' : score >= 60 ? 'review' : 'action_needed';

  const confidence: HomeHealthResult['confidence'] =
    dataFindings.length === 0 ? 'high' : dataFindings.length <= 2 ? 'moderate' : 'limited';
  const confidenceReason =
    dataFindings.length === 0
      ? 'Systems, ages and the mortgage are all on file.'
      : `${dataFindings.length} gap${dataFindings.length === 1 ? '' : 's'} limit how much could be checked.`;

  return {
    score, grade, status, findings, dataFindings, confidence, confidenceReason,
    fiveYearExposure, systemsTracked: systems.length,
  };
}
