// One period, and how it compares.
//
// Every figure on the period view is a comparison whether it says so or not.
// "$4,301 on groceries" means nothing alone; "$4,301, up $340 on last month"
// is the sentence a household can act on. So the comparison is computed here,
// once, with the two rules that keep it honest:
//
//   A partial period is not comparable. If either side of a comparison is a
//   month Command holds only part of, the change is arithmetic on an incomplete
//   number and reporting it would invent a trend. It is suppressed and the
//   reason is available to say out loud.
//
//   An average is over complete periods only, for the same reason. A dashed
//   line that includes a half-loaded month sits lower than the truth and makes
//   every full month look like an overspend.
//
// Pure, and takes `now` rather than reading the clock, so "so far" can be
// tested.

import type { Cashflow, MonthFlow } from '../cashflow';
import { categoryByCode, categoryFromLabel } from './taxonomy';

export interface Delta {
  change: number;
  /** Null when the prior figure was zero — a rise from nothing has no percentage. */
  changePct: number | null;
  /**
   * False when either period is partial, so the change is arithmetic on an
   * incomplete number. The figure is still carried; it just must not be shown
   * as a trend.
   */
  comparable: boolean;
  reason: string | null;
}

export interface CategoryLine {
  code: string;
  label: string;
  /** Net of refunds, as everything downstream of the taxonomy is. */
  amount: number;
  count: number;
  /** Of the period's spending. */
  share: number;
  delta: Delta | null;
}

export interface SourceLine {
  id: string;
  label: string;
  amount: number;
  count: number;
  share: number;
  delta: Delta | null;
}

/** One bar in a category's period-over-period chart. */
export interface CategoryPoint {
  month: string;
  label: string;
  amount: number;
  /** Command holds only part of this period. Drawn faded and labelled. */
  partial: boolean;
  /** The period in progress. Its figure is real but not yet final. */
  inProgress: boolean;
}

export interface CategorySeries {
  points: CategoryPoint[];
  /** Across complete periods only. Null when there are none to average. */
  average: number | null;
  completeCount: number;
}

const MEANINGFUL_CHANGE = 0.05;

/** YYYY-MM for the period containing a given instant, in UTC. */
export const periodOf = (now: Date) => now.toISOString().slice(0, 7);

function delta(current: number, prior: number | null, partial: boolean, priorPartial: boolean): Delta | null {
  if (prior == null) return null;
  const change = current - prior;
  const comparable = !partial && !priorPartial;
  return {
    change,
    changePct: prior !== 0 ? (change / Math.abs(prior)) * 100 : null,
    comparable,
    reason: comparable
      ? null
      : partial && priorPartial
        ? 'Both periods are only partly loaded'
        : partial
          ? 'This period is only partly loaded'
          : 'The period before this one is only partly loaded',
  };
}

/** Whether a move is worth drawing attention to at all. */
export const worthMentioning = (d: Delta | null, floor = 25) =>
  d != null && d.comparable && Math.abs(d.change) >= floor
  && (d.changePct == null || Math.abs(d.changePct) >= MEANINGFUL_CHANGE * 100);

export interface PeriodDetail {
  period: MonthFlow;
  prior: MonthFlow | null;
  inProgress: boolean;
  income: Delta | null;
  expenses: Delta | null;
  savings: Delta | null;
  net: Delta | null;
  categories: CategoryLine[];
  /** Income by the account it arrived in. */
  incomeSources: SourceLine[];
  /** What was left out of the totals, and why. */
  excluded: Cashflow['excluded'];
}

/**
 * Everything the period view needs for one selected period.
 *
 * `index` follows the convention used everywhere in this codebase: 0 is the
 * most recent period.
 */
export function periodDetail(
  cashflow: Cashflow,
  index: number,
  now: Date,
  sourceLabel: (id: string) => string = (id) => id,
): PeriodDetail | null {
  const period = cashflow.months[index];
  if (!period) return null;
  const prior = cashflow.months[index + 1] ?? null;
  const priorPartial = prior?.partial ?? false;

  const spending = Object.entries(period.byCategory)
    .filter(([, v]) => v.amount !== 0);
  const total = spending.reduce((sum, [, v]) => sum + Math.max(0, v.amount), 0);

  const categories: CategoryLine[] = spending
    .map(([code, value]) => ({
      code,
      label: categoryByCode(code)?.label ?? categoryFromLabel(code).label,
      amount: value.amount,
      count: value.count,
      share: total > 0 ? (value.amount / total) * 100 : 0,
      delta: delta(value.amount, prior?.byCategory[code]?.amount ?? (prior ? 0 : null), period.partial, priorPartial),
    }))
    .sort((a, b) => b.amount - a.amount);

  const incomeSources: SourceLine[] = Object.entries(period.bySource)
    .filter(([, v]) => v.income > 0)
    .map(([id, value]) => ({
      id,
      label: sourceLabel(id),
      amount: value.income,
      count: value.count,
      share: period.income > 0 ? (value.income / period.income) * 100 : 0,
      delta: delta(value.income, prior?.bySource[id]?.income ?? (prior ? 0 : null), period.partial, priorPartial),
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    period,
    prior,
    inProgress: period.month === periodOf(now),
    income: delta(period.income, prior?.income ?? null, period.partial, priorPartial),
    expenses: delta(period.expenses, prior?.expenses ?? null, period.partial, priorPartial),
    savings: delta(period.savings, prior?.savings ?? null, period.partial, priorPartial),
    net: delta(period.net, prior?.net ?? null, period.partial, priorPartial),
    categories,
    incomeSources,
    excluded: cashflow.excluded.filter((e) => e.date.startsWith(period.month)),
  };
}

/**
 * One category across every period, oldest first, for the drill-down chart.
 *
 * Oldest first because that is the direction time runs; every other list in
 * this codebase is newest first, and a chart that read right-to-left would be
 * the one thing on the page that did.
 */
export function categorySeries(cashflow: Cashflow, code: string, now: Date): CategorySeries {
  const current = periodOf(now);
  const points: CategoryPoint[] = [...cashflow.months]
    .reverse()
    .map((m) => ({
      month: m.month,
      label: m.label,
      amount: m.byCategory[code]?.amount ?? 0,
      partial: m.partial,
      inProgress: m.month === current,
    }));

  // Complete means loaded end to end and finished. A period still running is
  // not partial -- nothing is missing from it -- but averaging it in would
  // pull the line down by however much of the month is left.
  const complete = points.filter((p) => !p.partial && !p.inProgress);
  return {
    points,
    average: complete.length > 0
      ? complete.reduce((sum, p) => sum + p.amount, 0) / complete.length
      : null,
    completeCount: complete.length,
  };
}
