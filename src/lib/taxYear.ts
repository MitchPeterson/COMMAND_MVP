// The tax year: what is due when, what forms to expect, and which figures
// Command already holds that a preparer will ask for.
//
// The boundary this file keeps: Command is not a tax preparer and does not
// calculate what is owed. It answers three narrower questions well —
//
//   * What are the dates, and which of them carry money?
//   * Given what Command knows about this household, which forms should arrive,
//     and which have not?
//   * Which figures already sit in the household's own documents, so nobody
//     hunts for a number Command extracted three months ago?
//
// Anything that would require judgment about a tax position — whether to
// itemize, whether something qualifies, how much is deductible — is stated as a
// lead for a preparer, never as an answer.

import type {
  CreditTransaction, FamilyMember, FinanceAccount, HouseholdProfile,
  LegalDocument, MortgageStatement, TaxDocument,
} from './supabase';
import { ageOf } from './familyTimeline';

// ─────────────────────────────────────────────────────────────
// Deadlines
// ─────────────────────────────────────────────────────────────

export interface TaxDeadline {
  date: string;
  label: string;
  detail: string;
  /** Deadlines you can still act on versus ones that are simply information. */
  actionable: boolean;
  taxYear: number;
}

/**
 * The dates that carry money, generated around today rather than hard-coded to
 * a year. Where a deadline falls on a weekend or holiday the IRS moves it; these
 * are the statutory dates and the UI says to confirm the exact day.
 */
export function taxDeadlines(today = new Date()): TaxDeadline[] {
  const year = today.getFullYear();
  const deadlines: TaxDeadline[] = [];

  const add = (date: string, label: string, detail: string, taxYear: number, actionable = true) =>
    deadlines.push({ date, label, detail, taxYear, actionable });

  for (const y of [year, year + 1]) {
    add(`${y}-01-15`, 'Q4 estimated payment', 'Final estimated payment for the prior tax year.', y - 1);
    add(`${y}-01-31`, 'Forms should have arrived', 'Employers and payers must issue W-2s and most 1099s by this date. Anything missing after it is worth chasing.', y - 1, false);
    add(`${y}-04-15`, 'Return due', 'Also the last day to contribute to an IRA or HSA for the prior year — a deadline people miss because it is not on the return itself.', y - 1);
    add(`${y}-04-15`, 'Q1 estimated payment', 'First estimated payment for this tax year.', y);
    add(`${y}-06-15`, 'Q2 estimated payment', 'Second estimated payment for this tax year.', y);
    add(`${y}-09-15`, 'Q3 estimated payment', 'Third estimated payment for this tax year.', y);
    add(`${y}-10-15`, 'Extended return due', 'If an extension was filed. An extension moves the filing date, never the payment date.', y - 1);
    add(`${y}-12-31`, 'Year-end actions close', 'Charitable gifts, 529 contributions, and any tax-loss harvesting have to be done by today to count for this year.', y);
  }

  const todayIso = today.toISOString().slice(0, 10);
  return deadlines
    .filter((d) => d.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);
}

// ─────────────────────────────────────────────────────────────
// Expected forms
// ─────────────────────────────────────────────────────────────

export interface ExpectedForm {
  /** Stable key, stored on a tax_documents row when the form arrives. */
  key: string;
  form: string;
  label: string;
  why: string;
  /** Where Command inferred the expectation from. */
  basis: string;
  received: TaxDocument | null;
}

export interface TaxYearChecklist {
  taxYear: number;
  expected: ExpectedForm[];
  outstanding: ExpectedForm[];
  extras: TaxDocument[];
}

/**
 * What should arrive, derived from what Command already knows rather than from
 * a stored list. A household that sells a rental or starts a business changes
 * this the moment the underlying record changes.
 */
