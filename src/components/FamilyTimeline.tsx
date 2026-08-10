import React from 'react';
import type { FamilyMember, HouseholdProfile } from '../lib/supabase';
import { familyTimeline, trumpAccountStanding, type EventKind } from '../lib/familyTimeline';
import { Banknote, CalendarClock, Car, GraduationCap, HeartPulse, Scale } from 'lucide-react';

interface Props {
  members: FamilyMember[];
  profile?: HouseholdProfile | null;
}

const ICONS: Record<EventKind, React.ElementType> = {
  driving: Car,
  legal_adult: Scale,
  college_start: GraduationCap,
  custodial_transfer: Banknote,
  health_plan_end: HeartPulse,
  trump_account_converts: Banknote,
};

const SECTION_LABEL: Record<string, string> = {
  insurance: 'Insurance',
  legal: 'Legal',
  finances: 'Finances',
  family: 'Family',
};

export function FamilyTimeline({ members, profile }: Props) {
  const timeline = familyTimeline(members, profile?.state);
  const trump = trumpAccountStanding(members);
  const thisYear = new Date().getFullYear();

  const seedEligible = trump.filter((t) => t.seedEligible);
  const canHold = trump.filter((t) => t.canHold && !t.seedEligible);

  return (
    <>
      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
        <div className="flex items-center gap-3 text-cmd-gold">
          <CalendarClock className="h-5 w-5" />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Worked out from birth dates</p>
            <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">What's coming, and when</h2>
          </div>
        </div>

        {timeline.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-cmd-border bg-cmd-black/40 p-5 text-sm text-cmd-muted">
            Nothing to plot yet. Add birth dates for the people in your household on your profile and this
            builds itself — no other information needed.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {timeline.map((year) => (
              <div key={year.year} className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-4">
                <p className="font-mono text-lg font-semibold text-cmd-offwhite">
                  {year.year}
                  <span className="ml-2 font-sans text-xs font-normal text-cmd-muted">
                    {year.year === thisYear ? 'this year' : `in ${year.year - thisYear} year${year.year - thisYear === 1 ? '' : 's'}`}
                  </span>
                </p>
                <div className="mt-3 space-y-3">
                  {year.events.map((event, i) => {
                    const Icon = ICONS[event.kind];
                    return (
                      <div key={i} className="flex gap-3">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cmd-gold" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-cmd-offwhite">
                            {event.title}
                            <span className="ml-2 text-xs font-normal text-cmd-muted">at {event.age}</span>
                            {event.varies && (
                              <span className="ml-2 text-[10px] text-cmd-muted/70">age varies — confirm</span>
                            )}
                          </p>
                          <p className="mt-1 text-sm text-cmd-muted">{event.detail}</p>
                          {event.action && (
                            <p className="mt-1 text-sm text-cmd-gold">{event.action}</p>
                          )}
                          {event.section && (
                            <p className="mt-1 text-[11px] text-cmd-muted/70">
                              Related records live in {SECTION_LABEL[event.section]}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Trump accounts: the eligibility is arithmetic, the recommendation is not. */}
      {(seedEligible.length > 0 || canHold.length > 0) && (
        <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Trump accounts</p>
          <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Where your children stand</h2>

          {seedEligible.length > 0 && (
            <div className="mt-4 rounded-2xl border border-cmd-gold/25 bg-cmd-gold/5 p-4">
              <p className="text-sm font-semibold text-cmd-offwhite">
                {seedEligible.map((t) => t.member.name.split(/\s+/)[0]).join(' and ')} qualif
                {seedEligible.length === 1 ? 'ies' : 'y'} for the $1,000 federal contribution
              </p>
              <p className="mt-1 text-sm text-cmd-muted">
                Born between 2025 and 2028, which is the window for the one-time Treasury contribution.
                It requires an election filed on the child's behalf — it does not arrive by itself.
              </p>
            </div>
          )}

          {canHold.length > 0 && (
            <div className="mt-4 rounded-2xl border border-cmd-border bg-cmd-black/40 p-4">
              <p className="text-sm font-semibold text-cmd-offwhite">
                {canHold.map((t) => t.member.name.split(/\s+/)[0]).join(', ')} can hold an account, but
                {canHold.length === 1 ? ' does' : ' do'} not qualify for the $1,000
              </p>
              <p className="mt-1 text-sm text-cmd-muted">
                Any child under 18 with a Social Security number may have one. The federal contribution is
                limited to children born from 2025 onward, and{' '}
                {canHold.map((t) => t.member.name.split(/\s+/)[0]).join(' and ')} predate{canHold.length === 1 ? 's' : ''} that.
              </p>
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-cmd-border bg-cmd-black/30 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">How they work</p>
            <ul className="mt-2 space-y-1.5 text-sm text-cmd-muted">
              <li>· Up to $5,000 a year from family, of which an employer may contribute $2,500 without it counting as your income.</li>
              <li>· Contributions are after-tax. Growth is untaxed inside the account but taxed as ordinary income when it comes out.</li>
              <li>· Nothing can be withdrawn until the end of the year the child turns 17.</li>
              <li>· At 18 the account becomes a traditional IRA, with the usual 10% penalty before 59½ except for education, a first home, or disaster recovery.</li>
              <li>· Investments must track a broad US equity index, with fees capped at 0.1%.</li>
            </ul>
            <p className="mt-3 text-sm text-cmd-muted">
              <span className="text-cmd-offwhite">For education specifically, a 529 usually wins.</span>{' '}
              Its growth is tax-free for qualified expenses where a Trump account's is taxed as income,
              and up to $35,000 of a 529 can later roll into a Roth IRA. The Trump account's real
              advantages are the free $1,000 if you qualify and employer money if it is offered.
            </p>
            <p className="mt-2 text-[11px] text-cmd-muted/70">
              Rules as enacted in 2025 and launched July 2026. Command is not a tax adviser — confirm
              anything here before acting on it.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
