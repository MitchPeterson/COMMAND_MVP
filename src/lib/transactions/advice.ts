// The aggregate that goes to the model, and nothing else.
//
// Built here rather than in the Edge Function because every figure in it is
// already computed by the modules that draw the page, and a second
// implementation in Deno would be a second thing to keep in step.
//
// The function rebuilds this field by field before sending it on, so anything
// added here that is not in its list is dropped. That is the guarantee; this
// module is the first half of it, and the honest description of what leaves
// the household.
//
// The rule that shaped it: a figure, never a record. "Groceries, $1,017 a
// month, up $52" is a fact about a category. "CUB FOODS #1234 SAVAGE MN,
// $142.87, September 14" is a fact about a Tuesday, and no recommendation
// needs one.

import type { Cashflow } from '../cashflow';
import type { SourceCoverage } from './coverage';
import type { RecurringSummaryView } from './recurringDetail';
import { periodDetail } from './period';

export interface AdviceBasis {
  periods: Array<{ period: string; income: number; expenses: number; savings: number; net: number; partial: boolean }>;
  categories: Array<{ category: string; perMonth: number; share: number; changeOnPrior: number | null }>;
  sources: Array<{ name: string; kind: string; loadedFrom: string | null; loadedTo: string | null; gaps: number }>;
  recurring: Array<{ merchant: string; cadence: string; perMonth: number; perYear: number; purpose: string; priceRose: string | null; decision: string | null }>;
  reviewQueue: number;
}

const round = (value: number) => Math.round(value * 100) / 100;

export function buildAdviceBasis(
  cashflow: Cashflow,
  coverage: SourceCoverage[],
  recurring: RecurringSummaryView,
  reviewQueue: number,
  now: Date = new Date(),
): AdviceBasis {
  // The most recent whole period carries the category figures: a partial month
  // would have the model recommending cuts against two-thirds of a month's
  // spending.
  const wholeIndex = cashflow.months.findIndex((m) => !m.partial);
  const detail = wholeIndex >= 0 ? periodDetail(cashflow, wholeIndex, now) : null;

  return {
    periods: cashflow.months.slice(0, 18).map((m) => ({
      period: m.month,
      income: round(m.income),
      expenses: round(m.expenses),
      savings: round(m.savings),
      net: round(m.net),
      partial: m.partial,
    })),

    categories: (detail?.categories ?? []).slice(0, 25).map((c) => ({
      category: c.label,
      perMonth: round(c.amount),
      share: Math.round(c.share),
      // Withheld where it is not comparable, rather than sent as a number the
      // model would reasonably quote as a trend.
      changeOnPrior: c.delta?.comparable ? round(c.delta.change) : null,
    })),

    sources: coverage.map((c) => ({
      name: c.source.name,
      kind: c.source.kind,
      loadedFrom: c.periods[c.periods.length - 1]?.period ?? null,
      loadedTo: c.nextExportFrom,
      gaps: c.gapCount,
    })),

    recurring: recurring.groups.flatMap((g) => g.items).slice(0, 40).map((i) => ({
      merchant: i.merchant.slice(0, 60),
      cadence: i.cadence,
      perMonth: round(i.perPeriod),
      perYear: round(i.perYear),
      purpose: i.purpose,
      priceRose: i.priceIncrease
        ? `${i.priceIncrease.from} to ${i.priceIncrease.to} in ${i.priceIncrease.since.slice(0, 7)}`
        : null,
      decision: i.decision,
    })),

    reviewQueue,
  };
}

/**
 * Whether there is enough on file for advice to be worth asking for.
 *
 * A model given one partial month will produce ten confident sentences about
 * it, and every one of them will be wrong in the same invisible way.
 */
export function enoughToAdviseOn(basis: AdviceBasis): { ready: boolean; reason: string | null } {
  const whole = basis.periods.filter((p) => !p.partial).length;
  if (whole === 0) {
    return { ready: false, reason: 'No complete month on file yet. Import a full month and this becomes useful.' };
  }
  if (basis.categories.length < 3 && basis.recurring.length === 0) {
    return { ready: false, reason: 'Too little on file to say anything specific.' };
  }
  return { ready: true, reason: null };
}
