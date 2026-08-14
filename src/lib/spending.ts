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

import type { CreditCard, CreditTransaction } from './supabase';

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

// Issuer categories, model categories and hand entry all arrive with different
// spellings for the same thing. Matched on substrings rather than mapped
// exactly, because the list of issuer category names is long and changes.
const GROUPS: Array<{ code: string; label: string; match: string[] }> = [
  { code: 'groceries', label: 'Groceries', match: ['grocer', 'supermarket', 'food & drink'] },
  { code: 'dining', label: 'Dining and takeout', match: ['dining', 'restaurant', 'bar', 'coffee'] },
  { code: 'travel', label: 'Travel', match: ['travel', 'airline', 'hotel', 'lodging', 'air '] },
  { code: 'gas', label: 'Fuel', match: ['gas', 'fuel', 'service station'] },
  { code: 'transport', label: 'Transport', match: ['transit', 'parking', 'rideshare', 'toll', 'auto'] },
  { code: 'utilities', label: 'Utilities', match: ['utilit', 'electric', 'internet', 'phone', 'cable'] },
  { code: 'health', label: 'Health and medical', match: ['health', 'medical', 'pharmac', 'dental', 'vision'] },
  { code: 'shopping', label: 'Shopping', match: ['shop', 'retail', 'merchandise', 'department', 'amazon'] },
  { code: 'home', label: 'Home and improvement', match: ['home', 'hardware', 'furnish', 'garden', 'improvement'] },
  { code: 'home_services', label: 'Home services', match: ['home_services', 'contractor', 'repair', 'lawn'] },
  { code: 'education', label: 'Education and childcare', match: ['education', 'school', 'tuition', 'childcare', 'camp'] },
  { code: 'entertainment', label: 'Entertainment', match: ['entertain', 'streaming', 'subscription', 'recreation'] },
  { code: 'charitable', label: 'Charitable giving', match: ['charit', 'donation', 'nonprofit'] },
  { code: 'insurance', label: 'Insurance', match: ['insur'] },
  { code: 'fees', label: 'Fees and interest', match: ['fee', 'interest', 'finance charge'] },
  { code: 'cash', label: 'Cash advances', match: ['cash advance', 'atm'] },
];

export function categoryGroup(raw: string | null | undefined): { code: string; label: string } {
  const value = (raw ?? '').toLowerCase().trim();
  if (!value) return { code: 'uncategorized', label: 'Not categorized' };
  const hit = GROUPS.find((g) => g.match.some((m) => value.includes(m)));
  return hit ? { code: hit.code, label: hit.label } : { code: 'other', label: 'Everything else' };
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

const MONTH_LABEL = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
    .format(new Date(Date.UTC(y, m - 1, 1)));
};

export function monthlySpending(
  transactions: CreditTransaction[],
  cards: CreditCard[] = [],
): SpendingCoverage {
  const spending = transactions.filter((t) => t.transaction_date && !isCardPayment(t));

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

        const group = categoryGroup(t.category);
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
