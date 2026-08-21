import React from 'react';
import type {
  DeductionLogEntry, FamilyMember, FinanceAccount, HouseholdProfile, LegalDocument,
  MortgageStatement, TaxDocument, TaxReturn,
} from '../lib/supabase';
import { computeTaxHealth, type TaxFindingSeverity } from '../lib/taxHealth';
import { FindingList } from './FindingList';
import { useDismissals } from './useDismissals';
import { gradeTone } from '../lib/coverageHealth';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';

interface Props {
  taxDocuments: TaxDocument[];
  profile?: HouseholdProfile | null;
  members: FamilyMember[];
  mortgageStatements: MortgageStatement[];
  financeAccounts: FinanceAccount[];
  legalDocuments: LegalDocument[];
  taxReturns: TaxReturn[];
  deductions: DeductionLogEntry[];
}

export function TaxHealth(props: Props) {
  const {
    score, grade, findings, dataFindings, confidence, confidenceReason,
    taxYear, received, expectedCount, nextDeadline,
  } = computeTaxHealth(
    props.taxDocuments, props.profile, props.members,
    props.mortgageStatements, props.financeAccounts, props.legalDocuments,
    props.taxReturns, props.deductions,
  );

  // Findings the household has put down stay put -- and come back on their own
  // when the facts behind them change. See lib/dismissals.
  const { visible, hiddenCount, onDismiss, onRestore } = useDismissals('taxes', findings);
  const criticals = findings.filter((f) => f.severity === 'critical');
  const attention = findings.filter((f) => f.severity === 'attention');
  const tone =
    criticals.length > 0
      ? { label: 'Needs attention', className: 'text-red-300' }
      : attention.length > 0
        ? { label: 'Something to chase', className: 'text-amber-300' }
        : { label: 'On track', className: 'text-emerald-300' };

  const icons: Record<TaxFindingSeverity, React.ReactNode> = {
    critical: <ShieldAlert className="h-4 w-4 shrink-0 text-red-300" />,
    attention: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />,
    info: <Info className="h-4 w-4 shrink-0 text-cmd-muted" />,
  };
  const borders: Record<TaxFindingSeverity, string> = {
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
            title={score === null ? 'Not enough information to grade' : `Tax readiness ${score} of 100`}
          >
            <span className="text-3xl font-bold leading-none">{grade}</span>
            <span className="mt-1 text-[11px] opacity-70">{score === null ? '—' : score}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Tax health</p>
            <h1 className="mt-2 text-3xl font-semibold text-cmd-offwhite">Tax year {taxYear}</h1>
            <p className={`mt-1 text-sm font-medium ${tone.className}`}>{tone.label}</p>
            <p className="mt-1 text-xs text-cmd-muted" title={confidenceReason}>
              Assessment confidence: {confidence}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-sm text-cmd-muted">Forms gathered</p>
          <p className="text-3xl font-semibold text-cmd-offwhite">
            {received}<span className="text-cmd-muted"> / {expectedCount}</span>
          </p>
          <p className="mt-1 text-xs text-cmd-muted">
            {nextDeadline ? `Next date ${nextDeadline}` : 'No dates ahead'}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {visible.length === 0 && hiddenCount === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <p className="text-sm text-cmd-muted">Nothing outstanding and no deadline close.</p>
          </div>
        ) : (
          <FindingList
              section="taxes"
              findings={visible}
              hiddenCount={hiddenCount}
              onDismiss={onDismiss}
              onRestore={onRestore}
            />
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
    </section>
  );
}
