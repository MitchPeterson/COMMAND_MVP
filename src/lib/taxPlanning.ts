// Tax planning against last year's return.
//
// Last year's return is the most informative document a household owns: it says
// what bracket they landed in, whether they itemized, what credits they claimed,
// what carried forward, and what the safe-harbor number is. Planning during the
// year is mostly arithmetic against those figures.
//
// The line this file holds, everywhere:
//
//   Command surfaces the arithmetic and names the question. It does not tell
//   anyone to do a thing. Every item ends up as something to raise with a
//   preparer, with the numbers already worked out so the conversation is short.
//
// That is not timidity — a tax position depends on facts Command cannot see
// (other income, state specifics, whether an employer plan allows something),
// and an app that says "make this Roth conversion" is wrong often enough to be
// dangerous. Naming the opportunity and showing the numbers is the useful part
// and is safe to be confident about.

import type { DeductionLogEntry, FamilyMember, HouseholdProfile, TaxReturn } from './supabase';
import { ageOf } from './familyTimeline';
import { listOf } from './text';

export type PlanningHorizon = 'act_by_dec_31' | 'act_by_april' | 'anytime' | 'watch';

export interface PlanningItem {
  title: string;
  /** What the numbers say, in the household's own figures. */
  finding: string;
  /** The question to put to a preparer. Null where the item is simply a chore. */
  question: string | null;
  horizon: PlanningHorizon;
  /** Dollars where the arithmetic supports a figure, null where it does not. */
  magnitude: number | null;
  basis: string;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

/**
 * The safe harbor: paying at least this much through withholding and estimates
 * avoids an underpayment penalty regardless of what this year turns out to be.
 * 100% of last year's tax, or 110% where prior-year AGI exceeded $150,000.
 */
export const SAFE_HARBOR_AGI_THRESHOLD = 150_000;

export function safeHarborTarget(priorReturn: TaxReturn): number | null {
  if (priorReturn.total_tax == null) return null;
  const higher = (priorReturn.adjusted_gross_income ?? 0) > SAFE_HARBOR_AGI_THRESHOLD;
  return Math.round(priorReturn.total_tax * (higher ? 1.1 : 1.0));
}

export interface PlanningResult {
  items: PlanningItem[];
  /** Deduction categories logged this year, for the bunching comparison. */
  loggedByCategory: Record<string, number>;
  loggedTotal: number;
  priorReturn: TaxReturn | null;
}

export function computeTaxPlanning(
  taxYear: number,
  priorReturn: TaxReturn | null,
  deductions: DeductionLogEntry[],
  members: FamilyMember[],
  profile: HouseholdProfile | null | undefined,
  today = new Date(),
): PlanningResult {
  const items: PlanningItem[] = [];

  const thisYearLog = deductions.filter((d) => d.tax_year === taxYear);
  const loggedByCategory: Record<string, number> = {};
  for (const entry of thisYearLog) {
    loggedByCategory[entry.category] = (loggedByCategory[entry.category] ?? 0) + Number(entry.amount);
  }
  const loggedTotal = Object.values(loggedByCategory).reduce((sum, v) => sum + v, 0);

  if (!priorReturn) {
    return { items, loggedByCategory, loggedTotal, priorReturn: null };
  }

  // ── The safe harbor ────────────────────────────────────────────────────────
  const harbor = safeHarborTarget(priorReturn);
  if (harbor != null) {
    const higher = (priorReturn.adjusted_gross_income ?? 0) > SAFE_HARBOR_AGI_THRESHOLD;
    items.push({
      title: 'Your safe-harbor number for this year',
      finding:
        `Paying ${money(harbor)} across withholding and estimated payments avoids an underpayment ` +
        `penalty for ${taxYear}, whatever this year actually turns out to be.`,
      question:
        `Is withholding on pace to reach ${money(harbor)} by year end, or should an estimated payment ` +
        `cover the difference?`,
      horizon: 'act_by_dec_31',
      magnitude: harbor,
      basis:
        `${higher ? '110' : '100'}% of your ${priorReturn.tax_year} total tax of ` +
        `${money(priorReturn.total_tax ?? 0)}${higher ? ', because AGI was above $150,000' : ''}`,
    });
  }

  // ── Standard versus itemized, and bunching ─────────────────────────────────
  if (priorReturn.took_standard_deduction && priorReturn.standard_deduction_amount) {
    const itemizableNow =
      (loggedByCategory.charitable ?? 0) +
      (loggedByCategory.medical ?? 0) +
      (priorReturn.itemized_salt ?? 0) +
      (priorReturn.itemized_mortgage_interest ?? 0);
    const threshold = priorReturn.standard_deduction_amount;
    const shortfall = threshold - itemizableNow;

    if (itemizableNow > threshold * 0.6 && shortfall > 0) {
      items.push({
        title: 'You are within reach of itemizing',
        finding:
          `Roughly ${money(itemizableNow)} of itemizable items against a ${money(threshold)} standard ` +
          `deduction — about ${money(shortfall)} short. You took the standard deduction in ` +
          `${priorReturn.tax_year}.`,
        question:
          'Would concentrating two years of charitable giving into this one push you over the line, ' +
          'and take the standard deduction next year instead?',
        horizon: 'act_by_dec_31',
        magnitude: shortfall,
        basis: 'Logged deductions this year plus SALT and mortgage interest from your last return',
      });
    }
  }

  // The mirror case: a household that already itemizes gets the benefit of
  // charitable giving from the first dollar, which is different guidance
  // entirely from the bunching advice above and is easy to get backwards.
  if (priorReturn.took_standard_deduction === false && priorReturn.itemized_total) {
    const standard = priorReturn.standard_deduction_amount;
    const margin = standard ? priorReturn.itemized_total - standard : null;
    items.push({
      title: 'You itemized last year',
      finding:
        `${money(priorReturn.itemized_total)} of itemized deductions in ${priorReturn.tax_year}` +
        (margin != null
          ? `, ${money(Math.abs(margin))} ${margin >= 0 ? 'above' : 'below'} the standard deduction. `
          : '. ') +
        'While that holds, giving counts from the first dollar rather than only above a threshold ' +
        '— the opposite of the position a household taking the standard deduction is in.',
      question:
        'Is this year tracking to itemize again, and does that change when giving is worth doing?',
      horizon: 'anytime',
      magnitude: priorReturn.itemized_total,
      basis: `Schedule A on your ${priorReturn.tax_year} return`,
    });
  }

  // ── Carryforwards, the thing that gets lost between preparers ──────────────
  if (priorReturn.capital_loss_carryforward && priorReturn.capital_loss_carryforward > 0) {
    items.push({
      title: 'You have a capital loss carrying forward',
      finding:
        `${money(priorReturn.capital_loss_carryforward)} carried out of ${priorReturn.tax_year}. Up to ` +
        `$3,000 a year can offset ordinary income, and the rest keeps carrying — but it also offsets ` +
        `gains in full, which matters if you are thinking about selling something.`,
      question: 'Does this carryforward change whether it is worth realizing a gain this year?',
      horizon: 'anytime',
      magnitude: priorReturn.capital_loss_carryforward,
      basis: `Your ${priorReturn.tax_year} return`,
    });
  }
  if (priorReturn.charitable_carryforward && priorReturn.charitable_carryforward > 0) {
    items.push({
      title: 'Charitable giving carried forward',
      finding:
        `${money(priorReturn.charitable_carryforward)} of giving exceeded the limit in ` +
        `${priorReturn.tax_year} and carried forward. It expires after five years.`,
      question: 'Should this be used before giving more, so nothing expires unused?',
      horizon: 'anytime',
      magnitude: priorReturn.charitable_carryforward,
      basis: `Your ${priorReturn.tax_year} return`,
    });
  }

  // ── A child aging out of the credit ────────────────────────────────────────
  const turningSeventeen = members.filter((m) => {
    const age = ageOf(m.birth_date);
    return age !== null && age >= 16.2 && age < 17.2
      && ['child', 'son', 'daughter'].includes((m.relationship ?? '').toLowerCase());
  });
  if (turningSeventeen.length > 0 && (priorReturn.child_tax_credit ?? 0) > 0) {
    items.push({
      title: `${listOf(turningSeventeen.map((m) => m.name.split(/\s+/)[0]))} turns 17`,
      finding:
        `The child tax credit turns on age at year end, so this is the last year — or the first year ` +
        `without it, depending on the birthday. You claimed ${money(priorReturn.child_tax_credit ?? 0)} ` +
        `in ${priorReturn.tax_year}.`,
      question:
        'Does withholding need adjusting for a credit that will not be there, rather than finding out ' +
        'at filing?',
      horizon: 'act_by_dec_31',
      magnitude: priorReturn.child_tax_credit ?? null,
      basis: 'Birth dates on your profile against your last return',
    });
  }

  // ── Retirement and health accounts ─────────────────────────────────────────
  const month = today.getMonth();
  if (month >= 8) {
    items.push({
      title: 'Contribution deadlines are two different dates',
      finding:
        'Workplace retirement contributions have to happen through payroll by 31 December. An IRA or ' +
        'HSA for this year can wait until the filing deadline in April.',
      question: 'Is there room left in either, and is payroll on pace to use it before the year ends?',
      horizon: 'act_by_dec_31',
      magnitude: null,
      basis: 'Statutory deadlines',
    });
  }

  // ── State-specific ─────────────────────────────────────────────────────────
  if ((profile?.state ?? '').toUpperCase() === 'MN' && (loggedByCategory.education ?? 0) === 0) {
    items.push({
      title: 'Minnesota 529 benefit goes unused if nothing is contributed by December',
      finding:
        'Minnesota offers either a credit or a subtraction for 529 contributions, and which is better ' +
        'depends on income. Nothing has been logged this year.',
      question: 'Which of the two applies at your income, and is a contribution worth making before year end?',
      horizon: 'act_by_dec_31',
      magnitude: null,
      basis: 'Your household is in Minnesota',
    });
  }

  // ── Substantiation, while it is still fixable ──────────────────────────────
  const unsubstantiated = thisYearLog.filter((d) => d.needs_receipt && !d.has_receipt);
  if (unsubstantiated.length > 0) {
    const total = unsubstantiated.reduce((sum, d) => sum + Number(d.amount), 0);
    items.push({
      title: `${unsubstantiated.length} logged item${unsubstantiated.length === 1 ? '' : 's'} without a receipt`,
      finding:
        `${money(total)} logged with no acknowledgment attached. A charitable gift over $250 needs a ` +
        `written one from the charity, and they are far easier to get in November than in March.`,
      question: null,
      horizon: 'act_by_dec_31',
      magnitude: total,
      basis: 'Your deduction log',
    });
  }

  const order: Record<PlanningHorizon, number> = {
    act_by_dec_31: 0, act_by_april: 1, anytime: 2, watch: 3,
  };
  items.sort((a, b) => order[a.horizon] - order[b.horizon] || (b.magnitude ?? 0) - (a.magnitude ?? 0));

  return { items, loggedByCategory, loggedTotal, priorReturn };
}

/** Categories the log offers. Named for what was spent, not for what is deductible. */
export const DEDUCTION_CATEGORIES: Array<{ code: string; label: string; needsReceipt: boolean; note?: string }> = [
  { code: 'charitable', label: 'Charitable giving', needsReceipt: true,
    note: 'Anything over $250 needs a written acknowledgment from the charity.' },
  { code: 'medical', label: 'Medical and dental', needsReceipt: false,
    note: 'Only the part above a percentage of AGI counts, so log everything and let the preparer sort it.' },
  { code: 'business', label: 'Business expense', needsReceipt: true },
  { code: 'home_office', label: 'Home office', needsReceipt: false },
  { code: 'mileage', label: 'Mileage', needsReceipt: false,
    note: 'Log the miles and the purpose; the rate changes each year.' },
  { code: 'education', label: 'Education and 529', needsReceipt: false },
  { code: 'childcare', label: 'Childcare', needsReceipt: true,
    note: 'The provider’s tax ID is needed at filing — worth capturing now.' },
  { code: 'state_local_tax', label: 'State and local tax', needsReceipt: false },
  { code: 'investment_expense', label: 'Investment expense', needsReceipt: false },
  { code: 'other', label: 'Something else', needsReceipt: false },
];

export function categoryLabel(code: string): string {
  return DEDUCTION_CATEGORIES.find((c) => c.code === code)?.label ?? code;
}
