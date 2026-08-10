// The family calendar.
//
// Almost everything that matters for a household with children is a date times
// a dollar amount, and the dates all fall out of birth dates already on file.
// Nothing here needs to be entered — it is arithmetic on ages.
//
// Two rules about how these are worded:
//
//   * Ages that are federal law are stated plainly (a dependent can stay on a
//     parent's health plan to 26). Ages that vary by state or by account are
//     stated as varying, with a note to confirm — Command does not know which
//     custodial account someone opened or under which state's act.
//   * Nothing here is advice about what to do. It is a date, what changes on
//     that date, and where in Command the related record lives.

import type { FamilyMember } from './supabase';

export type EventKind =
  | 'driving'
  | 'legal_adult'
  | 'college_start'
  | 'custodial_transfer'
  | 'health_plan_end'
  | 'trump_account_converts';

export interface FamilyEvent {
  memberId: string;
  memberName: string;
  kind: EventKind;
  /** Calendar year it lands in. */
  year: number;
  age: number;
  title: string;
  detail: string;
  /** Set where the event carries a predictable cost or a document to prepare. */
  action: string | null;
  /** Which section of Command holds the record this touches. */
  section: 'insurance' | 'legal' | 'finances' | 'family' | null;
  /** True where the age varies by state or account and the user should check. */
  varies: boolean;
}

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

export function ageOf(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const born = new Date(`${birthDate}T00:00:00Z`).getTime();
  if (Number.isNaN(born)) return null;
  const years = (Date.now() - born) / YEAR_MS;
  return years >= 0 && years < 130 ? years : null;
}

function yearAtAge(birthDate: string, age: number): number {
  return new Date(`${birthDate}T00:00:00Z`).getUTCFullYear() + age;
}

/**
 * Custodial accounts transfer to the child at the age of majority under the
 * state's transfers-to-minors act, which is 21 in Minnesota and 18 in many
 * other states — and an individual account can specify differently. Command
 * shows the state's usual age and says to confirm rather than asserting a law.
 */
const UTMA_21_STATES = new Set(['MN', 'CA', 'NV', 'NJ', 'PA', 'VA', 'NC', 'TN', 'MA']);

export function custodialAge(state: string | null | undefined): { age: number; certain: boolean } {
  const code = (state ?? '').trim().toUpperCase();
  if (UTMA_21_STATES.has(code)) return { age: 21, certain: false };
  return { age: 18, certain: false };
}

export function eventsForMember(member: FamilyMember, state: string | null | undefined): FamilyEvent[] {
  if (!member.birth_date) return [];
  const age = ageOf(member.birth_date);
  if (age == null || age >= 30) return [];

  const custodial = custodialAge(state);
  const name = member.name.split(/\s+/)[0];

  const events: Array<Omit<FamilyEvent, 'memberId' | 'memberName' | 'year'> & { at: number }> = [
    {
      at: 16, kind: 'driving', age: 16,
      title: `${name} can drive`,
      detail:
        'Adding a teenage driver typically raises an auto premium substantially — often by half again or ' +
        'more. It is one of the few household cost increases you can see coming years ahead.',
      action: 'Ask your carrier what it will cost before the birthday, not after.',
      section: 'insurance', varies: true,
    },
    {
      at: 18, kind: 'legal_adult', age: 18,
      title: `${name} becomes a legal adult`,
      detail:
        'At 18 a parent has no automatic right to a child’s medical information or to act on their ' +
        'behalf. A hospital can decline to discuss their care with you, and a bank can decline to let ' +
        'you help with an account — including while they are away at school.',
      action:
        'A HIPAA authorization, a healthcare power of attorney and a financial power of attorney, ' +
        'signed by them. Three short documents that only matter on the day they are needed.',
      section: 'legal', varies: false,
    },
    {
      at: 18, kind: 'college_start', age: 18,
      title: `${name} would start college`,
      detail:
        'Assumes starting the autumn after turning 18. This is the year education funding has to be ' +
        'ready, and the year a 529 begins drawing down rather than growing.',
      action: null,
      section: 'finances', varies: true,
    },
    {
      at: custodial.age, kind: 'custodial_transfer', age: custodial.age,
      title: `Custodial accounts transfer to ${name}`,
      detail:
        `Money in an UTMA or UGMA account becomes theirs outright, to spend as they choose. The age is ` +
        `${custodial.age} in most cases here, but it varies by state and the account itself can specify ` +
        `differently — worth confirming with whoever holds it.`,
      action: 'Only relevant if a custodial account exists. Confirm the age with the custodian.',
      section: 'finances', varies: true,
    },
    {
      at: 18, kind: 'trump_account_converts', age: 18,
      title: `${name}'s Trump account becomes a traditional IRA`,
      detail:
        'Only relevant if one was opened. No withdrawals are allowed before this point, and from 18 it ' +
        'follows ordinary traditional-IRA rules — taxed as income on withdrawal, with a 10% penalty ' +
        'before 59½ except for education, a first home, or disaster recovery.',
      action: null,
      section: 'finances', varies: false,
    },
    {
      at: 26, kind: 'health_plan_end', age: 26,
      title: `${name} comes off your health plan`,
      detail:
        'Federal law allows a dependent to stay on a parent’s plan until they turn 26, and not past it. ' +
        'Coverage typically ends at the end of that birthday month or the plan year, depending on the plan.',
      action: 'They will need their own cover from that point.',
      section: 'insurance', varies: false,
    },
  ];

  return events
    .filter((event) => age < event.at)
    .map((event) => ({
      memberId: member.id,
      memberName: member.name,
      kind: event.kind,
      year: yearAtAge(member.birth_date!, event.at),
      age: event.age,
      title: event.title,
      detail: event.detail,
      action: event.action,
      section: event.section,
      varies: event.varies,
    }));
}

