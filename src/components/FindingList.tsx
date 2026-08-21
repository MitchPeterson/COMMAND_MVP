// Findings, with a way to put one down.
//
// Seven section cards and the premium panel each had their own copy of this
// markup, which is why none of them had a dismiss control: adding one meant
// adding it eight times. It lives here now.
//
// The control is deliberately quiet. A finding is the point of the card, and a
// row of buttons beside every one of them would compete with the thing it is
// attached to -- so the options appear when the row is hovered or focused, and
// otherwise the card looks exactly as it did.

import React, { useState } from 'react';
import { AlertTriangle, Info, RotateCcw, Scale, AlertOctagon, X } from 'lucide-react';
import {
  fingerprintFinding, SNOOZE_OPTIONS, snoozeUntil,
  type FingerprintableFinding,
} from '../lib/dismissals';

export interface DisplayFinding extends FingerprintableFinding {
  severity: string;
  /** Legal findings carry this; nothing else does. */
  attorneyReview?: boolean;
}

interface Props {
  section: string;
  findings: DisplayFinding[];
  /** How many are hidden right now, for the offer to bring them back. */
  hiddenCount?: number;
  onDismiss?: (input: { fingerprint: string; title: string; snoozedUntil: string | null }) => Promise<void> | void;
  onRestore?: () => Promise<void> | void;
  emptyMessage?: string;
}

const BORDER: Record<string, string> = {
  critical: 'border-red-500/30 bg-red-500/5',
  attention: 'border-cmd-gold/30 bg-cmd-gold/5',
  info: 'border-cmd-border bg-cmd-black/40',
};

const ICON: Record<string, React.ReactNode> = {
  critical: <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />,
  attention: <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-cmd-gold" />,
  info: <Info className="mt-0.5 h-4 w-4 shrink-0 text-cmd-muted" />,
};

export function FindingList({
  section, findings, hiddenCount = 0, onDismiss, onRestore, emptyMessage,
}: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const put = async (finding: DisplayFinding, fingerprint: string, days: number | null) => {
    if (!onDismiss) return;
    setBusy(fingerprint);
    try {
      await onDismiss({
        fingerprint,
        title: finding.title,
        snoozedUntil: days == null ? null : snoozeUntil(days),
      });
      setOpen(null);
    } finally {
      setBusy(null);
    }
  };

  if (findings.length === 0 && hiddenCount === 0) {
    return emptyMessage
      ? <p className="rounded-2xl border border-dashed border-cmd-border p-6 text-center text-sm text-cmd-muted">{emptyMessage}</p>
      : null;
  }

  return (
    <div className="space-y-2.5">
      {findings.map((finding) => {
        const fingerprint = fingerprintFinding(section, finding);
        const showing = open === fingerprint;
        return (
          <div
            key={fingerprint}
            className={`group relative rounded-2xl border px-4 py-3 ${BORDER[finding.severity] ?? BORDER.info}`}
          >
            <div className="flex gap-3">
              {ICON[finding.severity] ?? ICON.info}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-cmd-offwhite">{finding.title}</p>
                <p className="mt-1 text-sm leading-6 text-cmd-muted">{finding.detail}</p>
                {finding.attorneyReview && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-cmd-gold">
                    <Scale className="h-3 w-3" /> An attorney is the right person to answer this one.
                  </p>
                )}
              </div>

              {onDismiss && (
                <button
                  type="button"
                  onClick={() => setOpen(showing ? null : fingerprint)}
                  aria-label={`Put down: ${finding.title}`}
                  className="h-6 w-6 shrink-0 rounded-md text-cmd-muted opacity-0 transition hover:bg-cmd-black/40 hover:text-cmd-offwhite focus:opacity-100 group-hover:opacity-100"
                >
                  <X className="mx-auto h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {showing && onDismiss && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-cmd-border pt-3">
                {SNOOZE_OPTIONS.map((option) => (
                  <button
                    key={option.days}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => put(finding, fingerprint, option.days)}
                    className="rounded-lg border border-cmd-border px-3 py-1.5 text-xs text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold disabled:opacity-40"
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => put(finding, fingerprint, null)}
                  className="rounded-lg border border-cmd-border px-3 py-1.5 text-xs text-cmd-muted transition hover:border-cmd-gold hover:text-cmd-offwhite disabled:opacity-40"
                >
                  I have handled this
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Hidden, never lost. */}
      {hiddenCount > 0 && onRestore && (
        <button
          type="button"
          onClick={() => onRestore()}
          className="inline-flex items-center gap-2 text-xs text-cmd-muted transition hover:text-cmd-gold"
        >
          <RotateCcw className="h-3 w-3" />
          {hiddenCount} put down. Show {hiddenCount === 1 ? 'it' : 'them'} again
        </button>
      )}
    </div>
  );
}
