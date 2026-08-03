import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSearch2, XCircle } from 'lucide-react';
import {
  confirmDocumentExtraction,
  discardDocumentExtraction,
  type DocumentExtraction,
  type DocumentType,
} from '../lib/supabase';

interface DocumentExtractionReviewProps {
  householdId: string;
  extractions: DocumentExtraction[];
  onChange?: () => void;
}

type FieldDefinition = {
  key: string;
  label: string;
  inputType: 'text' | 'number' | 'date';
};

const fieldDefinitions: Record<DocumentType, FieldDefinition[]> = {
  mortgage_statement: [
    { key: 'lender', label: 'Lender', inputType: 'text' },
    { key: 'current_balance', label: 'Current balance', inputType: 'number' },
    { key: 'interest_rate', label: 'Interest rate', inputType: 'text' },
    { key: 'monthly_payment', label: 'Monthly payment', inputType: 'text' },
    { key: 'escrow_balance', label: 'Escrow balance', inputType: 'number' },
  ],
  insurance_dec_page: [
    { key: 'carrier', label: 'Carrier', inputType: 'text' },
    { key: 'policy_type', label: 'Policy type', inputType: 'text' },
    { key: 'policy_number', label: 'Policy number', inputType: 'text' },
    { key: 'coverage_amount', label: 'Coverage amount', inputType: 'number' },
    { key: 'premium', label: 'Premium', inputType: 'number' },
    { key: 'renewal_date', label: 'Renewal date', inputType: 'date' },
  ],
  credit_card_statement: [
    { key: 'issuer', label: 'Issuer', inputType: 'text' },
    { key: 'card_name_last4', label: 'Card name / last 4', inputType: 'text' },
    { key: 'current_balance', label: 'Current balance', inputType: 'number' },
    { key: 'credit_limit', label: 'Credit limit', inputType: 'number' },
    { key: 'minimum_payment', label: 'Minimum payment', inputType: 'text' },
    { key: 'due_date', label: 'Due date', inputType: 'date' },
    { key: 'apr', label: 'APR', inputType: 'text' },
  ],
  bank_statement: [
    { key: 'institution', label: 'Institution', inputType: 'text' },
    { key: 'account_type', label: 'Account type', inputType: 'text' },
    { key: 'balance', label: 'Balance', inputType: 'number' },
    { key: 'as_of_date', label: 'As of date', inputType: 'date' },
  ],
  tax_document: [
    { key: 'doc_type', label: 'Document type', inputType: 'text' },
    { key: 'tax_year', label: 'Tax year', inputType: 'number' },
    { key: 'source', label: 'Source', inputType: 'text' },
    { key: 'amount', label: 'Amount', inputType: 'number' },
  ],
  paystub: [
    { key: 'employer', label: 'Employer', inputType: 'text' },
    { key: 'pay_period', label: 'Pay period', inputType: 'text' },
    { key: 'gross_pay', label: 'Gross pay', inputType: 'number' },
    { key: 'net_pay', label: 'Net pay', inputType: 'number' },
    { key: 'pay_frequency', label: 'Pay frequency', inputType: 'text' },
  ],
  unknown: [
    { key: 'notes', label: 'Detected fields (raw JSON)', inputType: 'text' },
  ],
};

function stringifyValue(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function DocumentExtractionReview({ householdId, extractions, onChange }: DocumentExtractionReviewProps) {
  const pending = useMemo(
    () => extractions.filter((item) => item.status === 'pending_review'),
    [extractions]
  );

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [formState, setFormState] = useState<Record<string, Record<string, string>>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const nextOpen: Record<string, boolean> = {};
    const nextForm: Record<string, Record<string, string>> = {};

    pending.forEach((item) => {
      nextOpen[item.id] = item.confidence === 'low';
      const fields = fieldDefinitions[item.detected_type] ?? fieldDefinitions.unknown;
      const rawFields =
        typeof item.extracted_fields === 'object' && item.extracted_fields !== null && !Array.isArray(item.extracted_fields)
          ? item.extracted_fields
          : {};

      nextForm[item.id] = fields.reduce((acc, field) => {
        const nestedFields =
          typeof (rawFields as Record<string, unknown>).fields === 'object' && (rawFields as Record<string, unknown>).fields !== null
            ? ((rawFields as Record<string, unknown>).fields as Record<string, unknown>)
            : {};
        const value = (rawFields as Record<string, unknown>)[field.key] ?? nestedFields[field.key] ?? '';
        acc[field.key] = stringifyValue(value);
        return acc;
      }, {} as Record<string, string>);
    });

    setOpenMap(nextOpen);
    setFormState(nextForm);
  }, [pending]);

  if (!pending.length) return null;

  return (
    <section className="rounded-3xl border border-cmd-gold/20 bg-cmd-black/40 p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Document extraction</p>
          <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Review extracted documents</h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-cmd-border bg-cmd-black/60 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cmd-muted">
          <FileSearch2 className="h-4 w-4 text-cmd-gold" /> {pending.length} pending review
        </div>
      </div>

      <div className="space-y-4">
        {pending.map((item) => {
          const fields = fieldDefinitions[item.detected_type] ?? fieldDefinitions.unknown;
          const isLowConfidence = item.confidence === 'low';
          const isOpen = openMap[item.id] ?? isLowConfidence;
          const statusAccent = isLowConfidence ? 'border-cmd-gold/40 bg-cmd-gold/10' : 'border-cmd-border/30 bg-cmd-black/50';

          return (
            <div key={item.id} className={`rounded-3xl border p-5 ${statusAccent}`}>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-cmd-gold">
                    <span className="text-xs uppercase tracking-[0.24em] text-cmd-muted">{item.detected_type.replace('_', ' ')}</span>
                    {isLowConfidence && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-amber-200">Low confidence</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-cmd-muted">Detected confidence: <span className="font-semibold text-cmd-offwhite">{item.confidence ?? 'unknown'}</span></p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenMap((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                  className="rounded-full border border-cmd-border bg-cmd-black/70 px-4 py-2 text-sm font-semibold text-cmd-gold"
                >
                  {isOpen ? 'Collapse' : 'Expand'}
                </button>
              </div>

              {isOpen && (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {fields.map((field) => (
                      <label key={field.key} className="space-y-2 text-sm">
                        <span className="text-xs uppercase tracking-[0.24em] text-cmd-muted">{field.label}</span>
                        <input
                          type={field.inputType}
                          value={formState[item.id]?.[field.key] ?? ''}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...(prev[item.id] ?? {}),
                                [field.key]: event.target.value,
                              },
                            }))}
                          className="w-full rounded-2xl border border-cmd-border bg-cmd-black/80 px-4 py-3 text-sm text-cmd-offwhite outline-none transition focus:border-cmd-gold"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={async () => {
                        setSubmitting((prev) => ({ ...prev, [item.id]: true }));
                        const success = await discardDocumentExtraction(item.id);
                        setSubmitting((prev) => ({ ...prev, [item.id]: false }));
                        if (success && onChange) onChange();
                      }}
                      disabled={submitting[item.id]}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" /> Discard
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setSubmitting((prev) => ({ ...prev, [item.id]: true }));
                        const success = await confirmDocumentExtraction(item.id, formState[item.id] ?? {}, item.detected_type, householdId, item.document_id);
                        setSubmitting((prev) => ({ ...prev, [item.id]: false }));
                        if (success && onChange) onChange();
                      }}
                      disabled={submitting[item.id]}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Confirm & Add to Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
