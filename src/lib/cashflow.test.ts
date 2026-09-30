// What the period roll-up does today.
//
// The two behaviors worth guarding hardest are the ones that would be
// invisible if they broke: transfers must stay out of both sides of the
// totals, and a month that is only partly covered must not be averaged in as
// though it were a whole one.

import { describe, expect, it } from 'vitest';
import { computeCashflow, flowOf, overdraftCharges } from './cashflow';
import { statement, txn } from './testFactory';

describe('flowOf', () => {
  it('trusts an imported row, which states what it was', () => {
    expect(flowOf(txn({ flow: 'transfer' }))).toBe('transfer');
  });

  it('falls back to the card reading for a statement row, which has no flow', () => {
    expect(flowOf(txn({ flow: null, direction: 'charge' }))).toBe('expense');
    expect(flowOf(txn({ flow: null, direction: 'credit', merchant_description: 'PAYMENT - THANK YOU' })))
      .toBe('transfer');
    // DELIBERATE CHANGE: was 'refund'. A refund is an expense that came back,
    // and direction='credit' already carries the sign, so it nets against the
    // category it came from instead of sitting in a total of its own.
    expect(flowOf(txn({ flow: null, direction: 'credit', merchant_description: 'RETURN' })))
      .toBe('expense');
  });
});

describe('computeCashflow totals', () => {
  it('keeps transfers out of income and out of spending', () => {
    // The same dollars twice is the worst error available here: importing
    // checking alongside the card it pays would otherwise count both.
    const flow = computeCashflow([
      txn({ transaction_date: '2026-09-02', amount: 5000, flow: 'income', direction: 'credit' }),
      txn({ transaction_date: '2026-09-05', amount: 200, flow: 'expense' }),
      txn({ transaction_date: '2026-09-12', amount: 1800, flow: 'transfer' }),
    ]);
    expect(flow.totalIncome).toBe(5000);
    expect(flow.totalExpenses).toBe(200);
    expect(flow.totalTransfers).toBe(1800);
    expect(flow.net).toBe(4800);
  });

  it('nets a refund against the category it came from', () => {
    const flow = computeCashflow([
      txn({ transaction_date: '2026-09-05', amount: 100, flow: 'expense', direction: 'charge' }),
      txn({ transaction_date: '2026-09-09', amount: 30, flow: 'expense', direction: 'credit' }),
    ]);
    // Spending is net of the return, not gross with the return parked beside it.
    expect(flow.totalExpenses).toBe(70);
    expect(flow.months[0].refunds).toBe(30);
    expect(flow.categories[0].amount).toBe(70);
  });

  it('counts savings as kept, not as spent', () => {
    // Savings and transfers both move money between the household's own
    // accounts. The difference is that one is a decision and the other is
    // bookkeeping, so they are totalled apart and neither is spending.
    const flow = computeCashflow([
      txn({ transaction_date: '2026-09-02', amount: 5000, flow: 'income', direction: 'credit' }),
      txn({ transaction_date: '2026-09-05', amount: 200, flow: 'expense' }),
      txn({ transaction_date: '2026-09-06', amount: 800, flow: 'savings' }),
    ]);
    expect(flow.totalSavings).toBe(800);
    expect(flow.totalExpenses).toBe(200);
    expect(flow.months[0].savings).toBe(800);
    // Savings is not a spending category, so it never reaches the chart.
    expect(flow.categories.map((c) => c.code)).toEqual(['groceries']);
  });

  it('does not categorize income or transfers, which would top the chart', () => {
    const flow = computeCashflow([
      txn({ transaction_date: '2026-09-02', amount: 5000, flow: 'income', direction: 'credit', category: 'Income' }),
      txn({ transaction_date: '2026-09-05', amount: 200, flow: 'expense', category: 'Groceries' }),
    ]);
    expect(flow.categories.map((c) => c.code)).toEqual(['groceries']);
  });

  it('counts a card payment separately, as a hole rather than as spending', () => {
    const flow = computeCashflow([
      txn({
        transaction_date: '2026-09-12', amount: 1850, flow: 'transfer',
        merchant_description: 'PAYMENT TO CHASE CARD 4417',
      }),
    ]);
    expect(flow.cardPayments).toEqual({ total: 1850, count: 1 });
    expect(flow.hasCardTransactions).toBe(false);
  });
});

