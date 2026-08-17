// Is the person this document names someone already on file?
//
// A policy says MARCUS J WHITFIELD; the household has "Marcus". A will says
// "Priya Anand Whitfield"; the profile says "Priya". Neither is a new person,
// and Command asked to add both — so answering the question honestly created a
// duplicate of someone already there.
//
// The strict test in followUps.ts decides whether to ask at all, and it stays
// strict: suppressing a question on a guess is worse than asking one. This is
// the other side of it — once the question is being asked, these are the people
// it might already be about, ranked, each with the reason it is a candidate so
// the user is choosing rather than trusting.
//
// Nothing here decides anything. A suggestion is offered and a person picks.

import type { FamilyMember } from './supabase';

export interface PersonCandidate {
  member: FamilyMember;
  /** 0–1, only for ordering. Never shown, never used as a threshold to act. */
  score: number;
  /** Why this person is a candidate, in the user's terms. */
  reason: string;
}

/** Documents shout, abbreviate, and put the surname first. */
export function nameWords(value: string | null | undefined): string[] {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/**
 * Short forms a household actually uses, where the short form is not simply the
 * start of the long one. "Mitch" for "Mitchell" needs no table; "Bob" for
 * "Robert" does.
 */
const SHORT_FORMS: Record<string, string> = {
  bob: 'robert', rob: 'robert', bobby: 'robert',
  bill: 'william', billy: 'william', liam: 'william',
  dick: 'richard', rick: 'richard', rich: 'richard',
  jim: 'james', jimmy: 'james', jack: 'john',
  peggy: 'margaret', meg: 'margaret', maggie: 'margaret',
  betty: 'elizabeth', liz: 'elizabeth', beth: 'elizabeth', eliza: 'elizabeth',
  mike: 'michael', mick: 'michael',
  hank: 'henry', harry: 'harold', chuck: 'charles', charlie: 'charles',
  ted: 'edward', ned: 'edward', ed: 'edward',
  tony: 'anthony', sandy: 'sandra', sally: 'sarah', polly: 'mary',
  kate: 'katherine', katie: 'katherine', kathy: 'katherine',
  nate: 'nathaniel', gus: 'august', tina: 'christina', chris: 'christopher',
};

/**
 * Two first names that a household would treat as one person's.
 *
 * The prefix rule carries most of it — Mitch/Mitchell, Dan/Daniel,
 * Sam/Samuel — and the table above covers the ones it cannot.
 */
export function sameFirstName(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length >= 3 && long.startsWith(short)) return true;
  return SHORT_FORMS[a] === b || SHORT_FORMS[b] === a
    || Boolean(SHORT_FORMS[a] && SHORT_FORMS[a] === SHORT_FORMS[b]);
}

/** A single letter carrying a stop: the "J" in MARCUS J WHITFIELD. */
function initials(value: string | null | undefined): string[] {
  return (value ?? '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length === 1);
}

/**
 * A document name against one person on file. Returns null when there is no
 * reason to think they are the same, so a household of five does not offer five
 * candidates for a stranger.
 */
export function scoreAgainst(documentName: string, member: FamilyMember): PersonCandidate | null {
  const doc = nameWords(documentName);
  const own = nameWords(member.name);
  if (doc.length === 0 || own.length === 0) return null;

  const docSet = new Set(doc);
  const ownSet = new Set(own);
  const shared = own.filter((w) => docSet.has(w));

  const sortedDoc = [...doc].sort().join(' ');
  const sortedOwn = [...own].sort().join(' ');
  if (sortedDoc === sortedOwn) {
    // Same words, but "MARCUS J WHITFIELD" is not written the way the household
    // writes it, and saying so would be the sort of small wrongness that makes
    // someone stop believing the rest.
    const identical = documentName.trim().toLowerCase() === (member.name ?? '').trim().toLowerCase();
    return {
      member,
      score: 1,
      reason: identical
        ? 'The same name, written the same way.'
        : 'The same name, once initials and capitalization are set aside.',
    };
  }

  const [shortSet, longSet] = own.length <= doc.length ? [own, doc] : [doc, own];
  const otherSet = shortSet === own ? docSet : ownSet;
  if (shortSet.length >= 2 && shortSet.every((w) => otherSet.has(w))) {
    return { member, score: 0.95, reason: 'Every part of the shorter name appears in the longer one.' };
  }

  const sameFirst = doc[0] === own[0];
  const sameLast = doc[doc.length - 1] === own[own.length - 1];

  if (sameFirst && sameLast) {
    return { member, score: 0.9, reason: 'The first and last names both match.' };
  }

  // Mitch against MITCHELL. Without this, the person the document actually
  // names ranked level with every other relative who shares the surname.
  if (sameLast && sameFirstName(doc[0], own[0])) {
    const [shortForm, longForm] = doc[0].length <= own[0].length ? [doc[0], own[0]] : [own[0], doc[0]];
    const title = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
    return {
      member,
      score: 0.85,
      reason: `The last name matches, and ${title(shortForm)} is a short form of ${title(longForm)}.`,
    };
  }

  // "M WHITFIELD" against "Marcus Whitfield".
  if (sameLast && initials(documentName).some((i) => own.some((w) => w.startsWith(i)))) {
    return { member, score: 0.75, reason: 'The last name matches and the initial fits.' };
  }

  // The case that started this: one name on file, a full name in the document.
  if (own.length === 1 && docSet.has(own[0])) {
    return {
      member,
      score: doc[0] === own[0] ? 0.7 : 0.55,
      reason: `Your household records this person as ${member.name}, which the document's name contains.`,
    };
  }
  if (doc.length === 1 && ownSet.has(doc[0])) {
    return { member, score: 0.7, reason: `The document gives one name, and ${member.name} carries it.` };
  }

  if (sameLast) {
    return { member, score: 0.4, reason: `Shares the last name with ${member.name}, but the first name differs.` };
  }
  if (shared.length > 0) {
    return { member, score: 0.3, reason: `Shares a name with ${member.name}.` };
  }
  return null;
}

/** You, then a spouse, then everyone else — the order a household reads in. */
function relationshipRank(relationship: string): number {
  const r = (relationship ?? '').toLowerCase();
  if (r.includes('self')) return 0;
  if (r.includes('spouse') || r.includes('partner')) return 1;
  return 2;
}

/**
 * Everyone on file who could be the person a document named, likeliest first.
 * A weak candidate is still worth showing — the user knows their own family and
 * can tell in a second — but a stranger produces an empty list rather than a
 * lineup of unrelated relatives.
 */
export function rankPeople(documentName: string, members: FamilyMember[]): PersonCandidate[] {
  return members
    .map((m) => scoreAgainst(documentName, m))
    .filter((c): c is PersonCandidate => c !== null)
    .sort((a, b) => b.score - a.score
      || relationshipRank(a.member.relationship) - relationshipRank(b.member.relationship)
      || a.member.name.localeCompare(b.member.name));
}
