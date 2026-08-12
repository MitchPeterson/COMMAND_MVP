// Finances health.
//
// The section answers three questions and grades on those alone: what is owned,
// what is owed, and whether the money coming in is doing anything useful.
//
// The one that makes it worth having is reconciliation. A user states a net
// worth in their profile; Command knows what is actually on file. When those
// disagree by a wide margin, everything downstream that leans on net worth — the
// umbrella recommendation most of all — is reasoning from a number nobody has
// checked. Saying so is more useful than quietly picking one.
//
// What this is not: investment advice, a return projection, or an opinion on
// anyone's allocation. Command reports balances, totals and the gaps between
// them. Whether a portfolio is right for a household is not a question it
// answers.

import type {
  Asset, BudgetSummary, CreditCard, FinanceAccount, HouseholdProfile,
  Loan, MortgageAccount,
} from './supabase';

export type FinanceFindingSeverity = 'critical' | 'attention' | 'info';

export interface FinanceFinding {
  severity: FinanceFindingSeverity;
  title: string;
  detail: string;
}

export interface FinancesHealthResult {
  score: number | null;
  grade: string;
  status: 'good' | 'review' | 'action_needed' | 'unknown';
  findings: FinanceFinding[];
  dataFindings: FinanceFinding[];
  confidence: 'high' | 'moderate' | 'limited';
  confidenceReason: string;

  // The balance sheet, assembled from every section that owns a piece of it.
  liquidAssets: number;
  investedAssets: number;
  propertyAssets: number;
  totalAssets: number;
  mortgageDebt: number;
  loanDebt: number;
  cardDebt: number;
  totalDebt: number;
  computedNetWorth: number;
  statedNetWorth: number | null;
  /** computed - stated. Negative means more was claimed than is on file. */
  netWorthGap: number | null;

  monthlyIncome: number | null;
  monthlyExpenses: number | null;
  savingsRatePct: number | null;
  emergencyFundMonths: number | null;
  monthlyDebtService: number;
  debtToIncomePct: number | null;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

// Account types, matched on substrings because account_type is free text and
// arrives from onboarding, extraction and hand entry with no shared vocabulary.
const LIQUID = ['checking', 'savings', 'money market', 'cash', 'cd', 'certificate'];
const INVESTED = [
  'brokerage', 'investment', 'taxable', 'retirement', '401', '403', '457', 'ira',
  'roth', 'pension', 'hsa', 'education', '529', 'annuity', 'crypto',
];

const matches = (type: string | null | undefined, list: string[]) => {
  const value = (type ?? '').toLowerCase();
  return list.some((t) => value.includes(t));
};

/** Emergency fund targets. Stated in the finding so the reasoning can be argued with. */
const EMERGENCY_FUND_TARGET_MONTHS = 6;
const EMERGENCY_FUND_THIN_MONTHS = 3;
/** Above this share of income going to debt service, everything else gets harder. */
const DEBT_SERVICE_HIGH_PCT = 36;
const DEBT_SERVICE_SEVERE_PCT = 43;
/** A stated net worth this far from what is on file is worth reconciling. */
const NET_WORTH_TOLERANCE_PCT = 15;

export function computeFinancesHealth(
  accounts: FinanceAccount[],
  loans: Loan[],
  cards: CreditCard[],
  mortgage: MortgageAccount | null | undefined,
  assets: Asset[],
  budget: BudgetSummary | null | undefined,
  profile: HouseholdProfile | null | undefined,
): FinancesHealthResult {
  const findings: FinanceFinding[] = [];
  const dataFindings: FinanceFinding[] = [];

  // ── Assets ────────────────────────────────────────────────────────────────
  const liquidAssets = accounts
    .filter((a) => matches(a.account_type, LIQUID))
    .reduce((sum, a) => sum + (a.balance ?? 0), 0);
  const investedAssets = accounts
    .filter((a) => matches(a.account_type, INVESTED))
    .reduce((sum, a) => sum + (a.balance ?? 0), 0);
  // Accounts that match neither list still count toward the total — dropping a
  // balance because its label was unfamiliar would silently understate net worth.
  const otherAccounts = accounts
    .filter((a) => !matches(a.account_type, LIQUID) && !matches(a.account_type, INVESTED))
    .reduce((sum, a) => sum + (a.balance ?? 0), 0);

  const homeValue = profile?.home_value ?? 0;
  const vehicleValue = assets
    .filter((a) => a.type === 'vehicle')
    .reduce((sum, a) => sum + (a.current_value ?? 0), 0);

  // Real estate comes from the assets table when anything is itemized there, and
  // from the profile figure only when nothing is. Taking both double-counts the
  // house; excluding real_estate outright — which this did first — silently
  // dropped a second property, so a rental or a cabin never reached net worth.
  const realEstate = assets.filter((a) => a.type === 'real_estate');
  const realEstateValue = realEstate.length > 0
    ? realEstate.reduce((sum, a) => sum + (a.current_value ?? 0), 0)
    : homeValue;

  const otherProperty = assets
    .filter((a) => a.type !== 'vehicle' && a.type !== 'real_estate')
    .reduce((sum, a) => sum + (a.current_value ?? 0), 0);
  const propertyAssets = realEstateValue + vehicleValue + otherProperty;
  const totalAssets = liquidAssets + investedAssets + otherAccounts + propertyAssets;

  // ── Debts, read from whichever section owns each record ───────────────────
  const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'deferred');
  const mortgageDebt = mortgage?.principal_balance ?? 0;
  const loanDebt = activeLoans.reduce((sum, l) => sum + (l.current_balance ?? 0), 0);
  const cardDebt = cards.reduce((sum, c) => sum + (c.current_balance ?? 0), 0);
  const totalDebt = mortgageDebt + loanDebt + cardDebt;