export interface TimelineYear {
  year: number;
  events: FamilyEvent[];
}

/** Every upcoming event across the household, grouped by year. */
export function familyTimeline(
  members: FamilyMember[],
  state: string | null | undefined,
  horizonYears = 20,
): TimelineYear[] {
  const thisYear = new Date().getFullYear();
  const byYear = new Map<number, FamilyEvent[]>();

  for (const member of members) {
    for (const event of eventsForMember(member, state)) {
      if (event.year > thisYear + horizonYears) continue;
      const list = byYear.get(event.year) ?? [];
      list.push(event);
      byYear.set(event.year, list);
    }
  }

  return [...byYear.entries()]
    .map(([year, events]) => ({ year, events }))
    .sort((a, b) => a.year - b.year);
}

export interface TrumpAccountStanding {
  member: FamilyMember;
  birthYear: number | null;
  /** Any child under 18 with a Social Security number may hold one. */
  canHold: boolean;
  /** The one-time $1,000 federal contribution is limited to a birth-year window. */
  seedEligible: boolean;
}

/**
 * Trump accounts, as enacted in 2025 and launched in July 2026.
 *
 * Two separate questions that are easy to conflate: any child under 18 with a
 * Social Security number may hold an account, but the one-time $1,000 federal
 * contribution is limited to children born between 1 January 2025 and
 * 31 December 2028, and only when an election is filed on the child's behalf.
 *
 * Command computes both from birth dates it already holds. It does not compute
 * whether opening one is a good idea — see the note the UI carries: for
 * education specifically a 529 usually wins, because 529 growth is tax-free for
 * qualified expenses while a Trump account is taxed as ordinary income on the
 * way out.
 */
const SEED_BIRTH_WINDOW = { from: 2025, to: 2028 };

export function trumpAccountStanding(members: FamilyMember[]): TrumpAccountStanding[] {
  return members
    .filter((m) => ['child', 'son', 'daughter'].includes((m.relationship ?? '').toLowerCase()))
    .map((member) => {
      const age = ageOf(member.birth_date);
      const birthYear = member.birth_date
        ? new Date(`${member.birth_date}T00:00:00Z`).getUTCFullYear()
        : null;
      return {
        member,
        birthYear,
        canHold: age !== null && age < 18,
        seedEligible:
          birthYear !== null &&
          birthYear >= SEED_BIRTH_WINDOW.from &&
          birthYear <= SEED_BIRTH_WINDOW.to,
      };
    });
}

/** Children under 18, which several checks elsewhere depend on. */
export function minorChildren(members: FamilyMember[]): FamilyMember[] {
  return members.filter((m) => {
    const relationship = (m.relationship ?? '').toLowerCase();
    if (!['child', 'son', 'daughter'].includes(relationship)) return false;
    const age = ageOf(m.birth_date);
    return age !== null && age < 18;
  });
}

/** Years until the youngest child is 22, the usual end of financial dependence. */
export function yearsToIndependence(members: FamilyMember[], independenceAge = 22): number | null {
  const ages = members
    .filter((m) => ['child', 'son', 'daughter'].includes((m.relationship ?? '').toLowerCase()))
    .map((m) => ageOf(m.birth_date))
    .filter((a): a is number => a !== null);
  if (ages.length === 0) return null;
  const youngest = Math.min(...ages);
  return Math.max(0, Math.round(independenceAge - youngest));
}
