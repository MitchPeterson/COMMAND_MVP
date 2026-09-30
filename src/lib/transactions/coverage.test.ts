import { describe, expect, it } from 'vitest';
import {
  computeCoverage, dateRangeFromFileName, describeRange, gapsIn, mergeRanges,
  periodsBetween, untrackedCounterparties,
} from './coverage';

const NOW = new Date('2026-09-20T12:00:00Z');
const checking = { id: 'a1', kind: 'bank' as const, name: 'Chase checking', tracked: true };

/**
 * The grid's period range comes from every source's loads, not just this
 * one's, so `otherLoads` is how a test says "the household has data going back
 * to July even though this account does not".
 */
const coverage = (
  loads: Array<[string, string]>,
  marks = {},
  otherLoads: Array<[string, string]> = [],
) => computeCoverage({
  sources: [checking, { id: 'a2', kind: 'bank', name: 'Other', tracked: true }],
  loads: [
    ...loads.map(([start, end]) => ({ sourceId: 'a1', start, end })),
    ...otherLoads.map(([start, end]) => ({ sourceId: 'a2', start, end })),
  ],
  marks, now: NOW,
})[0];

const statusOf = (c: ReturnType<typeof coverage>, period: string) =>
  c.periods.find((p) => p.period === period)!;

describe('ranges', () => {
  it('joins ranges that touch, so no one is sent to re-export a day already there', () => {
    expect(mergeRanges([{ start: '2026-08-01', end: '2026-08-14' }, { start: '2026-08-15', end: '2026-08-31' }]))
      .toEqual([{ start: '2026-08-01', end: '2026-08-31' }]);
  });

  it('joins overlapping ranges', () => {
    expect(mergeRanges([{ start: '2026-08-01', end: '2026-08-20' }, { start: '2026-08-10', end: '2026-08-31' }]))
      .toEqual([{ start: '2026-08-01', end: '2026-08-31' }]);
  });

  it('keeps a real gap apart', () => {
    expect(mergeRanges([{ start: '2026-08-01', end: '2026-08-10' }, { start: '2026-08-14', end: '2026-08-31' }]))
      .toHaveLength(2);
  });

  it('finds a hole in the middle', () => {
    expect(gapsIn({ start: '2026-08-01', end: '2026-08-31' }, [
      { start: '2026-08-01', end: '2026-08-10' }, { start: '2026-08-15', end: '2026-08-31' },
    ])).toEqual([{ start: '2026-08-11', end: '2026-08-14' }]);
  });

  it('finds a hole at each end', () => {
    expect(gapsIn({ start: '2026-08-01', end: '2026-08-31' }, [{ start: '2026-08-07', end: '2026-08-20' }]))
      .toEqual([
        { start: '2026-08-01', end: '2026-08-06' },
        { start: '2026-08-21', end: '2026-08-31' },
      ]);
  });

  it('says a single missing day as one day', () => {
    expect(describeRange({ start: '2026-08-04', end: '2026-08-04' })).toBe('August 4');
    expect(describeRange({ start: '2026-08-01', end: '2026-08-06' })).toBe('August 1 to August 6');
  });
});

describe('periodsBetween', () => {
  it('runs from the earliest load to the month containing now, newest first', () => {
    expect(periodsBetween('2026-07', NOW)).toEqual(['2026-09', '2026-08', '2026-07']);
  });

  it('crosses a year end', () => {
    expect(periodsBetween('2025-11', new Date('2026-01-05T00:00:00Z')))
      .toEqual(['2026-01', '2025-12', '2025-11']);
  });
});