describe('partial months', () => {
  const spanning = (dates: string[]) =>
    computeCashflow(dates.map((d) => txn({ transaction_date: d, amount: 100 })));

  it('marks the first month partial when the data starts mid-month', () => {
    const flow = spanning(['2026-08-14', '2026-09-10', '2026-09-20', '2026-09-30']);
    const august = flow.months.find((m) => m.month === '2026-08')!;
    expect(august.partial).toBe(true);
  });

  it('marks the last month partial when the data stops mid-month', () => {
    const flow = spanning(['2026-08-01', '2026-08-20', '2026-09-06']);
    expect(flow.months.find((m) => m.month === '2026-09')!.partial).toBe(true);
  });

  it('leaves a fully covered month alone', () => {
    const flow = spanning(['2026-08-02', '2026-08-29', '2026-09-02', '2026-09-28']);
    expect(flow.months.find((m) => m.month === '2026-08')!.partial).toBe(false);
  });

  it('averages over whole months only, so a half month does not read as a cheap one', () => {
    const flow = computeCashflow([
      // August: partial, one $100 charge late in the month.
      txn({ transaction_date: '2026-08-28', amount: 100 }),
      // September: whole, $1,000.
      txn({ transaction_date: '2026-09-02', amount: 500 }),
      txn({ transaction_date: '2026-09-28', amount: 500 }),
    ]);
    expect(flow.wholeMonths.map((m) => m.month)).toEqual(['2026-09']);
    expect(flow.averageExpenses).toBe(1000);
  });
});

describe('income visibility', () => {
  it('withholds a savings rate when income is not credibly in view', () => {
    // One small credit on a card export is not a salary, and a rate computed
    // against it would read as a 99% saver.
    const flow = computeCashflow([
      txn({ transaction_date: '2026-09-02', amount: 40, flow: 'income', direction: 'credit' }),
      txn({ transaction_date: '2026-09-05', amount: 3000, flow: 'expense' }),
    ]);
    expect(flow.incomeVisible).toBe(false);
    expect(flow.savingsRate).toBeNull();
  });

  it('reports one when income recurs across months', () => {
    const flow = computeCashflow([
      txn({ transaction_date: '2026-08-02', amount: 5000, flow: 'income', direction: 'credit' }),
      txn({ transaction_date: '2026-08-28', amount: 2500, flow: 'expense' }),
      txn({ transaction_date: '2026-09-02', amount: 5000, flow: 'income', direction: 'credit' }),
      txn({ transaction_date: '2026-09-28', amount: 2500, flow: 'expense' }),
    ]);
    expect(flow.incomeVisible).toBe(true);
    expect(flow.savingsRate).toBe(50);
  });
});

describe('merchants and fees', () => {
  it('groups a merchant by its stable key, not its raw text', () => {
    // Eighteen Amazon charges with different reference codes are one merchant.
    const flow = computeCashflow([
      txn({ transaction_date: '2026-09-02', amount: 20, merchant_description: 'AMAZON.COM*RT4R21' }),
      txn({ transaction_date: '2026-09-09', amount: 30, merchant_description: 'AMAZON.COM*9K2XQ1' }),
    ]);
    const amazon = flow.merchants.find((m) => /amazon/i.test(m.merchant))!;
    expect(amazon.count).toBe(2);
    expect(amazon.amount).toBe(50);
  });

  it('picks out overdrafts from other fees, because the remedy differs', () => {
    const flow = computeCashflow([
      txn({ transaction_date: '2026-09-14', amount: 35, merchant_description: 'OVERDRAFT FEE', category: 'Fees and interest' }),
      txn({ transaction_date: '2026-09-15', amount: 12, merchant_description: 'ANNUAL FEE', category: 'Fees and interest' }),
    ]);
    expect(flow.fees.count).toBe(2);
    expect(overdraftCharges(flow).map((f) => f.merchant)).toEqual(['OVERDRAFT FEE']);
  });
});

describe('statement confirmation', () => {
  it('ignores rows from a statement nobody has confirmed', () => {
    const flow = computeCashflow(
      [txn({ statement_id: 's9', import_id: null, flow: null, amount: 500 })],
      [statement({ id: 's1' })],
    );
    expect(flow.transactionCount).toBe(0);
  });
});
