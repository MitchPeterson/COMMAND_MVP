import React, { useEffect, useState } from 'react';
import { getRecordHistory, type RecordHistoryEntry } from '../lib/supabase';
import { History, Loader2 } from 'lucide-react';

interface Props {
  tableName: string;
  recordId: string;
}

const FIELD_LABELS: Record<string, string> = {
  carrier: 'Carrier',
  policy_number: 'Policy number',
  coverage_amount: 'Coverage amount',
  annual_premium: 'Annual premium',
  deductible: 'Deductible',
  renewal_date: 'Renewal date',
  type: 'Type',
  status: 'Status',
  notes: 'Notes',
  name: 'Name',
  current_value: 'Value',
};

const MONEY_FIELDS = new Set(['coverage_amount', 'annual_premium', 'deductible', 'current_value']);

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return 'empty';
  if (MONEY_FIELDS.has(field) && typeof value === 'number') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date);
}

/**
 * Version history for a single record. Loaded on demand rather than with the
 * page — history is something you go looking for, and fetching it for every
 * policy on every render would be wasted work.
 */
export function RecordHistory({ tableName, recordId }: Props) {
  const [entries, setEntries] = useState<RecordHistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getRecordHistory(tableName, recordId).then((rows) => {
      if (active) {
        setEntries(rows);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [tableName, recordId]);

  if (loading) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-cmd-border bg-cmd-black/30 px-4 py-3 text-sm text-cmd-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-cmd-border bg-cmd-black/30 px-4 py-3 text-sm text-cmd-muted">
        No recorded changes yet.
      </div>
    );
  }

  const current = entries[0];

  return (
    <div className="mt-4 rounded-2xl border border-cmd-border bg-cmd-black/30 p-4">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-cmd-gold" />
        <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">
          Version {current.version} · current
        </p>
      </div>

      <ol className="mt-4 space-y-3">
        {entries.map((entry) => {
          const changes = Object.entries(entry.changed_fields ?? {});
          const isCurrent = entry.version === current.version;

          return (
            <li
              key={entry.id}
              className={`rounded-xl border px-4 py-3 ${
                isCurrent ? 'border-cmd-gold/25 bg-cmd-gold/5' : 'border-cmd-border bg-cmd-black/40'
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-cmd-offwhite">
                  v{entry.version} · {entry.operation}
                </p>
                <p className="text-xs text-cmd-muted">{formatWhen(entry.changed_at)}</p>
              </div>

              {changes.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {changes.map(([field, change]) => (
                    <li key={field} className="text-sm text-cmd-muted">
                      <span className="text-cmd-offwhite/80">{FIELD_LABELS[field] ?? field}</span>{' '}
                      <span className="text-cmd-muted/70 line-through">{formatValue(field, change.from)}</span>
                      {' → '}
                      <span className="text-cmd-offwhite">{formatValue(field, change.to)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-cmd-muted">
                  {entry.operation === 'created' ? 'Record created.' : 'Record removed.'}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
