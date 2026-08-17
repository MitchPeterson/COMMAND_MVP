import { SectionIntro } from '../components/SectionIntro';
import { familiarityState, introFor } from '../lib/sectionIntros';
import React from 'react';
import { useHousehold } from '../useHousehold';
import { FamilyHealth } from '../components/FamilyHealth';
import { FamilyTimeline } from '../components/FamilyTimeline';
import { ProtectionGap } from '../components/ProtectionGap';
import { ageOf } from '../lib/familyTimeline';
import { Users, Gift, Heart } from 'lucide-react';

export function FamilyView() {
  const { data } = useHousehold();
  const members = data?.familyMembers ?? [];
  const milestones = (data?.familyMilestones ?? []).slice().sort((a, b) => {
    if (!a.event_date) return 1;
    if (!b.event_date) return -1;
    return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
  });
  const upcomingMilestones = milestones.filter((event) => {
    return event.event_date ? new Date(event.event_date) >= new Date() : false;
  }).slice(0, 2);


  const familiarity = familiarityState((data?.familyMembers ?? []).length);
  // The uploader stays on the page; the intro's action takes you to it.
  const goToUploader = () =>
    document.getElementById('section-uploader')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return (
    <div className="space-y-6">
      {/* The grade leads, as on every section. */}
      {familiarity === 'unstarted' ? (
        <SectionIntro
          intro={introFor('family')!}
          icon={<Users className="h-5 w-5" />}
          onAction={goToUploader}
        />
      ) : (
        <FamilyHealth
          members={members}
          profile={data?.profile ?? null}
          policies={data?.insurancePolicies ?? []}
          mortgage={data?.mortgage ?? null}
          legalDocuments={data?.legalDocuments ?? []}
        />
      )}

      <ProtectionGap
        members={members}
        profile={data?.profile ?? null}
        policies={data?.insurancePolicies ?? []}
        mortgage={data?.mortgage ?? null}
      />

      <FamilyTimeline members={members} profile={data?.profile ?? null} />

      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Family members</p>
            <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">People on the plan</h2>
          </div>
          <span className="rounded-full border border-cmd-border bg-cmd-black/60 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cmd-muted">
            {members.length} person{members.length === 1 ? '' : 's'}
          </span>
        </div>
        {members.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
            No family members added yet. Add household members to keep everyone aligned.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {members.map((member) => (
              <div key={member.id} className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-5">
                <div className="flex items-center gap-3 text-cmd-gold">
                  <Heart className="h-5 w-5" />
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-cmd-muted">{member.relationship}</p>
                    <h3 className="mt-2 text-xl font-semibold text-cmd-offwhite">{member.name}</h3>
                  </div>
                </div>
                <p className="mt-4 text-sm text-cmd-muted">
                  {member.birth_date
                    ? `Born ${member.birth_date}${ageOf(member.birth_date) != null ? ` · ${Math.floor(ageOf(member.birth_date)!)} years old` : ''}`
                    : 'Birth date not recorded — add it on your profile and this person joins the timeline'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Upcoming milestones</p>
            <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Family milestones</h2>
          </div>
          <span className="rounded-full border border-cmd-border bg-cmd-black/60 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cmd-muted">
            {milestones.length} milestone{milestones.length === 1 ? '' : 's'}
          </span>
        </div>
        {milestones.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
            No milestones tracked yet. Add important events to keep the household on schedule.
          </div>
        ) : (
          <div className="space-y-4">
            {milestones.map((event) => (
              <div key={event.id} className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-5 sm:flex sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Gift className="h-5 w-5 text-cmd-gold" />
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-cmd-muted">{event.category ?? 'Family event'}</p>
                    <h3 className="mt-2 text-xl font-semibold text-cmd-offwhite">{event.title}</h3>
                    <p className="mt-2 text-sm text-cmd-muted">{event.triggers_review?.join(', ') || 'No review triggers set'}</p>
                  </div>
                </div>
                <div className="mt-4 text-left sm:mt-0 sm:text-right">
                  <p className="text-sm text-cmd-muted">Date</p>
                  <p className="mt-1 font-semibold text-cmd-offwhite">{event.event_date ?? 'TBD'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
