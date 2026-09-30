import { describe, expect, it } from 'vitest';
import { computeCashflow } from '../cashflow';
import { txn } from '../testFactory';
import { categorySeries, periodDetail, worthMentioning } from './period';

const NOW = new Date('2026-09-20T12:00:00Z');

/** Two whole months plus a partial one, so the honesty rules have something to bite on. */
const threeMonths = () => computeCashflow([
  // July — whole
  txn({ transaction_date: '2026-07-02', amount: 300, category: 'Groceries' }),
  txn({ transaction_date: '2026-07-28', amount: 200, category: 'Dining and takeout' }),
  txn({ transaction_date: '2026-07-03', amount: 5000, flow: 'income', direction: 'credit' }),
  // August — whole
  txn({ transaction_date: '2026-08-02', amount: 640, category: 'Groceries' }),
  txn({ transaction_date: '2026-08-29', amount: 100, category: 'Dining and takeout' }),
  txn({ transaction_date: '2026-08-03', amount: 5000, flow: 'income', direction: 'credit' }),
  // September — in progress, data stops on the 18th
  txn({ transaction_date: '2026-09-02', amount: 400, category: 'Groceries' }),
  txn({ transaction_date: '2026-09-18', amount: 5000, flow: 'income', direction: 'credit' }),
]);

describe('periodDetail', () => {
  it('compares the selected period with the one before it', () => {
    const detail = periodDetail(threeMonths(), 1, NOW)!;  // August
    expect(detail.period.month).toBe('2026-08');
    expect(detail.prior?.month).toBe('2026-07');
    expect(detail.expenses?.change).toBe(240);      // 740 against 500
    expect(detail.expenses?.comparable).toBe(true);
  });

  it('ranks categories by what was spent', () => {
    const detail = periodDetail(threeMonths(), 1, NOW)!;
    expect(detail.categories.map((c) => c.code)).toEqual(['groceries', 'dining']);
    expect(detail.categories[0].amount).toBe(640);
    expect(Math.round(detail.categories[0].share)).toBe(86);
  });

  it('gives each category its own change on the period before', () => {
    const detail = periodDetail(threeMonths(), 1, NOW)!;
    const groceries = detail.categories.find((c) => c.code === 'groceries')!;
    expect(groceries.delta?.change).toBe(340);
    expect(Math.round(groceries.delta!.changePct!)).toBe(113);
  });

  it('refuses to call a change comparable when a period is only partly loaded', () => {
    // September is the last month and its data stops on the 18th.
    const detail = periodDetail(threeMonths(), 0, NOW)!;
    expect(detail.period.partial).toBe(true);
    expect(detail.expenses?.comparable).toBe(false);
    expect(detail.expenses?.reason).toMatch(/partly loaded/i);
  });

  it('knows which period is still running', () => {
    expect(periodDetail(threeMonths(), 0, NOW)!.inProgress).toBe(true);
    expect(periodDetail(threeMonths(), 1, NOW)!.inProgress).toBe(false);
  });

  it('has no comparison for the earliest period on file', () => {
    const detail = periodDetail(threeMonths(), 2, NOW)!;
    expect(detail.prior).toBeNull();
    expect(detail.expenses).toBeNull();
    expect(detail.categories[0].delta).toBeNull();
  });

  it('lists what it left out of the totals', () => {
    const flow = computeCashflow([
      txn({ transaction_date: '2026-09-05', amount: 200 }),
      txn({ transaction_date: '2026-09-12', amount: 1850, flow: 'transfer', merchant_description: 'PAYMENT TO CHASE CARD' }),
      txn({ transaction_date: '2026-09-06', amount: 800, flow: 'savings', merchant_description: 'TO SAVINGS' }),
    ]);
    const detail = periodDetail(flow, 0, NOW)!;
    expect(detail.excluded.map((e) => e.flow).sort()).toEqual(['savings', 'transfer']);
  });

  it('returns nothing for a period that is not there', () => {
    expect(periodDetail(threeMonths(), 99, NOW)).toBeNull();
  });
});

describe('worthMentioning', () => {
  it('stays quiet about a change that is not comparable', () => {
    expect(worthMentioning({ change: 900, changePct: 60, comparable: false, reason: 'x' })).toBe(false);
  });

  it('stays quiet about a rounding-sized move', () => {
    expect(worthMentioning({ change: 4, changePct: 40, comparable: true, reason: null })).toBe(false);
  });

  it('speaks up about a real one', () => {
    expect(worthMentioning({ change: 340, changePct: 113, comparable: true, reason: null })).toBe(true);
  });
});

describe('categorySeries', () => {
  it('runs oldest first, the direction time runs', () => {
    const series = categorySeries(threeMonths(), 'groceries', NOW);
    expect(series.points.map((p) => p.month)).toEqual(['2026-07', '2026-08', '2026-09']);
  });

  it('averages complete periods only', () => {
    const series = categorySeries(threeMonths(), 'groceries', NOW);
    // July 300 and August 640. September is still running and is left out --
    // including it would pull the line down by however much of the month is
    // left and make every finished month look like an overspend.
    expect(series.average).toBe(470);
    expect(series.completeCount).toBe(2);
  });

  it('marks the period still in progress', () => {
    const series = categorySeries(threeMonths(), 'groceries', NOW);
    expect(series.points.find((p) => p.month === '2026-09')!.inProgress).toBe(true);
    expect(series.points.find((p) => p.month === '2026-08')!.inProgress).toBe(false);
  });

  it('shows a zero rather than dropping a period the category is absent from', () => {
    // A gap in the middle of a chart reads as no data; a zero reads as none
    // spent, which is what happened.
    const series = categorySeries(threeMonths(), 'dining', NOW);
    expect(series.points.map((p) => p.amount)).toEqual([200, 100, 0]);
  });

  it('has no average when nothing is complete', () => {
    const flow = computeCashflow([txn({ transaction_date: '2026-09-18', amount: 400 })]);
    expect(categorySeries(flow, 'groceries', NOW).average).toBeNull();
  });
});
