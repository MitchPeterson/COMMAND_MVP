// Money in against money out, drawn.
//
// The figures this replaces were a paragraph: "you brought in $12,400 and
// spent $11,180, leaving $1,220, which is 10%." Four numbers and a
// relationship between them is exactly the case CLAUDE.md says to draw, and
// the shape carries something the sentence cannot -- whether the gap is
// steady or whether one month ate the other three.
//
// Drawn by hand in SVG rather than with a charting library, for the reason
// every other chart here is: the palette is swappable, and a library's baked
// colors would be the one thing on the page that ignored the theme.
//
// Two series means two colors, and the honest pair took measuring. Gold
// against cmd-muted separates by only 13.3 for normal vision where a chart
// needs 15, so the neutral is its own stepped token -- see the note in
// index.css. Position, the legend and the direct labels carry identity too,
// so the colors are never doing the job alone.

import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, TrendingDown, Wallet } from 'lucide-react';
import type { Cashflow } from '../lib/cashflow';
import { StatTile } from './StatTile';

interface Props {
  cashflow: Cashflow;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const short = (value: number) =>
  Math.abs(value) >= 1000
    ? `$${(value / 1000).toFixed(Math.abs(value) >= 10000 ? 0 : 1)}k`
    : `$${Math.round(value)}`;

/** Jan 2026, for an axis where the full label will not fit. UTC, or a month
 *  built at UTC midnight renders as the previous one west of Greenwich. */
const TICK_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const tick = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return TICK_FORMAT.format(new Date(Date.UTC(y, m - 1, 1)))
    + (m === 1 ? ` ’${String(y).slice(2)}` : '');
};

/** 45-degree hatching for a month that is only partly covered. The gap is the
 *  finding, so it is drawn rather than left off the chart. */
const HATCH_GOLD =
  'repeating-linear-gradient(45deg, rgb(var(--cmd-gold)) 0 2px, rgb(var(--cmd-gold) / 0.25) 2px 5px)';
const HATCH_NEUTRAL =
  'repeating-linear-gradient(45deg, rgb(var(--cmd-series-2)) 0 2px, rgb(var(--cmd-series-2) / 0.25) 2px 5px)';

