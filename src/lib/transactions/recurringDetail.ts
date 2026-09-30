// How often it charges, what it really costs, and what to make of it.
//
// findRecurringCharges answers "does this repeat". This answers the three
// questions that follow, and the first of them was being answered wrong.
//
// Annual cost was (total seen / months seen) x 12, which is right for a
// monthly charge and badly wrong for anything else. A $600 yearly insurance
// premium seen once in a five-month window reported as $7,200 a year -- twelve
// times over -- and a quarterly charge reported as three times its cost. Both
// look entirely plausible on the page, which is the problem: nobody checks a
// number that is not obviously absurd.
//
// So cadence is inferred from the median gap between charges rather than
// assumed, and cost is normalized from the cadence. The median rather than the
// mean because one skipped month should not turn a monthly charge into a
// two-monthly one.

import type { RecurringCharge } from '../recurring';
import { categoryFromLabel } from './taxonomy';

export type Cadence = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly' | 'irregular';

/** How many times a year each cadence charges. */
const PER_YEAR: Record<Exclude<Cadence, 'irregular'>, number> = {
  weekly: 52, fortnightly: 26, monthly: 12, quarterly: 4, yearly: 1,
};

export const cadenceLabel: Record<Cadence, string> = {
  weekly: 'Weekly', fortnightly: 'Every two weeks', monthly: 'Monthly',
  quarterly: 'Quarterly', yearly: 'Yearly', irregular: 'Irregular',
};

/**
 * The cadence a run of dates implies.
 *
 * Bands are wide because billing dates wander: a "monthly" charge lands
 * anywhere from 28 to 31 days apart, and a household that pays on the first
 * gets a February gap of 28 and a March gap of 31 without anything changing.
 */
export function inferCadence(dates: string[]): { cadence: Cadence; medianGapDays: number | null } {
  const sorted = [...new Set(dates.filter(Boolean))].sort();
  if (sorted.length < 2) return { cadence: 'irregular', medianGapDays: null };

  const day = (iso: string) => Math.floor(Date.UTC(
    Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)),
  ) / 86400000);

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) gaps.push(day(sorted[i]) - day(sorted[i - 1]));
  gaps.sort((a, b) => a - b);

  // The median, not the mean: one skipped month should not turn a monthly
  // charge into a two-monthly one.
  const median = gaps.length % 2
    ? gaps[(gaps.length - 1) / 2]
    : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;

  const cadence: Cadence = median <= 10 ? 'weekly'
    : median <= 20 ? 'fortnightly'
      : median <= 45 ? 'monthly'
        : median <= 135 ? 'quarterly'
          : median <= 400 ? 'yearly'
            : 'irregular';

  return { cadence, medianGapDays: median };
}

export type Verdict = 'cut' | 'look' | 'keep';

export interface RecurringItem extends RecurringCharge {
  cadence: Cadence;
  medianGapDays: number | null;
  /** Normalized to one month, whatever the cadence. */
  perPeriod: number;
  /** Replaces the old annualCost, which assumed everything was monthly. */
  perYear: number;
  /** Which of the three purposes it belongs to. */
  purpose: string;
  /** Command's reading, from evidence on file. Never a guess about usefulness. */
  verdict: Verdict;
  verdictReason: string;
  /** What the household decided, where it has. */
  decision: 'keep' | 'cut' | null;
}

export interface PurposeGroup {
  purpose: string;
  items: RecurringItem[];
  perPeriod: number;
  perYear: number;
}

export interface RecurringSummaryView {
  groups: PurposeGroup[];
  totalPerPeriod: number;
  totalPerYear: number;
  /** Subscriptions and memberships only — the part that could be cancelled. */
  optionalPerPeriod: number;
  optionalPerYear: number;
  /** Flagged by Command and not yet decided either way. */
  undecided: number;
  /** What the household marked to cut. */
  cutPerPeriod: number;
  cutPerYear: number;
}

const FIXED = 'Fixed bills';
const OPTIONAL = 'Subscriptions and memberships';
const OTHER = 'Everything else';