describe('a period status', () => {
  it('is complete when the whole month is loaded', () => {
    expect(statusOf(coverage([['2026-08-01', '2026-08-31']]), '2026-08').status).toBe('complete');
  });

  it('is partial, with the days named, when there is a hole', () => {
    const p = statusOf(coverage([['2026-08-07', '2026-08-31']]), '2026-08');
    expect(p.status).toBe('partial');
    expect(p.gaps).toEqual([{ start: '2026-08-01', end: '2026-08-06' }]);
    expect(p.note).toBe('Missing August 1 to August 6');
  });

  it('is missing when nothing touches the month at all', () => {
    // Another account reaches back to July, so August is a month the grid
    // covers -- and this account has nothing in it.
    const p = statusOf(coverage([['2026-09-01', '2026-09-18']], {}, [['2026-07-01', '2026-09-20']]), '2026-08');
    expect(p.status).toBe('missing');
  });

  it('only asks the current month for days that have happened', () => {
    // Loaded to the 20th and today is the 20th. Nothing is missing, even
    // though the month runs to the 30th.
    expect(statusOf(coverage([['2026-09-01', '2026-09-20']]), '2026-09').status).toBe('complete');
  });

  it('calls a few days behind in the current month in progress, not partial', () => {
    // Every household is a little behind its own bank. Calling that "partial"
    // every month would make the word useless by the time a real gap appeared.
    const p = statusOf(coverage([['2026-09-01', '2026-09-16']]), '2026-09');
    expect(p.status).toBe('in_progress');
    expect(p.note).toBe('Loaded through September 16');
  });

  it('still calls the current month partial when it started late', () => {
    const p = statusOf(coverage([['2026-09-08', '2026-09-20']]), '2026-09');
    expect(p.status).toBe('partial');
  });

  it('takes the household word for it', () => {
    const marked = coverage([['2026-09-01', '2026-09-20']], { 'a1:2026-08': 'complete' }, [['2026-07-01', '2026-09-20']]);
    expect(statusOf(marked, '2026-08').status).toBe('confirmed');
    expect(statusOf(marked, '2026-08').note).toMatch(/marked this complete/i);
  });

  it('takes "there was no activity" as an answer too', () => {
    const marked = coverage([['2026-09-01', '2026-09-20']], { 'a1:2026-08': 'not_needed' }, [['2026-07-01', '2026-09-20']]);
    expect(statusOf(marked, '2026-08').note).toMatch(/no activity/i);
  });
});

describe('what to do next', () => {
  it('names the oldest hole, because everything after it is suspect anyway', () => {
    const c = coverage([['2026-07-01', '2026-07-20'], ['2026-08-10', '2026-09-20']]);
    expect(c.fill).toEqual({ start: '2026-07-21', end: '2026-07-31' });
  });

  it('says where the next export should start', () => {
    expect(coverage([['2026-08-01', '2026-09-18']]).nextExportFrom).toBe('2026-09-19');
  });

  it('counts gaps in finished months only', () => {
    // A hole in the month still running is normal and is not a chore.
    const c = coverage([['2026-07-01', '2026-07-31'], ['2026-08-01', '2026-08-31'], ['2026-09-01', '2026-09-15']]);
    expect(c.gapCount).toBe(0);
  });

  it('counts a real gap in a finished month', () => {
    const c = coverage([['2026-07-01', '2026-07-10'], ['2026-08-01', '2026-09-20']]);
    expect(c.gapCount).toBe(1);
  });
});

describe('sources that are not tracked', () => {
  it('leaves an untracked source out entirely', () => {
    const all = computeCoverage({
      sources: [checking, { id: 'a3', kind: 'bank', name: 'Old savings', tracked: false }],
      loads: [{ sourceId: 'a1', start: '2026-09-01', end: '2026-09-20' }],
      marks: {}, now: NOW,
    });
    expect(all.map((c) => c.source.id)).toEqual(['a1']);
  });
});

describe('untrackedCounterparties', () => {
  it('ranks by how often each was seen', () => {
    const found = untrackedCounterparties([
      { description: 'Transfer to Ally Savings', counterpartyKey: 'ally savings' },
      { description: 'Transfer to Ally Savings', counterpartyKey: 'ally savings' },
      { description: 'PAYMENT TO DISCOVER', counterpartyKey: 'discover' },
    ]);
    expect(found.map((f) => f.key)).toEqual(['ally savings', 'discover']);
    expect(found[0].count).toBe(2);
  });

  it('forgets the ones told not to bother about', () => {
    const found = untrackedCounterparties(
      [{ description: 'Transfer to Ally', counterpartyKey: 'ally savings' }],
      ['ally savings'],
    );
    expect(found).toEqual([]);
  });
});

describe('dateRangeFromFileName', () => {
  it.each([
    ['Chase8841_20260801-20260831.csv', '2026-08-01', '2026-08-31'],
    ['statement_2026-08-01_to_2026-08-31.csv', '2026-08-01', '2026-08-31'],
    ['activity 08-01-2026 to 08-31-2026.xlsx', '2026-08-01', '2026-08-31'],
  ])('reads a range out of %s', (name, start, end) => {
    expect(dateRangeFromFileName(name)).toEqual({ start, end });
  });

  it('refuses a single date, which is the day it was downloaded', () => {
    // Chase8841_Activity_20260926 was exported on the 26th and says nothing
    // about what is inside it. Reading it as a range would invent a coverage
    // claim the file never made.
    expect(dateRangeFromFileName('Chase8841_Activity_20260926.csv')).toBeNull();
    expect(dateRangeFromFileName('DownloadTxnHistory.csv')).toBeNull();
  });
});
