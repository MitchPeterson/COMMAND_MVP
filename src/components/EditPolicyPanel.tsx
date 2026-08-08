import React, { useState } from 'react';
import { updateInsurancePolicy, type InsurancePolicy, type InsurancePolicyType } from '../lib/supabase';

interface Props {
  policy: InsurancePolicy;
  onSaved: () => Promise<void> | void;
  onCancel: () => void;
}

const TYPES: Array<{ value: InsurancePolicyType; label: string }> = [
  { value: 'home', label: 'Home' },
  { value: 'auto', label: 'Auto' },
  { value: 'umbrella', label: 'Umbrella' },
  { value: 'life', label: 'Life' },
  { value: 'disability', label: 'Disability' },
  { value: 'health', label: 'Health' },
  { value: 'other', label: 'Other' },
];

const input =
  'w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2.5 text-sm text-cmd-offwhite ' +
  'placeholder-cmd-muted/50 outline-none transition focus:border-cmd-gold/50';
const label = 'text-[11px] uppercase tracking-[0.16em] text-cmd-muted';

/**
 * Edits the policy record, not the extraction. The evidence trail behind an
 * extracted policy is a record of what a document said and stays as it was —
 * correcting a carrier's name here does not rewrite history.
 */
export function EditPolicyPanel({ policy, onSaved, onCancel }: Props) {
  const [form, setForm] = useState({
    type: policy.type,
    carrier: policy.carrier ?? '',
    policy_number: policy.policy_number ?? '',
    coverage_amount: policy.coverage_amount?.toString() ?? '',
    deductible: policy.deductible?.toString() ?? '',
    annual_premium: policy.annual_premium?.toString() ?? '',
    renewal_date: policy.renewal_date ?? '',
    notes: policy.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      await updateInsurancePolicy(policy.id, {
        type: form.type as InsurancePolicyType,
        carrier: form.carrier,
        policy_number: form.policy_number,
        coverage_amount: form.coverage_amount,
        deductible: form.deductible,
        annual_premium: form.annual_premium,
        renewal_date: form.renewal_date,
        notes: form.notes,
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the policy.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-cmd-gold/25 bg-cmd-black/30 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-cmd-gold">Edit policy</p>

      <div className="mt-4">
        <p className={label}>Type</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => set('type', t.value)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                form.type === t.value
                  ? 'border-cmd-gold bg-cmd-gold/15 text-cmd-gold'
                  : 'border-cmd-border bg-cmd-black/40 text-cmd-muted hover:text-cmd-offwhite'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2">
          <label className={label}>Carrier</label>
          <input className={`${input} mt-1.5`} value={form.carrier} onChange={(e) => set('carrier', e.target.value)} />
        </div>
        <div>
          <label className={label}>Policy number</label>
          <input className={`${input} mt-1.5`} value={form.policy_number} onChange={(e) => set('policy_number', e.target.value)} />
        </div>
        <div>
          <label className={label}>Coverage amount</label>
          <input className={`${input} mt-1.5`} inputMode="decimal" value={form.coverage_amount} onChange={(e) => set('coverage_amount', e.target.value)} />
        </div>
        <div>
          <label className={label}>Deductible</label>
          <input className={`${input} mt-1.5`} inputMode="decimal" value={form.deductible} onChange={(e) => set('deductible', e.target.value)} />
        </div>
        <div>
          <label className={label}>Annual premium</label>
          <input className={`${input} mt-1.5`} inputMode="decimal" value={form.annual_premium} onChange={(e) => set('annual_premium', e.target.value)} />
        </div>
        <div>
          <label className={label}>Renewal date</label>
          <input className={`${input} mt-1.5`} type="date" value={form.renewal_date} onChange={(e) => set('renewal_date', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Notes</label>
          <input className={`${input} mt-1.5`} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. Insured: Mitch · Beneficiaries: Kelly (100%)" />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-xl border border-cmd-gold bg-cmd-gold/15 px-4 py-2 text-sm font-semibold text-cmd-gold transition hover:bg-cmd-gold/25 disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-cmd-border px-4 py-2 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
        >
          Cancel
        </button>
      </div>

      {policy.source_extraction_id && (
        <p className="mt-3 text-xs text-cmd-muted/70">
          Editing here changes this policy record only. The extracted document detail and its
          evidence remain unchanged.
        </p>
      )}
    </div>
  );
}
