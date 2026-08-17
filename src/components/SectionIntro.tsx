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
import { ArrowRight } from 'lucide-react';
import type { SectionIntroCopy } from '../lib/sectionIntros';

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

        {/* Kept near a readable measure rather than stretched to the card. */}
        <p className="mt-4 text-sm leading-7 text-cmd-muted sm:text-base">{intro.body}</p>

        <button
          type="button"
          onClick={onAction}
          className="mt-8 inline-flex items-center gap-2 rounded-xl border border-cmd-gold bg-cmd-gold px-5 py-2.5 text-sm font-semibold text-cmd-black transition hover:bg-cmd-gold/85"
        >
          {intro.ctaLabel} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
