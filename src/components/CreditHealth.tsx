import React from 'react';
import type { CreditCard as CreditCardRow, HouseholdProfile } from '../lib/supabase';
import { computeCreditHealth, type CreditFindingSeverity } from '../lib/creditHealth';
import { gradeTone } from '../lib/coverageHealth';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';

interface Props {
  cards: CreditCardRow[];
  profile?: HouseholdProfile | null;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export function CreditHealth({ cards, profile }: Props) {
  const {
    score, grade, findings, dataFindings, confidence, confidenceReason,
    totalLimit, totalBalance, utilization, cardCount,
  } = computeCreditHealth(cards, profile);

  const criticals = findings.filter((f) => f.severity === 'critical');
  const attention = findings.filter((f) => f.severity === 'attention');

  const tone =
    criticals.length > 0
      ? { label: 'Needs attention', className: 'text-red-300' }
      : attention.length > 0
        ? { label: 'Review suggested', className: 'text-amber-300' }
        : { label: 'Nothing outstanding found', className: 'text-emerald-300' };

  const icons: Record<CreditFindingSeverity, React.ReactNode> = {
    critical: <ShieldAlert className="h-4 w-4 shrink-0 text-red-300" />,
    attention: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />,
    info: <Info className="h-4 w-4 shrink-0 text-cmd-muted" />,
  };
  const borders: Record<CreditFindingSeverity, string> = {
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
            title={score === null ? 'Not enough information to grade' : `Credit health ${score} of 100`}
          >
            <span className="text-3xl font-bold leading-none">{grade}</span>
            <span className="mt-1 text-[11px] opacity-70">{score === null ? '—' : score}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Credit health</p>
            <h1 className="mt-2 text-3xl font-semibold text-cmd-offwhite">
              {cardCount} card{cardCount === 1 ? '' : 's'}
            </h1>
            <p className={`mt-1 text-sm font-medium ${tone.className}`}>{tone.label}</p>
            <p className="mt-1 text-xs text-cmd-muted" title={confidenceReason}>
              Assessment confidence: {confidence}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm text-cmd-muted">Utilization</p>
          <p className="text-3xl font-semibold text-cmd-offwhite">
            {utilization == null ? '--' : `${Math.round(utilization)}%`}
          </p>
          <p className="mt-1 text-xs text-cmd-muted">
            {totalLimit > 0 ? `${money(totalBalance)} of ${money(totalLimit)}` : 'No limits recorded'}
          </p>
        </div>
      </div>

      {cardCount === 0 ? (
        <p className="mt-6 text-sm text-cmd-muted">
          No cards on file yet. Add a card below and Command will track utilization against your
          limits and your income, and tell you what it can — and cannot — see.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {findings.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <p className="text-sm text-cmd-muted">
                Nothing outstanding across the cards on file. Adding balances and limits for any
                missing card widens the checks that can run.
              </p>
            </div>
          ) : (
            findings.map((finding, i) => (
              <div key={i} className={`flex gap-3 rounded-2xl border px-4 py-3 ${borders[finding.severity]}`}>
                {icons[finding.severity]}
                <div>
                  <p className="text-sm font-semibold text-cmd-offwhite">{finding.title}</p>
                  <p className="mt-1 text-sm text-cmd-muted">{finding.detail}</p>
                </div>
              </div>
            ))
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
