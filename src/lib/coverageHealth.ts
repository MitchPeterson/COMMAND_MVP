// Coverage health: findings and a score derived from the policies and extracted
// documents on file.
//
// Everything here is an observation traceable to a document. It deliberately
// stops short of advice — whether a gap matters depends on net worth, dependents
// and risk tolerance that this layer does not have.

import type { InsurancePolicy, InsurancePolicyExtraction } from './supabase';

export type FindingSeverity = 'critical' | 'attention' | 'info';

export interface CoverageFinding {
  severity: FindingSeverity;
  title: string;
  detail: string;
}

export interface CoverageHealthResult {
  score: number | null;          // null when there is nothing to assess
  grade: string;                 // A–F, or '—'
  status: 'good' | 'review' | 'action_needed' | 'unknown';
  findings: CoverageFinding[];
  totalPremium: number;
  byType: Record<string, number>;
}

/**
 * Umbrella requirements name a liability kind; policies and extractions label the
 * same thing three different ways. requirement_type is home_liability, the
 * extraction's insurance_type is 'homeowners', and insurance_policies.type is
 * 'home'. Matching on any one of those alone silently fails — which is exactly
 * what made a home policy on file report as missing.
 */
const LIABILITY_TARGETS: Record<
  string,
  { extractionTypes: string[]; coverageCodes: string[]; policyTypes: string[]; label: string }
