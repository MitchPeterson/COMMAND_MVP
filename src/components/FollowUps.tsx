// Questions your documents raised about everything else.
//
// The point is that they are concrete. "Your policy lists Sarah as a driver — is
// she in your household?" is a question someone answers from memory in a second.
// "Add your family" is a chore, and it is the same request.
//
// Shown as questions rather than tasks for that reason, and each one carries
// what the document said so it can be checked rather than trusted.

import React from 'react';
import { ArrowRight, HelpCircle } from 'lucide-react';
import type { FollowUp } from '../lib/followUps';

interface Props {
  followUps: FollowUp[];
  onOpen: (section: string) => void;
}

export function FollowUps({ followUps, onOpen }: Props) {
  if (followUps.length === 0) return null;

  return (
    <section className="rounded-3xl border border-cmd-gold/25 bg-cmd-charcoal p-6">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-cmd-gold" />
        <p className="text-xs uppercase tracking-[0.24em] text-cmd-gold">From what you uploaded</p>
      </div>
      <h2 className="mt-3 text-xl font-semibold text-cmd-offwhite">
        {followUps.length === 1
          ? 'One thing your documents raised'
          : `${followUps.length} things your documents raised`}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-cmd-muted">
        Your paperwork mentions people and things Command has not been told about. Each one takes a
        moment and fills in a section you have not had to think about yet.
      </p>

      <div className="mt-5 space-y-3">
        {followUps.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item.section)}
            className="flex w-full items-start gap-4 rounded-2xl border border-cmd-border bg-cmd-black/40 p-4 text-left transition hover:border-cmd-gold/40"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-cmd-offwhite">{item.question}</p>
              <p className="mt-1 text-sm leading-6 text-cmd-muted">{item.evidence}</p>
              <p className="mt-2 text-xs text-cmd-gold">{item.actionLabel} →</p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-cmd-muted" />
          </button>
        ))}
      </div>
    </section>
  );
}
