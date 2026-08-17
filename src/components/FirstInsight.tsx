// The first thing a new household is told.
//
// Deliberately the only loud element on the page while it is shown. A callout
// that competes with three other cards is not a callout, and the claim it makes
// — that Command found something in a couple of minutes that a spreadsheet with
// one tab per topic could not — only holds if it is the thing you see first.
//
// It shows the finding, names every section it drew on, and links to where the
// working is. It does not restate the finding in its own words: the section is
// the source of truth and a second phrasing would eventually contradict it.

import React from 'react';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import type { FirstInsight as Insight } from '../lib/firstInsight';

interface Props {
  insight: Insight;
  onOpen: (section: string) => void;
  onDismiss: () => void;
}

export function FirstInsight({ insight, onOpen, onDismiss }: Props) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-cmd-gold/30 bg-cmd-charcoal p-6 sm:p-8">
      {/* A single soft wash rather than a gradient panel: the figure should be
          the brightest thing here. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cmd-gold/10 blur-3xl"
      />

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-4 top-4 rounded-lg p-1.5 text-cmd-muted transition hover:text-cmd-offwhite"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cmd-gold" />
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-gold">Command found something</p>
        </div>

        <h2 className="mt-4 max-w-2xl text-2xl font-semibold leading-snug text-cmd-offwhite sm:text-3xl">
          {insight.title}
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-cmd-muted">{insight.detail}</p>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
          <button
            type="button"
            onClick={() => onOpen(insight.section)}
            className="inline-flex items-center gap-2 rounded-xl border border-cmd-gold bg-cmd-gold px-4 py-2 text-sm font-semibold text-cmd-black transition hover:bg-cmd-gold/85"
          >
            See how it worked this out <ArrowRight className="h-4 w-4" />
          </button>

          {/* Naming the sections is the point being made: no single one of these
              holds this finding on its own. */}
          <p className="text-xs text-cmd-muted">
            Read across{' '}
            {insight.spans.map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && (i === insight.spans.length - 1 ? ' and ' : ', ')}
                <span className="text-cmd-offwhite">{s}</span>
              </React.Fragment>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
