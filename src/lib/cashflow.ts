// Money in, money out, and what the difference says.
//
// Spending analysis alone answers half a question. A household spending
// $9,400 a month is either comfortable or in trouble depending entirely on
// what came in, and until transactions could be imported Command had no way
// to see income at all.
//
// Three things this is careful about, each because the careless version is
// confidently wrong:
//
//   1. **Transfers are not spending.** Money moved to savings or used to pay a
//      card is the same money twice. Excluded, and counted separately so the
//      household can see they were excluded.
//
//   2. **Edge months are usually partial.** A statement period runs the 14th
//      to the 13th, so the first and last months of any import hold a fraction
//      of a month. Averaging over them understates spending and flatters the
//      savings rate. They are marked, and the averages leave them out.
//
//   3. **Income is only visible if a checking account was imported.** A card
//      export has no salary in it. Saying "you saved 97% of your income" off a
//      file that contains one refund is worse than saying nothing, so the
//      savings rate is withheld until income looks like income.

import type { CreditTransaction } from './supabase';
import { categoryGroup, isAcceptedTransaction } from './spending';
import { merchantKey } from './recurring';
import type { CreditStatement } from './supabase';

export interface MonthFlow {
  /** YYYY-MM */
  month: string;
  label: string;
  income: number;
  expenses: number;
  refunds: number;
  transfers: number;
  /**
   * Money deliberately put aside, counted as kept rather than as spent.
   *
   * Distinct from a transfer: both move between the household's own accounts,
   * but a transfer is bookkeeping and this is a decision. Populated only from
   * rows a classifier or a person marked as savings; nothing infers it yet.
   */
  savings: number;
  /** Income less expenses, refunds included. Transfers never touch this. */
  net: number;
  transactionCount: number;
  /**
   * True when the month is not covered end to end. An average that includes
   * one reads low, and a "you spent less in March" that is really "March is
   * half imported" is the kind of wrong nobody catches.
   */
  partial: boolean;
}

export interface CategoryTotal {
  code: string;
  label: string;
  amount: number;
  share: number;
  count: number;
}

export interface CategoryMove {
  code: string;
  label: string;
  recent: number;
  prior: number;
  change: number;
  changePct: number;
}

export interface MerchantTotal {
  merchant: string;
  amount: number;
  count: number;
  category: string;
}

