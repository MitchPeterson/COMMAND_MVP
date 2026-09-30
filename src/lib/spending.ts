// Where the money went, as far as Command can see.
//
// That qualifier is the whole design. Spending here is reconstructed from card
// statements that have been uploaded and read — so cash, cheques, debit cards,
// ACH transfers and anything autopaid from checking are all invisible. A total
// presented as "you spent $6,240 in July" would be wrong in a way the user
// cannot detect, because the missing spending leaves no trace to notice.
//
// So every figure is stated against its coverage: which cards, which months, and
// what share of the household's own recorded expenses it accounts for. When the
// cards on file explain a third of the monthly outgoings, saying so is more
// useful than a confident pie chart of the third.

import type { CreditCard, CreditStatement, CreditTransaction } from './supabase';
import { categoryFromLabel } from './transactions/taxonomy';

export interface CategorySpend {
  category: string;
  label: string;
  amount: number;
  /** Of the month's total. */
  share: number;
  count: number;
  /** True when a category came from the model rather than the issuer. */
  inferred: boolean;
}

export interface MonthSpend {
  /** YYYY-MM */
  month: string;
  label: string;
  total: number;
  categories: CategorySpend[];
  transactionCount: number;
  refunds: number;
}

export interface SpendingCoverage {
  months: MonthSpend[];
  cardsSeen: number;
  cardsOnFile: number;
  earliest: string | null;
  latest: string | null;
  transactionCount: number;
  /** Share of transactions whose category the model assigned rather than the issuer. */
  inferredShare: number;
}

/**
 * Whether a transaction is something the household has accepted as true.
 *
 * Two ways in, and they are confirmed differently. A row read off a statement
 * counts once that statement has been reviewed. A row from an uploaded
 * spreadsheet has no statement at all -- it was confirmed at the moment of
 * import, in a preview showing the columns, the sign convention and the first
 * rows -- so it always counts.
 *
 * Written once and shared, because the same filter appears in spending,
 * recurring charges and the rewards strategy, and a version that dropped
 * imported rows in only one of them would have the same screen reporting two
 * different totals.
 */
export function isAcceptedTransaction(
  t: { statement_id: string | null; import_id?: string | null },
  acceptedStatementIds: Set<string> | null,
): boolean {
  if (t.statement_id == null) return true;
  return !acceptedStatementIds || acceptedStatementIds.has(t.statement_id);
}

/**
 * A payment to the card is not spending, it is a transfer — counting it would
 * double the month and counting it as negative would erase a real purchase. A
 * refund is different: it genuinely reduces what was spent in its category, so
 * it offsets rather than being dropped.
 */
function isCardPayment(t: CreditTransaction): boolean {
  if (t.direction !== 'credit') return false;
  const merchant = (t.merchant_description ?? '').toLowerCase();
  const category = (t.category ?? '').toLowerCase();
  return category.includes('payment')
    || /payment\s*-?\s*thank\s*you|online payment|autopay|electronic payment/.test(merchant);
}

// Formatted in UTC, not local time.
//
// The date is built with Date.UTC and Intl formats in the runtime's own zone,
// so midnight on May 1 UTC is April 30 anywhere west of Greenwich -- and every
// month on the page rendered as the one before it for most of the US. The
// month string carries no time at all; UTC is just the way to say so.
const MONTH_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const MONTH_LABEL = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return MONTH_FORMAT.format(new Date(Date.UTC(y, m - 1, 1)));
};

export function monthlySpending(
  transactions: CreditTransaction[],
  cards: CreditCard[] = [],
  statements: CreditStatement[] = [],
): SpendingCoverage {
  // Only statements the user has accepted onto a card count. rewardsStrategy has
  // always filtered this way; this did not, so the same transactions counted as
  // spending here and did not count as spending there — on the same screen.
  //
  // Passing no statements keeps every transaction, which is what the callers that
  // have not been given them expect.
  const accepted = statements.length > 0
    ? new Set(statements
      .filter((st) => st.review_status === 'confirmed' || st.review_status === 'partially_confirmed')
      .map((st) => st.id))
    : null;

  const spending = transactions.filter(
    (t) => t.transaction_date && !isCardPayment(t) && isAcceptedTransaction(t, accepted)
      // Imported rows say outright what they were. Income is not spending, and
      // a transfer between the household's own accounts is the same money as
      // the purchases it pays for -- counting either would inflate the month.
      && t.flow !== 'income' && t.flow !== 'transfer',
  );

  const byMonth = new Map<string, CreditTransaction[]>();
  for (const t of spending) {
    const month = (t.transaction_date ?? '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    const held = byMonth.get(month) ?? [];
    held.push(t);
    byMonth.set(month, held);
  }

  const months: MonthSpend[] = [...byMonth.entries()]
    .map(([month, rows]) => {
      const buckets = new Map<string, CategorySpend>();
      let total = 0;
      let refunds = 0;

      for (const t of rows) {
        const amount = Number(t.amount) || 0;
        // Direction carries the sign; amounts are stored as magnitudes.
        const signed = t.direction === 'credit' ? -amount : amount;
        if (signed < 0) refunds += amount;
        total += signed;

        const group = categoryFromLabel(t.category);
        const held = buckets.get(group.code) ?? {
          category: group.code, label: group.label, amount: 0, share: 0, count: 0, inferred: false,
        };
        held.amount += signed;
        held.count += 1;
        if (t.category_source === 'ai_classified') held.inferred = true;
        buckets.set(group.code, held);
      }

      const categories = [...buckets.values()]
        .map((c) => ({ ...c, share: total > 0 ? (c.amount / total) * 100 : 0 }))
        .sort((a, b) => b.amount - a.amount);

      return { month, label: MONTH_LABEL(month), total, categories, transactionCount: rows.length, refunds };
    })
    .sort((a, b) => b.month.localeCompare(a.month));

  const cardsSeen = new Set(spending.map((t) => t.credit_card_id).filter(Boolean)).size;
  const inferred = spending.filter((t) => t.category_source === 'ai_classified').length;

  return {
    months,
    cardsSeen,
    cardsOnFile: cards.length,
    earliest: months.length ? months[months.length - 1].month : null,
    latest: months.length ? months[0].month : null,
    transactionCount: spending.length,
    inferredShare: spending.length > 0 ? inferred / spending.length : 0,
  };
}

/**
 * How much of the household's own recorded monthly expenses the read statements
 * actually explain. The gap is the point: it is the money Command cannot see,
 * and naming it stops a partial view being mistaken for a complete one.
 */
export function coverageAgainstBudget(
  month: MonthSpend | null,
  monthlyExpenses: number | null | undefined,
): { share: number; unexplained: number } | null {
  if (!month || !monthlyExpenses || monthlyExpenses <= 0) return null;
  return {
    share: (month.total / monthlyExpenses) * 100,
    unexplained: Math.max(0, monthlyExpenses - month.total),
  };
}
