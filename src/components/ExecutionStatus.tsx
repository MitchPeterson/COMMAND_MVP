// Whether the copy on file is signed, or a draft, or does not say.
//
// For a will this is the most consequential fact about the document, and it was
// rendered as grey subtitle text next to the page count while the model's
// confidence in its own classification got a colored badge. That is backwards.
//
// The language boundary matters as much as the prominence. Command reports what
// the document says about itself and what Command could see in the copy it was
// given. It never says a document is valid, invalid, enforceable or sufficient —
// an unsigned copy in the vault does not mean no signed original exists, and
// whether any of it holds up is an attorney's call.

import React from 'react';
import { BadgeCheck, FileSignature, FileEdit, HelpCircle, ShieldAlert } from 'lucide-react';

export type ObservationState = 'observed' | 'not_observed' | 'indeterminate';

export interface ExecutionObservation {
  observation_code: string;
  state: ObservationState;
  detail?: string | null;
  source_page?: number | null;
  evidence?: string | null;
  confidence?: number | null;
}

interface Props {
  documentStatus: string | null | undefined;
  observations?: ExecutionObservation[] | null;
  className?: string;
}

type Tone = 'draft' | 'signed' | 'recorded' | 'ended' | 'unstated' | 'neutral';

const TONES: Record<Tone, string> = {
  draft: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  signed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  recorded: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  ended: 'border-red-500/30 bg-red-500/10 text-red-200',
  unstated: 'border-cmd-border bg-cmd-black/60 text-cmd-muted',
  neutral: 'border-cmd-border bg-cmd-black/60 text-cmd-offwhite',
};

const ICONS: Record<Tone, React.ElementType> = {
  draft: FileEdit,
  signed: FileSignature,
  recorded: BadgeCheck,
  ended: ShieldAlert,
  unstated: HelpCircle,
  neutral: HelpCircle,
};

/**
 * The list, whatever arrived. `execution_observations` is a JSONB column that
 * was declared with an object default, and `{} ?? []` is `{}` — so an empty
 * object reached `.some()` and threw, blanking the entire Legal view rather than
 * degrading one badge. The loader coerces this now and the column default is
 * fixed, but a component that renders a list should not be able to take a page
 * down because a column changed shape.
 */
function list(observations: ExecutionObservation[] | null | undefined): ExecutionObservation[] {
  return Array.isArray(observations) ? observations : [];
}

/** True only when the document positively says so — never inferred from absence. */
function observed(observations: ExecutionObservation[], fragment: string): boolean {
  return list(observations).some(
    (o) => (o.observation_code ?? '').includes(fragment) && o.state === 'observed',
  );
}

function notObserved(observations: ExecutionObservation[], fragment: string): boolean {
  const matching = list(observations).filter((o) => (o.observation_code ?? '').includes(fragment));
  // A scan showing a conformed "/s/" signature produces both an observed and a
  // not-observed entry. Anything observed wins, so the two never contradict.
  return matching.length > 0 && matching.every((o) => o.state === 'not_observed');
}

export interface ExecutionSummary {
  label: string;
  tone: Tone;
  /** The honest qualifier, shown next to the badge rather than inside it. */
  detail: string;
}

export function summarizeExecution(
  documentStatus: string | null | undefined,
  observations: ExecutionObservation[] | null | undefined = [],
): ExecutionSummary {
  const status = (documentStatus ?? '').toLowerCase();
  // Every read of the list goes through list(), so a non-array argument degrades
  // to "nothing observed" rather than throwing.
  const seen = list(observations);
  const marks: string[] = [];
  if (observed(seen, 'signature')) marks.push('signed');
  if (observed(seen, 'notar')) marks.push('notarized');
  if (observed(seen, 'witness')) marks.push('witnessed');

  if (status === 'draft') {
    return {
      label: 'Marked DRAFT',
      tone: 'draft',
      detail: marks.length > 0
        ? `The document labels itself a draft, though Command did see it ${marks.join(' and ')}.`
        : 'The document labels itself a draft. If a signed version exists, uploading it gives Command the executed terms.',
    };
  }
  if (status === 'revoked') {
    return { label: 'Marked revoked', tone: 'ended', detail: 'The document states it has been revoked.' };
  }
  if (status === 'expired') {
    return { label: 'Marked expired', tone: 'ended', detail: 'The document states it has expired.' };
  }
  if (status === 'recorded') {
    return {
      label: 'Recorded',
      tone: 'recorded',
      detail: 'The copy carries recording detail from a public register.',
    };
  }
  if (status === 'certified_copy') {
    return { label: 'Certified copy', tone: 'recorded', detail: 'The copy is certified.' };
  }
  if (status === 'amended') {
    return {
      label: 'Amended',
      tone: 'neutral',
      detail: 'The document states it amends or restates an earlier one.',
    };
  }
  if (status === 'executed') {
    return {
      label: marks.length > 0 ? `Signed · ${marks.filter((m) => m !== 'signed').join(' and ') || 'executed'}` : 'Signed',
      tone: 'signed',
      detail: marks.length > 0
        ? `Command saw it ${marks.join(' and ')} in this copy.`
        : 'The document presents as executed.',
    };
  }

  // Status not stated. The observations still carry real information, and for a
  // will "we could not see a signature" is worth saying out loud.
  if (marks.length > 0) {
    return {
      label: `Signature seen · ${marks.join(' and ')}`,
      tone: 'signed',
      detail: 'The document does not label its own status, but Command saw these in this copy.',
    };
  }
  if (notObserved(seen, 'signature')) {
    return {
      label: 'No signature seen',
      tone: 'draft',
      detail:
        'Command did not find a signature in this copy. That may mean the signature page was not ' +
        'scanned rather than that none exists — worth checking which.',
    };
  }
  return {
    label: 'Signing not stated',
    tone: 'unstated',
    detail: 'The pages do not say whether this was signed, and Command did not see a signature block.',
  };
}

export function ExecutionStatus({ documentStatus, observations, className = '' }: Props) {
  const summary = summarizeExecution(documentStatus, observations);
  const Icon = ICONS[summary.tone];
  return (
    <span
      title={summary.detail}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${TONES[summary.tone]} ${className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" /> {summary.label}
    </span>
  );
}
