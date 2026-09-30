// What the category normalizer and the monthly roll-up do today.
//
// `categoryGroup` is a read-time normalizer over free text: the importer
// writes a label chosen so that this function's substring list happens to
// match it. That coupling is the thing a later phase replaces, so it is
// pinned here first.

import { describe, expect, it } from 'vitest';
import { categoryGroup, isAcceptedTransaction, monthlySpending, coverageAgainstBudget } from './spending';
import { statement, txn } from './testFactory';

describe('categoryGroup', () => {
  it.each([
    ['Groceries', 'groceries'],
    ['Dining and takeout', 'dining'],
    ['Merchandise & Supplies-Groceries', 'groceries'],  // an issuer's own wording
    ['Travel-Airline', 'travel'],
    ['Loan payments', 'housing'],
    ['Fees and interest', 'fees'],
  ])('puts %j in %j', (input, code) => {
    expect(categoryGroup(input).code).toBe(code);
  });

  it('separates "not categorized" from "everything else"', () => {
    // Load-bearing: nothing-was-read and read-but-unrecognised are different
    // states, and the UI says so.
    expect(categoryGroup('').code).toBe('uncategorized');
    expect(categoryGroup(null).code).toBe('uncategorized');
    expect(categoryGroup('ZZQQ').code).toBe('other');
  });

  it('matches housing before home, so a mortgage is not a hardware run', () => {
    expect(categoryGroup('mortgage').code).toBe('housing');
  });

  it('KNOWN DEFECT: home_services is unreachable, shadowed by home', () => {
    // 'home_services' contains 'home', and the home group is tested first, so
    // the home_services group can never be reached. Pinned deliberately: the
    // taxonomy phase has to fix this on purpose rather than by accident.
    expect(categoryGroup('home_services').code).toBe('home');
    expect(categoryGroup('contractor').code).toBe('home_services');
  });
});

describe('isAcceptedTransaction', () => {
  it('always accepts an imported row, which has no statement to confirm', () => {
    expect(isAcceptedTransaction({ statement_id: null, import_id: 'i1' }, new Set())).toBe(true);
  });

  it('accepts a statement row only once that statement is confirmed', () => {
    expect(isAcceptedTransaction({ statement_id: 's1' }, new Set(['s1']))).toBe(true);
    expect(isAcceptedTransaction({ statement_id: 's1' }, new Set(['s2']))).toBe(false);
  });

  it('accepts everything when no statement filter is supplied', () => {
    expect(isAcceptedTransaction({ statement_id: 's1' }, null)).toBe(true);
  });
});

describe('monthlySpending', () => {
  it('groups by month, newest first', () => {
    const result = monthlySpending([
      txn({ transaction_date: '2026-08-04', amount: 50 }),
      txn({ transaction_date: '2026-09-14', amount: 100 }),
    ]);
    expect(result.months.map((m) => m.month)).toEqual(['2026-09', '2026-08']);
    expect(result.months[0].total).toBe(100);
  });

  it('labels a month in UTC, so it does not slip to the previous one', () => {
    // A month built at UTC midnight formats as the month before anywhere west
    // of Greenwich unless the formatter is told.
    const result = monthlySpending([txn({ transaction_date: '2026-09-14' })]);
    expect(result.months[0].label).toBe('September 2026');
  });

  it('leaves income and transfers out of spending', () => {
    const result = monthlySpending([
      txn({ amount: 100, flow: 'expense' }),
      txn({ amount: 5240, flow: 'income', direction: 'credit' }),
      txn({ amount: 1200, flow: 'transfer' }),
    ]);
    expect(result.months[0].total).toBe(100);
    expect(result.months[0].transactionCount).toBe(1);
  });

  it('offsets a refund against its category rather than dropping it', () => {
    const result = monthlySpending([
      txn({ amount: 100, flow: 'expense', direction: 'charge' }),
      txn({ amount: 30, flow: 'refund', direction: 'credit' }),
    ]);
    expect(result.months[0].total).toBe(70);
    expect(result.months[0].refunds).toBe(30);
  });

  it('drops rows from a statement the household has not confirmed', () => {
    const rows = [
      txn({ statement_id: 's1', import_id: null, flow: null }),
      txn({ statement_id: 's2', import_id: null, flow: null }),
    ];
    const result = monthlySpending(rows, [], [statement({ id: 's1' })]);
    expect(result.transactionCount).toBe(1);
  });

  it('reports how much of the reading was inferred rather than issuer-given', () => {
    const result = monthlySpending([
      txn({ category_source: 'ai_classified' }),
      txn({ category_source: 'issuer_provided' }),
    ]);
    expect(result.inferredShare).toBe(0.5);
  });
});

describe('coverageAgainstBudget', () => {
  it('names the money it cannot see', () => {
    const month = monthlySpending([txn({ amount: 3000 })]).months[0];
    expect(coverageAgainstBudget(month, 10000)).toEqual({ share: 30, unexplained: 7000 });
  });

  it('says nothing rather than dividing by a budget it does not have', () => {
    const month = monthlySpending([txn({ amount: 3000 })]).months[0];
    expect(coverageAgainstBudget(month, null)).toBeNull();
    expect(coverageAgainstBudget(null, 10000)).toBeNull();
  });
});