/**
 * Command's reading of an item, from what is on file and nothing else.
 *
 * Deliberately narrow. Command cannot see whether a subscription is used, and
 * a "you do not need this" built on nothing would be the least trustworthy
 * sentence on the page. It says only what the transactions support: the price
 * went up, the charge stopped, or the household cannot stop paying it anyway.
 */
function readVerdict(item: Omit<RecurringItem, 'verdict' | 'verdictReason' | 'decision'>, latestMonth: string | null): {
  verdict: Verdict; verdictReason: string;
} {
  const committed = categoryFromLabel(item.category).committed === true;

  if (item.priceIncrease) {
    const { from, to } = item.priceIncrease;
    return {
      verdict: committed ? 'look' : 'cut',
      verdictReason: `Went from $${from.toFixed(2)} to $${to.toFixed(2)}`
        + `${committed ? '. Worth a call, even if it cannot be dropped.' : '.'}`,
    };
  }

  if (latestMonth && item.lastSeen.slice(0, 7) < latestMonth && item.occurrences >= 3) {
    return {
      verdict: 'look',
      verdictReason: `Nothing since ${item.lastSeen}. Either it was cancelled, or a bill was missed.`,
    };
  }

  if (committed) {
    return { verdict: 'keep', verdictReason: 'A fixed commitment — not something to cancel.' };
  }

  if (item.perYear >= 300) {
    return { verdict: 'look', verdictReason: `$${Math.round(item.perYear)} a year, steady. Worth confirming it is still wanted.` };
  }

  return { verdict: 'keep', verdictReason: 'Steady, and small.' };
}

export function buildRecurringView(
  charges: RecurringCharge[],
  decisions: Record<string, 'keep' | 'cut'> = {},
  keyOf: (charge: RecurringCharge) => string = (c) => c.merchant.toLowerCase(),
): RecurringSummaryView {
  const latestMonth = charges.map((c) => c.lastSeen.slice(0, 7)).sort().pop() ?? null;

  const items: RecurringItem[] = charges.map((charge) => {
    // months[] holds one entry per month seen; the charge dates themselves are
    // not carried, so the month starts stand in. Good enough to tell monthly
    // from quarterly from yearly, which is all the cadence has to decide.
    const { cadence, medianGapDays } = inferCadence(charge.months.map((m) => `${m}-01`));

    const timesPerYear = cadence === 'irregular' ? 12 : PER_YEAR[cadence];
    const perYear = charge.amount * timesPerYear;
    const category = categoryFromLabel(charge.category);
    const purpose = category.committed ? FIXED
      : category.code === 'subscriptions' || category.code === 'entertainment' ? OPTIONAL
        : OTHER;

    const base = {
      ...charge,
      cadence,
      medianGapDays,
      perPeriod: perYear / 12,
      perYear,
      purpose,
    };
    const { verdict, verdictReason } = readVerdict(base, latestMonth);
    return { ...base, verdict, verdictReason, decision: decisions[keyOf(charge)] ?? null };
  });

  const groups: PurposeGroup[] = [FIXED, OPTIONAL, OTHER]
    .map((purpose) => {
      const mine = items.filter((i) => i.purpose === purpose);
      return {
        purpose,
        items: mine.sort((a, b) => b.perYear - a.perYear),
        perPeriod: mine.reduce((sum, i) => sum + i.perPeriod, 0),
        perYear: mine.reduce((sum, i) => sum + i.perYear, 0),
      };
    })
    .filter((g) => g.items.length > 0);

  const optional = items.filter((i) => i.purpose === OPTIONAL);
  const cut = items.filter((i) => i.decision === 'cut');

  return {
    groups,
    totalPerPeriod: items.reduce((sum, i) => sum + i.perPeriod, 0),
    totalPerYear: items.reduce((sum, i) => sum + i.perYear, 0),
    optionalPerPeriod: optional.reduce((sum, i) => sum + i.perPeriod, 0),
    optionalPerYear: optional.reduce((sum, i) => sum + i.perYear, 0),
    undecided: items.filter((i) => i.verdict !== 'keep' && i.decision === null).length,
    cutPerPeriod: cut.reduce((sum, i) => sum + i.perPeriod, 0),
    cutPerYear: cut.reduce((sum, i) => sum + i.perYear, 0),
  };
}
