import React from 'react';
import type {
  Asset, BudgetSummary, CreditCard, CreditTransaction, FinanceAccount, HouseholdProfile,
  Loan, MortgageAccount,
} from '../lib/supabase';
import { computeFinancesHealth, type FinanceFindingSeverity } from '../lib/financesHealth';
import { FindingList } from './FindingList';
import { useDismissals } from './useDismissals';
import { gradeTone } from '../lib/coverageHealth';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';

interface Props {
  accounts: FinanceAccount[];
  loans: Loan[];
  cards: CreditCard[];
  mortgage?: MortgageAccount | null;
  assets: Asset[];
  budget?: BudgetSummary | null;
  profile?: HouseholdProfile | null;
  transactions?: CreditTransaction[];
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

/** One line of the balance sheet. Zero is shown, not hidden — an absent debt is information. */
function SheetRow({ label, value, muted = false }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className={`text-sm ${muted ? 'text-cmd-muted' : 'text-cmd-offwhite/80'}`}>{label}</span>
      <span className={`font-mono text-sm ${muted ? 'text-cmd-muted' : 'text-cmd-offwhite'}`}>
        {money(value)}
      </span>
    </div>
  );
}

export function FinancesHealth(props: Props) {
  const result = computeFinancesHealth(
    props.accounts, props.loans, props.cards, props.mortgage,
    props.assets, props.budget, props.profile, props.transactions ?? [],
  );
  const {
    score, grade, findings, dataFindings, confidence, confidenceReason,
    liquidAssets, investedAssets, propertyAssets, totalAssets,
    mortgageDebt, loanDebt, cardDebt, totalDebt,
    computedNetWorth, statedNetWorth, netWorthGap,
    emergencyFundMonths, savingsRatePct, debtToIncomePct,
  } = result;

  // Findings the household has put down stay put -- and come back on their own
  // when the facts behind them change. See lib/dismissals.
  const { visible, hiddenCount, onDismiss, onRestore } = useDismissals('finances', findings);
  const criticals = findings.filter((f) => f.severity === 'critical');
  const attention = findings.filter((f) => f.severity === 'attention');
  const tone =
    criticals.length > 0
      ? { label: 'Needs attention', className: 'text-red-300' }
      : attention.length > 0
        ? { label: 'Review suggested', className: 'text-amber-300' }
        : { label: 'Nothing outstanding found', className: 'text-emerald-300' };

  const icons: Record<FinanceFindingSeverity, React.ReactNode> = {
    critical: <ShieldAlert className="h-4 w-4 shrink-0 text-red-300" />,
    attention: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />,
    info: <Info className="h-4 w-4 shrink-0 text-cmd-muted" />,
  };
  const borders: Record<FinanceFindingSeverity, string> = {
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
            title={score === null ? 'Not enough information to grade' : `Finances health ${score} of 100`}
          >
            <span className="text-3xl font-bold leading-none">{grade}</span>
            <span className="mt-1 text-[11px] opacity-70">{score === null ? '—' : score}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Finances health</p>
            <h1 className="mt-2 text-3xl font-semibold text-cmd-offwhite">{money(computedNetWorth)}</h1>
            <p className="mt-1 text-xs text-cmd-muted">Net worth from what is on file</p>
            <p className={`mt-1 text-sm font-medium ${tone.className}`}>{tone.label}</p>
            <p className="mt-1 text-xs text-cmd-muted" title={confidenceReason}>
              Assessment confidence: {confidence}
            </p>
          </div>
        </div>

        <div className="shrink-0 space-y-3 text-left sm:text-right">
          <div>
            <p className="text-sm text-cmd-muted">Cash covers</p>
            <p className="text-2xl font-semibold text-cmd-offwhite">
              {emergencyFundMonths == null ? '--' : `${emergencyFundMonths.toFixed(1)} mo`}
            </p>
          </div>
          <div className="flex gap-5">
            <div>
              <p className="text-xs text-cmd-muted">Saving</p>
              <p className="text-sm font-semibold text-cmd-offwhite">
                {savingsRatePct == null ? '--' : `${Math.round(savingsRatePct)}%`}
              </p>
            </div>
            <div>
              <p className="text-xs text-cmd-muted">Debt service</p>
              <p className="text-sm font-semibold text-cmd-offwhite">
                {debtToIncomePct == null ? '--' : `${Math.round(debtToIncomePct)}%`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* The balance sheet itself. Assembled from every section that owns a
          piece of it, which is the only place the whole picture exists. */}
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-cmd-border bg-cmd-black/30 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">What you own</p>
          <div className="mt-3">
            <SheetRow label="Cash and savings" value={liquidAssets} />
            <SheetRow label="Invested and retirement" value={investedAssets} />
            <SheetRow label="Property and vehicles" value={propertyAssets} />
            <div className="mt-2 border-t border-cmd-border pt-2">
              <SheetRow label="Total" value={totalAssets} />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-cmd-border bg-cmd-black/30 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">What you owe</p>
          <div className="mt-3">
            <SheetRow label="Mortgage" value={mortgageDebt} muted={mortgageDebt === 0} />
            <SheetRow label="Loans" value={loanDebt} muted={loanDebt === 0} />
            <SheetRow label="Card balances" value={cardDebt} muted={cardDebt === 0} />
            <div className="mt-2 border-t border-cmd-border pt-2">
              <SheetRow label="Total" value={totalDebt} />
            </div>
          </div>
          <p className="mt-3 text-xs text-cmd-muted">
            The mortgage is kept in Home and the cards in Credit. This reads all three.
          </p>
        </div>
      </div>

      {statedNetWorth != null && netWorthGap != null && Math.abs(netWorthGap) > 1000 && (
        <p className="mt-3 text-xs text-cmd-muted">
          Your profile states {money(statedNetWorth)} — a difference of {money(Math.abs(netWorthGap))}.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {visible.length === 0 && hiddenCount === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <p className="text-sm text-cmd-muted">
              Nothing outstanding against what is on file.
            </p>
          </div>
        ) : (
          <FindingList
              section="finances"
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
    </section>
  );
}
