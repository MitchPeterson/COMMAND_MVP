import React, { useState } from 'react';
import {
  addHomeSystem, updateHomeSystem, deleteHomeSystem,
  type HomeSystem, type HomeSystemDocument, type Document as StoredDocument,
} from '../lib/supabase';
import {
  SYSTEM_CATEGORIES, categoryOf, outlookFor, replacementTimeline, type SystemOutlook,
} from '../lib/homeSystems';
import { CalendarClock, FileText, Pencil, Plus, ShieldCheck, Trash2, Wrench } from 'lucide-react';

interface Props {
  householdId: string;
  systems: HomeSystem[];
  systemDocuments: HomeSystemDocument[];
  documents: StoredDocument[];
  onChanged: () => Promise<void> | void;
}

const money = (value: number | null | undefined) =>
  value == null
    ? '--'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const input =
  'w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2.5 text-sm text-cmd-offwhite ' +
  'placeholder-cmd-muted/50 outline-none transition focus:border-cmd-gold/50';
const label = 'text-[11px] uppercase tracking-[0.16em] text-cmd-muted';

const STATE_TONE: Record<SystemOutlook['state'], string> = {
  past_life: 'border-red-500/30 bg-red-500/10 text-red-200',
  due_soon: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  watch: 'border-cmd-gold/30 bg-cmd-gold/10 text-cmd-gold',
  fine: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  unknown_age: 'border-cmd-border bg-cmd-black/50 text-cmd-muted',
};

const STATE_LABEL: Record<SystemOutlook['state'], string> = {
  past_life: 'Past typical life',
  due_soon: 'Within 2 years',
  watch: 'Within 5 years',
  fine: 'Some years left',
  unknown_age: 'Age unknown',
};

interface SystemForm {
  name: string;
  category: string;
  location: string;
  make: string;
  model: string;
  serial_number: string;
  installed_on: string;
  approximate_age_years: string;
  purchase_price: string;
  user_expected_life_years: string;
  user_replacement_cost: string;
  warranty_provider: string;
  warranty_type: string;
  warranty_expires_on: string;
  notes: string;
}

const emptyForm = (): SystemForm => ({
  name: '', category: 'furnace', location: '', make: '', model: '', serial_number: '',
  installed_on: '', approximate_age_years: '', purchase_price: '',
  user_expected_life_years: '', user_replacement_cost: '',
  warranty_provider: '', warranty_type: '', warranty_expires_on: '', notes: '',
});

function SystemFields({ form, onChange }: { form: SystemForm; onChange: (next: SystemForm) => void }) {
  const set = (key: keyof SystemForm, value: string) => onChange({ ...form, [key]: value });
  const category = categoryOf(form.category);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <label className={label}>What is it</label>
        <input className={`${input} mt-1.5`} value={form.name} autoFocus placeholder="Basement furnace"
          onChange={(e) => set('name', e.target.value)} />
      </div>
      <div>
        <p className={label}>Kind</p>
        <select className={`${input} mt-1.5`} value={form.category} onChange={(e) => set('category', e.target.value)}>
          {SYSTEM_CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label className={label}>Where</label>
        <input className={`${input} mt-1.5`} value={form.location} placeholder="Basement"
          onChange={(e) => set('location', e.target.value)} />
      </div>

      <div>
        <label className={label}>Installed on</label>
        <input className={`${input} mt-1.5`} type="date" value={form.installed_on}
          onChange={(e) => set('installed_on', e.target.value)} />
      </div>
      <div>
        <label className={label}>…or roughly how old</label>
        <input className={`${input} mt-1.5`} inputMode="decimal" placeholder="14"
          value={form.approximate_age_years} onChange={(e) => set('approximate_age_years', e.target.value)} />
      </div>
      <div>
        <label className={label}>Make</label>
        <input className={`${input} mt-1.5`} value={form.make} placeholder="Carrier"
          onChange={(e) => set('make', e.target.value)} />
      </div>

      <div>
        <label className={label}>Model</label>
        <input className={`${input} mt-1.5`} value={form.model} onChange={(e) => set('model', e.target.value)} />
      </div>
      <div>
        <label className={label}>Serial</label>
        <input className={`${input} mt-1.5`} value={form.serial_number}
          onChange={(e) => set('serial_number', e.target.value)} />
      </div>
      <div>
        <label className={label}>What it cost</label>
        <input className={`${input} mt-1.5`} inputMode="decimal" value={form.purchase_price}
          onChange={(e) => set('purchase_price', e.target.value)} />
      </div>

      <div>
        <label className={label}>Expected life, years</label>
        <input className={`${input} mt-1.5`} inputMode="decimal"
          placeholder={`${category.lifeYears[0]}–${category.lifeYears[1]} typical`}
          value={form.user_expected_life_years} onChange={(e) => set('user_expected_life_years', e.target.value)} />
      </div>
      <div>
        <label className={label}>Replacement cost</label>
        <input className={`${input} mt-1.5`} inputMode="decimal"
          placeholder={`${money(category.costUsd[0])}–${money(category.costUsd[1])} typical`}
          value={form.user_replacement_cost} onChange={(e) => set('user_replacement_cost', e.target.value)} />
      </div>
      <div>
        <p className={label}>Warranty</p>
        <select className={`${input} mt-1.5`} value={form.warranty_type}
          onChange={(e) => set('warranty_type', e.target.value)}>
          <option value="">Not recorded</option>
          <option value="manufacturer">Manufacturer</option>
          <option value="extended">Extended</option>
          <option value="home_warranty">Home warranty</option>
          <option value="installer">Installer</option>
          <option value="none_known">None that I know of</option>
        </select>
      </div>

      <div>
        <label className={label}>Warranty from</label>
        <input className={`${input} mt-1.5`} value={form.warranty_provider}
          onChange={(e) => set('warranty_provider', e.target.value)} />
      </div>
      <div>
        <label className={label}>Warranty runs to</label>
        <input className={`${input} mt-1.5`} type="date" value={form.warranty_expires_on}
          onChange={(e) => set('warranty_expires_on', e.target.value)} />
      </div>
      <div>
        <label className={label}>Notes</label>
        <input className={`${input} mt-1.5`} value={form.notes} placeholder="Serviced every October"
          onChange={(e) => set('notes', e.target.value)} />
      </div>
    </div>
  );
}

