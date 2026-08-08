import React, { useState } from 'react';
import { createManualPolicy, type InsurancePolicyType } from '../lib/supabase';
import { Plus, X } from 'lucide-react';

interface Props {
  householdId: string;
  onAdded: () => Promise<void> | void;
}

interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  kind?: 'text' | 'money' | 'date';
  hint?: string;
}

/**
 * Deliberately short per type. A life policy the user is entering from memory
 * should not present the same form as a homeowners declarations page — asking
 * for twelve fields is how manual entry gets abandoned. Only what identifies the
 * policy and its headline number; everything else can come from a document later.
 */
const FIELDS_BY_TYPE: Record<InsurancePolicyType, FieldDef[]> = {
  life: [
    { key: 'insured', label: 'Who is insured', placeholder: 'e.g. Mitch, or Mitch & Kelly' },
    { key: 'coverage_amount', label: 'Death benefit', kind: 'money', placeholder: '500000' },
    { key: 'beneficiaries', label: 'Beneficiaries', placeholder: 'e.g. Kelly (100%)' },
    { key: 'renewal_date', label: 'Term ends', kind: 'date', hint: 'Leave blank for whole life' },
  ],
  home: [
    { key: 'coverage_amount', label: 'Dwelling limit', kind: 'money', placeholder: '750000' },
    { key: 'deductible', label: 'Deductible', kind: 'money', placeholder: '2500' },
    { key: 'renewal_date', label: 'Renewal date', kind: 'date' },
  ],
  auto: [
    { key: 'coverage_amount', label: 'Liability limit', kind: 'money', placeholder: '250000', hint: 'Per person bodily injury' },
    { key: 'deductible', label: 'Collision deductible', kind: 'money', placeholder: '1000' },
    { key: 'renewal_date', label: 'Renewal date', kind: 'date' },
  ],
  umbrella: [
    { key: 'coverage_amount', label: 'Umbrella limit', kind: 'money', placeholder: '2000000' },
    { key: 'renewal_date', label: 'Renewal date', kind: 'date' },
  ],
  disability: [
    { key: 'insured', label: 'Who is insured', placeholder: 'e.g. Mitch' },
    { key: 'coverage_amount', label: 'Monthly benefit', kind: 'money', placeholder: '8000' },
  ],
  health: [
    { key: 'insured', label: 'Who is covered', placeholder: 'e.g. Whole household' },
    { key: 'deductible', label: 'Deductible', kind: 'money', placeholder: '3000' },
  ],
  other: [
    { key: 'coverage_amount', label: 'Coverage amount', kind: 'money' },
    { key: 'renewal_date', label: 'Renewal date', kind: 'date' },
  ],
};

const TYPE_LABELS: Array<{ value: InsurancePolicyType; label: string }> = [
  { value: 'life', label: 'Life' },
  { value: 'home', label: 'Home' },
  { value: 'auto', label: 'Auto' },
  { value: 'umbrella', label: 'Umbrella' },
  { value: 'disability', label: 'Disability' },
  { value: 'health', label: 'Health' },
  { value: 'other', label: 'Other' },
];

export function AddPolicyForm({ householdId, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<InsurancePolicyType>('life');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields = FIELDS_BY_TYPE[type];

  const reset = () => {
    setValues({});
    setError(null);
  };

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      await createManualPolicy(householdId, {
        type,
        carrier: values.carrier?.trim() || null,
        policy_number: values.policy_number?.trim() || null,
        coverage_amount: values.coverage_amount ?? null,
        deductible: values.deductible ?? null,
        annual_premium: values.annual_premium ?? null,
        renewal_date: values.renewal_date || null,
        // Details the policy table has no column for still shouldn't be lost.
        notes: [
          values.insured ? `Insured: ${values.insured.trim()}` : null,
          values.beneficiaries ? `Beneficiaries: ${values.beneficiaries.trim()}` : null,
        ].filter(Boolean).join(' · ') || null,
      });
      reset();
      setOpen(false);
      await onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the policy.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-cmd-border bg-cmd-black/40 px-4 py-2.5 text-sm font-medium text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
      >
        <Plus className="h-4 w-4" /> Add a policy manually
      </button>
    );
  }

  const input =
    'w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2.5 text-sm text-cmd-offwhite ' +
    'placeholder-cmd-muted/50 outline-none transition focus:border-cmd-gold/50';

  return (
    <section className="rounded-3xl border border-cmd-gold/25 bg-cmd-charcoal p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-gold">Add manually</p>
          <h3 className="mt-2 text-xl font-semibold text-cmd-offwhite">New policy</h3>
          <p className="mt-1 text-sm text-cmd-muted">
            Only what you know — everything here is optional, and a document can fill in the rest later.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { reset(); setOpen(false); }}
          className="rounded-lg border border-cmd-border p-2 text-cmd-muted transition hover:text-cmd-offwhite"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Policy type</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {TYPE_LABELS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => { setType(t.value); setValues({}); }}
              className={`rounded-xl border px-4 py-2 text-sm transition ${
                type === t.value
                  ? 'border-cmd-gold bg-cmd-gold/15 text-cmd-gold'
                  : 'border-cmd-border bg-cmd-black/40 text-cmd-muted hover:border-cmd-gold/40 hover:text-cmd-offwhite'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Carrier</label>
          <input
            className={`${input} mt-1.5`}
            placeholder="e.g. Northwestern Mutual"
            value={values.carrier ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, carrier: e.target.value }))}
          />
        </div>

        {fields.map((field) => (
          <div key={field.key}>
            <label className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">{field.label}</label>
            <input
              className={`${input} mt-1.5`}
              type={field.kind === 'date' ? 'date' : 'text'}
              inputMode={field.kind === 'money' ? 'decimal' : undefined}
              placeholder={field.placeholder}
              value={values[field.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
            />
            {field.hint && <p className="mt-1 text-xs text-cmd-muted/70">{field.hint}</p>}
          </div>
        ))}

        <div>
          <label className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Annual premium</label>
          <input
            className={`${input} mt-1.5`}
            inputMode="decimal"
            placeholder="Optional"
            value={values.annual_premium ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, annual_premium: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Policy number</label>
          <input
            className={`${input} mt-1.5`}
            placeholder="Optional"
            value={values.policy_number ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, policy_number: e.target.value }))}
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={submit}
          className="rounded-xl border border-cmd-gold bg-cmd-gold/15 px-5 py-2.5 text-sm font-semibold text-cmd-gold transition hover:bg-cmd-gold/25 disabled:opacity-40"
        >
          {saving ? 'Adding…' : 'Add policy'}
        </button>
        <button
          type="button"
          onClick={() => { reset(); setOpen(false); }}
          className="rounded-xl border border-cmd-border px-5 py-2.5 text-sm font-medium text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