  const computedNetWorth = totalAssets - totalDebt;
  const statedNetWorth = profile?.net_worth ?? null;
  const netWorthGap = statedNetWorth != null ? computedNetWorth - statedNetWorth : null;

  // ── Cash flow ─────────────────────────────────────────────────────────────
  const monthlyIncome = budget?.monthly_income
    ?? (profile?.household_income ? profile.household_income / 12 : null);
  const monthlyExpenses = budget?.monthly_expenses ?? null;
  const savingsRatePct = budget?.savings_rate
    ?? (monthlyIncome && monthlyExpenses
      ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100
      : null);

  const monthlyDebtService =
    (mortgage?.monthly_payment ?? 0) +
    activeLoans.reduce((sum, l) => sum + (l.monthly_payment ?? 0), 0);
  const debtToIncomePct = monthlyIncome && monthlyIncome > 0
    ? (monthlyDebtService / monthlyIncome) * 100
    : null;

  const emergencyFundMonths = budget?.emergency_fund_months
    ?? (monthlyExpenses && monthlyExpenses > 0 ? liquidAssets / monthlyExpenses : null);

  // ── Findings ──────────────────────────────────────────────────────────────

  // Reconciliation leads. Everything that leans on net worth — the umbrella
  // finding above all — is reasoning from whichever number it happened to read.
  if (statedNetWorth != null && statedNetWorth > 0 && netWorthGap != null) {
    const gapPct = Math.abs(netWorthGap / statedNetWorth) * 100;
    if (gapPct > NET_WORTH_TOLERANCE_PCT) {
      const short = netWorthGap < 0;
      findings.push({
        severity: gapPct > 40 ? 'attention' : 'info',
        title: short
          ? `${money(Math.abs(netWorthGap))} of your stated net worth is not on file`
          : `What is on file exceeds your stated net worth by ${money(netWorthGap)}`,
        detail: short
          ? `You entered ${money(statedNetWorth)}. The accounts, property and debts Command holds come ` +
            `to ${money(computedNetWorth)}. Either something is not recorded yet — an account, a ` +
            `property, an interest in a business — or the figure on your profile has drifted. ` +
            `Insurance findings compare coverage against net worth, so the gap matters beyond this page.`
          : `You entered ${money(statedNetWorth)}. The records on file come to ${money(computedNetWorth)}. ` +
            `Updating the profile figure keeps the coverage findings honest.`,
      });
    }
  } else if (statedNetWorth == null) {
    dataFindings.push({
      severity: 'info',
      title: 'No stated net worth to reconcile against',
      detail: `Command computes ${money(computedNetWorth)} from what is on file. Adding your own figure ` +
        `to the profile lets it flag when something is missing.`,
    });
  }

