// "Is this someone you already have?"
//
// Answering yes to "is MARCUS J WHITFIELD part of your household?" used to open
// an empty form and add a second Marcus, because the only thing the question
// could do was create. A policy writes a full legal name and a household writes
// what it calls someone, and those are hardly ever the same string.
//
// So the question gets a middle answer. The people already on file who could be
// this person are offered first, each with the reason it is a candidate, and
// only then the option to add someone new. Choosing a person records the match
// against the extracted row, which is what stops the question coming back.

import React, { useState } from 'react';
import { Check, UserPlus, Users } from 'lucide-react';
import type { FamilyMember } from '../lib/supabase';
import { resolveInsuredPartyMatch } from '../lib/supabase';
import { rankPeople } from '../lib/personMatch';

interface Props {
  /** The name exactly as the document wrote it. */
  documentName: string;
  /** The extracted row, where the answer is recorded. */
  partyId: string | null;
  members: FamilyMember[];
  /** The user chose to add someone new — hand off to the editor. */
  onAddNew: () => void;
  onDone: () => Promise<void> | void;
  onCancel: () => void;
}

export function MatchPerson({ documentName, partyId, members, onAddNew, onDone, onCancel }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const candidates = rankPeople(documentName, members);

  const link = async (member: FamilyMember) => {
    if (!partyId) {
      // Nothing to write the match against; adding is the only honest option.
      setError('Command could not find the record this question came from. Add the person instead.');
      return;
    }
    setBusy(member.id);
    setError(null);
    try {
      await resolveInsuredPartyMatch(partyId, member.id);
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that match.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-3xl border border-cmd-gold/30 bg-cmd-charcoal p-6">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-cmd-gold" />
        <p className="text-xs uppercase tracking-[0.24em] text-cmd-gold">From your policy</p>
      </div>
      <h2 className="mt-3 text-2xl font-semibold text-cmd-offwhite">
        Your document names {documentName}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
        {candidates.length > 0
          ? `That may be someone you already have on file — paperwork uses full legal names and
             households do not. Pick the person it is, and Command will remember that these are the
             same one without changing the name you use.`
          : `Nobody on file looks like this person. Adding them keeps ages, milestones and coverage
             findings accurate.`}
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
          {error}
        </div>
      )}

      {candidates.length > 0 && (
        <div className="mt-5 space-y-2">
          {candidates.map(({ member, reason }) => (
            <button
              key={member.id}
              type="button"
              disabled={busy !== null}
              onClick={() => link(member)}
              className="flex w-full items-center gap-4 rounded-2xl border border-cmd-border bg-cmd-black/40 p-4 text-left transition hover:border-cmd-gold/40 disabled:opacity-50"
            >
              <Check className="h-4 w-4 shrink-0 text-cmd-gold" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-cmd-offwhite">
                  This is {member.name}
                  <span className="ml-2 text-xs font-normal uppercase tracking-[0.16em] text-cmd-muted">
                    {member.relationship}
                  </span>
                </p>
                <p className="mt-1 text-sm leading-6 text-cmd-muted">{reason}</p>
              </div>
              {busy === member.id && <span className="shrink-0 text-xs text-cmd-muted">Saving…</span>}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-cmd-border pt-5">
        <button
          type="button"
          onClick={onAddNew}
          className="inline-flex items-center gap-2 rounded-xl border border-cmd-gold bg-cmd-gold/15 px-4 py-2 text-sm font-semibold text-cmd-gold transition hover:bg-cmd-gold/25"
        >
          <UserPlus className="h-4 w-4" />
          {candidates.length > 0 ? 'None of these — add a new person' : `Add ${documentName}`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-cmd-border px-4 py-2 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
        >
          Not now
        </button>
      </div>
    </section>
  );
}
