// What is coming out automatically.
//
// A household knows what it signed up for and not what it is still paying for.
// The charges that matter are the ones nobody looks at: a subscription three
// years past its usefulness, a service renewed at a higher rate, an autopay set
// up on a card that has since changed.
//
// All of it is already in the transactions Command has read. This finds the ones
// that repeat and says what they cost over a year, which is the number that makes
// someone act — $14.99 a month is invisible and $180 a year is a decision.
//
// Evidence, not inference. A charge is called recurring when the statements show
// it recurring, or when the issuer itself printed AUTOPAY against it. Guessing
// from a merchant's name would mean telling someone their groceries renew
// automatically.

import type { CreditStatement, CreditTransaction } from './supabase';
import { isAcceptedTransaction } from './spending';
import { categoryFromLabel } from './transactions/taxonomy';
import { merchantKey } from './transactions/counterparty';

// Re-exported for the callers that have always imported it from here.
export { merchantKey };

export interface RecurringCharge {
  merchant: string;
  /** The typical charge — the most recent where the amount moves. */
  amount: number;
  /** True for the utilities and the like, where the figure changes each month. */
  varies: boolean;
  occurrences: number;
  months: string[];
  annualCost: number;
  category: string | null;
  lastSeen: string;
  /** The statement itself said so, rather than Command working it out. */
  markedAutopay: boolean;
  /** How confident, and why, in the user's terms. */
  basis: string;
  /**
   * A price rise, where the charge settled at one figure and then settled at a
   * higher one.
   *
   * This is the finding people act on. Nobody notices a subscription going
   * from $12.99 to $17.99 -- the email is one of forty that week -- and
   * nothing else in the household's records would ever surface it, because
   * both figures look entirely normal on their own.
   */
  priceIncrease: { from: number; to: number; since: string; annualDifference: number } | null;
}

/**
 * A charge that settled at one amount and later settled at a higher one.
 *
 * Deliberately strict. It requires the old amount to have been charged at
 * least twice and the new amount to be the current one, so a single unusual
 * month -- an annual renewal, a one-off overage -- is not reported as a price
 * rise. Utilities move every month and never trigger this, which is correct:
 * a heating bill going up in January is weather, not a price increase.
 */
function findPriceIncrease(
  rows: Array<{ amount: number; date: string }>,
): RecurringCharge['priceIncrease'] {
  if (rows.length < 3) return null;
  const ordered = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const current = ordered[ordered.length - 1].amount;

  // Where the current amount started. Everything before it is the old price.
  let firstAtCurrent = ordered.length - 1;
  while (firstAtCurrent > 0 && Math.abs(ordered[firstAtCurrent - 1].amount - current) < 0.01) {
    firstAtCurrent -= 1;
  }
  const before = ordered.slice(0, firstAtCurrent);
  if (before.length < 2) return null;

  // The old price has to have been a price, not a wobble.
  const previous = before[before.length - 1].amount;
  const settled = before.filter((r) => Math.abs(r.amount - previous) < 0.01).length >= 2;
  if (!settled) return null;
  if (current <= previous * 1.03) return null;

  return {
    from: previous,
    to: current,
    since: ordered[firstAtCurrent].date,
    annualDifference: (current - previous) * 12,
  };
}

export interface RecurringSummary {
  charges: RecurringCharge[];
  annualTotal: number;
  monthsObserved: number;
  /** How many charges were examined, so an empty result can explain itself. */
  considered: number;
  /** Statement periods read. Repetition cannot be seen within a single one. */
  periodsRead: number;
  /** True when only one period has been read, so repetition cannot be seen. */
  singlePeriod: boolean;
}

/** Issuers print these against a charge they are taking automatically. */
const AUTOPAY_MARKERS = /\b(autopay|auto pay|auto-pay|recurring|automatic payment|subscription)\b/i;

/**
 * Whether a varying repeat in this category is a bill or a coincidence.
 *
 * Was BILL_CATEGORIES, a fourteen-entry substring list matched against the
 * category string. It is a property of the category now, so it cannot drift
 * out of step with the category list beside it.
 *
 * The reason it exists is unchanged: without it two flights in two months read
 * as a subscription. The demo statement had Delta in June and again in July,
 * and the first version called that a recurring charge costing $10,234 a year.
 */
