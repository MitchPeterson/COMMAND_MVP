// What the API has actually been spent on.
//
// Every call already computed its own price for the cost line in the response
// and then threw it away, so "the balance ran down fast" had no answer beyond a
// guess. This is the answer: which document, which pass, which model, how many
// times, and how much of it was wasted on readings that failed or repeated.
//
// Kept out of the way in Profile rather than given a section. It is a tool for
// whoever pays the bill, not part of what Command is for.

import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { getApiUsage, summarizeUsage, type ApiUsageRow, type UsageBucket } from '../lib/supabase';

type Window = 'all' | '30d' | '7d' | '24h';

const WINDOWS: Array<{ key: Window; label: string; hours: number | null }> = [
  { key: '24h', label: 'Last 24 hours', hours: 24 },
  { key: '7d', label: 'Last 7 days', hours: 24 * 7 },
  { key: '30d', label: 'Last 30 days', hours: 24 * 30 },
  { key: 'all', label: 'All time', hours: null },
];

const usd = (value: number) =>
  value >= 1 ? `$${value.toFixed(2)}` : `$${value.toFixed(4)}`;

const tokens = (value: number) =>
  value >= 1_000_000 ? `${(value / 1e6).toFixed(1)}M`
    : value >= 1000 ? `${Math.round(value / 1000)}k`
      : String(value);

