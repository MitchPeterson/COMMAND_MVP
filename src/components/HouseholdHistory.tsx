import React, { useEffect, useState } from 'react';
import { getHouseholdHistory, type RecordHistoryEntry } from '../lib/supabase';
import { ChevronDown, ChevronRight, History, Loader2 } from 'lucide-react';

const TABLE_LABELS: Record<string, string> = {
  insurance_policies: 'Insurance policy',
  legal_documents: 'Legal document',
  assets: 'Asset',
  household_profile: 'Household profile',
  finance_accounts: 'Finance account',
  credit_cards: 'Credit card',
};

const describe = (entry: RecordHistoryEntry): string => {
  const label = TABLE_LABELS[entry.table_name] ?? entry.table_name;
  const name =
    (entry.snapshot?.carrier as string) ??
    (entry.snapshot?.name as string) ??
    (entry.snapshot?.account_name as string) ??
    (entry.snapshot?.card_name as string) ??
    '';
  const subject = name ? `${label} — ${name}` : label;
  if (entry.operation === 'created') return `${subject} added`;
  if (entry.operation === 'deleted') return `${subject} removed`;
  const fields = Object.keys(entry.changed_fields ?? {});
  return `${subject}: ${fields.length} field${fields.length === 1 ? '' : 's'} changed`;
};

const when = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
};

/** Household-wide change log. Collapsed by default — it is a reference, not a feed. */
export function HouseholdHistory({ householdId }: { householdId: string }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<RecordHistoryEntry[] | null>(null);

  useEffect(() => {
    if (!open || entries !== null) return;
    getHouseholdHistory(householdId).then(setEntries);
  }, [open, entries, householdId]);

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          <History className="h-5 w-5 text-cmd-gold" />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Version history</p>
            <h2 className="mt-1 text-xl font-semibold text-cmd-offwhite">Recent changes</h2>
          </div>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-cmd-muted" /> : <ChevronRight className="h-4 w-4 text-cmd-muted" />}
      </button>

      {open && (
        <div className="mt-5">
          {entries === null ? (
            <p className="flex items-center gap-2 text-sm text-cmd-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-cmd-muted">No recorded changes yet.</p>
          ) : (
            <ol className="space-y-2">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-cmd-border bg-cmd-black/40 px-4 py-2.5"
                >
                  <span className="text-sm text-cmd-offwhite">{describe(entry)}</span>
                  <span className="text-xs text-cmd-muted">
                    v{entry.version} · {when(entry.changed_at)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
