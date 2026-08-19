// The house itself, with or without paperwork.
//
// "Is this the home you live in?" led to the Home section and a request to
// upload a mortgage statement — which is no use to anyone who owns their house
// outright, or paid it off, or simply does not have the statement to hand. The
// house is the largest thing most households own and it was the one thing that
// could not be typed in.
//
// An address is not a document, and neither is a rough value. Both are recorded
// here, and the property is what the follow-up was asking about, so answering it
// retires the question.

import React, { useEffect, useRef, useState } from 'react';
import { Home, Plus, Trash2 } from 'lucide-react';
import {
  addAsset, deleteAsset, updateHouseholdProfile,
  type Asset, type HouseholdProfile,
} from '../lib/supabase';

interface Props {
  householdId: string;
  assets: Asset[];
  profile: HouseholdProfile | null;
  /** An address a policy named, arriving already filled in. */
  prefillAddress?: string | null;
  onChanged: () => Promise<void> | void;
}

const field =
  'mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2 text-sm text-cmd-offwhite';
const label = 'text-xs uppercase tracking-[0.16em] text-cmd-muted';

const money = (value: number | null) =>
  value == null ? 'Value not recorded' : `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function PropertyPanel({ householdId, assets, profile, prefillAddress, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', current_value: '', notes: '' });
  const anchor = useRef<HTMLDivElement | null>(null);

  const properties = assets.filter((a) => a.type === 'real_estate');

  // Arriving from the question that named the address opens the form holding
  // it. Being asked about a house and then handed an empty form is the moment
  // someone gives up.
  useEffect(() => {
    if (!prefillAddress) return;
    setForm((prev) => ({ ...prev, name: prefillAddress }));
    setOpen(true);
    anchor.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [prefillAddress]);

  const save = async () => {
    if (!form.name.trim()) {
      setError('An address is needed, even a rough one.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addAsset(householdId, {
        name: form.name,
        type: 'real_estate',
        current_value: form.current_value,
        notes: form.notes,
      });
      // The profile's home value feeds the Home grade and the net worth
      // reconciliation. Fill it only when it is empty — a household that has
      // set its own figure does not want it overwritten by this form.
      const entered = Number(String(form.current_value).replace(/[^0-9.]/g, ''));
      if (profile && profile.home_value == null && Number.isFinite(entered) && entered > 0) {
        await updateHouseholdProfile(householdId, { home_value: entered });
      }
      setForm({ name: '', current_value: '', notes: '' });
      setOpen(false);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await deleteAsset(id);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that.');
    }
  };

  return (
    <section
      id="section-property"
      ref={anchor}
      className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6"
    >
      <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Property</p>
      <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">The home itself</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
        No document needed. Plenty of households own their home outright, and an address and a rough
        value are things you already know — both count toward your net worth exactly the same.
      </p>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {properties.length > 0 && (
        <div className="mt-5 space-y-2">
          {properties.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-cmd-border bg-cmd-charcoal px-4 py-3"
            >
              <Home className="h-4 w-4 shrink-0 text-cmd-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-cmd-offwhite">{item.name}</p>
                <p className="text-xs text-cmd-muted">{money(item.current_value)}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={`Remove ${item.name}`}
                className="shrink-0 text-cmd-muted transition hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => { setError(null); setOpen(true); }}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-cmd-border px-4 py-2 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
        >
          <Plus className="h-4 w-4" />
          {properties.length > 0 ? 'Add another property' : 'Add your home'}
        </button>
      ) : (
        <div className="mt-5 rounded-3xl border border-cmd-gold/30 bg-cmd-charcoal p-5">
          {prefillAddress && (
            <p className="mb-4 rounded-xl border border-cmd-gold/25 bg-cmd-gold/5 px-3 py-2 text-sm text-cmd-muted">
              Filled in from your insurance policy. Change anything that is not right, and add its
              value if you know it.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              Address
              <input
                value={form.name}
                placeholder="4218 Sunnyside Road, Edina MN"
                className={field}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </label>
            <label className={label}>
              Roughly what it is worth
              <input
                value={form.current_value}
                inputMode="decimal"
                placeholder="985000"
                className={field}
                onChange={(e) => setForm((p) => ({ ...p, current_value: e.target.value }))}
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-cmd-muted">
            An estimate is fine. It is there so your net worth is not missing the largest thing you
            own — a mortgage is not required, and can be added separately if you have one.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="rounded-full bg-cmd-gold px-5 py-2 text-sm font-semibold text-cmd-black transition disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save the property'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setError(null); }}
              className="rounded-full border border-cmd-border px-5 py-2 text-sm text-cmd-muted transition hover:text-cmd-offwhite"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
