// Tax health.
//
// Graded on readiness, not on outcome. Command does not know whether a return
// is right — it knows whether the paperwork is gathered, whether a deadline is
// close, and whether figures it already holds have been carried across. That is
// a narrow claim, and the grade says only that much.

import type {
  FamilyMember, FinanceAccount, HouseholdProfile, LegalDocument, MortgageStatement, TaxDocument,
} from './supabase';
import { expectedForms, taxDeadlines } from './taxYear';

export type TaxFindingSeverity = 'critical' | 'attention' | 'info';

export interface TaxFinding {
  severity: TaxFindingSeverity;
  title: string;
  detail: string;
}

export interface TaxHealthResult {
  score: number | null;
  grade: string;
  status: 'good' | 'review' | 'action_needed' | 'unknown';
  findings: TaxFinding[];
  dataFindings: TaxFinding[];
  confidence: 'high' | 'moderate' | 'limited';
  confidenceReason: string;
  taxYear: number;
  received: number;
  expectedCount: number;
  nextDeadline: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeTaxHealth(
  taxDocuments: TaxDocument[],
  profile: HouseholdProfile | null | undefined,
  members: FamilyMember[],
  mortgageStatements: MortgageStatement[],
  financeAccounts: FinanceAccount[],
  legalDocuments: LegalDocument[],
  today = new Date(),
): TaxHealthResult {
  const findings: TaxFinding[] = [];
  const dataFindings: TaxFinding[] = [];

  // Before mid-April the year people are actually working on is the previous
  // one. After it, attention has moved to the current year.
  const month = today.getMonth();
  const taxYear = month < 3 ? today.getFullYear() - 1 : today.getFullYear();

  const checklist = expectedForms(
    taxYear, taxDocuments, profile, members, mortgageStatements, financeAccounts, legalDocuments,
  );
  const deadlines = taxDeadlines(today);
  const next = deadlines[0] ?? null;

  const received = checklist.expected.length - checklist.outstanding.length;

  // ── A deadline in the near distance ────────────────────────────────────────
  if (next) {
    const days = Math.round((new Date(`${next.date}T00:00:00Z`).getTime() - today.getTime()) / DAY_MS);
    if (days <= 30 && next.actionable) {
      findings.push({
        severity: days <= 14 ? 'attention' : 'info',
        title: `${next.label} in ${days} day${days === 1 ? '' : 's'}`,
        detail: `${next.detail} Falls on ${next.date}; the IRS moves a deadline that lands on a weekend or holiday, so confirm the exact day.`,
      });
    }
  }

  // ── Forms still outstanding ────────────────────────────────────────────────
  if (checklist.outstanding.length > 0) {
    const afterIssuance = today >= new Date(`${taxYear + 1}-01-31T00:00:00Z`);
    findings.push({
      severity: afterIssuance ? 'attention' : 'info',
      title: `${checklist.outstanding.length} form${checklist.outstanding.length === 1 ? '' : 's'} not yet on file for ${taxYear}`,
      detail:
        checklist.outstanding.map((f) => f.form).join(', ') +
        (afterIssuance
          ? '. The issuing deadline has passed, so anything still missing is worth chasing.'
          : '. Most are not issued until the following January, so this is expected for now.'),
    });
  }

  // ── What limits the assessment ─────────────────────────────────────────────
  if (financeAccounts.length === 0) {
    dataFindings.push({
      severity: 'info',
      title: 'No financial accounts on file',
      detail: 'Command cannot tell which 1099s to expect without knowing where the money is.',
    });
  }
  if (mortgageStatements.length === 0 && profile?.home_ownership) {
    dataFindings.push({
      severity: 'info',
      title: 'No mortgage statement read',
      detail: 'Mortgage interest and the property tax paid through escrow both come from one.',
    });
  }
  dataFindings.push({
    severity: 'info',
    title: 'Command is not a tax preparer',
    detail:
      'It tracks what has arrived, what the dates are, and figures already in your documents. ' +
      'Whether something is deductible, and what is owed, is not a question it answers.',
  });

  if (checklist.expected.length === 0) {
    return {
      score: null, grade: '—', status: 'unknown', findings, dataFindings,
      confidence: 'limited', confidenceReason: 'Not enough on file to know what to expect.',
      taxYear, received: 0, expectedCount: 0, nextDeadline: next?.date ?? null,
    };
  }

  const weights: Record<TaxFindingSeverity, number> = { critical: 30, attention: 12, info: 4 };
  const penalty = findings.reduce((sum, f) => sum + weights[f.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const status = score >= 75 ? 'good' : score >= 60 ? 'review' : 'action_needed';

  const realGaps = dataFindings.length - 1;
  return {
    score, grade, status, findings, dataFindings,
    confidence: realGaps <= 0 ? 'high' : realGaps === 1 ? 'moderate' : 'limited',
    confidenceReason:
      realGaps <= 0
        ? 'Accounts, the mortgage and the household are all on file.'
        : `${realGaps} gap${realGaps === 1 ? '' : 's'} limit what could be checked.`,
    taxYear, received, expectedCount: checklist.expected.length,
    nextDeadline: next?.date ?? null,
  };
}
