// The security statement, rendered from one source.
//
// Three places need it at three lengths — enrollment, the Profile page, and the
// moment a file is handed over — and three copies of this text would have
// drifted apart within a month. All of it comes from lib/securityPosture.ts.

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Lock, ShieldCheck } from 'lucide-react';
import {
  SECURITY_CLAIMS, SECURITY_SUMMARY, POSTURE_VERIFIED_ON,
} from '../lib/securityPosture';

/** The full list. Collapsed by default on Profile, open on a dedicated view. */
export function SecurityPosture({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="flex items-center gap-3">
          <ShieldCheck className="h-4 w-4 text-cmd-muted" />
          <span>
            <span className="block text-sm font-semibold text-cmd-offwhite">
              How your data is handled
            </span>
            <span className="block text-xs text-cmd-muted">
              The controls in place today, and what makes each one true
            </span>
          </span>
        </span>
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-cmd-muted" />
          : <ChevronRight className="h-4 w-4 shrink-0 text-cmd-muted" />}
      </button>

      {open && (
        <div className="mt-6">
          <div className="space-y-3">
            {SECURITY_CLAIMS.map((claim) => (
              <div
                key={claim.id}
                className="rounded-2xl border border-cmd-border bg-cmd-charcoal p-5"
              >
                <p className="text-sm font-semibold text-cmd-offwhite">{claim.title}</p>
                <p className="mt-2 text-sm leading-6 text-cmd-muted">{claim.detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-cmd-muted/70">
            Accurate as of {POSTURE_VERIFIED_ON}. Each statement above describes something Command
            does rather than a standard it claims to meet.
          </p>
        </div>
      )}
    </section>
  );
}

/**
 * The enrollment version. Short, because a wall of security copy at the moment
 * of signing up reads as protesting too much.
 */
export function SecurityNote({ palette = 'brand' }: { palette?: 'brand' | 'auth' }) {
  const [open, setOpen] = useState(false);
  const auth = palette === 'auth';
  const border = auth ? 'border-[#2a2b2e]' : 'border-cmd-border';
  const muted = auth ? 'text-[#808084]' : 'text-cmd-muted';
  const offwhite = auth ? 'text-[#F6F6F4]' : 'text-cmd-offwhite';
  const gold = auth ? 'text-[#C9A24D]' : 'text-cmd-gold';

  return (
    <div className={`rounded-xl border ${border} bg-black/20 px-4 py-3.5`}>
      <div className="flex items-start gap-2.5">
        <Lock className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${gold}`} />
        <div className="min-w-0">
          <p className={`text-xs font-semibold ${offwhite}`}>Before you hand over a document</p>
          <p className={`mt-1.5 text-xs leading-5 ${muted}`}>{SECURITY_SUMMARY}</p>
          {open && (
            <ul className={`mt-3 space-y-2 text-xs leading-5 ${muted}`}>
              {SECURITY_CLAIMS.map((claim) => (
                <li key={claim.id}>
                  <span className={offwhite}>{claim.title}.</span> {claim.detail}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={`mt-2 text-xs font-medium ${gold} transition hover:opacity-80`}
          >
            {open ? 'Show less' : 'What else is in place'}
          </button>
        </div>
      </div>
    </div>
  );
}
