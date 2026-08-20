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
  ChevronLeft, ChevronRight, CreditCard, FileText, Folder, Home, Landmark,
  Receipt, Scale, Shield, Users, Wallet,
} from 'lucide-react';
import type { Asset, CreditCard as CreditCardRow, FinanceAccount, Loan, MortgageAccount, Document as StoredDocument, TimelineEvent } from '../lib/supabase';

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
    <section className="anchor-card flex flex-col rounded-3xl border border-cmd-border bg-cmd-black p-6">
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

// ── One section at a time ─────────────────────────────────────────────────────
//
// Nine sections, one dashboard: only one of them can have real estate here. So
// the slot rotates. A different section leads on each visit, and the arrows
// move through the rest on demand, which surfaces breadth over time instead of
// showing insurance forever because it happened to be built first.
//
// The ring is the section's score rather than a count, so the same shape means
// the same thing everywhere — which is the point of every section returning the
// same result type.

export interface SpotlightSection {
  id: string;
  label: string;
  score: number | null;
  grade: string;
  status: 'good' | 'review' | 'action_needed' | 'unknown';
  findings: Array<{ severity: string; title: string; detail: string }>;
}

/**
 * The headline, derived from the findings shown beneath it rather than from the
 * status alone.
 *
 * A section can score well and still carry a finding — Legal graded B and said
 * "No action needed" directly above "No trust found in Command", which reads
 * as the card contradicting itself.
 */
function headlineFor(section: SpotlightSection): string {
  if (section.status === 'unknown') return 'Not enough on file to grade';
  const critical = section.findings.filter((f) => f.severity === 'critical').length;
  const attention = section.findings.filter((f) => f.severity === 'attention').length;
  if (critical > 0) return 'Needs attention';
  if (attention > 0) return 'Worth a look';
  if (section.findings.length > 0) return 'Nothing urgent';
  return 'No action needed';
}

/** The score as an arc. Hand-drawn: one ring is not worth a charting library. */
function ScoreRing({ score, grade }: { score: number | null; grade: string }) {
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const filled = ((score ?? 0) / 100) * circumference;

  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" strokeWidth="14" className="stroke-cmd-black" />
        {score != null && (
          <circle
            cx="70" cy="70" r={r} fill="none" strokeWidth="14" strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference - filled}`}
            className="stroke-cmd-gold"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold leading-none text-cmd-offwhite">{grade}</span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.16em] text-cmd-muted">
          {score == null ? 'Ungraded' : `${score} / 100`}
        </span>
      </div>
    </div>
  );
}

export function SectionSpotlight({ sections, index, onIndex, onOpen }: {
  sections: SpotlightSection[];
  index: number;
  onIndex: (next: number) => void;
  onOpen?: (section: string) => void;
}) {
  if (sections.length === 0) return null;
  const current = sections[Math.min(index, sections.length - 1)];
  const counts = {
    critical: current.findings.filter((f) => f.severity === 'critical').length,
    attention: current.findings.filter((f) => f.severity === 'attention').length,
  };
  const lead = current.findings.find((f) => f.severity === 'critical')
    ?? current.findings.find((f) => f.severity === 'attention')
    ?? current.findings[0]
    ?? null;

  const step = (delta: number) =>
    onIndex((index + delta + sections.length) % sections.length);

  return (
    <section className="flex flex-col rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">{current.label}</p>
        <div className="flex items-center gap-1">
          <button
            type="button" onClick={() => step(-1)} aria-label="Previous section"
            className="rounded-lg border border-cmd-border p-1 text-cmd-muted transition hover:border-cmd-gold hover:text-cmd-gold"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button" onClick={() => step(1)} aria-label="Next section"
            className="rounded-lg border border-cmd-border p-1 text-cmd-muted transition hover:border-cmd-gold hover:text-cmd-gold"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-6">
        <ScoreRing score={current.score} grade={current.grade} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-cmd-offwhite">{headlineFor(current)}</p>
          {lead ? (
            <p className="mt-2 text-sm leading-6 text-cmd-muted line-clamp-4">{lead.title}</p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-cmd-muted">Nothing flagged in this section.</p>
          )}
          {(counts.critical > 0 || counts.attention > 0) && (
            <p className="mt-3 text-xs text-cmd-muted">
              {[
                counts.critical > 0 ? `${counts.critical} critical` : null,
                counts.attention > 0 ? `${counts.attention} to look at` : null,
              ].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {onOpen && (
        <button
          type="button"
          onClick={() => onOpen(current.id)}
          className="mt-6 w-full rounded-xl bg-cmd-gold px-4 py-2.5 text-sm font-semibold text-cmd-black transition hover:bg-cmd-gold-hover"
        >
          Open {current.label}
        </button>
      )}

      {/* On demand, without hunting for the arrows. */}
      <div className="mt-4 flex items-center justify-center gap-1.5">
        {sections.map((section, i) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onIndex(i)}
            aria-label={`Show ${section.label}`}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'w-5 bg-cmd-gold' : 'w-1.5 bg-cmd-border hover:bg-cmd-border-hi'
            }`}
          />
        ))}
      </div>
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
  score: <Scale className="h-5 w-5" />,
  policies: <Shield className="h-5 w-5" />,
  worth: <Wallet className="h-5 w-5" />,
  tasks: <Receipt className="h-5 w-5" />,
  documents: <Folder className="h-5 w-5" />,
};

export { money as dashboardMoney };
