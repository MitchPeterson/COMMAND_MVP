import React from 'react';
import type { FamilyMember, HouseholdProfile, InsurancePolicy, LegalDocument, MortgageAccount } from '../lib/supabase';
import { computeFamilyHealth, type FamilyFindingSeverity } from '../lib/familyHealth';
import { gradeTone } from '../lib/coverageHealth';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';

interface Props {
  members: FamilyMember[];
  profile?: HouseholdProfile | null;
  policies: InsurancePolicy[];
  mortgage?: MortgageAccount | null;
  legalDocuments: LegalDocument[];
}

export function FamilyHealth({ members, profile, policies, mortgage, legalDocuments }: Props) {
  const { score, grade, findings, dataFindings, confidence, confidenceReason, dependents, nextEventYear } =
    computeFamilyHealth(members, profile, policies, mortgage, legalDocuments);

  const criticals = findings.filter((f) => f.severity === 'critical');
  const attention = findings.filter((f) => f.severity === 'attention');
  const tone =
    criticals.length > 0
      ? { label: 'Worth attention', className: 'text-red-300' }
      : attention.length > 0
        ? { label: 'Some things to prepare', className: 'text-amber-300' }
        : { label: 'Nothing outstanding', className: 'text-emerald-300' };

  const icons: Record<FamilyFindingSeverity, React.ReactNode> = {
    critical: <ShieldAlert className="h-4 w-4 shrink-0 text-red-300" />,
    attention: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />,
    info: <Info className="h-4 w-4 shrink-0 text-cmd-muted" />,
  };
  const borders: Record<FamilyFindingSeverity, string> = {
    critical: 'border-red-500/25 bg-red-500/5',
    attention: 'border-amber-500/25 bg-amber-500/5',
    info: 'border-cmd-border bg-cmd-black/30',
  };

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-5">
          <div
            className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-current ${gradeTone(grade)}`}
            title={score === null ? 'Not enough information to grade' : `Family readiness ${score} of 100`}
          >
            <span className="text-3xl font-bold leading-none">{grade}</span>
            <span className="mt-1 text-[11px] opacity-70">{score === null ? '—' : score}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Family health</p>
            <h1 className="mt-2 text-3xl font-semibold text-cmd-offwhite">
              {members.length} in the household
            </h1>
            <p className={`mt-1 text-sm font-medium ${tone.className}`}>{tone.label}</p>
            <p className="mt-1 text-xs text-cmd-muted" title={confidenceReason}>
              Assessment confidence: {confidence}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm text-cmd-muted">Financially dependent</p>
          <p className="text-3xl font-semibold text-cmd-offwhite">{dependents}</p>
          <p className="mt-1 text-xs text-cmd-muted">
            {nextEventYear ? `Next milestone ${nextEventYear}` : 'No milestones on the calendar'}
          </p>
        </div>
      </div>

      {members.length === 0 ? (
        <p className="mt-6 text-sm text-cmd-muted">
          Add the people in your household on your profile, with birth dates. Everything in this section
          computes itself from those dates — there is nothing else to fill in.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {findings.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <p className="text-sm text-cmd-muted">
                Nothing outstanding against what is on file.
              </p>
            </div>
          ) : (
            findings.map((finding, i) => (
              <div key={i} className={`flex gap-3 rounded-2xl border px-4 py-3 ${borders[finding.severity]}`}>
                {icons[finding.severity]}
                <div>
                  <p className="text-sm font-semibold text-cmd-offwhite">{finding.title}</p>
                  <p className="mt-1 text-sm text-cmd-muted">{finding.detail}</p>
                </div>
              </div>
            ))
          )}

          {dataFindings.length > 0 && (
            <div className="mt-5 rounded-2xl border border-cmd-border bg-cmd-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">What limits this assessment</p>
              <ul className="mt-2 space-y-1.5">
                {dataFindings.map((finding, i) => (
                  <li key={i} className="text-sm text-cmd-muted">
                    <span className="text-cmd-offwhite/80">{finding.title}</span> — {finding.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