/**
 * The systems inventory and the replacement timeline built from it.
 *
 * Typical figures and the household's own are never shown as the same thing:
 * anything the user entered is marked "yours", anything Command supplied says
 * "typical". A national average dressed as a quote is how a planning tool loses
 * the user's trust the first time they get a real estimate.
 */
export function HomeSystemsPanel({ householdId, systems, systemDocuments, documents, onChanged }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SystemForm>(emptyForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null);

  const timeline = replacementTimeline(systems);
  const outlooks = systems.map(outlookFor).sort((a, b) => {
    const order = { past_life: 0, due_soon: 1, watch: 2, fine: 3, unknown_age: 4 };
    return order[a.state] - order[b.state] || (a.yearsRemaining ?? 99) - (b.yearsRemaining ?? 99);
  });

  const startAdd = () => {
    setError(null);
    setEditingId(null);
    setForm(emptyForm());
    setAdding(true);
  };

  const startEdit = (system: HomeSystem) => {
    setError(null);
    setAdding(false);
    setEditingId(system.id);
    setForm({
      name: system.name,
      category: system.category,
      location: system.location ?? '',
      make: system.make ?? '',
      model: system.model ?? '',
      serial_number: system.serial_number ?? '',
      installed_on: system.installed_on ?? '',
      approximate_age_years: system.approximate_age_years?.toString() ?? '',
      purchase_price: system.purchase_price?.toString() ?? '',
      user_expected_life_years: system.user_expected_life_years?.toString() ?? '',
      user_replacement_cost: system.user_replacement_cost?.toString() ?? '',
      warranty_provider: system.warranty_provider ?? '',
      warranty_type: system.warranty_type ?? '',
      warranty_expires_on: system.warranty_expires_on ?? '',
      notes: system.notes ?? '',
    });
  };

  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    setError(null);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError('Give it a name so you can find it later.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editingId) await updateHomeSystem(editingId, form);
      else await addHomeSystem(householdId, form);
      await onChanged();
      cancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await deleteHomeSystem(id);
      await onChanged();
      setConfirmingRemove(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that.');
    } finally {
      setBusy(false);
    }
  };

  const docsFor = (systemId: string) =>
    systemDocuments
      .filter((link) => link.system_id === systemId)
      .map((link) => ({ link, doc: documents.find((d) => d.id === link.document_id) }))
      .filter((entry) => entry.doc);

  return (
    <>
      {/* ── The timeline ─────────────────────────────────────────────────── */}
      {timeline.length > 0 && (
        <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
          <div className="flex items-center gap-3 text-cmd-gold">
            <CalendarClock className="h-5 w-5" />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">What's coming</p>
              <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Replacement timeline</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {timeline.map((year) => (
              <div key={year.year} className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-mono text-lg font-semibold text-cmd-offwhite">
                    {year.year === new Date().getFullYear() ? 'Now' : year.year}
                  </p>
                  <p className="text-lg font-semibold text-cmd-gold">{money(year.total)}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {year.items.map((item) => (
                    <span key={item.system.id} className="rounded-lg border border-cmd-border px-2.5 py-1 text-xs text-cmd-muted">
                      {item.system.name} · {money(item.cost)}
                      {item.costIsUserSet ? ' (yours)' : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-cmd-muted/70">
            Years are estimates from typical service life, not predictions about a specific unit — a
            furnace serviced every autumn outlives one that is not, and Command cannot see the difference.
            Costs are typical installed prices unless you entered your own.
          </p>
        </section>
      )}

      {/* ── The inventory ────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Wrench className="h-4 w-4 text-cmd-gold" />
            <h2 className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Systems and appliances</h2>
          </div>
          <button
            type="button"
            onClick={startAdd}
            className="inline-flex items-center gap-2 rounded-xl border border-cmd-gold bg-cmd-gold/15 px-3.5 py-2 text-sm font-semibold text-cmd-gold transition hover:bg-cmd-gold/25"
          >
            <Plus className="h-4 w-4" /> Add a system
          </button>
        </div>

        {(adding || editingId) && (
          <div className="mb-4 rounded-2xl border border-cmd-gold/25 bg-cmd-black/30 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-cmd-gold">
              {editingId ? 'Edit system' : 'Add a system'}
            </p>
            <div className="mt-4">
              <SystemFields form={form} onChange={setForm} />
            </div>
            {error && (
              <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
                {error}
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={save}
                className="rounded-xl border border-cmd-gold bg-cmd-gold/15 px-4 py-2 text-sm font-semibold text-cmd-gold transition hover:bg-cmd-gold/25 disabled:opacity-40">
                {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add it'}
              </button>
              <button type="button" onClick={cancel}
                className="rounded-xl border border-cmd-border px-4 py-2 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold">
                Cancel
              </button>
            </div>
          </div>
        )}

        {systems.length === 0 && !adding ? (
          <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
            Nothing recorded yet. Start with the furnace, water heater and roof — they carry most of the
            cost, and their ages are most of what a timeline needs.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {outlooks.map((outlook) => {
              const system = outlook.system as HomeSystem;
              const attached = docsFor(system.id);
              return (
                <div key={system.id} className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">
                        {outlook.category.label}{system.location ? ` · ${system.location}` : ''}
                      </p>
                      <h3 className="mt-1.5 text-xl font-semibold text-cmd-offwhite">{system.name}</h3>
                      <p className="mt-1 text-sm text-cmd-muted">
                        {[system.make, system.model].filter(Boolean).join(' ') || 'Make and model not recorded'}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs ${STATE_TONE[outlook.state]}`}>
                      {STATE_LABEL[outlook.state]}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Age</p>
                      <p className="mt-1 text-cmd-offwhite">
                        {outlook.ageYears == null
                          ? '--'
                          : `${outlook.ageYears.toFixed(0)} yr${outlook.ageIsApproximate ? ' approx' : ''}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Replace around</p>
                      <p className="mt-1 text-cmd-offwhite">{outlook.replacementYear ?? '--'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Cost</p>
                      <p className="mt-1 text-cmd-offwhite">{money(outlook.cost)}</p>
                      <p className="text-[10px] text-cmd-muted/70">
                        {outlook.costIsUserSet ? 'yours' : 'typical'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-cmd-border/60 pt-3">
                    <span className={`inline-flex items-center gap-1 text-[11px] ${
                      outlook.warrantyState === 'active' ? 'text-emerald-300'
                        : outlook.warrantyState === 'expired' ? 'text-cmd-muted' : 'text-cmd-muted/70'
                    }`}>
                      <ShieldCheck className="h-3 w-3" />
                      {outlook.warrantyState === 'active'
                        ? `Warranty to ${system.warranty_expires_on}`
                        : outlook.warrantyState === 'expired'
                          ? `Warranty ended ${system.warranty_expires_on}`
                          : 'Warranty not recorded'}
                    </span>
                    {attached.map(({ link, doc }) => (
                      <span key={link.id} className="inline-flex items-center gap-1 rounded-lg border border-cmd-border px-2 py-0.5 text-[11px] text-cmd-muted">
                        <FileText className="h-3 w-3" /> {link.doc_role} · {doc!.name}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => startEdit(system)}
                      className="inline-flex items-center gap-1 rounded-lg border border-cmd-border px-2.5 py-1 text-[11px] text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold">
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    {confirmingRemove === system.id ? (
                      <>
                        <button type="button" disabled={busy} onClick={() => remove(system.id)}
                          className="rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-200">
                          Confirm remove
                        </button>
                        <button type="button" onClick={() => setConfirmingRemove(null)}
                          className="rounded-lg border border-cmd-border px-2.5 py-1 text-[11px] text-cmd-muted">
                          Keep
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setConfirmingRemove(system.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-cmd-border px-2.5 py-1 text-[11px] text-cmd-muted transition hover:border-red-500/40 hover:text-red-200">
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