export function CashflowOverview({ cashflow }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const months = [...cashflow.months].reverse(); // oldest to newest, as time runs.

  if (months.length === 0) return null;

  const peak = Math.max(...months.map((m) => Math.max(m.income, m.expenses)), 1);
  const showIncome = cashflow.incomeVisible;
  const active = months.find((m) => m.month === hovered) ?? null;

  const H = 150;
  // Thin marks. Without a ceiling, five months across a wide card render as
  // slabs 80px wide, which reads as a block diagram rather than a chart.
  const BAR_CAP = 34;

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Money in, money out</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-cmd-muted">
            {cashflow.months.length} month{cashflow.months.length === 1 ? '' : 's'} on file
            {cashflow.earliest ? `, ${cashflow.earliest} to ${cashflow.latest}` : ''}.
            {' '}Transfers between your own accounts are excluded from both sides — they are the
            same money twice.
          </p>
        </div>
      </div>

      {/* The headline figures. A stat tile beats a chart for a single number. */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {showIncome && (
          <StatTile
            label="Income" icon={<ArrowDownLeft className="h-3 w-3" />}
            value={cashflow.averageIncome != null ? money(cashflow.averageIncome) : '--'}
            note="in a typical whole month"
          />
        )}
        <StatTile
          label="Spending" icon={<ArrowUpRight className="h-3 w-3" />}
          value={cashflow.averageExpenses != null ? money(cashflow.averageExpenses) : '--'}
          note="in a typical whole month"
        />
        {showIncome && (
          <StatTile
            label="Left over" icon={<Wallet className="h-3 w-3" />}
            value={cashflow.averageIncome != null && cashflow.averageExpenses != null
              ? money(cashflow.averageIncome - cashflow.averageExpenses) : '--'}
            note={cashflow.savingsRate != null
              ? `${Math.round(cashflow.savingsRate)}% of what came in`
              : 'income not yet in view'}
          />
        )}
        <StatTile
          label="Transfers" value={money(cashflow.totalTransfers)}
          note="moved between accounts, not counted as spending"
        />
        {!showIncome && (
          <StatTile
            label="Income" value="Not in view"
            note="card statements have no salary in them"
          />
        )}
      </div>

      {/* The chart. Legend first, because two series always need one. */}
      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {showIncome && (
              <span className="flex items-center gap-1.5 text-cmd-muted">
                <span className="h-2.5 w-2.5 rounded-sm bg-cmd-gold" /> Money in
              </span>
            )}
            <span className="flex items-center gap-1.5 text-cmd-muted">
              <span className="h-2.5 w-2.5 rounded-sm bg-cmd-series-2" /> Money out
            </span>
            {months.some((m) => m.partial) && (
              <span className="flex items-center gap-1.5 text-cmd-muted">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundImage: HATCH_NEUTRAL }}
                />
                Part of a month only
              </span>
            )}
          </div>
          {active && (
            <p className="text-xs text-cmd-offwhite">
              <span className="text-cmd-muted">{active.label}</span>
              {showIncome ? ` · in ${money(active.income)}` : ''}
              {` · out ${money(active.expenses)}`}
              {showIncome ? ` · ${active.net >= 0 ? 'left' : 'short'} ${money(Math.abs(active.net))}` : ''}
              {active.partial ? ' · partial month' : ''}
            </p>
          )}
        </div>

        {/* Bars as elements rather than SVG.
            An SVG sized to the container needs preserveAspectRatio="none",
            and that stretches a corner radius horizontally -- a 4px round on
            the top of a bar comes out as a 20px ellipse. Flex children round
            correctly at any width, hatch with a gradient, and take a hover
            without a transparent hit rectangle over the top. */}
        <div
          className="mt-3 flex items-end gap-3"
          style={{ height: `${H}px` }}
          role="img"
          aria-label={
            showIncome
              ? `Money in against money out, by month. ${months.map((m) => `${m.label}: in ${money(m.income)}, out ${money(m.expenses)}`).join('. ')}.`
              : `Spending by month. ${months.map((m) => `${m.label}: ${money(m.expenses)}`).join('. ')}.`
          }
        >
          {months.map((m) => {
            const dim = hovered != null && hovered !== m.month;
            return (
              <div
                key={m.month}
                onMouseEnter={() => setHovered(m.month)}
                onMouseLeave={() => setHovered(null)}
                // The pair gap is deliberately much smaller than the gap
                // between months: the two bars have to read as one month's
                // pair rather than as two independent bars, and at equal gaps
                // they did not.
                className={`flex h-full min-w-0 flex-1 items-end justify-center gap-0.5 transition-opacity ${
                  dim ? 'opacity-40' : 'opacity-100'
                }`}
              >
                {showIncome && (
                  <div
                    className={`min-w-0 flex-1 rounded-t ${m.partial ? '' : 'bg-cmd-gold'}`}
                    style={{
                      maxWidth: BAR_CAP,
                      height: `${Math.max(m.income > 0 ? 2 : 0, (m.income / peak) * H)}px`,
                      ...(m.partial ? { backgroundImage: HATCH_GOLD } : {}),
                    }}
                  />
                )}
                <div
                  className={`min-w-0 flex-1 rounded-t ${m.partial ? '' : 'bg-cmd-series-2'}`}
                  style={{
                    maxWidth: BAR_CAP,
                    height: `${Math.max(m.expenses > 0 ? 2 : 0, (m.expenses / peak) * H)}px`,
                    ...(m.partial ? { backgroundImage: HATCH_NEUTRAL } : {}),
                  }}
                />
              </div>
            );
          })}
        </div>
        {/* The baseline the bars sit on, and the only rule this chart has:
            gridlines across five bars are furniture, not information. */}
        <div className="h-px bg-cmd-border" />

        {/* Direct labels under the axis rather than on the marks. The gold
            measures below 3:1 against a light page, and a visible label is the
            relief that makes that legible anyway. */}
        <div className="mt-2 flex">
          {months.map((m) => (
            <button
              key={m.month}
              type="button"
              onMouseEnter={() => setHovered(m.month)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(m.month)}
              onBlur={() => setHovered(null)}
              className="min-w-0 flex-1 px-0.5 text-center"
            >
              <span className={`block truncate text-[11px] ${hovered === m.month ? 'text-cmd-gold' : 'text-cmd-muted'}`}>
                {tick(m.month)}
              </span>
              <span className="mt-0.5 block truncate font-mono text-[11px] text-cmd-offwhite">
                {short(m.expenses)}
              </span>
              {showIncome && (
                <span className={`mt-0.5 block truncate font-mono text-[10px] ${
                  m.net < 0 ? 'text-red-400' : 'text-cmd-muted'
                }`}>
                  {m.net < 0 ? '−' : '+'}{short(Math.abs(m.net))}
                </span>
              )}
            </button>
          ))}
        </div>

        {showIncome && cashflow.monthsOverspent.length > 0 && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-red-300">
            <TrendingDown className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              More went out than came in in {cashflow.monthsOverspent.map((m) => m.label).join(', ')}.
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
