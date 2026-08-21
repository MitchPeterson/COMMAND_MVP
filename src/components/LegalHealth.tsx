import React from 'react';
import type {
  Asset,
  FamilyMember,
  HouseholdProfile,
  LegalDocument,
  LegalDocumentExtraction,
} from '../lib/supabase';
import { computeLegalHealth, type LegalFindingSeverity } from '../lib/legalHealth';
import { FindingList } from './FindingList';
import { useDismissals } from './useDismissals';
import { gradeTone } from '../lib/coverageHealth';
import { AlertTriangle, CheckCircle2, Info, Scale, ShieldAlert } from 'lucide-react';

interface Props {
  extractions: LegalDocumentExtraction[];
  documents: LegalDocument[];
  profile?: HouseholdProfile | null;
  familyMembers?: FamilyMember[];
  assets?: Asset[];
}

const ESSENTIAL_TONE: Record<string, string> = {
  found: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  unconfirmed: 'border-cmd-gold/30 bg-cmd-gold/10 text-cmd-gold',
  not_found: 'border-cmd-border bg-cmd-black/40 text-cmd-muted',
};

// "Not found in Command" is the whole point of the wording: it is a statement
// about what has been uploaded, never about what the household has.
const ESSENTIAL_LABEL: Record<string, string> = {
  found: 'On file',
  unconfirmed: 'Awaiting your review',
  not_found: 'Not found in Command',
};

export function LegalHealth({ extractions, documents, profile, familyMembers = [], assets = [] }: Props) {
  const { score, grade, findings, dataFindings, confidence, confidenceReason, essentials, documentCount } =
    computeLegalHealth(extractions, documents, profile, familyMembers, assets);
  // Findings the household has put down stay put -- and come back on their own
  // when the facts behind them change. See lib/dismissals.
  const { visible, hiddenCount, onDismiss, onRestore } = useDismissals('legal', findings);

  const criticals = findings.filter((f) => f.severity === 'critical');
  const attention = findings.filter((f) => f.severity === 'attention');

  const tone =
    criticals.length > 0
      ? { label: 'Worth attention', className: 'text-red-300' }
      : attention.length > 0
        ? { label: 'Review suggested', className: 'text-amber-300' }
        : { label: 'Nothing outstanding found', className: 'text-emerald-300' };

  const icons: Record<LegalFindingSeverity, React.ReactNode> = {
    critical: <ShieldAlert className="h-4 w-4 shrink-0 text-red-300" />,
    attention: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />,
    info: <Info className="h-4 w-4 shrink-0 text-cmd-muted" />,
  };
  const borders: Record<LegalFindingSeverity, string> = {
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
            title={score === null ? 'Not enough information to grade' : `Legal readiness ${score} of 100`}
          >
            <span className="text-3xl font-bold leading-none">{grade}</span>
            <span className="mt-1 text-[11px] opacity-70">{score === null ? '—' : score}</span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Legal health</p>
            <h1 className="mt-2 text-3xl font-semibold text-cmd-offwhite">
              {documentCount} document{documentCount === 1 ? '' : 's'}
            </h1>
            <p className={`mt-1 text-sm font-medium ${tone.className}`}>{tone.label}</p>
            <p className="mt-1 text-xs text-cmd-muted" title={confidenceReason}>
              Assessment confidence: {confidence}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {essentials.map((essential) => (
            <div
              key={essential.label}
              className={`rounded-2xl border px-3 py-2 text-center ${ESSENTIAL_TONE[essential.state]}`}
            >
              <p className="text-xs font-semibold">{essential.label}</p>
              <p className="mt-0.5 text-[11px] opacity-80">{ESSENTIAL_LABEL[essential.state]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {visible.length === 0 && hiddenCount === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <p className="text-sm text-cmd-muted">
              Nothing outstanding found against what is on file. Adding more documents widens the
              checks that can run.
            </p>
          </div>
        ) : (
          <FindingList
              section="legal"
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
            <p className="mt-2 text-xs text-cmd-muted/70">
              These affect how much could be checked, not the grade itself.
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-cmd-muted/70">
        Command reports what is and is not on file here. It does not assess whether any document is
        valid or currently in force, and a document Command has not seen is not a document you do
        not have.
      </p>
    </section>
  );
}
