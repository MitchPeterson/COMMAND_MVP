// The dashboard's summary panels.
//
// A layout borrowed from a mockup: a strip of counts across the top, then the
// household's position, what is due, and how the policies stand — three things
// a person checks rather than reads.
//
// Everything here is presentation over data that already exists. One thing in
// the mockup is deliberately absent: a net worth trend line and a "+4.7% vs
// last month". Nothing snapshots net worth over time, so that figure could only
// be invented, and an invented trend on the first card of the page is the worst
// place to put one.

import React from 'react';
import {
  ChevronRight, CreditCard, FileText, Folder, Home, Landmark,
  Receipt, Scale, Shield, Users, Wallet,
} from 'lucide-react';
import type { Asset, CreditCard as CreditCardRow, FinanceAccount, InsurancePolicy, Loan, MortgageAccount, Document as StoredDocument, TimelineEvent } from '../lib/supabase';

const money = (value: number | null | undefined, compact = false): string =>
  value == null
    ? '—'
    : new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', maximumFractionDigits: 0,
      ...(compact ? { notation: 'compact', maximumFractionDigits: 2 } : {}),
    }).format(value);

// ── The strip of counts ───────────────────────────────────────────────────────

export interface OverviewStat {
  label: string;
  value: string;
  icon: React.ReactNode;
  section?: string;
  linkLabel?: string;
}

