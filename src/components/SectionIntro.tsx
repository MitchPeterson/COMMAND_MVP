// A section with nothing in it yet.
//
// One card, centered, and deliberately less than the grade card it replaces: no
// score ring reporting a dash, no confidence reading, no list of everything that
// limited an assessment that never ran. Those are all true of an empty section
// and none of them are worth a first impression.
//
// It says what the section is for, why that is worth the upload, and offers the
// one action that starts it.

import React from 'react';
import { ArrowRight, FileText, Sparkles } from 'lucide-react';
import type { SectionIntroCopy } from '../lib/sectionIntros';
import { listSeparator } from '../lib/text';

interface Props {
  intro: SectionIntroCopy;
  onAction: () => void;
  /** The section's own mark, so the card is recognisably part of that pillar. */
  icon?: React.ReactNode;
}

export function SectionIntro({ intro, onAction, icon }: Props) {
  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal px-6 py-10 sm:px-10 sm:py-14">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        {icon && (
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-cmd-gold/25 bg-cmd-gold/10 text-cmd-gold">
            {icon}
          </div>
        )}

        <h1 className="text-2xl font-semibold leading-snug text-cmd-offwhite sm:text-3xl">
          {intro.title}
        </h1>

        {/* Why the section exists, before anything is asked of the user. */}
        <p className="mt-3 text-base leading-7 text-cmd-offwhite/90">{intro.purpose}</p>

        {/* Kept near a readable measure rather than stretched to the card. */}
        <p className="mt-4 text-sm leading-7 text-cmd-muted">{intro.body}</p>

        {intro.feeds.length > 0 && (
          <p className="mt-4 inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-cmd-border bg-cmd-black/40 px-4 py-1.5 text-xs text-cmd-muted">
            <Sparkles className="h-3 w-3 shrink-0 text-cmd-gold" />
            {/* One flex child, not one per word. The separators were flex items
                of their own, so the container's gap opened a space in front of
                every comma — "Finances , Home and Family". */}
            <span>
              Filling this in also sharpens{' '}
              {intro.feeds.map((f, i) => (
                <React.Fragment key={f}>
                  {listSeparator(i, intro.feeds.length)}
                  <span className="text-cmd-offwhite">{f}</span>
                </React.Fragment>
              ))}
            </span>
          </p>
        )}

        <button
          type="button"
          onClick={onAction}
          className="mt-8 inline-flex items-center gap-2 rounded-xl border border-cmd-gold bg-cmd-gold px-5 py-2.5 text-sm font-semibold text-cmd-black transition hover:bg-cmd-gold/85"
        >
          {intro.ctaLabel} <ArrowRight className="h-4 w-4" />
        </button>

        {/* What to reach for, and what else counts. Named in plain words rather
            than industry terms, because "any insurance policy" is findable and
            "Form ACORD 25" is not. */}
        <div className="mt-9 w-full rounded-2xl border border-cmd-border bg-cmd-black/40 p-5 text-left">
          <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Start with</p>
          <p className="mt-2 text-sm font-semibold text-cmd-offwhite">{intro.primary.label}</p>
          <p className="mt-1 text-sm leading-6 text-cmd-muted">{intro.primary.why}</p>

          {intro.also.length > 0 && (
            <>
              <p className="mt-5 text-xs uppercase tracking-[0.2em] text-cmd-muted">
                Also useful, whenever you have them
              </p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {intro.also.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-cmd-muted">
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cmd-muted/60" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs leading-5 text-cmd-muted/70">
                One is enough to begin. Nothing here has to be done in a sitting, and nothing reaches
                your profile until you confirm it.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
