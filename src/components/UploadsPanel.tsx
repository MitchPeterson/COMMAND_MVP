// Whether every source has actually been loaded.
//
// The screen that stops every other number on the page from being quietly
// wrong. A household exports one account in August and another in September,
// and the totals describe a different set of accounts each month while looking
// exactly as confident either way.
//
// So the gaps are named to the day. "Chase checking is missing August 1 to
// August 6" is something someone can go and fix; "some data may be incomplete"
// is a disclaimer, which is what a page says when it does not know.
//
// Each card ends with the one instruction that matters -- what to export next,
// and from which day -- because the whole point is to make the chore small
// enough to do.

import React, { useMemo, useState } from 'react';
import { CheckCircle2, CircleDashed, CircleSlash, Clock, Loader2, Pencil, X } from 'lucide-react';
import {
  setSourcePeriodMark, setSourceTracking, renameSource, dismissUntrackedSource,
} from '../lib/supabase';
import {
  computeCoverage, describeRange, untrackedCounterparties,
  type CoverageStatus, type SourceCoverage, type SourceRef,
} from '../lib/transactions/coverage';
import { StatTile } from './StatTile';

interface Props {
  householdId: string;
  sources: SourceRef[];
  loads: Array<{ sourceId: string; start: string; end: string }>;
  marks: Record<string, 'complete' | 'not_needed'>;
  /** Transfers naming somewhere no source on file accounts for. */
  transfers: Array<{ description: string; counterpartyKey: string | null }>;
  dismissedKeys: string[];
  onChanged: () => Promise<void> | void;
  now?: Date;
}

const CHIP: Record<CoverageStatus, { label: string; className: string; icon: React.ReactNode }> = {
  confirmed: { label: 'Confirmed', className: 'border-cmd-good/50 text-cmd-good', icon: <CheckCircle2 className="h-3 w-3" /> },
  complete: { label: 'Complete', className: 'border-cmd-good/50 text-cmd-good', icon: <CheckCircle2 className="h-3 w-3" /> },
  in_progress: { label: 'In progress', className: 'border-cmd-border-hi text-cmd-muted', icon: <Clock className="h-3 w-3" /> },
  partial: { label: 'Partial', className: 'border-cmd-warn/50 text-cmd-warn', icon: <CircleDashed className="h-3 w-3" /> },
  missing: { label: 'Missing', className: 'border-red-500/40 text-cmd-bad', icon: <CircleSlash className="h-3 w-3" /> },
};

const SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const shortMonth = (period: string) => {
  const [y, m] = period.split('-').map(Number);
  return SHORT.format(new Date(Date.UTC(y, m - 1, 1))) + (m === 1 ? ` ’${String(y).slice(2)}` : '');
};

