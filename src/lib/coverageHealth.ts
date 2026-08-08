// Coverage health.
//
// The grade answers one question: how well does this coverage fit THIS
// household? It is scored against net worth, home value, dependents and cash
// reserves — not against how complete the paperwork is.
//
// Gaps in documentation are reported separately, as assessment confidence. A
// household with excellent coverage and only declarations pages on file should
// still grade well; it just carries a caveat that exclusions were not visible.
//
// Thresholds are stated openly in each finding so the reasoning is auditable
// rather than a black-box number.

import type { HouseholdProfile, InsurancePolicy, InsurancePolicyExtraction } from './supabase';

export type FindingSeverity = 'critical' | 'attention' | 'info';

export interface CoverageFinding {
  severity: FindingSeverity;
  title: string;
  detail: string;
}

export interface CoverageHealthResult {
  score: number | null;
  grade: string;
  status: 'good' | 'review' | 'action_needed' | 'unknown';
  /** Adequacy of coverage for this household. Drives the grade. */
  findings: CoverageFinding[];
  /** What the documents could not tell us. Affects confidence, never the grade. */
  dataFindings: CoverageFinding[];
  confidence: 'high' | 'moderate' | 'limited';
  confidenceReason: string;
  totalPremium: number;
  byType: Record<string, number>;
}

const LIABILITY_TARGETS: Record<
  string,
  { extractionTypes: string[]; coverageCodes: string[]; policyTypes: string[]; label: string }