export function expectedForms(
  taxYear: number,
  documents: TaxDocument[],
  profile: HouseholdProfile | null | undefined,
  members: FamilyMember[],
  mortgageStatements: MortgageStatement[],
  financeAccounts: FinanceAccount[],
  legalDocuments: LegalDocument[],
): TaxYearChecklist {
  const forYear = documents.filter((d) => d.tax_year === taxYear);
  const bind = (key: string) => forYear.find((d) => d.satisfies_expectation === key) ?? null;

  const expected: ExpectedForm[] = [];
  const push = (key: string, form: string, label: string, why: string, basis: string) =>
    expected.push({ key, form, label, why, basis, received: bind(key) });

  // Income — assumed for any household reporting income.
  if (profile?.household_income) {
    push('w2', 'W-2', 'Wage statement',
      'Wages and the tax already withheld from them.',
      `Household income of $${profile.household_income.toLocaleString()} is on file`);
  }

  // Mortgage interest and the property tax paid through escrow.
  if (mortgageStatements.length > 0) {
    push('1098', 'Form 1098', 'Mortgage interest statement',
      'Interest paid, and usually the property tax paid out of escrow.',
      'A mortgage statement has been read');
  }

  // Investment income.
  const brokerage = financeAccounts.filter((a) =>
    ['brokerage', 'investment', 'taxable'].some((t) => (a.account_type ?? '').toLowerCase().includes(t)));
  if (brokerage.length > 0) {
    push('1099_b', 'Form 1099-B / consolidated', 'Brokerage statement',
      'Sales, dividends and interest from a taxable account.',
      `${brokerage.length} taxable investment account${brokerage.length === 1 ? '' : 's'} on file`);
  }

  const interestBearing = financeAccounts.filter((a) =>
    ['savings', 'checking', 'money market', 'cd'].some((t) => (a.account_type ?? '').toLowerCase().includes(t)));
  if (interestBearing.length > 0) {
    push('1099_int', 'Form 1099-INT', 'Interest income',
      'Only issued above $10 of interest, so a small account may produce nothing.',
      `${interestBearing.length} deposit account${interestBearing.length === 1 ? '' : 's'} on file`);
  }

  // Children.
  const children = members.filter((m) =>
    ['child', 'son', 'daughter'].includes((m.relationship ?? '').toLowerCase()));
  const underThirteen = children.filter((m) => {
    const age = ageOf(m.birth_date);
    return age !== null && age < 13;
  });
  if (underThirteen.length > 0) {
    push('dependent_care', 'Care provider statement', 'Childcare records',
      'The provider’s name, address and tax ID, plus what was paid — needed to claim the credit.',
      `${underThirteen.length} child${underThirteen.length === 1 ? '' : 'ren'} under 13`);
  }

  const collegeAge = children.filter((m) => {
    const age = ageOf(m.birth_date);
    return age !== null && age >= 17 && age <= 24;
  });
  if (collegeAge.length > 0) {
    push('1098_t', 'Form 1098-T', 'Tuition statement',
      'Issued by the school; needed for education credits.',
      `${collegeAge.length} child${collegeAge.length === 1 ? '' : 'ren'} of college age`);
  }

  // Business interests, from the legal section.
  const business = legalDocuments.filter((d) => (d.category ?? '') === 'business');
  if (business.length > 0) {
    push('k1', 'Schedule K-1', 'Partnership or S-corp statement',
      'These arrive late — often after the April deadline, which is the usual reason to extend.',
      `${business.length} business document${business.length === 1 ? '' : 's'} on file`);
  }

  // Health coverage.
  push('1095', 'Form 1095', 'Health coverage statement',
    'Proof of coverage. Only needed for the return in some situations, but keep it.',
    'Assumed for any household with health cover');

  const expectationKeys = new Set(expected.map((e) => e.key));
  return {
    taxYear,
    expected,
    outstanding: expected.filter((e) => !e.received),
    extras: forYear.filter((d) => !d.satisfies_expectation || !expectationKeys.has(d.satisfies_expectation)),
  };
}

// ─────────────────────────────────────────────────────────────
// Figures Command already holds
// ─────────────────────────────────────────────────────────────

export interface TaxLead {
  label: string;
  amount: number | null;
  source: string;
  detail: string;
}

/**
 * Numbers already sitting in the household's own extracted documents that a
 * preparer will ask for. Not deductions — Command does not know whether this
 * household itemizes, and says so rather than implying a benefit.
 */
export function taxLeads(
  taxYear: number,
  mortgageStatements: MortgageStatement[],
  transactions: CreditTransaction[],
  members: FamilyMember[],
  profile: HouseholdProfile | null | undefined,
): TaxLead[] {
  const leads: TaxLead[] = [];

  // The newest statement's YTD figures are the running total for the year.
  const newest = mortgageStatements
    .filter((s) => s.review_status === 'confirmed' && s.statement_date?.startsWith(String(taxYear)))
    .sort((a, b) => (b.statement_date ?? '').localeCompare(a.statement_date ?? ''))[0];

  if (newest?.interest_paid_ytd != null) {
    leads.push({
      label: 'Mortgage interest paid',
      amount: newest.interest_paid_ytd,
      source: `Your ${newest.statement_date} mortgage statement`,
      detail: 'Year to date at that statement. The 1098 in January will carry the final figure.',
    });
  }
  if (newest?.taxes_paid_ytd != null) {
    leads.push({
      label: 'Property tax paid through escrow',
      amount: newest.taxes_paid_ytd,
      source: `Your ${newest.statement_date} mortgage statement`,
      detail:
        'State and local taxes are capped in combination, so this may not be deductible in full — ' +
        'a question for your preparer, not one Command answers.',
    });
  }

  const charitable = transactions
    .filter((t) => t.direction === 'charge' && (t.category ?? '').toLowerCase().includes('charit')
      && (t.transaction_date ?? '').startsWith(String(taxYear)))
    .reduce((sum, t) => sum + (t.amount ?? 0), 0);
  if (charitable > 0) {
    leads.push({
      label: 'Charitable giving on card statements',
      amount: charitable,
      source: 'Transactions categorized as charitable on your statements',
      detail:
        'Only what went on a card Command has read. Cheques, payroll giving and donated goods are not ' +
        'here, and a receipt is still needed for anything over $250.',
    });
  }

  const children = members.filter((m) =>
    ['child', 'son', 'daughter'].includes((m.relationship ?? '').toLowerCase()));
  const creditEligible = children.filter((m) => {
    const age = ageOf(m.birth_date);
    return age !== null && age < 17;
  });
  if (children.length > 0) {
    leads.push({
      label: 'Children under 17 at year end',
      amount: creditEligible.length,
      source: 'Birth dates on your profile',
      detail:
        'The child tax credit turns on age at the end of the year — a child who turns 17 during the ' +
        'year is out for that whole year, which surprises people.',
    });
  }

  if (profile?.state?.toUpperCase() === 'MN') {
    leads.push({
      label: 'Minnesota 529 benefit',
      amount: null,
      source: 'Your household is in Minnesota',
      detail:
        'Minnesota offers a state tax benefit for 529 contributions that many households miss. Whether ' +
        'a credit or a subtraction is better depends on income — worth asking about.',
    });
  }

  return leads;
}