function SourceCard({
  coverage, householdId, onChanged,
}: { coverage: SourceCoverage; householdId: string; onChanged: Props['onChanged'] }) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(coverage.source.name);
  const [error, setError] = useState<string | null>(null);
  const { source } = coverage;

  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await work(); await onChanged(); }
    catch (err) { setError(err instanceof Error ? err.message : 'That did not work.'); }
    finally { setBusy(false); }
  };

  const markPeriod = (period: string, mark: 'complete' | 'not_needed') => run(() =>
    setSourcePeriodMark(householdId, {
      financeAccountId: source.kind === 'bank' ? source.id : null,
      creditCardId: source.kind === 'card' ? source.id : null,
      period, mark,
    }));

  return (
    <div className="rounded-2xl border border-cmd-border bg-cmd-charcoal p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') run(async () => { await renameSource(source.kind, source.id, name); setEditing(false); });
                  if (e.key === 'Escape') { setName(source.name); setEditing(false); }
                }}
                className="rounded-xl border border-cmd-border bg-cmd-black px-3 py-1.5 text-sm text-cmd-offwhite focus:border-cmd-gold focus:outline-none"
              />
              <button
                type="button"
                onClick={() => run(async () => { await renameSource(source.kind, source.id, name); setEditing(false); })}
                className="rounded-xl bg-cmd-gold px-3 py-1.5 text-xs font-medium text-cmd-black"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="group flex items-center gap-1.5 text-left"
            >
              <h3 className="text-lg font-semibold text-cmd-offwhite">{source.name}</h3>
              <Pencil className="h-3 w-3 text-cmd-muted opacity-0 transition group-hover:opacity-100" />
            </button>
          )}
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-cmd-muted">
            {source.kind === 'card' ? 'Credit card' : 'Bank account'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => run(() => setSourceTracking(source.kind, source.id, false))}
          disabled={busy}
          className="shrink-0 rounded-xl border border-cmd-border px-3 py-1.5 text-xs text-cmd-muted transition hover:border-red-500/40 hover:text-cmd-bad disabled:opacity-40"
          title="Stop asking about exports for this account. Nothing already loaded is removed."
        >
          Stop tracking
        </button>
      </div>

      {/* The one instruction that matters. */}
      <div className="mt-4 rounded-xl border border-cmd-border bg-cmd-black/40 p-3">
        {coverage.fill ? (
          <p className="text-sm text-cmd-offwhite">
            Fill in <span className="text-cmd-warn">{describeRange(coverage.fill)}</span>.
            {coverage.nextExportFrom && (
              <span className="text-cmd-muted"> Next export starts {describeRange({ start: coverage.nextExportFrom, end: coverage.nextExportFrom })}.</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-cmd-muted">
            Nothing missing.
            {coverage.nextExportFrom && ` Next export starts ${describeRange({ start: coverage.nextExportFrom, end: coverage.nextExportFrom })}.`}
          </p>
        )}
      </div>

      {/* Period by period. Newest first, as every list here is. */}
      <div className="mt-4 -mx-5 overflow-x-auto px-5">
        <div className="flex gap-2">
          {coverage.periods.map((p) => {
            const chip = CHIP[p.status];
            return (
              <div key={p.period} className="min-w-[7rem] shrink-0 rounded-xl border border-cmd-border bg-cmd-black/30 p-2.5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">{shortMonth(p.period)}</p>
                <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${chip.className}`}>
                  {chip.icon}{chip.label}
                </span>
                {p.note && <p className="mt-1.5 text-[10px] leading-3.5 text-cmd-muted">{p.note}</p>}
                {(p.status === 'missing' || p.status === 'partial') && (
                  // For a month that genuinely had no activity. Without this,
                  // a dormant account is permanently "missing" and the gap
                  // count never reaches zero.
                  <button
                    type="button"
                    onClick={() => markPeriod(p.period, 'not_needed')}
                    disabled={busy}
                    className="mt-1.5 text-[10px] text-cmd-muted underline decoration-dotted transition hover:text-cmd-gold disabled:opacity-40"
                  >
                    No activity
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-cmd-bad">{error}</p>}
      {busy && <Loader2 className="mt-3 h-3.5 w-3.5 animate-spin text-cmd-gold" />}
    </div>
  );
}

export function UploadsPanel({
  householdId, sources, loads, marks, transfers, dismissedKeys, onChanged, now = new Date(),
}: Props) {
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const coverage = useMemo(
    () => computeCoverage({ sources, loads, marks, now }),
    [sources, loads, marks, now],
  );

  const untracked = useMemo(
    () => untrackedCounterparties(transfers, dismissedKeys),
    [transfers, dismissedKeys],
  );

  const lastPeriod = coverage[0]?.periods[1]?.period ?? null;
  const completeLastPeriod = lastPeriod
    ? coverage.filter((c) => {
      const p = c.periods.find((x) => x.period === lastPeriod);
      return p?.status === 'complete' || p?.status === 'confirmed';
    }).length
    : 0;
  const gaps = coverage.reduce((sum, c) => sum + c.gapCount, 0);

  if (sources.filter((s) => s.tracked).length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
        No accounts are being tracked for exports yet. Import one and it appears here.
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">What has been loaded</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
        Every total on this page is only as complete as what has been imported. A month missing an
        account is not wrong by a little — it describes a different household.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatTile label="Accounts tracked" value={String(coverage.length)} />
        <StatTile
          label={lastPeriod ? `Complete for ${shortMonth(lastPeriod)}` : 'Complete last month'}
          value={`${completeLastPeriod} of ${coverage.length}`}
          tone={completeLastPeriod < coverage.length ? 'warn' : 'default'}
        />
        <StatTile
          label="Gaps to fill"
          value={String(gaps)}
          tone={gaps > 0 ? 'warn' : 'default'}
          note={gaps === 0 ? 'nothing outstanding in a finished month' : 'in months that have finished'}
        />
      </div>

      <div className="mt-5 space-y-4">
        {coverage.map((c) => (
          <SourceCard key={c.source.id} coverage={c} householdId={householdId} onChanged={onChanged} />
        ))}
      </div>

      {/* Places money went that no account on file accounts for. */}
      {untracked.length > 0 && (
        <div className="mt-6 rounded-2xl border border-cmd-border bg-cmd-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Seen, but not on file</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
            Your transfers name these, and nothing on file accounts for them. Each is either an
            account worth importing or one Command should stop mentioning.
          </p>
          <ul className="mt-3 space-y-1.5">
            {untracked.slice(0, 8).map((u) => (
              <li key={u.key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-cmd-offwhite">
                  {u.name}
                  <span className="ml-2 text-[11px] text-cmd-muted">
                    seen {u.count} time{u.count === 1 ? '' : 's'}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={busyKey === u.key}
                  onClick={async () => {
                    setBusyKey(u.key);
                    try { await dismissUntrackedSource(householdId, u.key, u.name); await onChanged(); }
                    finally { setBusyKey(null); }
                  }}
                  className="shrink-0 rounded-xl border border-cmd-border px-2.5 py-1 text-xs text-cmd-muted transition hover:text-cmd-offwhite disabled:opacity-40"
                >
                  {busyKey === u.key ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Not needed'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
