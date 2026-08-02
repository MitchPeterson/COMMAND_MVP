import React from 'react';
import { useHousehold } from '../useHousehold';
import { Users, Gift, Calendar, Heart } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-8 shadow-sm shadow-black/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Family hub</p>
            <h1 className="mt-3 text-3xl font-semibold text-cmd-offwhite">Family</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cmd-border bg-cmd-black/50 px-4 py-2 text-sm text-cmd-muted">
            <Users className="h-4 w-4" /> {members.length} member{members.length === 1 ? '' : 's'}
          </div>
        </div>
      </section>

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
                <p className="mt-4 text-sm text-cmd-muted">Born {member.birth_date ?? 'unknown'}</p>
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
                <div className="mt-4 text-right sm:mt-0">
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
