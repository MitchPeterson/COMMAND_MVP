// What has actually been loaded, and what has not.
//
// Every figure on the period view rests on an assumption nobody stated: that
// the months on screen are the months in full. They usually are not. A
// household exports one account in August and another in September, and the
// totals quietly describe a different set of accounts each month while looking
// exactly as confident either way.
//
// So coverage is computed rather than assumed, and the gaps are named to the
// day. "Checking is missing Aug 1 to Aug 6" is a thing someone can go and fix;
// "some data may be incomplete" is a disclaimer.
//
// Almost nothing here is stored. Coverage is derived from the imports on file
// every time it is asked for, because a status written down is a status that
// goes stale while still looking authoritative. The only stored part is what
// the household asserted -- this period is complete, or this period had no
// activity -- which is the one thing that cannot be derived.

export type CoverageStatus =
  /** The household said so outright. */
  | 'confirmed'
  /** Nothing loaded that touches this period at all. */
  | 'missing'
  /** Loaded end to end. */
  | 'complete'
  /** The period still running, loaded from its start and lagging only at the end. */
  | 'in_progress'
  /** Loaded, with holes. The holes are named. */
  | 'partial';

export interface DateRange { start: string; end: string }

export interface SourceRef {
  id: string;
  kind: 'bank' | 'card';
  name: string;
  tracked: boolean;
}

export interface PeriodCoverage {
  period: string;
  status: CoverageStatus;
  /** The days inside this period that nothing covers. Empty unless partial. */
  gaps: DateRange[];
  /** Why, in the household's words. Null when there is nothing to say. */
  note: string | null;
}

export interface SourceCoverage {
  source: SourceRef;
  /** Newest period first, matching every other list in this codebase. */
  periods: PeriodCoverage[];
  /** The earliest hole worth filling, if there is one. */
  fill: DateRange | null;
  /** The day the next export should start from, so nothing is missed. */
  nextExportFrom: string | null;
  /** Gaps in periods that have finished. A hole in the current month is normal. */
  gapCount: number;
}

// ── Dates, as plain strings ─────────────────────────────────────────────────

const day = (iso: string) => Math.floor(Date.UTC(
  Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)),
) / 86400000);

const iso = (n: number) => new Date(n * 86400000).toISOString().slice(0, 10);

