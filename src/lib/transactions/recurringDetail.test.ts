import { describe, expect, it } from 'vitest';
import type { RecurringCharge } from '../recurring';
import { buildRecurringView, inferCadence } from './recurringDetail';

const charge = (over: Partial<RecurringCharge> & { merchant: string }): RecurringCharge => ({
  amount: 20, varies: false, occurrences: 3, months: ['2026-07', '2026-08', '2026-09'],
  annualCost: 240, category: 'Subscriptions', lastSeen: '2026-09-06',
  markedAutopay: false, basis: '', priceIncrease: null, ...over,
});

describe('inferCadence', () => {
  it.each([
    [['2026-09-01', '2026-09-08', '2026-09-15'], 'weekly'],
    [['2026-07-01', '2026-07-15', '2026-07-29'], 'fortnightly'],
    [['2026-07-01', '2026-08-01', '2026-09-01'], 'monthly'],
    [['2026-01-01', '2026-04-01', '2026-07-01'], 'quarterly'],
    [['2025-06-01', '2026-06-01'], 'yearly'],
  ])('reads %j as %s', (dates, expected) => {
    expect(inferCadence(dates).cadence).toBe(expected);
  });

  it('takes the median, so one skipped month does not change the cadence', () => {
    // Paid monthly, missed August. The mean gap is 40 days; the median is 31.
    expect(inferCadence(['2026-06-01', '2026-07-01', '2026-09-01', '2026-10-01']).cadence).toBe('monthly');
  });

  it('tolerates billing dates wandering across month lengths', () => {
    expect(inferCadence(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']).cadence).toBe('monthly');
  });

  it('cannot infer anything from a single charge', () => {
    expect(inferCadence(['2026-09-01'])).toEqual({ cadence: 'irregular', medianGapDays: null });
  });
});

describe('what it really costs', () => {
  it('FIXED: a yearly premium no longer reports twelve times over', () => {
    // The old annualCost was (total seen / months seen) x 12, so a $600
    // yearly premium seen once reported as $7,200 a year.
    const view = buildRecurringView([charge({
      merchant: 'STATE FARM PREMIUM', amount: 600, occurrences: 2,
      months: ['2025-06', '2026-06'], category: 'Insurance',
    })]);
    const item = view.groups[0].items[0];
    expect(item.cadence).toBe('yearly');
    expect(item.perYear).toBe(600);
    expect(item.perPeriod).toBe(50);
  });

  it('FIXED: a quarterly charge no longer reports three times over', () => {
    const view = buildRecurringView([charge({
      merchant: 'WATER DISTRICT', amount: 300, occurrences: 3,
      months: ['2026-01', '2026-04', '2026-07'], category: 'Utilities',
    })]);
    expect(view.groups[0].items[0].perYear).toBe(1200);
  });

  it('leaves a monthly charge where it was', () => {
    const view = buildRecurringView([charge({ merchant: 'SPOTIFY', amount: 11.99 })]);
    expect(view.groups[0].items[0].perYear).toBeCloseTo(143.88, 2);
  });
});

describe('grouping by purpose', () => {
  it('separates what cannot be cancelled from what can', () => {
    const view = buildRecurringView([
      charge({ merchant: 'MORTGAGE', amount: 2400, category: 'Housing and loans' }),
      charge({ merchant: 'NETFLIX', amount: 22.99, category: 'Entertainment' }),
    ]);
    expect(view.groups.map((g) => g.purpose)).toEqual(['Fixed bills', 'Subscriptions and memberships']);
  });

  it('subtotals each group', () => {
    const view = buildRecurringView([
      charge({ merchant: 'NETFLIX', amount: 20, category: 'Entertainment' }),
      charge({ merchant: 'SPOTIFY', amount: 10, category: 'Subscriptions' }),
    ]);
    expect(view.groups[0].perPeriod).toBe(30);
    expect(view.groups[0].perYear).toBe(360);
  });

  it('counts only the cancellable part as optional', () => {
    const view = buildRecurringView([
      charge({ merchant: 'MORTGAGE', amount: 2400, category: 'Housing and loans' }),
      charge({ merchant: 'NETFLIX', amount: 20, category: 'Entertainment' }),
    ]);
    expect(view.totalPerPeriod).toBe(2420);
    expect(view.optionalPerPeriod).toBe(20);
  });
});

describe("Command's reading", () => {
  it('flags a price rise as worth cutting when it can be cancelled', () => {
    const item = buildRecurringView([charge({
      merchant: 'NETFLIX', amount: 22.99, category: 'Entertainment',
      priceIncrease: { from: 15.49, to: 22.99, since: '2026-08-06', annualDifference: 90 },
    })]).groups[0].items[0];
    expect(item.verdict).toBe('cut');
    expect(item.verdictReason).toMatch(/15\.49 to \$22\.99/);
  });

  it('flags a price rise on a fixed bill as worth a look, not a cut', () => {
    // A household cannot cancel its insurance, but it can ring them.
    const item = buildRecurringView([charge({
      merchant: 'STATE FARM', amount: 340, category: 'Insurance',
      priceIncrease: { from: 300, to: 340, since: '2026-08-01', annualDifference: 480 },
    })]).groups[0].items[0];
    expect(item.verdict).toBe('look');
    expect(item.verdictReason).toMatch(/cannot be dropped/i);
  });

  it('notices one that stopped', () => {
    const item = buildRecurringView([
      charge({ merchant: 'PLANET FITNESS', lastSeen: '2026-07-18', category: 'Entertainment' }),
      charge({ merchant: 'SPOTIFY', lastSeen: '2026-09-06' }),
    ]).groups[0].items.find((i) => i.merchant === 'PLANET FITNESS')!;
    expect(item.verdict).toBe('look');
    expect(item.verdictReason).toMatch(/cancelled, or a bill was missed/i);
  });

  it('never claims something is unused, because it cannot know', () => {
    // Command sees charges, not usage. The strongest thing it can honestly say
    // about a steady subscription is its size.
    const item = buildRecurringView([charge({ merchant: 'SOME SERVICE', amount: 40 })]).groups[0].items[0];
    expect(item.verdictReason).not.toMatch(/unused|do not use|never use/i);
    expect(item.verdictReason).toMatch(/480 a year/);
  });

  it('says nothing much about something steady and small', () => {
    const item = buildRecurringView([charge({ merchant: 'SOME SERVICE', amount: 4 })]).groups[0].items[0];
    expect(item.verdict).toBe('keep');
  });
});

describe('what the household decided', () => {
  it('carries a decision through', () => {
    const view = buildRecurringView(
      [charge({ merchant: 'NETFLIX', amount: 20, category: 'Entertainment' })],
      { netflix: 'cut' },
    );
    expect(view.groups[0].items[0].decision).toBe('cut');
    expect(view.cutPerPeriod).toBe(20);
    expect(view.cutPerYear).toBe(240);
  });

  it('counts what Command raised and nobody has answered', () => {
    const view = buildRecurringView([
      charge({ merchant: 'NETFLIX', amount: 40, category: 'Entertainment' }),
      charge({ merchant: 'TINY', amount: 2, category: 'Entertainment' }),
    ]);
    // The $40 one is worth a look and undecided; the $2 one is not raised.
    expect(view.undecided).toBe(1);
  });

  it('stops counting one that has been answered', () => {
    const view = buildRecurringView(
      [charge({ merchant: 'NETFLIX', amount: 40, category: 'Entertainment' })],
      { netflix: 'keep' },
    );
    expect(view.undecided).toBe(0);
  });
});