function BucketTable({ title, note, buckets, total }: {
  title: string; note: string; buckets: UsageBucket[]; total: number;
}) {
  if (buckets.length === 0) return null;
  return (
    <div className="rounded-2xl border border-cmd-border bg-cmd-black/30 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">{title}</p>
      <p className="mt-1 text-xs text-cmd-muted/70">{note}</p>
      <div className="mt-3 space-y-2">
        {buckets.slice(0, 12).map((b) => {
          const share = total > 0 ? (b.cost / total) * 100 : 0;
          return (
            <div key={b.key}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="min-w-0 truncate text-sm text-cmd-offwhite" title={b.key}>{b.key}</span>
                <span className="shrink-0 font-mono text-sm text-cmd-offwhite">{usd(b.cost)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-cmd-black/60">
                  <div className="h-full rounded-full bg-cmd-gold/60" style={{ width: `${Math.min(100, share)}%` }} />
                </div>
                <span className="shrink-0 text-[11px] text-cmd-muted">
                  {b.calls} call{b.calls === 1 ? '' : 's'} · {tokens(b.outputTokens)} out
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ApiUsageReport() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ApiUsageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [window_, setWindow] = useState<Window>('all');

  // Loaded on demand rather than with the household — nothing else needs it,
  // and it is the largest table in the app on a busy account.
  const load = async () => {
    setLoading(true);
    try {
      setRows(await getApiUsage());
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !loaded && !loading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const hours = WINDOWS.find((w) => w.key === window_)?.hours ?? null;
    if (hours == null) return rows;
    const cutoff = Date.now() - hours * 3600_000;
    return rows.filter((r) => new Date(r.created_at).getTime() >= cutoff);
  }, [rows, window_]);

  const s = useMemo(() => summarizeUsage(filtered), [filtered]);

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="flex items-center gap-3">
          <Activity className="h-4 w-4 text-cmd-muted" />
          <span>
            <span className="block text-sm font-semibold text-cmd-offwhite">API usage and cost</span>
            <span className="block text-xs text-cmd-muted">
              What every document reading has cost, by pass, model and file
            </span>
          </span>
        </span>
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-cmd-muted" />
          : <ChevronRight className="h-4 w-4 shrink-0 text-cmd-muted" />}
      </button>

      {open && (
        <div className="mt-6">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {WINDOWS.map((w) => (
              <button
                key={w.key}
                type="button"
                onClick={() => setWindow(w.key)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  window_ === w.key
                    ? 'border-cmd-gold/50 bg-cmd-gold/10 text-cmd-gold'
                    : 'border-cmd-border bg-cmd-black/60 text-cmd-muted hover:text-cmd-offwhite'
                }`}
              >
                {w.label}
              </button>
            ))}
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-cmd-border px-3 py-1 text-xs text-cmd-muted transition hover:text-cmd-offwhite disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {loading && !loaded ? (
            <p className="text-sm text-cmd-muted">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
              {loaded
                ? 'No calls recorded in this window. Anything read before cost logging shipped is not here.'
                : 'Nothing loaded yet.'}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-cmd-border bg-cmd-charcoal p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Spent</p>
                  <p className="mt-2 text-3xl font-semibold text-cmd-offwhite">{usd(s.cost)}</p>
                  <p className="mt-1 text-xs text-cmd-muted">{s.calls} calls</p>
                </div>
                <div className="rounded-2xl border border-cmd-border bg-cmd-charcoal p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Saved by replay</p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-300">{usd(s.saved)}</p>
                  <p className="mt-1 text-xs text-cmd-muted">{s.replayed} replayed</p>
                </div>
                <div className="rounded-2xl border border-cmd-border bg-cmd-charcoal p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Spent on failures</p>
                  <p className={`mt-2 text-3xl font-semibold ${s.failedCost > 0 ? 'text-amber-300' : 'text-cmd-offwhite'}`}>
                    {usd(s.failedCost)}
                  </p>
                  <p className="mt-1 text-xs text-cmd-muted">
                    {s.failed} call{s.failed === 1 ? '' : 's'} refused or truncated
                  </p>
                </div>
                <div className="rounded-2xl border border-cmd-border bg-cmd-charcoal p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Output share</p>
                  <p className="mt-2 text-3xl font-semibold text-cmd-offwhite">
                    {s.outputCostShare == null ? '--' : `${Math.round(s.outputCostShare * 100)}%`}
                  </p>
                  <p className="mt-1 text-xs text-cmd-muted">
                    {tokens(s.inputTokens)} in · {tokens(s.outputTokens)} out
                  </p>
                </div>
              </div>

              <p className="text-xs leading-5 text-cmd-muted">
                Output is usually most of the bill, which is why the effort setting and a model&rsquo;s
                output rate move it more than anything on the input side. Prices are the ones in force
                when each call was made, so this is not rewritten when rates change.
              </p>

              <div className="grid gap-4 lg:grid-cols-3">
                <BucketTable
                  title="By pass" total={s.cost} buckets={s.byLabel}
                  note="A three-pass insurance reading costs three times a one-pass mortgage reading."
                />
                <BucketTable
                  title="By model" total={s.cost} buckets={s.byModel}
                  note="Classification is cheap; the deep extraction passes are not."
                />
                <BucketTable
                  title="By document" total={s.cost} buckets={s.byDocument}
                  note="A file read many times shows up here as one expensive row."
                />
              </div>

              <details className="rounded-2xl border border-cmd-border bg-cmd-black/30 p-5">
                <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-cmd-muted">
                  Every call
                </summary>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-cmd-border text-xs uppercase tracking-[0.16em] text-cmd-muted">
                        <th className="py-2 pr-4 font-normal">When</th>
                        <th className="py-2 pr-4 font-normal">Document</th>
                        <th className="py-2 pr-4 font-normal">Pass</th>
                        <th className="py-2 pr-4 font-normal">Model</th>
                        <th className="py-2 pr-4 text-right font-normal">In / out</th>
                        <th className="py-2 pr-4 text-right font-normal">Took</th>
                        <th className="py-2 text-right font-normal">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 300).map((r) => (
                        <tr key={r.id} className="border-b border-cmd-border/40 last:border-0">
                          <td className="py-2 pr-4 font-mono text-xs text-cmd-muted">
                            {new Date(r.created_at).toLocaleString()}
                          </td>
                          <td className="max-w-[220px] truncate py-2 pr-4 text-cmd-offwhite" title={r.document_name ?? ''}>
                            {r.document_name ?? '—'}
                          </td>
                          <td className="py-2 pr-4 text-cmd-muted">
                            {r.label}
                            {!r.succeeded && <span className="ml-2 text-amber-300">failed</span>}
                          </td>
                          <td className="py-2 pr-4 font-mono text-xs text-cmd-muted">{r.model}</td>
                          <td className="py-2 pr-4 text-right font-mono text-xs text-cmd-muted">
                            {tokens(r.input_tokens + r.cache_write_tokens + r.cache_read_tokens)} / {tokens(r.output_tokens)}
                          </td>
                          <td className="py-2 pr-4 text-right font-mono text-xs text-cmd-muted">
                            {r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—'}
                          </td>
                          <td className={`py-2 text-right font-mono ${r.replayed ? 'text-emerald-300' : 'text-cmd-offwhite'}`}>
                            {r.replayed ? `${usd(0)} (saved ${usd(Number(r.saved_usd))})` : usd(Number(r.cost_usd))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length > 300 && (
                    <p className="mt-3 text-xs text-cmd-muted">
                      Showing the most recent 300 of {filtered.length}.
                    </p>
                  )}
                </div>
              </details>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
