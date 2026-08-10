// Last year's return, and what this year should be doing about it.
//
// The return itself is the input; the planning items are the output. They sit
// together because the numbers only mean something next to where they came from
// — a safe-harbor target is a made-up figure until you can see the total tax it
// was derived from.

import React, { useMemo, useState } from 'react';
import { Calculator, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import {
  saveTaxReturn, uploadDocumentAsset, invokeDocumentExtraction,
  type DeductionLogEntry, type FamilyMember, type HouseholdProfile, type TaxReturn,
} from '../lib/supabase';
import { computeTaxPlanning, type PlanningHorizon, type PlanningItem } from '../lib/taxPlanning';
import { UploadDropzone } from './UploadDropzone';

interface TaxBaselineProps {
  householdId: string;
  taxYear: number;
  returns: TaxReturn[];
  deductions: DeductionLogEntry[];
  members: FamilyMember[];
  profile: HouseholdProfile | null;
  onChanged: () => Promise<void> | void;
}

interface ManualReturnForm {
  tax_year: string;
  filing_status: string;
  adjusted_gross_income: string;
  taxable_income: string;
  total_tax: string;
  federal_withheld: string;
  estimated_payments: string;
  took_standard_deduction: string;
  standard_deduction_amount: string;
  itemized_salt: string;
  itemized_mortgage_interest: string;
  itemized_charitable: string;
  child_tax_credit: string;
  capital_loss_carryforward: string;
  charitable_carryforward: string;
  refund_amount: string;
  amount_owed: string;
  preparer: string;
}

const EMPTY_FORM: ManualReturnForm = {
  tax_year: '', filing_status: 'married_joint', adjusted_gross_income: '', taxable_income: '',
  total_tax: '', federal_withheld: '', estimated_payments: '', took_standard_deduction: '',
  standard_deduction_amount: '', itemized_salt: '', itemized_mortgage_interest: '',
  itemized_charitable: '', child_tax_credit: '', capital_loss_carryforward: '',
  charitable_carryforward: '', refund_amount: '', amount_owed: '', preparer: '',
};

const HORIZON_LABEL: Record<PlanningHorizon, string> = {
  act_by_dec_31: 'Before 31 December',
  act_by_april: 'Before the filing deadline',
  anytime: 'No deadline',
  watch: 'Worth watching',
};

const HORIZON_TONE: Record<PlanningHorizon, string> = {
  act_by_dec_31: 'border-cmd-gold/40 text-cmd-gold',
  act_by_april: 'border-cmd-border text-cmd-offwhite',
  anytime: 'border-cmd-border text-cmd-muted',
  watch: 'border-cmd-border text-cmd-muted',
};

const money = (value: number | null | undefined) =>
  value == null ? '--' : `$${Math.round(value).toLocaleString()}`;

function FigureRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-cmd-border/50 py-2 last:border-0">
      <div>
        <p className="text-sm text-cmd-offwhite">{label}</p>
        {note && <p className="text-xs text-cmd-muted">{note}</p>}
      </div>
      <p className="shrink-0 font-mono text-sm text-cmd-offwhite">{value}</p>
    </div>
  );
}