const periodStart = (period: string) => `${period}-01`;
const periodEnd = (period: string) => {
  const [y, m] = period.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

/** Every period from the earliest loaded to the one containing `now`, newest first. */
export function periodsBetween(earliest: string, now: Date): string[] {
  const out: string[] = [];
  const last = now.toISOString().slice(0, 7);
  let [y, m] = earliest.split('-').map(Number);
  for (let guard = 0; guard < 240; guard += 1) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    out.push(key);
    if (key === last) break;
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out.reverse();
}

/** Overlapping and touching ranges collapsed into the fewest that say the same thing. */
export function mergeRanges(ranges: DateRange[]): DateRange[] {
  const sorted = ranges
    .filter((r) => r.start && r.end && r.start <= r.end)
    .sort((a, b) => a.start.localeCompare(b.start));
  const out: DateRange[] = [];
  for (const range of sorted) {
    const last = out[out.length - 1];
    // Touching counts as contiguous: a file ending the 14th and one starting
    // the 15th leave no gap, and reporting one would send someone to re-export
    // a day that is already there.
    if (last && day(range.start) <= day(last.end) + 1) {
      if (range.end > last.end) last.end = range.end;
    } else out.push({ ...range });
  }
  return out;
}

/** The parts of `window` that `covered` does not reach. */
export function gapsIn(window: DateRange, covered: DateRange[]): DateRange[] {
  const gaps: DateRange[] = [];
  let cursor = day(window.start);
  const end = day(window.end);

  for (const range of mergeRanges(covered)) {
    const from = day(range.start);
    const to = day(range.end);
    if (to < cursor) continue;
    if (from > end) break;
    if (from > cursor) gaps.push({ start: iso(cursor), end: iso(Math.min(from - 1, end)) });
    cursor = Math.max(cursor, to + 1);
    if (cursor > end) break;
  }
  if (cursor <= end) gaps.push({ start: iso(cursor), end: iso(end) });
  return gaps;
}

export interface CoverageInput {
  sources: SourceRef[];
  /** One entry per import: which source, and the days it covers. */
  loads: Array<{ sourceId: string; start: string; end: string }>;
  /** What the household asserted, keyed `${sourceId}:${period}`. */
  marks: Record<string, 'complete' | 'not_needed'>;
  now: Date;
}

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
const niceDay = (value: string) => MONTH.format(new Date(`${value}T00:00:00Z`));

/** "Aug 1 to Aug 6", or "Aug 1" when a gap is a single day. */
export const describeRange = (range: DateRange) =>
  range.start === range.end ? niceDay(range.start) : `${niceDay(range.start)} to ${niceDay(range.end)}`;

export function computeCoverage(input: CoverageInput): SourceCoverage[] {
  const { sources, loads, marks, now } = input;
  const today = now.toISOString().slice(0, 10);
  const currentPeriod = today.slice(0, 7);

  const earliest = loads.map((l) => l.start).sort()[0]?.slice(0, 7) ?? currentPeriod;
  const allPeriods = periodsBetween(earliest, now);

  return sources.filter((s) => s.tracked).map((source) => {
    const mine = mergeRanges(
      loads.filter((l) => l.sourceId === source.id).map((l) => ({ start: l.start, end: l.end })),
    );

    const periods: PeriodCoverage[] = allPeriods.map((period) => {
      const mark = marks[`${source.id}:${period}`];
      if (mark) {
        return {
          period,
          status: mark === 'not_needed' ? 'confirmed' : 'confirmed',
          gaps: [],
          note: mark === 'not_needed' ? 'You said there was no activity' : 'You marked this complete',
        };
      }

      // The current period can only be covered as far as today. Asking for the
      // rest of the month is asking for days that have not happened.
      const isCurrent = period === currentPeriod;
      const window = { start: periodStart(period), end: isCurrent ? today : periodEnd(period) };

      const touching = mine.filter((r) => r.end >= window.start && r.start <= window.end);
      if (touching.length === 0) {
        return { period, status: 'missing', gaps: [window], note: 'Nothing loaded for this month' };
      }

      const gaps = gapsIn(window, touching);
      if (gaps.length === 0) {
        return { period, status: 'complete', gaps: [], note: null };
      }

      // A single gap at the trailing end of the month still running is an
      // export lag, not a hole. Every household is a few days behind its own
      // bank, and calling that "partial" every month would make the word
      // useless by the time a real gap appeared.
      const onlyTrailing = gaps.length === 1 && gaps[0].end === window.end
        && gaps[0].start > window.start;
      if (isCurrent && onlyTrailing) {
        return { period, status: 'in_progress', gaps, note: `Loaded through ${niceDay(iso(day(gaps[0].start) - 1))}` };
      }

      return {
        period,
        status: 'partial',
        gaps,
        note: `Missing ${gaps.map(describeRange).join(', and ')}`,
      };
    });

    // The oldest hole is the one to fix first: everything after it is suspect
    // anyway, and a household filling gaps wants a single next step.
    const finished = periods.filter((p) => p.period !== currentPeriod);
    const outstanding = [...periods].reverse().flatMap((p) =>
      (p.status === 'partial' || p.status === 'missing') ? p.gaps : []);

    const lastLoaded = mine[mine.length - 1]?.end ?? null;

    return {
      source,
      periods,
      fill: outstanding[0] ?? null,
      nextExportFrom: lastLoaded ? iso(day(lastLoaded) + 1) : null,
      gapCount: finished.filter((p) => p.status === 'partial' || p.status === 'missing').length,
    };
  });
}

/** Sources seen paying or being paid that nothing on file accounts for. */
export function untrackedCounterparties(
  transfers: Array<{ description: string; counterpartyKey: string | null }>,
  dismissed: string[] = [],
): Array<{ key: string; name: string; count: number }> {
  const seen = new Map<string, { key: string; name: string; count: number }>();
  for (const t of transfers) {
    const key = t.counterpartyKey;
    if (!key || dismissed.includes(key)) continue;
    const held = seen.get(key) ?? { key, name: t.description, count: 0 };
    held.count += 1;
    seen.set(key, held);
  }
  return [...seen.values()].sort((a, b) => b.count - a.count);
}

/**
 * A date range stated in a file's own name.
 *
 * Worth reading because it says something the rows cannot: what the export was
 * *meant* to cover. A file named 20260801-20260831 holding nothing after the
 * 6th is a five-day hole in August; judged by its rows alone it is a complete
 * little file that happens to stop early, and the gap is invisible.
 *
 * Two dates or nothing. A single date in a file name is the day it was
 * downloaded -- Chase8841_Activity_20260926 was exported on the 26th and says
 * nothing about what is inside it -- and reading that as a range would invent
 * a coverage claim the file never made.
 */
export function dateRangeFromFileName(fileName: string): DateRange | null {
  const name = fileName.replace(/\.[^.]+$/, '');

  // 20260801-20260831, 20260801_20260831
  const compact = name.match(/(20\d{2})(\d{2})(\d{2})\s*[-_to]{1,4}\s*(20\d{2})(\d{2})(\d{2})/i);
  if (compact) {
    const [, y1, m1, d1, y2, m2, d2] = compact;
    return { start: `${y1}-${m1}-${d1}`, end: `${y2}-${m2}-${d2}` };
  }

  // 2026-08-01 to 2026-08-31, 2026-08-01_2026-08-31
  const dashed = name.match(/(20\d{2}-\d{2}-\d{2})\s*[-_]*(?:to)?[-_\s]*(20\d{2}-\d{2}-\d{2})/i);
  if (dashed) return { start: dashed[1], end: dashed[2] };

  // 08-01-2026 to 08-31-2026
  const us = name.match(/(\d{2})[-/](\d{2})[-/](20\d{2})\s*[-_\s]*(?:to)?[-_\s]*(\d{2})[-/](\d{2})[-/](20\d{2})/i);
  if (us) {
    const [, m1, d1, y1, m2, d2, y2] = us;
    return { start: `${y1}-${m1}-${d1}`, end: `${y2}-${m2}-${d2}` };
  }

  return null;
}
