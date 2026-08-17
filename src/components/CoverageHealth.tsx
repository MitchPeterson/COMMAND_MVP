import React from 'react';
import type { HouseholdProfile, InsurancePolicy, InsurancePolicyExtraction } from '../lib/supabase';
import { computeCoverageHealth, gradeTone, type FindingSeverity } from '../lib/coverageHealth';
import { currency, titleCase } from './InsurancePolicyReview';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';

interface Props {
  policies: InsurancePolicy[];
  extractions: InsurancePolicyExtraction[];
  profile?: HouseholdProfile | null;
}

export function CoverageHealth({ policies, extractions, profile }: Props) {
  const confirmed = extractions.filter((e) => e.review_status === 'confirmed');
  const { score, grade, findings, dataFindings, confidence, confidenceReason, totalPremium, byType } =
    computeCoverageHealth(policies, extractions, profile);

  const criticals = findings.filter((f) => f.severity === 'critical');
  const attention = findings.filter((f) => f.severity === 'attention');

  const tone =
    criticals.length > 0
      ? { label: 'Needs attention', className: 'text-red-300' }
      : attention.length > 0
      ? { label: 'Review suggested', className: 'text-amber-300' }
      : { label: 'No issues detected', className: 'text-emerald-300' };

  const icons: Record<FindingSeverity, React.ReactNode> = {
    critical: <ShieldAlert className="h-4 w-4 shrink-0 text-red-300" />,
    attention: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />,
    info: <Info className="h-4 w-4 shrink-0 text-cmd-muted" />,
  };
  const borders: Record<FindingSeverity, string> = {
    critical: 'border-red-500/25 bg-red-500/5',
    attention: 'border-amber-500/25 bg-amber-500/5',
    info: 'border-cmd-border bg-cmd-black/30',
  };

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-5">
          <div
            className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-current ${gradeTone(grade)}`}
            title={score === null ? 'Not enough information to grade' : `Coverage score ${score} of 100`}
          >
            <span className="text-3xl font-bold leading-none">{grade}</span>
            <span className="mt-1 text-[11px] opacity-70">{score === null ? '—' : score}</span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Coverage health</p>
            <h1 className="mt-2 text-3xl font-semibold text-cmd-offwhite">
              {policies.length} polic{policies.length === 1 ? 'y' : 'ies'}
            </h1>
            <p className={`mt-1 text-sm font-medium ${tone.className}`}>{tone.label}</p>
            <p
              className="mt-1 text-xs text-cmd-muted"
              title={confidenceReason}
            >
              Assessment confidence: {confidence}
            </p>
          </div>
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
          Upload an insurance policy below and Command will read the coverages, deductibles and
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
          {dataFindings.length > 0 && (
            <div className="mt-5 rounded-2xl border border-cmd-border bg-cmd-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">
                What limits this assessment
              </p>
              <ul className="mt-2 space-y-1.5">
                {dataFindings.map((f, i) => (
                  <li key={i} className="text-sm text-cmd-muted">
                    <span className="text-cmd-offwhite/80">{f.title}</span> — {f.detail}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-cmd-muted/70">
                These affect how much could be checked, not the grade itself.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