const looksLikeABill = (category: string | null | undefined) =>
  categoryFromLabel(category).variable === true;

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export function findRecurringCharges(
  transactions: CreditTransaction[],
  statements: CreditStatement[] = [],
): RecurringSummary {
  // The same confirmation rule the rest of Credit uses: an unreviewed reading is
  // not yet a fact about the household.
  const accepted = statements.length > 0
    ? new Set(statements
      .filter((s) => s.review_status === 'confirmed' || s.review_status === 'partially_confirmed')
      .map((s) => s.id))
    : null;

  const charges = transactions.filter(
    (t) => t.direction === 'charge' && t.transaction_date && t.amount != null
      && isAcceptedTransaction(t, accepted)
      // A transfer repeats every month and renews nothing. Without this, the
      // monthly card payment out of checking is the largest "subscription"
      // the household has.
      && t.flow !== 'transfer' && t.flow !== 'income',
  );

  const groups = new Map<string, CreditTransaction[]>();
  for (const t of charges) {
    const key = merchantKey(t.merchant_description ?? '');
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }

  const allMonths = new Set(charges.map((t) => (t.transaction_date ?? '').slice(0, 7)));
  const monthsObserved = allMonths.size;
  // Periods, not calendar months. A single statement running June 30 to July 26
  // touches two months and still shows nothing twice.
  const periodsRead = accepted ? accepted.size : monthsObserved;

  /** The category to judge by — the most recent, since a merchant can be recategorised. */
  const newestCategory = (rows: CreditTransaction[]) =>
    [...rows].sort((a, b) => (b.transaction_date ?? '').localeCompare(a.transaction_date ?? ''))[0]?.category ?? null;

  const found: RecurringCharge[] = [];
  for (const rows of groups.values()) {
    const months = [...new Set(rows.map((t) => (t.transaction_date ?? '').slice(0, 7)))].sort();
    const marked = rows.some((t) => AUTOPAY_MARKERS.test(t.merchant_description ?? ''));
    const amounts = rows.map((t) => Number(t.amount));
    const sameAmount = new Set(amounts.map((a) => a.toFixed(2))).size === 1;


    const newest = [...rows].sort((a, b) => (b.transaction_date ?? '').localeCompare(a.transaction_date ?? ''))[0];
    const typical = sameAmount ? amounts[0] : Number(newest.amount);
    const varies = !sameAmount && rows.length > 1;

    // Three ways to be sure, in descending order of confidence:
    //   the statement says so; the identical amount arrives every month; or the
    //   amount moves but the category is one where a bill would.
    // A merchant appearing twice for different amounts is otherwise just a place
    // the household shops.
    const repeats = months.length >= 2;
    // A fourth way, and the one the price-rise finding depends on. A
    // subscription that went from $15.49 to $22.99 has two amounts, so it is
    // not "the same every month", and its category is Entertainment rather
    // than anything that reads as a bill -- so Netflix was being dropped by
    // all three tests above, and a price rise can only be reported on a
    // charge that was recognized as recurring in the first place.
    //
    // Three months and at most two distinct amounts. Two flights in two
    // months are two amounts over two months and still do not qualify.
    const distinctAmounts = new Set(amounts.map((a) => a.toFixed(2))).size;
    const settledTwice = months.length >= 3 && distinctAmounts <= 2;

    const recurring = marked
      || (repeats && sameAmount)
      || settledTwice
      || (repeats && looksLikeABill(newestCategory(rows)));
    if (!recurring) continue;

    found.push({
      merchant: newest.merchant_description ?? '',
      amount: typical,
      varies,
      occurrences: rows.length,
      months,
      // Per month over the months seen, projected forward. A charge seen twice
      // in one month is not billed 24 times a year.
      annualCost: (rows.reduce((sum, t) => sum + Number(t.amount), 0) / Math.max(months.length, 1)) * 12,
      category: newest.category ?? null,
      lastSeen: newest.transaction_date ?? '',
      markedAutopay: marked,
      priceIncrease: findPriceIncrease(
        rows.map((t) => ({ amount: Number(t.amount), date: t.transaction_date ?? '' })),
      ),
      basis: marked && repeats
        ? `Marked automatic on your statement, and seen in ${months.length} months.`
        : marked
          ? 'Your statement marks this as an automatic payment.'
          : sameAmount
            ? `The same ${money(typical)} in ${months.length} separate months.`
            : `Seen in ${months.length} months, for a changing amount.`,
    });
  }

  found.sort((a, b) => b.annualCost - a.annualCost);
  return {
    charges: found,
    annualTotal: found.reduce((sum, c) => sum + c.annualCost, 0),
    monthsObserved,
    considered: charges.length,
    periodsRead,
    singlePeriod: periodsRead <= 1,
  };
}
