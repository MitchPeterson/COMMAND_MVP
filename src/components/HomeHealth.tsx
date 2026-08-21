import React from 'react';
import type { HouseholdProfile } from '../lib/supabase';
import { FindingList } from './FindingList';
import { useDismissals } from './useDismissals';
import { computeHomeHealth, type HomeFindingSeverity } from '../lib/homeHealth';
import { gradeTone } from '../lib/coverageHealth';
import type { HomeSystemRow } from '../lib/homeSystems';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';

interface Props {
  systems: HomeSystemRow[];
  profile?: HouseholdProfile | null;
  mortgagePrincipal?: number | null;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export function HomeHealth({ systems, profile, mortgagePrincipal }: Props) {
  const {
    score, grade, findings, dataFindings, confidence, confidenceReason, fiveYearExposure, systemsTracked,
  } = computeHomeHealth(systems, profile, mortgagePrincipal);

  // Findings the household has put down stay put -- and come back on their own
  // when the facts behind them change. See lib/dismissals.
  const { visible, hiddenCount, onDismiss, onRestore } = useDismissals('home', findings);
  const criticals = findings.filter((f) => f.severity === 'critical');
  const attention = findings.filter((f) => f.severity === 'attention');

  const tone =
    criticals.length > 0
      ? { label: 'Money is coming due', className: 'text-red-300' }
      : attention.length > 0
        ? { label: 'Worth planning for', className: 'text-amber-300' }
        : { label: 'Nothing pressing', className: 'text-emerald-300' };

  const icons: Record<HomeFindingSeverity, React.ReactNode> = {
    critical: <ShieldAlert className="h-4 w-4 shrink-0 text-red-300" />,
    attention: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />,
    info: <Info className="h-4 w-4 shrink-0 text-cmd-muted" />,
  };
  const borders: Record<HomeFindingSeverity, string> = {
    critical: 'border-red-500/25 bg-red-500/5',
    attention: 'border-amber-500/25 bg-amber-500/5',
    info: 'border-cmd-border bg-cmd-black/30',
  };

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-5">
          <div
            className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-current ${gradeTone(grade)}`}
            title={score === null ? 'Not enough information to grade' : `Home health ${score} of 100`}
          >
            <span className="text-3xl font-bold leading-none">{grade}</span>
            <span className="mt-1 text-[11px] opacity-70">{score === null ? '—' : score}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Home health</p>
            <h1 className="mt-2 text-3xl font-semibold text-cmd-offwhite">
              {systemsTracked} system{systemsTracked === 1 ? '' : 's'} tracked
            </h1>
            <p className={`mt-1 text-sm font-medium ${tone.className}`}>{tone.label}</p>
            <p className="mt-1 text-xs text-cmd-muted" title={confidenceReason}>
              Assessment confidence: {confidence}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-sm text-cmd-muted">Likely replacement spend</p>
          <p className="text-3xl font-semibold text-cmd-offwhite">{money(fiveYearExposure)}</p>
          <p className="mt-1 text-xs text-cmd-muted">over the next five years, at typical prices</p>
        </div>
      </div>

      {systemsTracked === 0 ? (
        <p className="mt-6 text-sm text-cmd-muted">
          Add the furnace, water heater and roof first — they carry most of the cost, and knowing their
          ages is most of what a replacement timeline needs.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {visible.length === 0 && hiddenCount === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <p className="text-sm text-cmd-muted">
                Nothing on file is near the end of its service life. Adding more systems widens what can
                be checked.
              </p>
            </div>
          ) : (
            <FindingList
              section="home"
              findings={visible}
              hiddenCount={hiddenCount}
              onDismiss={onDismiss}
              onRestore={onRestore}
            />
          )}

          {dataFindings.length > 0 && (
            <div className="mt-5 rounded-2xl border border-cmd-border bg-cmd-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">What limits this assessment</p>
              <ul className="mt-2 space-y-1.5">
                {dataFindings.map((finding, i) => (
                  <li key={i} className="text-sm text-cmd-muted">
                    <span className="text-cmd-offwhite/80">{finding.title}</span> — {finding.detail}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-cmd-muted/70">
                These affect how much could be checked, not the grade itself.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
