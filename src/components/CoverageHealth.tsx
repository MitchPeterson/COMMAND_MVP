import React from 'react';
import type { InsurancePolicy, InsurancePolicyExtraction } from '../lib/supabase';
import { currency, titleCase } from './InsurancePolicyReview';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';

interface Props {
  policies: InsurancePolicy[];
  extractions: InsurancePolicyExtraction[];
}

type Severity = 'critical' | 'attention' | 'info';

interface Finding {
  severity: Severity;
  title: string;
  detail: string;
}

const LIABILITY_CODES: Record<string, string[]> = {
  home: ['personal_liability'],
  auto: ['bodily_injury_liability', 'combined_single_limit'],
  boat: ['boat_liability'],
  rv: ['rv_liability'],
  motorcycle: ['motorcycle_liability'],
};

/**
 * Observations, not advice. Everything here is derived from what the documents
 * actually said; where the documents are silent we say the check could not be
 * completed rather than assuming the answer.
 */
function analyse(policies: InsurancePolicy[], extractions: InsurancePolicyExtraction[]): Finding[] {
  const findings: Finding[] = [];
  const confirmed = extractions.filter((e) => e.review_status === 'confirmed');

  const bestLiabilityFor = (kind: string): number | null => {
    const codes = LIABILITY_CODES[kind] ?? [];
    const limits = confirmed
      .filter((e) => e.insurance_type === kind)
      .flatMap((e) => e.insurance_coverages)
      .filter((c) => codes.includes(c.coverage_code) && c.limit_amount !== null)
      .map((c) => c.limit_amount as number);
    return limits.length ? Math.max(...limits) : null;
  };

  // 1. Umbrella prerequisites vs what the underlying policies actually carry.
  const umbrellas = confirmed.filter((e) => e.insurance_type === 'umbrella');
  for (const umbrella of umbrellas) {
    for (const req of umbrella.insurance_underlying_requirements) {
      if (req.required_limit === null) continue;
      const kind = req.requirement_type.replace('_liability', '');
      const actual = bestLiabilityFor(kind);

      if (actual === null) {
        findings.push({
          severity: 'attention',
          title: `Umbrella requires ${currency(req.required_limit)} ${kind} liability — no ${kind} policy on file`,
          detail:
            `The umbrella policy states a required underlying limit, but no confirmed ${kind} ` +
            `policy has been added yet. Upload it to complete this check.`,
        });
      } else if (actual < req.required_limit) {
        findings.push({
          severity: 'critical',
          title: `${titleCase(kind)} liability is below what the umbrella requires`,
          detail:
            `The umbrella requires ${currency(req.required_limit)} underlying ${kind} liability; ` +
            `the ${kind} policy on file carries ${currency(actual)}. A gap here can leave the ` +
            `umbrella unable to respond as intended.`,
        });
      }
    }
  }

  // 2. Liability exposure with no umbrella at all.
  if (umbrellas.length === 0) {
    const exposures = Object.keys(LIABILITY_CODES).filter((k) => bestLiabilityFor(k) !== null);
    if (exposures.length > 0) {
      findings.push({
        severity: 'info',
        title: 'No umbrella policy on file',
        detail:
          `Liability coverage was found on ${exposures.join(', ')}, with no umbrella or excess ` +
          `policy added. Whether that matters depends on household net worth and exposure.`,
      });
    }
  }

  // 3. Renewal timing.
  const today = new Date();
  for (const policy of policies) {
    if (!policy.renewal_date) continue;
    const renewal = new Date(policy.renewal_date);
    if (Number.isNaN(renewal.getTime())) continue;
    const days = Math.round((renewal.getTime() - today.getTime()) / 86_400_000);
    if (days < 0) {
      findings.push({
        severity: 'critical',
        title: `${policy.carrier ?? 'A policy'} shows a renewal date in the past`,
        detail: `Renewal was ${policy.renewal_date}. Either the policy has lapsed or a newer declarations page has not been uploaded.`,
      });
    } else if (days <= 60) {
      findings.push({
        severity: 'attention',
        title: `${policy.carrier ?? 'A policy'} renews in ${days} day${days === 1 ? '' : 's'}`,
        detail: `Renewal ${policy.renewal_date}. Worth comparing before it auto-renews.`,
      });
    }
  }

  // 4. Duplicates — the same policy confirmed twice reads as double coverage.
  const seen = new Map<string, number>();
  for (const policy of policies) {
    const key = `${policy.carrier ?? ''}|${policy.policy_number ?? ''}`.toLowerCase();
    if (key === '|') continue;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const [key, count] of seen) {
    if (count > 1) {
      const [carrier, number] = key.split('|');
      findings.push({
        severity: 'attention',
        title: 'The same policy appears more than once',
        detail:
          `${carrier || 'Unknown carrier'} ${number ? `#${number}` : ''} is listed ${count} times. ` +
          `Duplicates inflate premium totals and coverage counts — remove the extra from Documents.`,
      });
    }
  }

  // 5. What the documents cannot support. Stated, not silently ignored.
  const decOnly = confirmed.filter((e) => e.declarations_only);
  if (decOnly.length > 0) {
    findings.push({
      severity: 'info',
      title: `${decOnly.length} polic${decOnly.length === 1 ? 'y is' : 'ies are'} based on a declarations page only`,
      detail:
        'Limits are high confidence, but exclusions, sublimits and endorsements were not in the ' +
        'documents provided, so those cannot be assessed. Upload the full policy to complete it.',
    });
  }

  return findings;
}

