// What counts as recurring today.
//
// Four independent tests decide it, and each exists because of a specific
// wrong answer: a subscription that raised its price was being dropped, two
// flights in two months were being called a subscription, and a monthly card
// payment was the largest "recurring charge" a household had.

import { describe, expect, it } from 'vitest';
import { findRecurringCharges } from './recurring';
import { txn } from './testFactory';

/** The same merchant charged on the 6th of each listed month. */
const monthly = (merchant: string, amounts: Array<[string, number]>, over = {}) =>
  amounts.map(([month, amount]) => txn({
    merchant_description: merchant,
    transaction_date: `${month}-06`,
    amount,
    direction: 'charge',
    flow: 'expense',
    ...over,
  }));

// merchantKey moved to transactions/counterparty.ts and is tested there. It
// also got better on the way: STARBUCKS STORE 08812 now keys as "starbucks"
// rather than "starbucks store", so it matches STARBUCKS #4821 -- and the
// processor-prefix bug that turned TST* HANNAH BISTRO into "tst bistro" is
// gone.

describe('recurrence tests', () => {
  it('finds a charge that is the same amount every month', () => {
    const found = findRecurringCharges(monthly('SPOTIFY USA', [
      ['2026-06', 11.99], ['2026-07', 11.99], ['2026-08', 11.99],
    ]));
    expect(found.charges).toHaveLength(1);
    expect(found.charges[0].annualCost).toBeCloseTo(143.88, 2);
  });

  it('finds a subscription that changed price once', () => {
    // Two amounts and an Entertainment category means the same-amount test and
    // the bill-category test both miss it. Without the third test the price
    // rise could never be reported on the charge it was built for.
    const found = findRecurringCharges(monthly('NETFLIX.COM 866-579', [
      ['2026-06', 15.49], ['2026-07', 15.49], ['2026-08', 22.99], ['2026-09', 22.99],
    ], { category: 'Entertainment' }));

    expect(found.charges).toHaveLength(1);
    expect(found.charges[0].priceIncrease).toMatchObject({ from: 15.49, to: 22.99 });
    expect(found.charges[0].priceIncrease!.annualDifference).toBeCloseTo(90, 0);
  });

  it('finds a bill whose amount moves every month', () => {
    const found = findRecurringCharges(monthly('XCEL ENERGY', [
      ['2026-07', 188.42], ['2026-08', 240.10],
    ], { category: 'Utilities' }));
    expect(found.charges).toHaveLength(1);
    expect(found.charges[0].varies).toBe(true);
  });

  it('trusts the issuer when it prints AUTOPAY', () => {
    const found = findRecurringCharges(monthly('SOME VENDOR AUTOPAY', [
      ['2026-07', 40], ['2026-08', 55],
    ]));
    expect(found.charges[0].markedAutopay).toBe(true);
  });

  it('does not call two flights a subscription', () => {
    // Travel, dining and retail repeat because people shop, not because
    // anything renews.
    const found = findRecurringCharges(monthly('DELTA AIR LINES', [
      ['2026-06', 412.30], ['2026-07', 980.00],
    ], { category: 'Travel' }));
    expect(found.charges).toHaveLength(0);
  });

  it('sees nothing repeat inside a single period', () => {
    const found = findRecurringCharges([
      txn({ merchant_description: 'SPOTIFY', transaction_date: '2026-09-06', amount: 11.99 }),
    ]);
    expect(found.charges).toHaveLength(0);
    expect(found.singlePeriod).toBe(true);
  });
});

describe('what recurrence ignores', () => {
  it('leaves transfers out, or the card payment is the biggest subscription', () => {
    const found = findRecurringCharges(monthly('PAYMENT TO CHASE CARD', [
      ['2026-06', 1850], ['2026-07', 1850], ['2026-08', 1850],
    ], { flow: 'transfer' }));
    expect(found.charges).toHaveLength(0);
  });

  it('leaves income out', () => {
    const found = findRecurringCharges(monthly('ACME PAYROLL', [
      ['2026-06', 5240], ['2026-07', 5240],
    ], { flow: 'income', direction: 'credit' }));
    expect(found.charges).toHaveLength(0);
  });
});

describe('price increase detection', () => {
  it('needs the old price to have settled, not wobbled', () => {
    // A single unusual month -- an annual renewal, a one-off overage -- is not
    // a price rise.
    const found = findRecurringCharges(monthly('SOME SERVICE', [
      ['2026-06', 10], ['2026-07', 14], ['2026-08', 14], ['2026-09', 14],
    ]));
    expect(found.charges[0]?.priceIncrease).toBeNull();
  });

  it('ignores a rise under three percent', () => {
    const found = findRecurringCharges(monthly('SOME SERVICE', [
      ['2026-06', 10], ['2026-07', 10], ['2026-08', 10.2], ['2026-09', 10.2],
    ]));
    expect(found.charges[0]?.priceIncrease).toBeNull();
  });
});

describe('annual cost', () => {
  it('projects per month over the months seen, not per occurrence', () => {
    // A charge seen twice in one month is not billed 24 times a year.
    const found = findRecurringCharges([
      ...monthly('GYM', [['2026-08', 25]]),
      txn({ merchant_description: 'GYM', transaction_date: '2026-08-20', amount: 25 }),
      ...monthly('GYM', [['2026-09', 25]]),
    ]);
    expect(found.charges[0].annualCost).toBeCloseTo(450, 0); // (75 / 2) * 12
  });
});