> = {
  home_liability: {
    extractionTypes: ['homeowners', 'renters'],
    coverageCodes: ['personal_liability'],
    policyTypes: ['home'],
    label: 'home',
  },
  auto_liability: {
    extractionTypes: ['auto'],
    coverageCodes: ['bodily_injury_liability', 'combined_single_limit'],
    policyTypes: ['auto'],
    label: 'auto',
  },
  boat_liability: {
    extractionTypes: ['boat'],
    coverageCodes: ['boat_liability', 'personal_liability'],
    policyTypes: ['other'],
    label: 'boat',
  },
  rv_liability: {
    extractionTypes: ['rv'],
    coverageCodes: ['rv_liability', 'personal_liability'],
    policyTypes: ['other'],
    label: 'RV',
  },
  motorcycle_liability: {
    extractionTypes: ['motorcycle'],
    coverageCodes: ['motorcycle_liability', 'bodily_injury_liability'],
    policyTypes: ['auto', 'other'],
    label: 'motorcycle',
  },
  rental_property_liability: {
    extractionTypes: ['homeowners', 'renters'],
    coverageCodes: ['personal_liability', 'rental_property_liability'],
    policyTypes: ['home'],
    label: 'rental property',
  },
};

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export function computeCoverageHealth(
  policies: InsurancePolicy[],
  extractions: InsurancePolicyExtraction[],
): CoverageHealthResult {
  const findings: CoverageFinding[] = [];
  const confirmed = extractions.filter((e) => e.review_status === 'confirmed');

  const totalPremium = policies.reduce((sum, p) => sum + (p.annual_premium ?? 0), 0);
  const byType = policies.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + 1;
    return acc;
  }, {});

  /** Three distinct answers: no such policy, a limit we found, or a policy whose limit we could not read. */
  const liabilityFor = (target: (typeof LIABILITY_TARGETS)[string]) => {
    const matchingExtractions = confirmed.filter((e) => target.extractionTypes.includes(e.insurance_type));
    const limits = matchingExtractions
      .flatMap((e) => e.insurance_coverages)
      .filter((c) => target.coverageCodes.includes(c.coverage_code) && c.limit_amount !== null)
      .map((c) => c.limit_amount as number);

    if (limits.length > 0) return { state: 'found' as const, limit: Math.max(...limits) };

    const hasPolicy =
      matchingExtractions.length > 0 || policies.some((p) => target.policyTypes.includes(p.type));
    return hasPolicy ? { state: 'unverifiable' as const } : { state: 'absent' as const };
  };

  // 1. Umbrella prerequisites against what the underlying policies actually carry.
  const umbrellas = confirmed.filter((e) => e.insurance_type === 'umbrella');
  for (const umbrella of umbrellas) {
    for (const req of umbrella.insurance_underlying_requirements) {
      const target = LIABILITY_TARGETS[req.requirement_type];
      if (!target || req.required_limit === null) continue;
      const actual = liabilityFor(target);

      if (actual.state === 'absent') {
        findings.push({
          severity: 'attention',
          title: `Umbrella requires ${money(req.required_limit)} ${target.label} liability — no ${target.label} policy on file`,
          detail: `The umbrella states this underlying requirement, but no ${target.label} policy has been added. Upload it to complete the check.`,
        });
      } else if (actual.state === 'unverifiable') {
        findings.push({
          severity: 'info',
          title: `Cannot verify ${target.label} liability against the umbrella requirement`,
          detail:
            `The umbrella requires ${money(req.required_limit)}. A ${target.label} policy is on file, ` +
            `but its liability limit was not found in the documents provided — upload the declarations page to complete this check.`,
        });
      } else if (actual.limit < req.required_limit) {
        findings.push({
          severity: 'critical',
          title: `${target.label[0].toUpperCase()}${target.label.slice(1)} liability is below the umbrella requirement`,
          detail:
            `The umbrella requires ${money(req.required_limit)} underlying ${target.label} liability; ` +
            `the policy on file carries ${money(actual.limit)}. A shortfall can leave the umbrella unable to respond as intended.`,
        });
      }
    }
  }

  // 2. Liability exposure with no umbrella at all.
  if (umbrellas.length === 0) {
    const exposed = Object.values(LIABILITY_TARGETS)
      .filter((t) => liabilityFor(t).state === 'found')
      .map((t) => t.label);
    if (exposed.length > 0) {
      findings.push({
        severity: 'info',
        title: 'No umbrella policy on file',
        detail: `Liability coverage was found on ${[...new Set(exposed)].join(', ')}, with no umbrella or excess policy. Whether that matters depends on net worth and exposure.`,
      });
    }
  }

  // 3. Renewal timing.
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
    } else if (days <= 60) {
      findings.push({
        severity: 'attention',
        title: `${policy.carrier ?? 'A policy'} renews in ${days} day${days === 1 ? '' : 's'}`,
        detail: `Renewal ${policy.renewal_date}. Worth comparing before it auto-renews.`,
      });
    }
  }

  // 4. Duplicates inflate premium totals and coverage counts.
  const seen = new Map<string, number>();
  for (const p of policies) {
    const key = `${p.carrier ?? ''}|${p.policy_number ?? ''}`.toLowerCase();
    if (key === '|') continue;
    seen.set(key, (seen.get(key) ?? 0) + 1);
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

  // 5. What the documents cannot support.
  const decOnly = confirmed.filter((e) => e.declarations_only);
  if (decOnly.length > 0) {
    findings.push({
      severity: 'info',
      title: `${decOnly.length} polic${decOnly.length === 1 ? 'y is' : 'ies are'} based on a declarations page only`,
      detail:
        'Limits are high confidence, but exclusions, sublimits and endorsements were not in the documents provided, so those cannot be assessed.',
    });
  }

  if (policies.length === 0) {
    return { score: null, grade: '—', status: 'unknown', findings, totalPremium, byType };
  }

  // Weighted deductions. Info items are mostly "we cannot see far enough yet",
  // which should nudge the score rather than dominate it.
  const weights: Record<FindingSeverity, number> = { critical: 25, attention: 10, info: 3 };
  const penalty = findings.reduce((sum, f) => sum + weights[f.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  const grade =
    score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const status = score >= 75 ? 'good' : score >= 60 ? 'review' : 'action_needed';

  return { score, grade, status, findings, totalPremium, byType };
}

export const gradeTone = (grade: string) =>
  grade === 'A' ? 'text-emerald-300'
  : grade === 'B' ? 'text-emerald-200'
  : grade === 'C' ? 'text-amber-300'
  : grade === 'D' ? 'text-orange-300'
  : grade === 'F' ? 'text-red-300'
  : 'text-cmd-muted';