export function CoverageHealth({ policies, extractions }: Props) {
  const confirmed = extractions.filter((e) => e.review_status === 'confirmed');
  const findings = analyse(policies, extractions);

  const totalPremium = policies.reduce((sum, p) => sum + (p.annual_premium ?? 0), 0);
  const byType = policies.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + 1;
    return acc;
  }, {});

  const criticals = findings.filter((f) => f.severity === 'critical');
  const attention = findings.filter((f) => f.severity === 'attention');

  const tone =
    criticals.length > 0
      ? { label: 'Needs attention', className: 'text-red-300' }
      : attention.length > 0
      ? { label: 'Review suggested', className: 'text-amber-300' }
      : { label: 'No issues detected', className: 'text-emerald-300' };

  const icons: Record<Severity, React.ReactNode> = {
    critical: <ShieldAlert className="h-4 w-4 shrink-0 text-red-300" />,
    attention: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />,
    info: <Info className="h-4 w-4 shrink-0 text-cmd-muted" />,
  };
  const borders: Record<Severity, string> = {
    critical: 'border-red-500/25 bg-red-500/5',
    attention: 'border-amber-500/25 bg-amber-500/5',
    info: 'border-cmd-border bg-cmd-black/30',
  };

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Coverage health</p>
          <h1 className="mt-3 text-3xl font-semibold text-cmd-offwhite">
            {policies.length} polic{policies.length === 1 ? 'y' : 'ies'}
          </h1>
          <p className={`mt-2 text-sm font-medium ${tone.className}`}>{tone.label}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-cmd-muted">Annual premium</p>
          <p className="text-3xl font-semibold text-cmd-offwhite">{currency(totalPremium)}</p>
          <p className="mt-1 text-xs text-cmd-muted">
            {Object.entries(byType).map(([t, n]) => `${n} ${t}`).join(' · ') || 'No policies yet'}
          </p>
        </div>
      </div>

      {policies.length === 0 ? (
        <p className="mt-6 text-sm text-cmd-muted">
          Upload a declarations page below and Command will read the coverages, deductibles and
          limits, then check them against each other.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {findings.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <p className="text-sm text-cmd-muted">
                Nothing inconsistent found across the policies on file. Adding more documents
                widens the checks that can run.
              </p>
            </div>
          ) : (
            findings.map((f, i) => (
              <div key={i} className={`flex gap-3 rounded-2xl border px-4 py-3 ${borders[f.severity]}`}>
                {icons[f.severity]}
                <div>
                  <p className="text-sm font-semibold text-cmd-offwhite">{f.title}</p>
                  <p className="mt-1 text-sm text-cmd-muted">{f.detail}</p>
                </div>
              </div>
            ))
          )}
          {confirmed.length < policies.length && (
            <p className="px-1 text-xs text-cmd-muted">
              {policies.length - confirmed.length} polic
              {policies.length - confirmed.length === 1 ? 'y was' : 'ies were'} added without an
              extracted document, so coverage-level checks cannot run on them.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