  // Emergency fund.
  if (emergencyFundMonths != null) {
    if (emergencyFundMonths < EMERGENCY_FUND_THIN_MONTHS) {
      findings.push({
        severity: 'critical',
        title: `Cash on hand covers ${emergencyFundMonths.toFixed(1)} months of expenses`,
        detail: `${money(liquidAssets)} in checking, savings and cash against monthly expenses. ` +
          `Under ${EMERGENCY_FUND_THIN_MONTHS} months, an ordinary setback becomes a borrowing decision.`,
      });
    } else if (emergencyFundMonths < EMERGENCY_FUND_TARGET_MONTHS) {
      findings.push({
        severity: 'attention',
        title: `Cash covers ${emergencyFundMonths.toFixed(1)} months against a ${EMERGENCY_FUND_TARGET_MONTHS}-month target`,
        detail: `${money(liquidAssets)} liquid. Six months is the conventional target for a dual-income ` +
          `household; a single-income one is usually told to hold more.`,
      });
    }
  } else {
    dataFindings.push({
      severity: 'info',
      title: 'No monthly expenses recorded',
      detail: 'Without them Command cannot say how long the cash on hand would last.',
    });
  }

  // Debt service.
  if (debtToIncomePct != null && monthlyDebtService > 0) {
    if (debtToIncomePct > DEBT_SERVICE_SEVERE_PCT) {
      findings.push({
        severity: 'critical',
        title: `Debt payments take ${Math.round(debtToIncomePct)}% of monthly income`,
        detail: `${money(monthlyDebtService)} a month across the mortgage and loans on file. Above ` +
          `${DEBT_SERVICE_SEVERE_PCT}% is the threshold most lenders stop at for new borrowing.`,
      });
    } else if (debtToIncomePct > DEBT_SERVICE_HIGH_PCT) {
      findings.push({
        severity: 'attention',
        title: `Debt payments take ${Math.round(debtToIncomePct)}% of monthly income`,
        detail: `${money(monthlyDebtService)} a month. Above ${DEBT_SERVICE_HIGH_PCT}% leaves less room ` +
          `for saving than the rest of this page assumes.`,
      });
    }
  }

  // Savings rate.
  if (savingsRatePct != null && savingsRatePct < 10) {
    findings.push({
      severity: savingsRatePct <= 0 ? 'critical' : 'attention',
      title: savingsRatePct <= 0
        ? 'Expenses are at or above income'
        : `Savings rate is ${Math.round(savingsRatePct)}%`,
      detail: savingsRatePct <= 0
        ? 'Nothing recorded is going to savings each month.'
        : 'Below 10%, retirement and education goals depend heavily on what is already invested.',
    });
  }

  // The rate spread — cash sitting idle while expensive debt runs.
  const expensiveLoans = activeLoans.filter((l) => (l.interest_rate ?? l.apr ?? 0) >= 6);
  if (expensiveLoans.length > 0 && liquidAssets > 0) {
    const worst = expensiveLoans.reduce((a, b) =>
      (a.interest_rate ?? a.apr ?? 0) > (b.interest_rate ?? b.apr ?? 0) ? a : b);
    const rate = worst.interest_rate ?? worst.apr ?? 0;
    findings.push({
      severity: 'info',
      title: `${worst.name} carries ${rate}% while ${money(liquidAssets)} sits in cash`,
      detail: 'Paying down a rate higher than cash earns is a guaranteed return, but it spends the ' +
        'emergency fund to get it. Which matters more depends on how secure the income is — a ' +
        'question for you rather than one Command answers.',
    });
  }