function PlanningCard({ item }: { item: PlanningItem }) {
  return (
    <div className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h4 className="text-base font-semibold text-cmd-offwhite">{item.title}</h4>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${HORIZON_TONE[item.horizon]}`}>
          {HORIZON_LABEL[item.horizon]}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-cmd-muted">{item.finding}</p>
      {item.question && (
        <div className="mt-4 rounded-2xl border border-cmd-border/70 bg-cmd-black/40 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-cmd-muted">Ask your preparer</p>
          <p className="mt-1 text-sm leading-6 text-cmd-offwhite">{item.question}</p>
        </div>
      )}
      <p className="mt-3 text-xs text-cmd-muted">Based on {item.basis}.</p>
    </div>
  );
}

export function TaxBaseline({
  householdId, taxYear, returns, deductions, members, profile, onChanged,
}: TaxBaselineProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ManualReturnForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // The baseline is the most recent return that is not the year being planned.
  const baseline = useMemo(
    () => returns.filter((r) => r.tax_year < taxYear).sort((a, b) => b.tax_year - a.tax_year)[0] ?? null,
    [returns, taxYear],
  );

  const planning = useMemo(
    () => computeTaxPlanning(taxYear, baseline, deductions, members, profile),
    [taxYear, baseline, deductions, members, profile],
  );

  const set = (key: keyof ManualReturnForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev: ManualReturnForm) => ({ ...prev, [key]: event.target.value }));

  const save = async () => {
    setError(null);
    const year = Number(form.tax_year);
    if (!year || year < 1990 || year > taxYear) {
      setError('Give it a tax year — the one on the front of the return.');
      return;
    }
    setSaving(true);
    try {
      await saveTaxReturn(householdId, {
        ...form,
        tax_year: year,
        took_standard_deduction: form.took_standard_deduction === ''
          ? null
          : form.took_standard_deduction === 'standard',
        entry_source: 'manual',
        review_status: 'confirmed',
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Planning</p>
          <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Last year&rsquo;s return, this year&rsquo;s plan</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
            A filed return is the most useful document a household owns. It fixes the safe-harbor number,
            says whether itemizing is even in play, and carries forward the things that get lost between
            preparers. Everything below is arithmetic against your own figures &mdash; questions to raise,
            not advice to follow.
          </p>
        </div>
        {baseline && (
          <span className="shrink-0 rounded-full border border-cmd-gold/40 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cmd-gold">
            Baseline {baseline.tax_year}
          </span>
        )}
      </div>

      {!baseline ? (
        <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center">
          <Calculator className="mx-auto h-6 w-6 text-cmd-muted" />
          <p className="mt-3 text-sm text-cmd-offwhite">No prior-year return on file.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-cmd-muted">
            Upload last year&rsquo;s 1040 &mdash; or type in six figures from it &mdash; and this section stops
            being a filing cabinet and starts being a plan.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="min-w-0 rounded-3xl border border-cmd-border bg-cmd-charcoal p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm uppercase tracking-[0.2em] text-cmd-muted">
                {baseline.tax_year} return
              </h3>
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-cmd-muted transition hover:text-cmd-gold"
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {expanded ? 'Less' : 'All figures'}
              </button>
            </div>
            <div className="mt-3">
              <FigureRow label="Adjusted gross income" value={money(baseline.adjusted_gross_income)} />
              <FigureRow label="Total tax" value={money(baseline.total_tax)}
                note="What you actually owed for the year, before payments" />
              <FigureRow
                label="Deduction taken"
                value={baseline.took_standard_deduction == null
                  ? '--'
                  : baseline.took_standard_deduction
                    ? `Standard · ${money(baseline.standard_deduction_amount)}`
                    : `Itemized · ${money(baseline.itemized_total)}`}
              />
              {expanded && (
                <>
                  <FigureRow label="Taxable income" value={money(baseline.taxable_income)} />
                  <FigureRow label="Federal withheld" value={money(baseline.federal_withheld)} />
                  <FigureRow label="Estimated payments" value={money(baseline.estimated_payments)} />
                  <FigureRow label="State and local tax" value={money(baseline.itemized_salt)} />
                  <FigureRow label="Mortgage interest" value={money(baseline.itemized_mortgage_interest)} />
                  <FigureRow label="Charitable giving" value={money(baseline.itemized_charitable)} />
                  <FigureRow label="Child tax credit" value={money(baseline.child_tax_credit)} />
                  <FigureRow label="Capital loss carryforward" value={money(baseline.capital_loss_carryforward)} />
                  <FigureRow label="Charitable carryforward" value={money(baseline.charitable_carryforward)} />
                  <FigureRow
                    label={baseline.refund_amount ? 'Refund' : 'Owed'}
                    value={money(baseline.refund_amount ?? baseline.amount_owed)}
                  />
                  {baseline.preparer && <FigureRow label="Prepared by" value={baseline.preparer} />}
                </>
              )}
            </div>
            <p className="mt-4 text-xs text-cmd-muted">
              {baseline.entry_source === 'extracted'
                ? 'Read from the return you uploaded. Check anything that drives a number you care about.'
                : 'Entered by hand.'}
            </p>
          </div>

          <div className="min-w-0 space-y-4">
            {planning.items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
                Nothing to plan against yet.
              </div>
            ) : (
              planning.items.map((item) => <PlanningCard key={item.title} item={item} />)
            )}
          </div>
        </div>
      )}

      {/* Manual entry sits below the reading, as everywhere else. */}
      <div className="mt-6 border-t border-cmd-border pt-6">
        {!showForm ? (
          <button
            type="button"
            onClick={() => { setShowForm(true); setForm({ ...EMPTY_FORM, tax_year: String(taxYear - 1) }); }}
            className="flex items-center gap-2 rounded-full border border-cmd-border px-4 py-2 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
          >
            <Plus className="h-4 w-4" />
            {baseline ? 'Enter another year' : 'Type in the figures instead'}
          </button>
        ) : (
          <div className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-5">
            <h3 className="text-sm uppercase tracking-[0.2em] text-cmd-muted">From your return</h3>
            <p className="mt-2 text-sm text-cmd-muted">
              Only the year is required. Everything else sharpens the planning &mdash; total tax and AGI
              between them produce the safe-harbor number, which is the single most useful figure here.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs uppercase tracking-[0.16em] text-cmd-muted">
                Tax year
                <input value={form.tax_year} onChange={set('tax_year')} inputMode="numeric" placeholder="2025"
                  className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2 text-sm text-cmd-offwhite" />
              </label>
              <label className="text-xs uppercase tracking-[0.16em] text-cmd-muted">
                Filing status
                <select value={form.filing_status} onChange={set('filing_status')}
                  className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2 text-sm text-cmd-offwhite">
                  <option value="married_joint">Married filing jointly</option>
                  <option value="married_separate">Married filing separately</option>
                  <option value="single">Single</option>
                  <option value="head_of_household">Head of household</option>
                </select>
              </label>
              <label className="text-xs uppercase tracking-[0.16em] text-cmd-muted">
                Deduction taken
                <select value={form.took_standard_deduction} onChange={set('took_standard_deduction')}
                  className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2 text-sm text-cmd-offwhite">
                  <option value="">Not sure</option>
                  <option value="standard">Standard</option>
                  <option value="itemized">Itemized</option>
                </select>
              </label>
              {([
                ['adjusted_gross_income', 'AGI (1040 line 11)'],
                ['total_tax', 'Total tax (line 24)'],
                ['taxable_income', 'Taxable income (line 15)'],
                ['federal_withheld', 'Federal withheld (line 25)'],
                ['estimated_payments', 'Estimated payments (line 26)'],
                ['standard_deduction_amount', 'Standard deduction (line 12)'],
                ['itemized_salt', 'State and local tax (Sch A)'],
                ['itemized_mortgage_interest', 'Mortgage interest (Sch A)'],
                ['itemized_charitable', 'Charitable giving (Sch A)'],
                ['child_tax_credit', 'Child tax credit (line 19)'],
                ['capital_loss_carryforward', 'Capital loss carryforward'],
                ['charitable_carryforward', 'Charitable carryforward'],
                ['refund_amount', 'Refund (line 34)'],
                ['amount_owed', 'Amount owed (line 37)'],
                ['preparer', 'Prepared by'],
              ] as Array<[keyof ManualReturnForm, string]>).map(([key, label]) => (
                <label key={key} className="text-xs uppercase tracking-[0.16em] text-cmd-muted">
                  {label}
                  <input value={form[key]} onChange={set(key)}
                    inputMode={key === 'preparer' ? 'text' : 'decimal'}
                    className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2 text-sm text-cmd-offwhite" />
                </label>
              ))}
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={save} disabled={saving}
                className="rounded-full bg-cmd-gold px-5 py-2 text-sm font-semibold text-cmd-black transition disabled:opacity-50">
                {saving ? 'Saving…' : 'Save the return'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setError(null); }}
                className="rounded-full border border-cmd-border px-5 py-2 text-sm text-cmd-muted transition hover:text-cmd-offwhite">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Uploading the return is the fast path; it lands as a document and gets read. */}
      <div className="mt-4">
        <UploadDropzone
          contextLabel="Upload last year's return"
          buttonLabel="Upload a 1040 or a preparer's copy"
          onUpload={async (file) => {
            const document = await uploadDocumentAsset(householdId, file, 'tax');
            await invokeDocumentExtraction(document.id);
            await onChanged();
          }}
        />
      </div>
    </section>
  );
}
