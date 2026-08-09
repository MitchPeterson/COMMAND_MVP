import React, { useState } from 'react';
import {
  addFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  isChildRelationship,
  isSelfRelationship,
  isSpouseRelationship,
  type FamilyMember,
  type HouseholdProfile,
  type Relationship,
} from '../lib/supabase';
import { Baby, Heart, Plus, Trash2, UserCircle2 } from 'lucide-react';

interface Props {
  householdId: string;
  members: FamilyMember[];
  profile: HouseholdProfile | null;
  onSaved: () => Promise<void> | void;
}

interface PersonForm {
  name: string;
  relationship: Relationship;
  birth_date: string;
}

const RELATIONSHIPS: Array<{ value: Relationship; label: string }> = [
  { value: 'Self', label: 'You' },
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Partner', label: 'Partner' },
  { value: 'Child', label: 'Child' },
  { value: 'Other', label: 'Other' },
];

const input =
  'w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2.5 text-sm text-cmd-offwhite ' +
  'placeholder-cmd-muted/50 outline-none transition focus:border-cmd-gold/50';
const label = 'text-[11px] uppercase tracking-[0.16em] text-cmd-muted';

/** Whole years as of today. Birthdays are the reason this is not stored. */
function ageFrom(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const born = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const beforeBirthday =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

function formatBirthDate(birthDate: string | null): string {
  if (!birthDate) return 'Birth date not set';
  const date = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return birthDate;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function iconFor(relationship: string) {
  if (isChildRelationship(relationship)) return Baby;
  if (isSpouseRelationship(relationship)) return Heart;
  return UserCircle2;
}

/** Sorted the way a household reads: you, then spouse, then children by age. */
function order(member: FamilyMember): number {
  if (isSelfRelationship(member.relationship)) return 0;
  if (isSpouseRelationship(member.relationship)) return 1;
  if (isChildRelationship(member.relationship)) return 2;
  return 3;
}

function PersonFields({
  form,
  onChange,
  lockRelationship,
}: {
  form: PersonForm;
  onChange: (next: PersonForm) => void;
  lockRelationship?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className={label}>Name</label>
        <input
          className={`${input} mt-1.5`}
          value={form.name}
          autoFocus
          placeholder="Full name"
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div>
        <label className={label}>Birth date</label>
        <input
          className={`${input} mt-1.5`}
          type="date"
          value={form.birth_date}
          onChange={(e) => onChange({ ...form, birth_date: e.target.value })}
        />
      </div>
      {!lockRelationship && (
        <div className="sm:col-span-2">
          <p className={label}>Relationship</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {RELATIONSHIPS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => onChange({ ...form, relationship: r.value })}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  form.relationship === r.value
                    ? 'border-cmd-gold bg-cmd-gold/15 text-cmd-gold'
                    : 'border-cmd-border bg-cmd-black/40 text-cmd-muted hover:text-cmd-offwhite'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The household's people, backed by `family_members`. Writes here also reconcile
 * the profile's denormalised copies (partner name, number of children) — see
 * syncProfilePeople — so nothing downstream reads a stale count.
 */
export function PeopleEditor({ householdId, members, profile, onSaved }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PersonForm | null>(null);
  const [adding, setAdding] = useState<Relationship | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);

  const sorted = members
    .slice()
    .sort((a, b) => order(a) - order(b) || (a.birth_date ?? '').localeCompare(b.birth_date ?? ''));

  const hasSelf = members.some((m) => isSelfRelationship(m.relationship));
  const hasSpouse = members.some((m) => isSpouseRelationship(m.relationship));
  const childCount = members.filter((m) => isChildRelationship(m.relationship)).length;

  // Onboarding recorded a partner's name and a child count without always
  // creating rows for them, so the profile can know about people this list does
  // not. Say so rather than silently disagreeing with the dashboard.
  const missingSpouse = !hasSpouse && Boolean(profile?.partner_name);
  const missingChildren = Math.max((profile?.num_children ?? 0) - childCount, 0);

  const startAdd = (relationship: Relationship) => {
    setError(null);
    setEditingId(null);
    setAdding(relationship);
    setForm({
      name:
        relationship === 'Self'
          ? profile?.primary_name ?? ''
          : relationship === 'Spouse' && missingSpouse
            ? profile?.partner_name ?? ''
            : '',
      relationship,
      birth_date: '',
    });
  };

  const startEdit = (member: FamilyMember) => {
    setError(null);
    setAdding(null);
    setEditingId(member.id);
    setForm({
      name: member.name,
      relationship: (RELATIONSHIPS.find((r) => r.value.toLowerCase() === member.relationship.toLowerCase())?.value ??
        (isChildRelationship(member.relationship)
          ? 'Child'
          : isSpouseRelationship(member.relationship)
            ? 'Spouse'
            : isSelfRelationship(member.relationship)
              ? 'Self'
              : 'Other')) as Relationship,
      birth_date: member.birth_date ?? '',
    });
  };

  const cancel = () => {
    setAdding(null);
    setEditingId(null);
    setForm(null);
    setError(null);
  };

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      setError('A name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editingId) {
        await updateFamilyMember(
          householdId,
          editingId,
          {
            name: form.name,
            relationship: form.relationship,
            birth_date: form.birth_date || null,
          },
          members.find((m) => m.id === editingId),
        );
      } else {
        await addFamilyMember(householdId, {
          name: form.name,
          relationship: form.relationship,
          birth_date: form.birth_date || null,
        });
      }
      await onSaved();
      cancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this person.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (member: FamilyMember) => {
    setBusy(true);
    setError(null);
    try {
      await deleteFamilyMember(householdId, member);
      await onSaved();
      setConfirmingRemoveId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove this person.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Household</p>
          <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">People</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {!hasSelf && (
            <button
              type="button"
              onClick={() => startAdd('Self')}
              className="inline-flex items-center gap-2 rounded-xl border border-cmd-border px-3.5 py-2 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
            >
              <Plus className="h-4 w-4" /> Add you
            </button>
          )}
          {!hasSpouse && (
            <button
              type="button"
              onClick={() => startAdd('Spouse')}
              className="inline-flex items-center gap-2 rounded-xl border border-cmd-border px-3.5 py-2 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
            >
              <Plus className="h-4 w-4" /> Add spouse
            </button>
          )}
          <button
            type="button"
            onClick={() => startAdd('Child')}
            className="inline-flex items-center gap-2 rounded-xl border border-cmd-gold bg-cmd-gold/15 px-3.5 py-2 text-sm font-semibold text-cmd-gold transition hover:bg-cmd-gold/25"
          >
            <Plus className="h-4 w-4" /> Add child
          </button>
        </div>
      </div>

      {(missingSpouse || missingChildren > 0) && !adding && (
        <div className="mb-4 rounded-2xl border border-cmd-gold/25 bg-cmd-gold/5 px-5 py-4 text-sm text-cmd-muted">
          Your profile records{' '}
          {[
            missingSpouse ? `a partner (${profile?.partner_name})` : null,
            missingChildren > 0 ? `${missingChildren} child${missingChildren === 1 ? '' : 'ren'}` : null,
          ]
            .filter(Boolean)
            .join(' and ')}{' '}
          who {missingSpouse && missingChildren === 0 ? 'is' : 'are'} not listed here yet. Add them to
          keep ages, milestones and coverage findings accurate.
        </div>
      )}

      {adding && form && (
        <div className="mb-4 rounded-2xl border border-cmd-gold/25 bg-cmd-black/30 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-cmd-gold">
            Add {adding === 'Self' ? 'yourself' : adding.toLowerCase()}
          </p>
          <div className="mt-4">
            <PersonFields form={form} onChange={setForm} />
          </div>
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
              {error}
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={save}
              className="rounded-xl border border-cmd-gold bg-cmd-gold/15 px-4 py-2 text-sm font-semibold text-cmd-gold transition hover:bg-cmd-gold/25 disabled:opacity-40"
            >
              {busy ? 'Saving…' : 'Add person'}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded-xl border border-cmd-border px-4 py-2 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 && !adding ? (
        <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
          {profile?.primary_name
            ? `${profile.primary_name} is the only name on this household. Add a spouse or a child to keep ages and milestones current.`
            : 'No one added yet. Add yourself, a spouse or a child.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sorted.map((member) => {
            const Icon = iconFor(member.relationship);
            const age = ageFrom(member.birth_date);
            const isEditing = editingId === member.id;

            return (
              <div
                key={member.id}
                className={`rounded-3xl border bg-cmd-black/40 p-5 ${
                  isEditing ? 'border-cmd-gold/40 sm:col-span-2' : 'border-cmd-border'
                }`}
              >
                {isEditing && form ? (
                  <>
                    <p className="text-xs uppercase tracking-[0.2em] text-cmd-gold">Edit person</p>
                    <div className="mt-4">
                      <PersonFields form={form} onChange={setForm} />
                    </div>
                    {error && (
                      <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
                        {error}
                      </div>
                    )}
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={save}
                        className="rounded-xl border border-cmd-gold bg-cmd-gold/15 px-4 py-2 text-sm font-semibold text-cmd-gold transition hover:bg-cmd-gold/25 disabled:opacity-40"
                      >
                        {busy ? 'Saving…' : 'Save changes'}
                      </button>
                      <button
                        type="button"
                        onClick={cancel}
                        className="rounded-xl border border-cmd-border px-4 py-2 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Icon className="mt-1 h-5 w-5 text-cmd-gold" />
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">
                            {isSelfRelationship(member.relationship) ? 'You' : member.relationship}
                          </p>
                          <h3 className="mt-1.5 text-xl font-semibold text-cmd-offwhite">{member.name}</h3>
                        </div>
                      </div>
                      {age !== null && (
                        <span className="rounded-full border border-cmd-border bg-cmd-black/60 px-3 py-1 text-xs text-cmd-muted">
                          {age} yrs
                        </span>
                      )}
                    </div>
                    <p className="mt-4 text-sm text-cmd-muted">{formatBirthDate(member.birth_date)}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(member)}
                        className="rounded-lg border border-cmd-border px-3 py-1.5 text-xs text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
                      >
                        Edit
                      </button>
                      {confirmingRemoveId === member.id ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => remove(member)}
                            className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 transition hover:bg-red-500/20 disabled:opacity-40"
                          >
                            {busy ? 'Removing…' : 'Confirm remove'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingRemoveId(null)}
                            className="rounded-lg border border-cmd-border px-3 py-1.5 text-xs text-cmd-muted transition hover:text-cmd-offwhite"
                          >
                            Keep
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setConfirmingRemoveId(member.id);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-cmd-border px-3 py-1.5 text-xs text-cmd-muted transition hover:border-red-500/40 hover:text-red-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && !adding && !editingId && (
        <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
          {error}
        </div>
      )}

      <p className="mt-5 text-xs text-cmd-muted/70">
        Birth dates drive ages across Command — milestone timing, life-insurance prompts and the
        household summary all read them here.
      </p>
    </section>
  );
}
