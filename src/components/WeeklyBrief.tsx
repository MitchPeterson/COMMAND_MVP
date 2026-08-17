// The brief: what moved since you last looked.
//
// Ordered by what a household would act on rather than by section. New gaps
// first, because those are the things that were not true last week. Then
// deadlines, which are the things that will stop being actionable. Then score
// movement and anything that resolved, which are reassurance rather than work.
//
// It opens itself once a week and otherwise waits to be asked, and reading it is
// what marks it read — dismissing without reading does the same, because a brief
// that reappears because you closed it wrong is worse than one you missed.

import React from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, Check, X } from 'lucide-react';
import type { Digest } from '../lib/digest';

interface Props {
  digest: Digest;
  onOpenSection: (section: string) => void;
  onClose: () => void;
}

function sinceLabel(since: string | null): string {
  if (!since) return 'Your first brief';
  const days = Math.round((Date.now() - new Date(since).getTime()) / 86_400_000);
  if (days <= 1) return 'Since yesterday';
  if (days < 14) return `Over the last ${days} days`;
  return `Since ${new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(new Date(since))}`;
}

export function WeeklyBrief({ digest, onOpenSection, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-auto bg-black/70 p-4 backdrop-blur-sm sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Your brief"
    >
      <div className="mt-6 w-full max-w-2xl rounded-3xl border border-cmd-border bg-cmd-charcoal p-5 sm:mt-14 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-gold">Your brief</p>
            <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">{sinceLabel(digest.since)}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1 text-cmd-muted transition hover:text-cmd-offwhite"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {digest.quiet ? (
          <div className="mt-6 rounded-2xl border border-cmd-border bg-cmd-black/40 p-6 text-center">
            <Check className="mx-auto h-5 w-5 text-emerald-300" />
            <p className="mt-3 text-sm text-cmd-offwhite">Nothing moved.</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-cmd-muted">
              No new gaps, no scores changed and nothing falls due in the next two months. Quiet weeks
              are worth reporting too — silence here means Command looked.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {digest.isFirst && (
              <p className="rounded-2xl border border-cmd-border bg-cmd-black/40 px-4 py-3 text-sm leading-6 text-cmd-muted">
                This is the first one, so there is nothing to compare against yet. From next week it
                will show what changed rather than what is true.
              </p>
            )}

            {digest.newFindings.length > 0 && (
              <section>
                <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">
                  New since last time · {digest.newFindings.length}
                </p>
                <div className="mt-3 space-y-2">
                  {digest.newFindings.map((f) => (
                    <button
                      key={`${f.section}-${f.title}`}
                      type="button"
                      onClick={() => onOpenSection(f.section)}
                      className="flex w-full gap-3 rounded-2xl border border-cmd-border bg-cmd-black/40 px-4 py-3 text-left transition hover:border-cmd-gold/40"
                    >
                      <AlertTriangle
                        className={`mt-0.5 h-4 w-4 shrink-0 ${f.severity === 'critical' ? 'text-red-300' : 'text-amber-300'}`}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-cmd-offwhite">{f.title}</span>
                        <span className="mt-0.5 block text-sm text-cmd-muted">{f.detail}</span>
                        <span className="mt-1 block text-xs text-cmd-muted/70">{f.label}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {digest.deadlines.length > 0 && (
              <section>
                <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Coming up</p>
                <div className="mt-3 space-y-2">
                  {digest.deadlines.map((d) => (
                    <div
                      key={`${d.date}-${d.label}`}
                      className="flex items-start gap-3 rounded-2xl border border-cmd-border bg-cmd-black/40 px-4 py-3"
                    >
                      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-cmd-gold/80" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-cmd-offwhite">{d.label}</p>
                        <p className="mt-0.5 text-sm text-cmd-muted">{d.detail}</p>
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-xs text-cmd-muted">
                        {d.daysAway < 0 ? `${Math.abs(d.daysAway)}d ago`
                          : d.daysAway === 0 ? 'today' : `in ${d.daysAway}d`}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(digest.moves.length > 0 || digest.resolved.length > 0) && (
              <section>
                <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Also</p>
                <div className="mt-3 space-y-2">
                  {digest.moves.map((m) => (
                    <button
                      key={m.section}
                      type="button"
                      onClick={() => onOpenSection(m.section)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-cmd-border bg-cmd-black/40 px-4 py-2.5 text-left transition hover:border-cmd-gold/40"
                    >
                      {m.delta > 0
                        ? <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-300" />
                        : <ArrowDownRight className="h-4 w-4 shrink-0 text-amber-300" />}
                      <span className="text-sm text-cmd-offwhite">{m.label}</span>
                      <span className="ml-auto font-mono text-sm text-cmd-muted">
                        {m.from} → <span className="text-cmd-offwhite">{m.to}</span>
                      </span>
                    </button>
                  ))}
                  {digest.resolved.map((f) => (
                    <div
                      key={`${f.section}-${f.title}`}
                      className="flex items-start gap-3 rounded-2xl border border-cmd-border bg-cmd-black/40 px-4 py-2.5"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      <p className="text-sm text-cmd-muted">
                        <span className="text-cmd-offwhite">{f.title}</span> — no longer flagged in {f.label}.
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        <div className="mt-7 flex items-center justify-between gap-4 border-t border-cmd-border pt-5">
          <p className="text-xs text-cmd-muted">Next brief in a week, or open it any time from the header.</p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-cmd-gold bg-cmd-gold px-4 py-2 text-sm font-semibold text-cmd-black transition hover:bg-cmd-gold/85"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