export interface Cashflow {
  /** Newest first. */
  months: MonthFlow[];
  /** The whole-month subset the averages are built from. */
  wholeMonths: MonthFlow[];
  totalIncome: number;
  totalExpenses: number;
  totalTransfers: number;
  /** Money put aside across the whole window. */
  totalSavings: number;
  net: number;
  averageIncome: number | null;
  averageExpenses: number | null;
  /** Share of income kept. Null when income is not credibly in view. */
  savingsRate: number | null;
  /** Whether the file set contains something that looks like real income. */
  incomeVisible: boolean;
  monthsOverspent: MonthFlow[];
  categories: CategoryTotal[];
  categoryMoves: CategoryMove[];
  merchants: MerchantTotal[];
  /** Interest, late fees, overdrafts and the like, called out on their own. */
  fees: { total: number; count: number; items: MerchantTotal[] };
  cashAdvances: { total: number; count: number };
  /**
   * Money paid to a credit card out of an account here.
   *
   * Tracked because it marks a hole. A payment of $1,850 to a card whose own
   * transactions are not on file means $1,850 of real spending happened
   * somewhere Command cannot see -- and the leftover figure on this page
   * quietly counts it as money saved.
   */
  cardPayments: { total: number; count: number };
  /** Whether any transaction on file actually came off a card. */
  hasCardTransactions: boolean;
  transactionCount: number;
  /** True when nothing imported carried a flow, so this is card data only. */
  fromStatementsOnly: boolean;
  earliest: string | null;
  latest: string | null;
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

const daysIn = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/**
 * What a transaction did with the money.
 *
 * Imported rows say so outright. Rows read off a card statement predate the
 * flow column, so they are read the way Credit has always read them: a charge
 * is spending, and a credit is a payment to the card or a refund.
 */
export type ComputedFlow = 'expense' | 'income' | 'savings' | 'transfer' | 'refund';

export function flowOf(t: CreditTransaction): ComputedFlow {
  if (t.flow) return t.flow;
  if (t.direction === 'charge') return 'expense';
  const merchant = (t.merchant_description ?? '').toLowerCase();
  const category = (t.category ?? '').toLowerCase();
  const isPayment = category.includes('payment')
    || /payment\s*-?\s*thank\s*you|online payment|autopay|electronic payment/.test(merchant);
  return isPayment ? 'transfer' : 'refund';
}

/** Fees and interest, which are worth naming separately from the category they sit in. */
const FEE_PATTERN = /\b(interest charge|interest charged|finance charge|late fee|overdraft|nsf|returned item|annual fee|service charge|maintenance fee|atm fee|foreign transaction fee|wire fee|monthly fee|account fee|penalty fee|over limit|cash advance fee)\b/i;

const OVERDRAFT_PATTERN = /\b(overdraft|nsf|insufficient funds|returned item)\b/i;

/** A transfer that is specifically a card being paid off. */
const CARD_PAYMENT_PATTERN = /\b(payment|pmt|autopay|auto ?pay|epay)\b.{0,24}\b(card|crd|visa|mastercard|amex|american express|discover|chase|citi|capital one|barclay|synchrony)\b|\b(card|crd|credit card)\b.{0,24}\b(payment|pmt|autopay)\b|\bpayment thank you\b/i;

export function computeCashflow(
  transactions: CreditTransaction[],
  statements: CreditStatement[] = [],
): Cashflow {
  const accepted = statements.length > 0
    ? new Set(statements
      .filter((s) => s.review_status === 'confirmed' || s.review_status === 'partially_confirmed')
      .map((s) => s.id))
    : null;

  const rows = transactions.filter(
    (t) => t.transaction_date && t.amount != null && isAcceptedTransaction(t, accepted),
  );

  const byMonth = new Map<string, MonthFlow>();
  const categories = new Map<string, CategoryTotal>();
  const merchants = new Map<string, MerchantTotal>();
  const feeItems = new Map<string, MerchantTotal>();

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalTransfers = 0;
  let totalSavings = 0;
  let feeTotal = 0;
  let feeCount = 0;
  let advanceTotal = 0;
  let advanceCount = 0;
  let cardPaymentTotal = 0;
  let cardPaymentCount = 0;

  for (const t of rows) {
    const month = (t.transaction_date ?? '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;

    const amount = Math.abs(Number(t.amount) || 0);
    const flow = flowOf(t);

    const held = byMonth.get(month) ?? {
      month, label: MONTH_LABEL(month), income: 0, expenses: 0, refunds: 0,
      transfers: 0, savings: 0, net: 0, transactionCount: 0, partial: false,
    };
    held.transactionCount += 1;

    if (flow === 'income') { held.income += amount; totalIncome += amount; }
    else if (flow === 'savings') { held.savings += amount; totalSavings += amount; }
    else if (flow === 'transfer') {
      held.transfers += amount;
      totalTransfers += amount;
      if (t.direction === 'charge' && CARD_PAYMENT_PATTERN.test(t.merchant_description ?? '')) {
        cardPaymentTotal += amount;
        cardPaymentCount += 1;
      }
    }
    else if (flow === 'refund') { held.refunds += amount; }
    else { held.expenses += amount; totalExpenses += amount; }
    byMonth.set(month, held);

    // Only spending is categorized. A paycheck in "Income" and a card payment
    // in "Transfers" would be the two largest categories on the chart and say
    // nothing about where the money went.
    if (flow !== 'expense' && flow !== 'refund') continue;

    const signed = flow === 'refund' ? -amount : amount;
    const group = categoryGroup(t.category);
    const bucket = categories.get(group.code)
      ?? { code: group.code, label: group.label, amount: 0, share: 0, count: 0 };
    bucket.amount += signed;
    bucket.count += 1;
    categories.set(group.code, bucket);

    // Grouped by the stable key, not the raw text. Store numbers and
    // reference codes change between visits while the merchant does not, so
    // grouping on the description scattered eighteen Amazon charges across
    // eighteen rows and put none of them near the top.
    const name = (t.merchant_description ?? '').trim() || 'Unnamed';
    const key = merchantKey(name) || name.toLowerCase();
    const merchant = merchants.get(key)
      ?? { merchant: name, amount: 0, count: 0, category: group.label };
    // The shortest description in the group is the one without the reference
    // code on the end, which is the one worth showing.
    if (name.length < merchant.merchant.length) merchant.merchant = name;
    merchant.amount += signed;
    merchant.count += 1;
    merchants.set(key, merchant);

    if (flow === 'expense' && FEE_PATTERN.test(name)) {
      feeTotal += amount;
      feeCount += 1;
      const fee = feeItems.get(key) ?? { merchant: name, amount: 0, count: 0, category: group.label };
      fee.amount += amount;
      fee.count += 1;
      feeItems.set(key, fee);
    }
    if (flow === 'expense' && group.code === 'cash') { advanceTotal += amount; advanceCount += 1; }
  }

  const months = [...byMonth.values()]
    .map((m) => ({ ...m, net: m.income - m.expenses + m.refunds }))
    .sort((a, b) => b.month.localeCompare(a.month));

  // Which months are only partly covered. The first and last month of the data
  // are the candidates: a period running the 14th to the 13th leaves both ends
  // short, and an average over them is not an average over a month.
  const dates = rows.map((t) => t.transaction_date ?? '').filter(Boolean).sort();
  const earliest = dates[0] ?? null;
  const latest = dates[dates.length - 1] ?? null;
  if (earliest && months.length > 0) {
    const first = months[months.length - 1];
    if (first.month === earliest.slice(0, 7) && Number(earliest.slice(8, 10)) > 4) first.partial = true;
  }
  if (latest && months.length > 0) {
    const last = months[0];
    if (last.month === latest.slice(0, 7) && Number(latest.slice(8, 10)) < daysIn(last.month) - 4) {
      last.partial = true;
    }
  }

  const wholeMonths = months.filter((m) => !m.partial);
  const averagedOver = wholeMonths.length > 0 ? wholeMonths : months;

  const categoryList = [...categories.values()].sort((a, b) => b.amount - a.amount);
  const categoryTotal = categoryList.reduce((sum, c) => sum + Math.max(0, c.amount), 0);
  for (const c of categoryList) c.share = categoryTotal > 0 ? (c.amount / categoryTotal) * 100 : 0;

  // Income is only believable when it recurs and is of a size that could fund
  // the spending. One $40 credit on a card export is not a salary, and a
  // savings rate computed against it would read as a 99% saver.
  const incomeMonths = months.filter((m) => m.income > 0).length;
  const incomeVisible = totalIncome > 0
    && (incomeMonths >= 2 || totalIncome > totalExpenses * 0.5);

  const avgIncome = averagedOver.length > 0
    ? averagedOver.reduce((s, m) => s + m.income, 0) / averagedOver.length : null;
  const avgExpenses = averagedOver.length > 0
    ? averagedOver.reduce((s, m) => s + m.expenses, 0) / averagedOver.length : null;

  // Compared over whole months only, and only where both sides are present.
  const recent = averagedOver[0] ?? null;
  const prior = averagedOver[1] ?? null;
  const categoryMoves: CategoryMove[] = [];
  if (recent && prior) {
    const sumFor = (month: MonthFlow, code: string) => rows
      .filter((t) => (t.transaction_date ?? '').startsWith(month.month)
        && flowOf(t) === 'expense' && categoryGroup(t.category).code === code)
      .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
    for (const c of categoryList) {
      const a = sumFor(recent, c.code);
      const b = sumFor(prior, c.code);
      if (a === 0 && b === 0) continue;
      categoryMoves.push({
        code: c.code, label: c.label, recent: a, prior: b,
        change: a - b,
        changePct: b > 0 ? ((a - b) / b) * 100 : a > 0 ? 100 : 0,
      });
    }
    categoryMoves.sort((x, y) => Math.abs(y.change) - Math.abs(x.change));
  }

  return {
    months,
    wholeMonths,
    totalIncome,
    totalExpenses,
    totalTransfers,
    totalSavings,
    net: totalIncome - totalExpenses,
    averageIncome: avgIncome,
    averageExpenses: avgExpenses,
    savingsRate: incomeVisible && avgIncome && avgIncome > 0 && avgExpenses != null
      ? ((avgIncome - avgExpenses) / avgIncome) * 100
      : null,
    incomeVisible,
    monthsOverspent: months.filter((m) => !m.partial && m.income > 0 && m.net < 0),
    categories: categoryList,
    categoryMoves,
    merchants: [...merchants.values()].sort((a, b) => b.amount - a.amount).slice(0, 12),
    fees: {
      total: feeTotal,
      count: feeCount,
      items: [...feeItems.values()].sort((a, b) => b.amount - a.amount),
    },
    cashAdvances: { total: advanceTotal, count: advanceCount },
    cardPayments: { total: cardPaymentTotal, count: cardPaymentCount },
    hasCardTransactions: rows.some((t) => t.credit_card_id != null || t.statement_id != null),
    transactionCount: rows.length,
    fromStatementsOnly: rows.every((t) => !t.flow),
    earliest,
    latest,
  };
}

/** Overdrafts specifically — a different problem from an annual fee. */
export function overdraftCharges(cashflow: Cashflow): MerchantTotal[] {
  return cashflow.fees.items.filter((f) => OVERDRAFT_PATTERN.test(f.merchant));
}
