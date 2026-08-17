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
 * Categories where a charge that repeats for a different amount each month is a
 * bill rather than a coincidence.
 *
 * Without this, two flights bought in different months read as a subscription:
 * the demo statement has Delta in June and again in July, and the first version
 * called that a recurring charge costing $10,234 a year. Travel, dining and
 * retail repeat because people shop, not because anything renews.
 */
const BILL_CATEGORIES = [
  'utilit', 'insur', 'subscription', 'phone', 'internet', 'cable', 'telecom',
  'streaming', 'membership', 'rent', 'mortgage', 'loan', 'tuition', 'childcare',
];

const looksLikeABill = (category: string | null | undefined) =>
  BILL_CATEGORIES.some((c) => (category ?? '').toLowerCase().includes(c));

/**
 * Merchant names carry store numbers, cities and reference codes that change
 * between months while the merchant does not. Stripped so two months of the same
 * charge recognise each other.
 */
export function merchantKey(description: string): string {
  return description
    .toLowerCase()
    .replace(/\b(autopay|auto pay|recurring|payment|purchase)\b/g, ' ')
    // Trailing reference and store numbers, and the *ABC1234 form.
    .replace(/[*#]\s*[a-z0-9]{3,}/g, ' ')
    .replace(/\b\d{3,}\b/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 3)
    .join(' ')
    .trim();
}

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
      && (!accepted || accepted.has(t.statement_id)),
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
    const recurring = marked
      || (repeats && sameAmount)
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