export function HouseholdOverview({ stats, onOpen }: {
  stats: OverviewStat[];
  onOpen?: (section: string) => void;
}) {
  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Household overview</p>
      <div className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`flex items-start gap-4 ${i > 0 ? 'xl:border-l xl:border-cmd-border xl:pl-6' : ''}`}
          >
            <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cmd-gold/40 text-cmd-gold">
              {stat.icon}
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-semibold leading-none text-cmd-offwhite">{stat.value}</p>
              <p className="mt-1.5 text-sm text-cmd-muted">{stat.label}</p>
              {stat.section && onOpen && (
                <button
                  type="button"
                  onClick={() => onOpen(stat.section!)}
                  className="mt-1 text-xs font-medium text-cmd-gold transition hover:opacity-80"
                >
                  {stat.linkLabel ?? 'View all'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Position ──────────────────────────────────────────────────────────────────

export interface PositionInput {
  accounts: FinanceAccount[];
  assets: Asset[];
  loans: Loan[];
  cards: CreditCardRow[];
  mortgage: MortgageAccount | null;
  statedNetWorth: number | null;
}

export function positionOf(input: PositionInput) {
  const assets = input.accounts.reduce((s, a) => s + (a.balance ?? 0), 0)
    + input.assets.reduce((s, a) => s + (a.current_value ?? 0), 0);
  const liabilities = (input.mortgage?.principal_balance ?? 0)
    + input.loans.filter((l) => l.status === 'active').reduce((s, l) => s + (l.current_balance ?? 0), 0)
    + input.cards.reduce((s, c) => s + (c.current_balance ?? 0), 0);
  return { assets, liabilities, net: assets - liabilities, stated: input.statedNetWorth };
}

/** The one inverted card on the page, which is what makes it read as the anchor. */
export function PositionCard({ position, onOpen }: {
  position: ReturnType<typeof positionOf>;
  onOpen?: () => void;
}) {
  const gap = position.stated != null ? position.stated - position.net : null;

  return (
    <section className="flex flex-col rounded-3xl border border-cmd-border bg-cmd-black p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">On file</p>
      <p className="mt-3 text-4xl font-semibold leading-none text-cmd-offwhite">{money(position.net)}</p>
      <p className="mt-2 text-sm text-cmd-muted">
        {gap == null
          ? 'Assets less debts, from what Command has read.'
          : gap > 0
            ? `${money(gap)} of your stated net worth is not on file yet.`
            : 'Everything you have stated is accounted for on file.'}
      </p>

      <dl className="mt-6 space-y-px overflow-hidden rounded-2xl border border-cmd-border">
        {[
          { label: 'Assets', value: position.assets },
          { label: 'Debts', value: position.liabilities },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between bg-cmd-charcoal px-4 py-3">
            <dt className="text-sm text-cmd-muted">{row.label}</dt>
            <dd className="font-mono text-sm text-cmd-offwhite">{money(row.value)}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between bg-cmd-charcoal px-4 py-3">
          <dt className="text-sm font-semibold text-cmd-gold">Net</dt>
          <dd className="font-mono text-sm font-semibold text-cmd-gold">{money(position.net)}</dd>
        </div>
      </dl>

      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="mt-5 inline-flex items-center gap-1.5 self-start text-sm font-medium text-cmd-gold transition hover:opacity-80"
        >
          View full breakdown <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </section>
  );
}

// ── What is due ───────────────────────────────────────────────────────────────

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function UpcomingTasks({ events, onOpen }: {
  events: TimelineEvent[];
  onOpen?: () => void;
}) {
  const today = new Date();
  const rows = events.slice(0, 5).map((event) => {
    const when = event.event_date ? new Date(`${event.event_date}T00:00:00Z`) : null;
    const days = when
      ? Math.round((when.getTime() - today.getTime()) / 86400000)
      : null;
    return { event, when, days };
  });

  return (
    <section className="flex flex-col rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Upcoming</p>
        {onOpen && (
          <button type="button" onClick={onOpen} className="text-xs font-medium text-cmd-gold transition hover:opacity-80">
            View all
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-cmd-border p-6 text-center text-sm text-cmd-muted">
          Nothing dated in the next 90 days.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-cmd-border">
          {rows.map(({ event, when, days }) => (
            <li key={event.id} className="flex items-center gap-4 py-3">
              <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-cmd-gold/25 bg-cmd-gold/5">
                <span className="text-[10px] font-semibold tracking-[0.08em] text-cmd-gold">
                  {when ? MONTHS[when.getUTCMonth()] : '—'}
                </span>
                <span className="text-sm font-semibold leading-none text-cmd-offwhite">
                  {when ? String(when.getUTCDate()).padStart(2, '0') : '--'}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-cmd-offwhite">{event.title}</p>
                <p className="text-xs text-cmd-muted">
                  {days == null ? 'No date recorded'
                    : days < 0 ? `${Math.abs(days)} days ago`
                      : days === 0 ? 'Today'
                        : `Due in ${days} day${days === 1 ? '' : 's'}`}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-cmd-muted" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── How the policies stand ────────────────────────────────────────────────────

export interface PolicyStanding {
  upToDate: number;
  expiringSoon: number;
  needsReview: number;
}

/** Hand-drawn rather than charted: one ring is not worth a charting library. */
function Donut({ standing, total }: { standing: PolicyStanding; total: number }) {
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const segments = [
    { value: standing.upToDate, className: 'text-cmd-gold' },
    { value: standing.expiringSoon, className: 'text-cmd-gold/45' },
    { value: standing.needsReview, className: 'text-cmd-border' },
  ];

  let offset = 0;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" strokeWidth="16" className="stroke-cmd-black" />
        {total > 0 && segments.map((segment, i) => {
          const length = (segment.value / total) * circumference;
          const dash = `${length} ${circumference - length}`;
          const node = (
            <circle
              key={i}
              cx="70" cy="70" r={r} fill="none" strokeWidth="16"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              className={`stroke-current ${segment.className}`}
            />
          );
          offset += length;
          return node;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-cmd-offwhite">{total}</span>
        <span className="text-[10px] uppercase tracking-[0.16em] text-cmd-muted">Policies</span>
      </div>
    </div>
  );
}

export function PolicyReview({ standing, onOpen }: {
  standing: PolicyStanding;
  onOpen?: () => void;
}) {
  const total = standing.upToDate + standing.expiringSoon + standing.needsReview;
  const legend = [
    { label: 'Up to date', value: standing.upToDate, dot: 'bg-cmd-gold' },
    { label: 'Renewing soon', value: standing.expiringSoon, dot: 'bg-cmd-gold/45' },
    { label: 'Waiting on review', value: standing.needsReview, dot: 'bg-cmd-border' },
  ];

  return (
    <section className="flex flex-col rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Policies</p>
        {onOpen && (
          <button type="button" onClick={onOpen} className="text-xs font-medium text-cmd-gold transition hover:opacity-80">
            View all
          </button>
        )}
      </div>

      {total === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-cmd-border p-6 text-center text-sm text-cmd-muted">
          No policies on file yet.
        </p>
      ) : (
        <>
          <div className="mt-5 flex items-center gap-6">
            <Donut standing={standing} total={total} />
            <ul className="min-w-0 flex-1 space-y-2.5">
              {legend.map((row) => (
                <li key={row.label} className="flex items-center gap-2.5 text-sm">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${row.dot}`} />
                  <span className="min-w-0 flex-1 truncate text-cmd-muted">{row.label}</span>
                  <span className="font-mono text-cmd-offwhite">{row.value}</span>
                </li>
              ))}
            </ul>
          </div>
          {onOpen && (
            <button
              type="button"
              onClick={onOpen}
              className="mt-6 w-full rounded-xl bg-cmd-gold px-4 py-2.5 text-sm font-semibold text-cmd-black transition hover:bg-cmd-gold-hover"
            >
              Review policies
            </button>
          )}
        </>
      )}
    </section>
  );
}

// ── What has come in ──────────────────────────────────────────────────────────

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  insurance: <Shield className="h-4 w-4" />,
  legal: <Scale className="h-4 w-4" />,
  credit: <CreditCard className="h-4 w-4" />,
  finance: <Wallet className="h-4 w-4" />,
  tax: <Receipt className="h-4 w-4" />,
  home: <Home className="h-4 w-4" />,
  family: <Users className="h-4 w-4" />,
  mortgage: <Landmark className="h-4 w-4" />,
};

export function RecentDocuments({ documents, onOpen }: {
  documents: StoredDocument[];
  onOpen?: () => void;
}) {
  const rows = [...documents]
    .sort((a, b) => (b.uploaded_at ?? '').localeCompare(a.uploaded_at ?? ''))
    .slice(0, 4);

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Recently read</p>
        {onOpen && (
          <button type="button" onClick={onOpen} className="text-xs font-medium text-cmd-gold transition hover:opacity-80">
            View all
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-cmd-border p-6 text-center text-sm text-cmd-muted">
          Nothing uploaded yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-cmd-border">
          {rows.map((doc) => (
            <li key={doc.id} className="flex items-center gap-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cmd-border bg-cmd-black/60 text-cmd-gold">
                {CATEGORY_ICON[doc.category ?? ''] ?? <FileText className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-cmd-offwhite">{doc.name}</p>
                <p className="text-xs text-cmd-muted">
                  {doc.uploaded_at
                    ? `Read ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(doc.uploaded_at))}`
                    : 'Date not recorded'}
                </p>
              </div>
              {doc.category && (
                <span className="hidden shrink-0 rounded-full border border-cmd-border bg-cmd-black/60 px-2.5 py-1 text-[11px] capitalize text-cmd-muted sm:inline">
                  {doc.category}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export const overviewIcons = {
  policies: <Shield className="h-5 w-5" />,
  worth: <Wallet className="h-5 w-5" />,
  tasks: <Receipt className="h-5 w-5" />,
  documents: <Folder className="h-5 w-5" />,
};

export { money as dashboardMoney };