> = {
  home_liability: { extractionTypes: ['homeowners', 'renters'], coverageCodes: ['personal_liability'], policyTypes: ['home'], label: 'home' },
  auto_liability: { extractionTypes: ['auto'], coverageCodes: ['bodily_injury_liability', 'combined_single_limit'], policyTypes: ['auto'], label: 'auto' },
  boat_liability: { extractionTypes: ['boat'], coverageCodes: ['boat_liability', 'personal_liability'], policyTypes: ['other'], label: 'boat' },
  rv_liability: { extractionTypes: ['rv'], coverageCodes: ['rv_liability', 'personal_liability'], policyTypes: ['other'], label: 'RV' },
  motorcycle_liability: { extractionTypes: ['motorcycle'], coverageCodes: ['motorcycle_liability', 'bodily_injury_liability'], policyTypes: ['auto', 'other'], label: 'motorcycle' },
  rental_property_liability: { extractionTypes: ['homeowners', 'renters'], coverageCodes: ['personal_liability', 'rental_property_liability'], policyTypes: ['home'], label: 'rental property' },
};

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export function computeCoverageHealth(
  policies: InsurancePolicy[],
  extractions: InsurancePolicyExtraction[],
  profile?: HouseholdProfile | null,
): CoverageHealthResult {
  const findings: CoverageFinding[] = [];
  const dataFindings: CoverageFinding[] = [];
  const confirmed = extractions.filter((e) => e.review_status === 'confirmed');

  const totalPremium = policies.reduce((sum, p) => sum + (p.annual_premium ?? 0), 0);
  const byType = policies.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + 1;
    return acc;
  }, {});

  const netWorth = profile?.net_worth ?? null;
  const homeValue = profile?.home_value ?? null;
  const dependents = profile?.num_children ?? 0;
  const hasPartner = Boolean(profile?.partner_name);
  const emergencyFund = profile?.emergency_fund_status ?? null;

  const liabilityFor = (target: (typeof LIABILITY_TARGETS)[string]) => {
    const matching = confirmed.filter((e) => target.extractionTypes.includes(e.insurance_type));
    const limits = matching
      .flatMap((e) => e.insurance_coverages)
      .filter((c) => target.coverageCodes.includes(c.coverage_code) && c.limit_amount !== null)
      .map((c) => c.limit_amount as number);
    if (limits.length > 0) return { state: 'found' as const, limit: Math.max(...limits) };
    const hasPolicy = matching.length > 0 || policies.some((p) => target.policyTypes.includes(p.type));
    return hasPolicy ? { state: 'unverifiable' as const } : { state: 'absent' as const };
  };

  const umbrellas = confirmed.filter((e) => e.insurance_type === 'umbrella');
  const umbrellaLimit = umbrellas
    .flatMap((e) => e.insurance_coverages)
    .filter((c) => c.coverage_code === 'umbrella_liability' && c.limit_amount !== null)
    .reduce<number | null>((max, c) => Math.max(max ?? 0, c.limit_amount as number), null);
  const hasUmbrellaPolicy = umbrellas.length > 0 || policies.some((p) => p.type === 'umbrella');

  // ── Adequacy: does the coverage fit this household? ───────────────────────

  // 1. Liability capacity against net worth. Assets above the liability ceiling
  //    are what a judgment can reach, which is the exposure that matters.
  if (netWorth !== null && netWorth > 0) {
    const homeLiability = liabilityFor(LIABILITY_TARGETS.home_liability);
    const autoLiability = liabilityFor(LIABILITY_TARGETS.auto_liability);
    const underlying = Math.max(
      homeLiability.state === 'found' ? homeLiability.limit : 0,
      autoLiability.state === 'found' ? autoLiability.limit : 0,
    );
    const totalCapacity = (umbrellaLimit ?? 0) + underlying;

    if (!hasUmbrellaPolicy && netWorth >= 500_000) {
      findings.push({
        severity: netWorth >= 1_000_000 ? 'critical' : 'attention',
        title: `No umbrella policy against ${money(netWorth)} net worth`,
        detail:
          `Liability coverage tops out at ${underlying > 0 ? money(underlying) : 'the underlying policies'}, ` +
          `leaving assets above that exposed to a judgment. An umbrella is the usual way to close the distance.`,
      });
    } else if (umbrellaLimit !== null && totalCapacity < netWorth) {
      findings.push({
        severity: 'critical',
        title: `Liability capacity of ${money(totalCapacity)} sits below ${money(netWorth)} net worth`,
        detail:
          `The umbrella carries ${money(umbrellaLimit)} over ${money(underlying)} of underlying liability. ` +
          `The shortfall of ${money(netWorth - totalCapacity)} is the portion of net worth a large claim could reach.`,
      });
    }
  }

  // 2. Dwelling limit against home value.
  if (homeValue !== null && homeValue > 0) {
    const dwelling = confirmed
      .filter((e) => e.insurance_type === 'homeowners')
      .flatMap((e) => e.insurance_coverages)
      .find((c) => c.coverage_code === 'dwelling' && c.limit_amount !== null);

    if (dwelling?.limit_amount != null && dwelling.limit_amount < homeValue * 0.8) {
      findings.push({
        severity: dwelling.limit_amount < homeValue * 0.6 ? 'critical' : 'attention',
        title: `Dwelling coverage of ${money(dwelling.limit_amount)} against a ${money(homeValue)} home`,
        detail:
          `The dwelling limit is ${Math.round((dwelling.limit_amount / homeValue) * 100)}% of the home's stated value. ` +
          `Rebuild cost and market value differ, so this is worth confirming rather than assuming a shortfall.`,
      });
    }
  }

  // 3. Life cover where people depend on the income.
  if (dependents > 0 || hasPartner) {
    const hasLife = policies.some((p) => p.type === 'life') || confirmed.some((e) => e.insurance_type === 'life');
    if (!hasLife) {
      findings.push({
        severity: dependents > 0 ? 'attention' : 'info',
        title: 'No life policy on file',
        detail:
          `The household has ${dependents > 0 ? `${dependents} dependent${dependents === 1 ? '' : 's'}` : 'a partner'} ` +
          `and no life insurance recorded. Employer cover often exists but is not captured here — upload it if so.`,
      });
    }
  }

  // 4. Deductible exposure against cash reserves.
  const largestDeductible = confirmed
    .flatMap((e) => e.insurance_deductibles)
    .reduce<number | null>((max, d) => {
      const value = d.amount ?? d.calculated_amount;
      return value !== null && value !== undefined ? Math.max(max ?? 0, value) : max;
    }, null);

  if (largestDeductible !== null && (emergencyFund === 'none' || emergencyFund === 'under3')) {
    findings.push({
      severity: largestDeductible >= 5_000 ? 'attention' : 'info',
      title: `${money(largestDeductible)} largest deductible against a thin emergency fund`,
      detail:
        'The household reported less than three months of reserves. A claim would need that deductible in cash up front.',
    });
  }

  // 5. Umbrella prerequisites — a mismatch can void the cover you paid for.
  for (const umbrella of umbrellas) {
    for (const req of umbrella.insurance_underlying_requirements) {
      const target = LIABILITY_TARGETS[req.requirement_type];
      if (!target || req.required_limit === null) continue;
      const actual = liabilityFor(target);
      if (actual.state === 'found' && actual.limit < req.required_limit) {
        findings.push({
          severity: 'critical',
          title: `${target.label[0].toUpperCase()}${target.label.slice(1)} liability is below the umbrella requirement`,
          detail:
            `The umbrella requires ${money(req.required_limit)} underlying ${target.label} liability; the policy on file ` +
            `carries ${money(actual.limit)}. A shortfall can leave the umbrella unable to respond.`,
        });
      } else if (actual.state === 'absent') {
        findings.push({
          severity: 'attention',
          title: `Umbrella requires ${target.label} liability that is not on file`,
          detail: `It states a required underlying limit of ${money(req.required_limit)}, but no ${target.label} policy has been added.`,
        });
      }
    }
  }

  // 6. Lapsed or imminent renewals.
  const now = Date.now();
  for (const policy of policies) {
    if (!policy.renewal_date) continue;
    const renewal = new Date(policy.renewal_date).getTime();
    if (Number.isNaN(renewal)) continue;
    const days = Math.round((renewal - now) / 86_400_000);
    if (days < 0) {
      findings.push({
        severity: 'critical',
        title: `${policy.carrier ?? 'A policy'} shows a renewal date in the past`,
        detail: `Renewal was ${policy.renewal_date}. Either it has lapsed or a newer declarations page has not been uploaded.`,
      });
    } else if (days <= 45) {
      findings.push({
        severity: 'attention',
        title: `${policy.carrier ?? 'A policy'} renews in ${days} day${days === 1 ? '' : 's'}`,
        detail: `Renewal ${policy.renewal_date}. Worth comparing before it auto-renews.`,
      });
    }
  }

  // 7. Duplicates distort every total on this page.
  const seen = new Map<string, number>();
  for (const p of policies) {
    const key = `${p.carrier ?? ''}|${p.policy_number ?? ''}`.toLowerCase();
    if (key !== '|') seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const [key, count] of seen) {
    if (count > 1) {
      const [carrier, number] = key.split('|');
      findings.push({
        severity: 'attention',
        title: 'The same policy appears more than once',
        detail: `${carrier || 'Unknown carrier'}${number ? ` #${number}` : ''} is listed ${count} times, which inflates the premium total.`,
      });
    }
  }

  // ── Assessment confidence: what the documents could not tell us ───────────

  const decOnly = confirmed.filter((e) => e.declarations_only);
  if (decOnly.length > 0) {
    dataFindings.push({
      severity: 'info',
      title: `${decOnly.length} polic${decOnly.length === 1 ? 'y is' : 'ies are'} declarations pages only`,
      detail: 'Limits are high confidence, but exclusions, sublimits and endorsements were not in the documents provided.',
    });
  }
  for (const target of Object.values(LIABILITY_TARGETS)) {
    if (liabilityFor(target).state === 'unverifiable') {
      dataFindings.push({
        severity: 'info',
        title: `${target.label[0].toUpperCase()}${target.label.slice(1)} liability limit not found`,
        detail: `A ${target.label} policy is on file but its liability limit was not in the documents provided, so it could not be included in the assessment.`,
      });
    }
  }
  if (!profile || (profile.net_worth === null && profile.home_value === null)) {
    dataFindings.push({
      severity: 'info',
      title: 'Household financial profile is incomplete',
      detail: 'Net worth and home value drive most adequacy checks. Without them the grade reflects only what could be compared.',
    });
  }
  const withoutDocs = policies.length - confirmed.length;
  if (withoutDocs > 0) {
    dataFindings.push({
      severity: 'info',
      title: `${withoutDocs} polic${withoutDocs === 1 ? 'y has' : 'ies have'} no extracted document`,
      detail: 'Coverage-level checks cannot run on policies entered without a declarations page.',
    });
  }

  if (policies.length === 0) {
    return {
      score: null, grade: '—', status: 'unknown', findings, dataFindings,
      confidence: 'limited', confidenceReason: 'No policies on file yet.',
      totalPremium, byType,
    };
  }

  // Grade reflects adequacy only. Documentation gaps move confidence instead.
  const weights: Record<FindingSeverity, number> = { critical: 30, attention: 12, info: 4 };
  const penalty = findings.reduce((sum, f) => sum + weights[f.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const status = score >= 75 ? 'good' : score >= 60 ? 'review' : 'action_needed';

  const confidence: CoverageHealthResult['confidence'] =
    dataFindings.length === 0 ? 'high' : dataFindings.length <= 2 ? 'moderate' : 'limited';
  const confidenceReason =
    dataFindings.length === 0
      ? 'Full policy documents and household financials are on file.'
      : `${dataFindings.length} gap${dataFindings.length === 1 ? '' : 's'} in the documents limit how much could be checked.`;

  return { score, grade, status, findings, dataFindings, confidence, confidenceReason, totalPremium, byType };
}

export const gradeTone = (grade: string) =>
  grade === 'A' ? 'text-emerald-300'
  : grade === 'B' ? 'text-emerald-200'
  : grade === 'C' ? 'text-amber-300'
  : grade === 'D' ? 'text-orange-300'
  : grade === 'F' ? 'text-red-300'
  : 'text-cmd-muted';