  // Federal student loans are worth flagging as a category, never as advice.
  const federalStudent = activeLoans.filter((l) => l.loan_type === 'student' && l.is_federal);
  if (federalStudent.length > 0) {
    findings.push({
      severity: 'info',
      title: `${federalStudent.length} federal student loan${federalStudent.length === 1 ? '' : 's'} on file`,
      detail: 'Federal loans carry repayment and forgiveness options that private ones do not. ' +
        'Refinancing privately gives those up permanently — worth confirming before any consolidation.',
    });
  }

  // ── What limits the assessment ────────────────────────────────────────────
  if (accounts.length === 0) {
    dataFindings.push({
      severity: 'info',
      title: 'No accounts on file',
      detail: 'Balances drive everything on this page.',
    });
  }
  if (realEstate.length > 0 && homeValue > 0 && Math.abs(realEstateValue - homeValue) > homeValue * 0.1) {
    dataFindings.push({
      severity: 'info',
      title: 'Your profile home value and the property on file disagree',
      detail: `The profile says ${money(homeValue)}; the property records total ${money(realEstateValue)}. ` +
        `The itemized records are used here.`,
    });
  }
  if (!mortgage && homeValue > 0) {
    dataFindings.push({
      severity: 'info',
      title: 'A home value is recorded with no mortgage',
      detail: 'If there is a loan against it, net worth here is overstated until it is on file.',
    });
  }
  if (loans.length === 0) {
    dataFindings.push({
      severity: 'info',
      title: 'No loans recorded',
      detail: 'Car, student and personal loans are not counted until they are added.',
    });
  }
  if (!budget) {
    dataFindings.push({
      severity: 'info',
      title: 'No monthly budget recorded',
      detail: 'Income and expenses set the savings rate and the emergency fund reading.',
    });
  }

  const noBasis = accounts.length === 0 && loans.length === 0 && !budget && !mortgage;
  if (noBasis) {
    return {
      score: null, grade: '—', status: 'unknown', findings, dataFindings,
      confidence: 'limited', confidenceReason: 'Nothing on file to assess yet.',
      liquidAssets, investedAssets, propertyAssets, totalAssets,
      mortgageDebt, loanDebt, cardDebt, totalDebt,
      computedNetWorth, statedNetWorth, netWorthGap,
      monthlyIncome, monthlyExpenses, savingsRatePct, emergencyFundMonths,
      monthlyDebtService, debtToIncomePct,
    };
  }

  const weights: Record<FinanceFindingSeverity, number> = { critical: 30, attention: 12, info: 4 };
  const penalty = findings.reduce((sum, f) => sum + weights[f.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const status = score >= 75 ? 'good' : score >= 60 ? 'review' : 'action_needed';

  const gaps = dataFindings.length;
  return {
    score, grade, status, findings, dataFindings,
    confidence: gaps === 0 ? 'high' : gaps <= 2 ? 'moderate' : 'limited',
    confidenceReason: gaps === 0
      ? 'Accounts, debts and a monthly budget are all on file.'
      : `${gaps} gap${gaps === 1 ? '' : 's'} limit what could be checked.`,
    liquidAssets, investedAssets, propertyAssets, totalAssets,
    mortgageDebt, loanDebt, cardDebt, totalDebt,
    computedNetWorth, statedNetWorth, netWorthGap,
    monthlyIncome, monthlyExpenses, savingsRatePct, emergencyFundMonths,
    monthlyDebtService, debtToIncomePct,
  };
}
