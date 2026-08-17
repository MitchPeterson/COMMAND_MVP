// The dashboard, for someone who has just arrived.
//
// The normal one is a summary layer, and a summary of nothing is a score of zero
// beside seven sections reporting zero, which reads as failure rather than as a
// beginning. Nobody should be shown a grade before there is anything to grade.
//
// So while the household is new this replaces it with the only two things worth
// saying: what Command is going to do, and the next single thing to do about it.
// Written for someone who has never used software like this and does not want
// to: plain words, one action at a time, and no jargon on the page at all.

import React from 'react';
import { ArrowRight, Check, Sparkles, Upload } from 'lucide-react';
import { SECTION_INTROS, type SectionIntroCopy } from '../lib/sectionIntros';

export interface SetupStep extends SectionIntroCopy {
  done: boolean;
}

interface Props {
  steps: SetupStep[];
  userName?: string | null;
  onOpen: (section: string) => void;
}

export function GettingStarted({ steps, userName, onOpen }: Props) {
  const done = steps.filter((s) => s.done);
  const remaining = steps.filter((s) => !s.done);
  // Three at a time. A list of seven things to do is a list nobody starts.
  const next = remaining.slice(0, 3);
  const firstName = (userName ?? '').trim().split(/\s+/)[0];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6 sm:p-9">
        <p className="text-xs uppercase tracking-[0.24em] text-cmd-gold">Getting started</p>
        <h1 className="mt-3 max-w-2xl text-2xl font-semibold leading-snug text-cmd-offwhite sm:text-3xl">
          {done.length === 0
            ? `Welcome${firstName ? `, ${firstName}` : ''}. Let's build the picture.`
            : `Good start${firstName ? `, ${firstName}` : ''} — ${done.length} of ${steps.length} areas underway.`}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-cmd-muted sm:text-base">
          Command keeps track of everything your household is responsible for — your insurance, your
          legal documents, the house, money, taxes and the people in it. Add one thing at a time and
          it starts telling you what it notices.
        </p>

        {/* Progress as a count of areas, not a percentage. Nobody is 43% ready. */}
        <div className="mt-6 flex flex-wrap items-center gap-2" aria-label={`${done.length} of ${steps.length} areas started`}>
          {steps.map((step) => (
            <span
              key={step.section}
              title={step.title}
              className={`h-1.5 w-10 rounded-full ${step.done ? 'bg-emerald-400/80' : 'bg-white/10'}`}
            />
          ))}
          <span className="ml-2 text-xs text-cmd-muted">
            {done.length} of {steps.length} started
          </span>
        </div>
      </section>

      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">
          {done.length === 0 ? 'Start here' : 'What to do next'}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-cmd-offwhite">
          {next.length === 0 ? 'Every area has something in it' : 'Three things worth doing'}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-cmd-muted">
          There is no order you have to follow and nothing has to be finished today. Pick whichever
          you already have to hand.
        </p>

        <div className="mt-5 space-y-3">
          {next.map((step) => (
            <button
              key={step.section}
              type="button"
              onClick={() => onOpen(step.section)}
              className="flex w-full items-start gap-4 rounded-2xl border border-cmd-border bg-cmd-charcoal p-5 text-left transition hover:border-cmd-gold/50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-cmd-offwhite">{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-cmd-muted">{step.purpose}</p>
                <p className="mt-3 text-sm text-cmd-muted">
                  <span className="text-cmd-offwhite/80">You would need:</span> {step.primary.label}
                  {step.noDocumentNeeded && (
                    <span className="ml-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200">
                      no document needed
                    </span>
                  )}
                </p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-cmd-gold" />
            </button>
          ))}
        </div>

        {done.length > 0 && (
          <div className="mt-6 border-t border-cmd-border pt-5">
            <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Already underway</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {done.map((step) => (
                <button
                  key={step.section}
                  type="button"
                  onClick={() => onOpen(step.section)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-cmd-border bg-cmd-black/50 px-3 py-1 text-xs text-cmd-muted transition hover:text-cmd-offwhite"
                >
                  <Check className="h-3 w-3 text-emerald-300" />
                  {step.section.charAt(0).toUpperCase() + step.section.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* The escape hatch from the three suggestions. Someone holding a document
          right now should not have to work out which section wants it — that is
          Command's job, and saying so is the reassurance. */}
      <section className="rounded-3xl border border-cmd-gold/25 bg-cmd-charcoal p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-gold">Or just start</p>
            <h2 className="mt-2 text-xl font-semibold text-cmd-offwhite">
              Have something to hand? Upload it.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-cmd-muted">
              You do not have to know which section it belongs to. Command reads it, works out what it
              is, files it in the right place and tells you what it found.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('command:add-document'))}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-cmd-gold bg-cmd-gold px-4 py-2.5 text-sm font-semibold text-cmd-black transition hover:bg-cmd-gold/85"
          >
            <Upload className="h-4 w-4" /> Upload anything
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            'An insurance policy', 'A will or trust', 'A mortgage statement',
            'Last year\u2019s tax return', 'A credit card statement', 'A bank or investment statement',
            'An appliance warranty', 'A power of attorney',
          ].map((idea) => (
            <span key={idea} className="rounded-full border border-cmd-border bg-cmd-black/40 px-3 py-1 text-xs text-cmd-muted">
              {idea}
            </span>
          ))}
        </div>

        <p className="mt-5 text-sm leading-6 text-cmd-muted">
          One document is a real start. Add the rest whenever you come across them — there is no
          deadline here, and Command fills the picture in as you go rather than waiting for all of it.
        </p>
      </section>

      <p className="flex items-start gap-2 px-1 text-sm leading-6 text-cmd-muted">
        <Sparkles className="mt-1 h-3.5 w-3.5 shrink-0 text-cmd-gold" />
        Once a few areas have something in them, this page turns into your summary — scores, what
        needs attention, and what is coming up.
      </p>
    </div>
  );
}
