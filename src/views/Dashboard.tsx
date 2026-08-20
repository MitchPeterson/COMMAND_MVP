import React, { useEffect, useMemo, useState } from 'react';
import { useHousehold } from '../useHousehold';
import { UploadDropzone } from '../components/UploadDropzone';
import { DocumentExtractionReview } from '../components/DocumentExtractionReview';
import { uploadDocumentAsset, invokeDocumentExtraction } from '../lib/supabase';
import { computeCoverageHealth } from '../lib/coverageHealth';
import { computeLegalHealth } from '../lib/legalHealth';
import { computeCreditHealth } from '../lib/creditHealth';
import { computeHomeHealth } from '../lib/homeHealth';
import { computeFamilyHealth } from '../lib/familyHealth';
import { computeTaxHealth } from '../lib/taxHealth';
import { computeFinancesHealth } from '../lib/financesHealth';
import {
  selectFirstInsight, insightSources, shouldShowFirstInsight,
  isInsightDismissed, dismissInsight,
} from '../lib/firstInsight';
import { FirstInsight } from '../components/FirstInsight';
import { WeeklyBrief } from '../components/WeeklyBrief';
import { GettingStarted, type SetupStep } from '../components/GettingStarted';
import { FollowUps } from '../components/FollowUps';
import { collectFollowUps } from '../lib/followUps';
import { SECTION_INTROS, familiarityState } from '../lib/sectionIntros';
import { buildDigest, readSnapshot, writeSnapshot, isDigestDue, type DigestInput } from '../lib/digest';
import { taxDeadlines } from '../lib/taxYear';
import { buildPriorityActions, type RankedAction, type RankedSeverity } from '../lib/priorityActions';
import {
  Shield,
  FileText,
  Home,
  Wallet,
  Receipt,
  Users,
  CreditCard,
  Calendar,
  Clock,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import {
  HouseholdOverview, PositionCard, UpcomingTasks, SectionSpotlight, RecentDocuments,
  positionOf, overviewIcons, dashboardMoney, type SpotlightSection,
} from '../components/DashboardPanels';

const severityOrder = ['critical', 'high', 'medium', 'low'] as const;
const severityLabels = {
  critical: { label: 'Critical', accent: 'bg-red-500/10 text-red-300 border-red-500/20' },
  high: { label: 'High', accent: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' },
  medium: { label: 'Review', accent: 'bg-slate-500/10 text-slate-300 border-slate-500/20' },
  low: { label: 'Low', accent: 'bg-slate-700/10 text-slate-300 border-slate-700/20' },
};

// section_scores rows were written at onboarding under keys that never quite
// matched the views: "tax" against a Taxes page, "healthcare" against Health.
// The mismatch was invisible for a while because it only degraded — the label
// fell back to the raw key, the icon fell back to a generic document, and the
// live scorer keyed on "taxes" silently failed to override the stored row, so
// the dashboard reported a section as untouched while its own page graded it.
// Normalize on read; the stored rows are left alone.
const SECTION_ALIASES: Record<string, string> = {
  tax: 'taxes',
  healthcare: 'health',
  insurances: 'insurance',
  finance: 'finances',
  legal_documents: 'legal',
};

function canonicalSection(section: string): string {
  const key = (section ?? '').trim().toLowerCase();
  return SECTION_ALIASES[key] ?? key;
}

const sectionLabels: Record<string, string> = {
  insurance: 'Insurance',
  legal: 'Legal',
  credit: 'Credit',
  home: 'Home',
  taxes: 'Taxes',
  finances: 'Finances',
  family: 'Family',
};

// The sections that exist. A stored row for anything else — 'advisory' and
// 'healthcare' were seeded for every household — is dropped rather than listed,
// because a row on this page is a promise there is a section behind it.
const REAL_SECTIONS = new Set([
  'insurance', 'legal', 'credit', 'home', 'finances', 'taxes', 'family',
]);

const sectionIcons: Record<string, React.ElementType> = {
  insurance: Shield,
  legal: FileText,
  home: Home,
  finances: Wallet,
  taxes: Receipt,
  family: Users,
  credit: CreditCard,
};

function formatDateLabel(dateString?: string | null) {
  if (!dateString) return 'No date';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function formatTimelineDate(dateString?: string | null) {
  if (!dateString) return 'TBD';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function formatScore(score: number | null | undefined) {
  if (score == null) return '--';
  return String(Math.round(score));
}

function getScoreState(score: number | null | undefined) {
  if (score == null) return { label: 'No score', className: 'text-cmd-muted', borderClass: 'border-cmd-border' };
  if (score < 60) return { label: 'Needs attention', className: 'text-red-400', borderClass: 'border-red-500' };
  if (score < 75) return { label: 'At risk', className: 'text-cmd-gold', borderClass: 'border-cmd-gold' };
  return { label: 'On track', className: 'text-emerald-400', borderClass: 'border-emerald-500' };
}

interface DashboardProps {
  /** `focusId` deep-links to one record inside the section, not just the page. */
  onNavigate?: (view: string, focusId?: string) => void;
  /** Increments when the header asks for the brief. */
  openBrief?: number;
  /** Holds the weekly appearance back while another dialog is showing. */
  deferAuto?: boolean;
}

export function DashboardView({ onNavigate, openBrief = 0, deferAuto = false }: DashboardProps) {
  const { data, refresh } = useHousehold();

  // Insurance is scored live from the policies and extracted documents on file,
  // so it reflects what the household actually has rather than a value frozen at
  // onboarding. The stored row is overridden when a live score is available.
  const coverage = useMemo(
    () => computeCoverageHealth(data?.insurancePolicies ?? [], data?.insuranceExtractions ?? [], data?.profile),
    [data?.insurancePolicies, data?.insuranceExtractions, data?.profile],
  );

  const legal = useMemo(
    () =>
      computeLegalHealth(
        data?.legalExtractions ?? [],
        data?.legalDocuments ?? [],
        data?.profile,
        data?.familyMembers ?? [],
        data?.assets ?? [],
      ),
    [data?.legalExtractions, data?.legalDocuments, data?.profile, data?.familyMembers, data?.assets],
  );

  const credit = useMemo(
    () => computeCreditHealth(data?.creditCards ?? [], data?.profile),
    [data?.creditCards, data?.profile],
  );

  const home = useMemo(
    () => computeHomeHealth(
      (data?.homeSystems ?? []) as never,
      data?.profile,
      data?.mortgage?.principal_balance ?? null,
    ),
    [data?.homeSystems, data?.profile, data?.mortgage],
  );

  const family = useMemo(
    () => computeFamilyHealth(
      data?.familyMembers ?? [], data?.profile, data?.insurancePolicies ?? [],
      data?.mortgage ?? null, data?.legalDocuments ?? [],
    ),
    [data?.familyMembers, data?.profile, data?.insurancePolicies, data?.mortgage, data?.legalDocuments],
  );

  const taxes = useMemo(
    () => computeTaxHealth(
      data?.taxDocuments ?? [], data?.profile, data?.familyMembers ?? [],
      data?.mortgageStatements ?? [], data?.financeAccounts ?? [], data?.legalDocuments ?? [],
      data?.taxReturns ?? [], data?.deductionLog ?? [],
    ),
    [data?.taxDocuments, data?.profile, data?.familyMembers,
      data?.mortgageStatements, data?.financeAccounts, data?.legalDocuments,
      data?.taxReturns, data?.deductionLog],
  );

  const finances = useMemo(
    () => computeFinancesHealth(
      data?.financeAccounts ?? [], data?.loans ?? [], data?.creditCards ?? [],
      data?.mortgage ?? null, data?.assets ?? [], data?.budgetSummary ?? null, data?.profile,
      data?.creditTransactions ?? [],
    ),
    [data?.financeAccounts, data?.loans, data?.creditCards, data?.mortgage,
      data?.assets, data?.budgetSummary, data?.profile, data?.creditTransactions],
  );

  // Selected from findings the scorers above already produced — no second
  // analysis, just the one worth leading with while a household is new.
  const [insightDismissed, setInsightDismissed] = useState(false);
  const firstInsight = useMemo(() => {
    const documentCount = (data?.documents ?? []).length;
    const confirmedRecords =
      (data?.insurancePolicies ?? []).length + (data?.legalDocuments ?? []).length +
      (data?.creditCards ?? []).length + (data?.financeAccounts ?? []).length;
    if (!shouldShowFirstInsight(documentCount, confirmedRecords)) return null;
    const pick = selectFirstInsight(insightSources({ coverage, finances, family, legal }));
    if (!pick || isInsightDismissed(pick.title)) return null;
    return pick;
  }, [data?.documents, data?.insurancePolicies, data?.legalDocuments, data?.creditCards,
    data?.financeAccounts, coverage, finances, family, legal]);

  // ── Getting started ─────────────────────────────────────────────────────
  // A summary of nothing is a zero beside seven zeros, which reads as failure
  // rather than as a beginning. While the household is new the dashboard is a
  // setup guide instead, and becomes the summary once there is something to
  // summarize.
  const setupSteps = useMemo<SetupStep[]>(() => {
    const started: Record<string, boolean> = {
      insurance: familiarityState((data?.insurancePolicies ?? []).length, (data?.insuranceExtractions ?? []).length) === 'started',
      legal: familiarityState((data?.legalDocuments ?? []).length, (data?.legalExtractions ?? []).length) === 'started',
      credit: familiarityState((data?.creditCards ?? []).length, (data?.creditStatements ?? []).length) === 'started',
      home: familiarityState((data?.homeSystems ?? []).length, data?.mortgage ? 1 : 0) === 'started',
      finances: familiarityState((data?.financeAccounts ?? []).length, (data?.loans ?? []).length) === 'started',
      taxes: familiarityState((data?.taxReturns ?? []).length, (data?.taxDocuments ?? []).length) === 'started',
      family: familiarityState((data?.familyMembers ?? []).length) === 'started',
    };
    return Object.values(SECTION_INTROS)
      .filter((intro) => intro.section in started)
      .sort((a, b) => a.order - b.order)
      .map((intro) => ({ ...intro, done: started[intro.section] }));
  }, [data?.insurancePolicies, data?.insuranceExtractions, data?.legalDocuments, data?.legalExtractions,
    data?.creditCards, data?.creditStatements, data?.homeSystems, data?.mortgage,
    data?.financeAccounts, data?.loans, data?.taxReturns, data?.taxDocuments, data?.familyMembers]);

  // Three of seven is the point where a summary starts being worth more than a
  // guide — enough sections have something that the scores mean something.
  const stillSettingUp = setupSteps.filter((s) => s.done).length < 3;

  // Questions the documents raised about sections other than their own. The
  // extractor has recorded the names and vehicles on every policy since August
  // and nothing has ever compared them to the household.
  const followUps = useMemo(
    () => collectFollowUps(
      data?.insuranceExtractions ?? [], data?.familyMembers ?? [], data?.assets ?? [],
    ),
    [data?.insuranceExtractions, data?.familyMembers, data?.assets],
  );

  // ── The brief ───────────────────────────────────────────────────────────
  // Assembled here because this is where all seven assessments already exist.
  // Computing them again in App would be a second opinion waiting to disagree.
  const digestSections = useMemo<DigestInput[]>(() => ([
    { section: 'insurance', label: 'Insurance', score: coverage.score, findings: coverage.findings },
    { section: 'legal', label: 'Legal', score: legal.score, findings: legal.findings },
    { section: 'credit', label: 'Credit', score: credit.score, findings: credit.findings },
    { section: 'home', label: 'Home', score: home.score, findings: home.findings },
    { section: 'family', label: 'Family', score: family.score, findings: family.findings },
    { section: 'taxes', label: 'Taxes', score: taxes.score, findings: taxes.findings },
    { section: 'finances', label: 'Finances', score: finances.score, findings: finances.findings },
  ]), [coverage, legal, credit, home, family, taxes, finances]);

  const [briefOpen, setBriefOpen] = useState(false);
  const [snapshot] = useState(() => readSnapshot());

  // Opens itself once a week, and whenever the header asks.
  useEffect(() => {
    if (!deferAuto && isDigestDue(snapshot)) setBriefOpen(true);
  }, [snapshot, deferAuto]);
  useEffect(() => {
    if (openBrief > 0) setBriefOpen(true);
  }, [openBrief]);

  const digest = useMemo(() => {
    // Deadlines the Tax section already computes, plus anything the household's
    // own timeline is carrying. Both are existing data; neither is recalculated.
    const fromTax = taxDeadlines().map((d) => ({ date: d.date, label: d.label, detail: d.detail, daysAway: 0 }));
    const fromTimeline = (data?.timelineEvents ?? [])
      .filter((e) => !e.completed && e.event_date)
      .map((e) => ({ date: e.event_date as string, label: e.title, detail: e.notes ?? '', daysAway: 0 }));
    const seen = new Set<string>();
    const deadlines = [...fromTimeline, ...fromTax].filter((d) => {
      const key = `${d.date}|${d.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return buildDigest(digestSections, deadlines, snapshot);
  }, [digestSections, snapshot, data?.timelineEvents]);

  // Reading it is what marks it read, so it does not reappear next login.
  const closeBrief = () => { writeSnapshot(digestSections); setBriefOpen(false); };

  // Any section with a live score overrides its stored row. The stored rows were
  // written once at onboarding and never recalculated, so without this an upload
  // changes the section page and leaves the dashboard telling the old story.
  // The summary layer the new layout leads with. All of it is data the page
  // already loads; none of it is a new query.
  const position = useMemo(() => positionOf({
    accounts: data?.financeAccounts ?? [],
    assets: data?.assets ?? [],
    loans: data?.loans ?? [],
    cards: data?.creditCards ?? [],
    mortgage: data?.mortgage ?? null,
    statedNetWorth: data?.profile?.net_worth ?? null,
  }), [data?.financeAccounts, data?.assets, data?.loans, data?.creditCards, data?.mortgage, data?.profile?.net_worth]);

  // Every section returns the same result type, which is what lets one card
  // stand in for any of them.
  const spotlight = useMemo<SpotlightSection[]>(() => ([
    { id: 'insurance', label: 'Insurance', ...coverage },
    { id: 'legal', label: 'Legal', ...legal },
    { id: 'finances', label: 'Finances', ...finances },
    { id: 'credit', label: 'Credit', ...credit },
    { id: 'home', label: 'Home', ...home },
    { id: 'taxes', label: 'Taxes', ...taxes },
    { id: 'family', label: 'Family', ...family },
  ].map((s) => ({
    id: s.id, label: s.label, score: s.score, grade: s.grade, status: s.status,
    findings: s.findings as SpotlightSection['findings'],
  }))
    // An empty section has no grade worth rotating to, and a household still
    // filling things in should not page through five cards saying "ungraded".
    .filter((s) => s.score != null || s.findings.length > 0)),
  [coverage, legal, finances, credit, home, taxes, family]);

  // A different section leads each visit. Stored rather than random so a
  // reload does not reshuffle the page under someone mid-read.
  const [spotlightIndex, setSpotlightIndex] = useState(() => {
    const seen = Number(localStorage.getItem('command:spotlight') ?? '0');
    const next = Number.isFinite(seen) ? (seen + 1) % 7 : 0;
    localStorage.setItem('command:spotlight', String(next));
    return next;
  });

  const liveScores = useMemo(() => {
    const live: Record<string, { score: number; status: string; summary: string }> = {};
    if (coverage.score !== null) {
      live.insurance = {
        score: coverage.score,
        status: coverage.status,
        summary:
          coverage.findings.length === 0
            ? 'No inconsistencies found across the policies on file.'
            : coverage.findings[0].title,
      };
    }
    if (legal.score !== null) {
      live.legal = {
        score: legal.score,
        status: legal.status,
        summary:
          legal.findings.length === 0
            ? 'Nothing outstanding against the documents on file.'
            : legal.findings[0].title,
      };
    }
    if (credit.score !== null) {
      live.credit = {
        score: credit.score,
        status: credit.status,
        summary:
          credit.findings.length === 0
            ? 'Nothing outstanding across the cards on file.'
            : credit.findings[0].title,
      };
    }
    if (home.score !== null) {
      live.home = {
        score: home.score,
        status: home.status,
        summary:
          home.findings.length === 0
            ? 'Nothing on file is near the end of its service life.'
            : home.findings[0].title,
      };
    }
    if (family.score !== null) {
      live.family = {
        score: family.score,
        status: family.status,
        summary: family.findings.length === 0
          ? 'Nothing outstanding against what is on file.'
          : family.findings[0].title,
      };
    }
    if (taxes.score !== null) {
      live.taxes = {
        score: taxes.score,
        status: taxes.status,
        summary: taxes.findings.length === 0
          ? 'Nothing outstanding and no deadline close.'
          : taxes.findings[0].title,
      };
    }
    if (finances.score !== null) {
      live.finances = {
        score: finances.score,
        status: finances.status,
        summary: finances.findings.length === 0
          ? 'Nothing outstanding against the accounts and debts on file.'
          : finances.findings[0].title,
      };
    }
    return live;
  }, [coverage, legal, credit, home, family, taxes, finances]);

  const sectionScores = useMemo(() => {
    const rows = (data?.sectionScores ?? []).map((section) => {
      const key = canonicalSection(section.section);
      const live = liveScores[key];
      return live
        ? { ...section, section: key, score: live.score, status: live.status as typeof section.status, summary: live.summary }
        : { ...section, section: key };
    });

    // Two rows can normalize onto the same section — an old "tax" row alongside
    // a newer "taxes" one. Showing both would put the same section on the page
    // twice with different scores, so the live-scored row wins, then the one
    // that actually has something in it.
    const byKey = new Map<string, typeof rows[number]>();
    for (const row of rows) {
      const existing = byKey.get(row.section);
      if (!existing) { byKey.set(row.section, row); continue; }
      const rowIsLive = Boolean(liveScores[row.section]);
      const keep = rowIsLive || row.score > existing.score ? row : existing;
      byKey.set(row.section, keep);
    }
    // Anything without a section behind it never reaches the page, so it also
    // never reaches the household score below.
    const deduped = [...byKey.values()].filter((row) => REAL_SECTIONS.has(row.section));
    // A zero means nothing has been put into that section, not that it is
    // failing. Ranking those first put the sections with the least information
    // at the top of the page, which is the opposite of useful.
    return deduped.sort((a, b) => {
      const aStarted = a.score > 0;
      const bStarted = b.score > 0;
      if (aStarted !== bStarted) return aStarted ? -1 : 1;
      return a.score - b.score;
    });
  }, [data?.sectionScores, liveScores]);

  const startedSections = useMemo(() => sectionScores.filter((s) => s.score > 0), [sectionScores]);

  // Anything a document produced that is still waiting on the user. This is the
  // dashboard's answer to "I just uploaded something — where did it go?".
  const awaitingReview = useMemo(() => {
    const legalPending = (data?.legalExtractions ?? []).filter((e) => e.review_status === 'pending_review');
    const legalPartial = (data?.legalExtractions ?? []).filter((e) => e.review_status === 'partially_confirmed');
    const insurancePending = (data?.insuranceExtractions ?? []).filter((e) => e.review_status === 'pending_review');
    const creditPending = (data?.creditStatements ?? []).filter(
      (s) => s.review_status === 'pending_review' || s.review_status === 'partially_confirmed',
    );
    const homePending = [
      ...(data?.mortgageStatements ?? []).filter((s) => s.review_status === 'pending_review'),
      ...(data?.applianceExtractions ?? []).filter((a) => a.review_status === 'pending_review'),
    ];
    const processing = (data?.documents ?? []).filter((d) => d.status === 'uploaded');
    const failed = (data?.documents ?? []).filter((d) => d.status === 'error');
    return { legalPending, legalPartial, insurancePending, creditPending, homePending, processing, failed };
  }, [data?.legalExtractions, data?.insuranceExtractions, data?.creditStatements,
    data?.mortgageStatements, data?.applianceExtractions, data?.documents]);

  // Two honest answers to one question, because averaging an untouched section
  // as a zero says the household is failing when it has simply not started. A
  // half-built profile scoring 13 is discouraging and wrong; a half-built
  // profile scoring 78 across what exists, with four sections still empty, is
  // both true and useful. Neither number is hidden.
  // Whole numbers. A household score is not precise to a tenth and pretending
  // otherwise reads as false accuracy.
  const average = (rows: typeof sectionScores) =>
    rows.length === 0 ? null : Math.round(rows.reduce((sum, s) => sum + s.score, 0) / rows.length);

  const startedScore = useMemo(() => average(startedSections), [startedSections]);
  const fullScore = useMemo(() => average(sectionScores), [sectionScores]);

  const [scoreMode, setScoreMode] = useState<'started' | 'all'>(() => {
    try {
      return window.localStorage.getItem('command:score-mode') === 'all' ? 'all' : 'started';
    } catch {
      return 'started';
    }
  });

  const chooseScoreMode = (mode: 'started' | 'all') => {
    setScoreMode(mode);
    try {
      window.localStorage.setItem('command:score-mode', mode);
    } catch {
      // Preference only. Losing it costs nothing.
    }
  };

  const untouched = sectionScores.length - startedSections.length;
  const healthScore =
    scoreMode === 'all'
      ? fullScore ?? data?.household?.health_score ?? null
      : startedScore ?? data?.household?.health_score ?? null;

  // Ranked, not merely listed: the stored rows are onboarding-era and the live
  // findings know what is true now, so they are merged and ordered by impact.
  const rankedActions = useMemo(
    () => buildPriorityActions(data?.priorityActions ?? [], coverage, legal),
    [data?.priorityActions, coverage, legal],
  );

  // Only the top of the list gets read. Showing forty items is the same as
  // showing none.
  const TOP_ACTIONS = 6;
  const topActions = rankedActions.slice(0, TOP_ACTIONS);
  const remainingActions = rankedActions.length - topActions.length;

  const groupedPriorities = useMemo(() => {
    const groups: Record<string, RankedAction[]> = { critical: [], high: [], medium: [], low: [] };
    topActions.forEach((item) => { groups[item.severity]?.push(item); });
    return groups;
  }, [topActions]);

  const timelineEvents = useMemo(() => {
    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 90);

    return (data?.timelineEvents ?? [])
      .filter((event) => {
        if (!event.event_date) return false;
        const eventDate = new Date(event.event_date);
        return !Number.isNaN(eventDate.getTime()) && eventDate >= today && eventDate <= maxDate;
      })
      .sort((a, b) => {
        const aDate = new Date(a.event_date ?? '');
        const bDate = new Date(b.event_date ?? '');
        return aDate.getTime() - bDate.getTime();
      });
  }, [data?.timelineEvents]);

  const scoreState = getScoreState(healthScore);
  const openPriorityCount = rankedActions.length;

  // Zeroes across the board are discouraging rather than informative, so the
  // strip waits until at least one of its four numbers means something.
  const hasSomethingToSummarize =
    (data?.documents ?? []).length > 0
    || position.assets > 0
    || timelineEvents.length > 0
    || healthScore != null;

  return (
    <div className="space-y-6">
      {/* Above the grid, full width, and the only loud thing on the page while it
          is here. A callout competing with three other cards is not a callout. */}
      {briefOpen && (
        <WeeklyBrief
          digest={digest}
          onOpenSection={(section) => { closeBrief(); onNavigate?.(section); }}
          onClose={closeBrief}
        />
      )}

      <FollowUps followUps={followUps} onOpen={(section, prefill) => onNavigate?.(section, prefill)} />

      {/* The guide used to return instead of the dashboard, so a household with
          two sections filled in saw none of what it had already put in. It sits
          above the summary now, and every card below hides itself when it has
          nothing to say — the complexity builds up rather than switching on. */}
      {stillSettingUp && (
        <GettingStarted
          steps={setupSteps}
          userName={data?.profile?.primary_first_name ?? data?.profile?.primary_name ?? null}
          onOpen={(section) => onNavigate?.(section)}
        />
      )}

      {!stillSettingUp && firstInsight && !insightDismissed && (
        <FirstInsight
          insight={firstInsight}
          onOpen={(section) => onNavigate?.(section)}
          onDismiss={() => { dismissInsight(firstInsight.title); setInsightDismissed(true); }}
        />
      )}

      {/* The summary layer: counts, then position, what is due and how the
          policies stand. Checked rather than read, so it leads. */}
      {hasSomethingToSummarize && (
      <HouseholdOverview
        onOpen={(section) => onNavigate?.(section)}
        stats={[
          {
            label: healthScore == null ? 'Not enough on file to grade' : `Household score · ${scoreState.label}`,
            value: healthScore == null ? '--' : String(healthScore),
            icon: overviewIcons.score, section: undefined,
          },
          {
            label: 'Net worth on file', value: dashboardMoney(position.net, true),
            icon: overviewIcons.worth, section: 'finances', linkLabel: 'View details',
          },
          {
            label: 'Dated in the next 90 days', value: String(timelineEvents.length),
            icon: overviewIcons.tasks, section: 'family', linkLabel: 'View dates',
          },
          {
            label: 'Documents read', value: String((data?.documents ?? []).length),
            icon: overviewIcons.documents, section: 'documents',
          },
        ]}
      />
      )}

      {(position.assets > 0 || timelineEvents.length > 0 || spotlight.length > 0) && (
      <div className="grid min-w-0 gap-6 xl:grid-cols-3">
        {position.assets > 0 && <PositionCard position={position} onOpen={() => onNavigate?.('finances')} />}
        {timelineEvents.length > 0 && <UpcomingTasks events={timelineEvents} onOpen={() => onNavigate?.('family')} />}
        <SectionSpotlight
          sections={spotlight}
          index={spotlightIndex}
          onIndex={setSpotlightIndex}
          onOpen={(section) => onNavigate?.(section)}
        />
      </div>
      )}

      {(data?.documents ?? []).length > 0 && (
        <RecentDocuments documents={data?.documents ?? []} onOpen={() => onNavigate?.('documents')} />
      )}

      {!stillSettingUp && (
      <>
      {/* min-w-0 on both tracks: a grid child defaults to min-width:auto, so a
          single long document title stretched the left column past its fraction
          and pushed Priority Actions off the side of the page. */}
      <div className="grid min-w-0 gap-6 xl:grid-cols-[1.4fr_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-8 shadow-sm shadow-black/10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Household Health Score</div>
                <div className="mt-4 flex items-end gap-6">
                  <span className="text-[80px] font-bold leading-none font-mono text-cmd-offwhite">
                    {healthScore ?? '--'}
                  </span>
                  <div className="min-w-0 space-y-2">
                    <div className={`text-sm font-semibold uppercase tracking-[0.2em] ${scoreState.className}`}>
                      {scoreState.label}
                    </div>
                    <div className="max-w-md text-sm text-cmd-muted">
                      {healthScore == null
                        ? 'No health score data available yet.'
                        : scoreMode === 'started'
                          ? `${startedSections.length} section${startedSections.length === 1 ? '' : 's'} you have started • ${openPriorityCount} open action${openPriorityCount === 1 ? '' : 's'}`
                          : `all ${sectionScores.length} sections • ${openPriorityCount} open action${openPriorityCount === 1 ? '' : 's'}`}
                    </div>
                    {untouched > 0 && (
                      <div className="text-xs text-cmd-muted/70">
                        {scoreMode === 'started'
                          ? `${untouched} section${untouched === 1 ? '' : 's'} not started yet — counting ${untouched === 1 ? 'it' : 'them'} would read ${fullScore ?? '--'}.`
                          : `Counting ${untouched} section${untouched === 1 ? '' : 's'} you have not started. What you have built reads ${startedScore ?? '--'}.`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                <div className="inline-flex rounded-2xl border border-cmd-border bg-cmd-black/50 p-1">
                  {([
                    { mode: 'started' as const, label: 'What you have built' },
                    { mode: 'all' as const, label: 'Full picture' },
                  ]).map((option) => (
                    <button
                      key={option.mode}
                      type="button"
                      onClick={() => chooseScoreMode(option.mode)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                        scoreMode === option.mode
                          ? 'bg-cmd-gold/15 text-cmd-gold'
                          : 'text-cmd-muted hover:text-cmd-offwhite'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {['60', '70', '80', '90', '100'].map((label) => (
                    <div
                      key={label}
                      className={`h-1 w-10 rounded-full ${
                        Number(label) <= (healthScore ?? 0)
                          ? healthScore && healthScore < 60
                            ? 'bg-red-500'
                            : healthScore && healthScore < 75
                            ? 'bg-cmd-gold'
                            : 'bg-emerald-500'
                          : 'bg-cmd-border'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {(awaitingReview.legalPending.length > 0 ||
            awaitingReview.legalPartial.length > 0 ||
            awaitingReview.creditPending.length > 0 ||
            awaitingReview.homePending.length > 0 ||
            awaitingReview.insurancePending.length > 0 ||
            awaitingReview.processing.length > 0 ||
            awaitingReview.failed.length > 0) && (
            <section className="rounded-3xl border border-cmd-gold/25 bg-cmd-charcoal p-6">
              <div className="mb-4 flex items-center gap-3">
                <Clock className="h-5 w-5 text-cmd-gold" />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Waiting on you</p>
                  <h2 className="mt-1 text-xl font-semibold text-cmd-offwhite">Uploads to finish</h2>
                </div>
              </div>
              <div className="space-y-2">
                {awaitingReview.processing.length > 0 && (
                  <p className="rounded-2xl border border-cmd-border bg-cmd-black/40 px-4 py-3 text-sm text-cmd-muted">
                    {awaitingReview.processing.length} document{awaitingReview.processing.length === 1 ? ' is' : 's are'} still being read.
                  </p>
                )}
                {[...awaitingReview.legalPending, ...awaitingReview.legalPartial].map((extraction) => (
                  <button
                    key={extraction.id}
                    type="button"
                    onClick={() => onNavigate?.('legal', extraction.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-cmd-border bg-cmd-black/40 px-4 py-3 text-left text-sm text-cmd-offwhite transition hover:border-cmd-gold/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium" title={extraction.document_title ?? ''}>
                        {extraction.document_title || 'Untitled legal document'}
                      </span>
                      <span className="mt-0.5 block text-xs text-cmd-muted">
                        {extraction.review_status === 'partially_confirmed'
                          ? 'Some details are still waiting on you'
                          : 'Read and waiting for your review — nothing reaches your profile until you confirm'}
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-cmd-gold">
                      Review <ArrowRight className="h-3 w-3" />
                    </span>
                  </button>
                ))}
                {awaitingReview.creditPending.map((statement) => (
                  <button
                    key={statement.id}
                    type="button"
                    onClick={() => onNavigate?.('credit')}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-cmd-border bg-cmd-black/40 px-4 py-3 text-left text-sm text-cmd-offwhite transition hover:border-cmd-gold/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {statement.institution ?? 'Card'} statement
                        {statement.last_four ? ` ••••${statement.last_four}` : ''}
                      </span>
                      <span className="mt-0.5 block text-xs text-cmd-muted">
                        Read and waiting for your review — no card is added or changed until you confirm
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-cmd-gold">
                      Review <ArrowRight className="h-3 w-3" />
                    </span>
                  </button>
                ))}
                {awaitingReview.homePending.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onNavigate?.('home')}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-cmd-border bg-cmd-black/40 px-4 py-3 text-left text-sm text-cmd-offwhite transition hover:border-cmd-gold/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {awaitingReview.homePending.length} home document
                        {awaitingReview.homePending.length === 1 ? '' : 's'} read
                      </span>
                      <span className="mt-0.5 block text-xs text-cmd-muted">
                        Mortgage figures and warranties waiting for your confirmation
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-cmd-gold">
                      Review <ArrowRight className="h-3 w-3" />
                    </span>
                  </button>
                )}
                {awaitingReview.insurancePending.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onNavigate?.('insurance')}
                    className="w-full rounded-2xl border border-cmd-border bg-cmd-black/40 px-4 py-3 text-left text-sm text-cmd-offwhite transition hover:border-cmd-gold/40"
                  >
                    {awaitingReview.insurancePending.length} insurance document{awaitingReview.insurancePending.length === 1 ? '' : 's'} waiting for your review.
                  </button>
                )}
                {awaitingReview.failed.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onNavigate?.('documents')}
                    className="w-full rounded-2xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-left text-sm text-red-200 transition hover:border-red-500/40"
                  >
                    {awaitingReview.failed.length} document{awaitingReview.failed.length === 1 ? '' : 's'} could not be read. The originals are safe — retry from the vault.
                  </button>
                )}
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Section status</p>
                <h2 className="mt-3 text-2xl font-semibold text-cmd-offwhite">Ranked by score</h2>
              </div>
              <span className="rounded-full border border-cmd-border bg-cmd-black/60 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cmd-muted">
                {sectionScores.length} sections
              </span>
            </div>
            {sectionScores.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
                No section scores available yet.
              </div>
            ) : (
              <div className="space-y-3">
                {sectionScores.map((section) => {
                  const Icon = sectionIcons[section.section] ?? FileText;
                  const routable = Boolean(onNavigate) && REAL_SECTIONS.has(section.section);
                  const isCritical = section.status === 'action_needed';
                  const isWarning = section.status === 'review';
                  return (
                    <div
                      key={section.id}
                      role={routable ? 'button' : undefined}
                      tabIndex={routable ? 0 : undefined}
                      onClick={() => { if (routable) onNavigate?.(section.section); }}
                      onKeyDown={(e) => { if (routable && (e.key === 'Enter' || e.key === ' ')) onNavigate?.(section.section); }}
                      className={`flex flex-col gap-3 rounded-3xl border ${isCritical ? 'border-red-500/20' : 'border-cmd-border'} bg-cmd-black/40 p-4 xl:flex-row xl:items-center xl:justify-between ${routable ? 'cursor-pointer transition hover:border-cmd-gold/40' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-white/5 p-3 text-cmd-gold">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-cmd-offwhite">{sectionLabels[section.section] ?? section.section}</p>
                          <p className="mt-1 text-sm text-cmd-muted">
                            {section.score === 0
                              ? 'Nothing here yet. Add something and Command will start scoring it.'
                              : section.summary ?? 'No summary available'}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-sm">
                        <span className="font-mono text-base font-semibold text-cmd-offwhite">
                          {section.score > 0 ? formatScore(section.score) : '--'}
                        </span>
                        <span className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${
                          section.score === 0
                            ? 'bg-cmd-black/60 text-cmd-muted'
                            : isCritical
                            ? 'bg-red-500/10 text-red-300'
                            : isWarning
                            ? 'bg-cmd-gold/10 text-cmd-gold'
                            : 'bg-emerald-500/10 text-emerald-300'
                        }`}>
                          {section.score === 0 ? 'not started' : section.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Priority actions</p>
                <h2 className="mt-3 text-2xl font-semibold text-cmd-offwhite">Action items</h2>
              </div>
              <span className="rounded-full border border-cmd-border bg-cmd-black/60 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cmd-muted">
                {openPriorityCount} open
              </span>
            </div>
            {openPriorityCount === 0 ? (
              <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
                No active priority actions. Everything looks up to date.
              </div>
            ) : (
              <div className="space-y-4">
                {severityOrder.map((severity: RankedSeverity) => {
                  const items = groupedPriorities[severity] ?? [];
                  if (!items.length) return null;
                  const { label, accent } = severityLabels[severity];
                  return (
                    <div key={severity} className="space-y-3">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-cmd-muted">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${accent}`}>{label}</span>
                        <span>{items.length} item{items.length === 1 ? '' : 's'}</span>
                      </div>
                      <div className="space-y-3">
                        {items.map((item) => (
                          <div key={item.id} className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-4">
                            <div className="mb-3 flex items-start justify-between gap-4">
                              <div className="text-sm font-semibold text-cmd-offwhite">{item.title}</div>
                              {item.dueDate && (
                                <div className="shrink-0 font-mono text-xs uppercase tracking-[0.2em] text-cmd-muted">
                                  {formatDateLabel(item.dueDate)}
                                </div>
                              )}
                            </div>
                            <p className="text-sm leading-6 text-cmd-muted">{item.detail || 'No additional detail available.'}</p>
                            {item.attorneyReview && (
                              <p className="mt-2 text-xs text-cmd-gold">An attorney is the right person to answer this one.</p>
                            )}
                            {item.estimatedValue != null ? (
                              <div className="mt-4 flex items-center justify-between rounded-3xl bg-white/5 px-4 py-3 text-sm">
                                <span className="text-cmd-gold">Estimated value</span>
                                <span className="font-mono text-cmd-offwhite">${item.estimatedValue.toLocaleString()}</span>
                              </div>
                            ) : null}
                            {item.section && onNavigate && (
                              <button
                                type="button"
                                onClick={() => onNavigate(item.section as string)}
                                className="mt-3 inline-flex items-center gap-1 text-xs text-cmd-gold transition hover:underline"
                              >
                                Open {sectionLabels[item.section] ?? item.section} <ArrowRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {remainingActions > 0 && (
                  <p className="pt-1 text-xs text-cmd-muted/70">
                    {remainingActions} lower-priority item{remainingActions === 1 ? '' : 's'} not shown.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* The timeline that used to live here rendered the same events as
              Upcoming above, from the same array. Two copies of one list is
              not two features. */}
        </div>
      </div>
      </>
      )}

      {/* Demoted, as on every section page: uploading is a means to the summary
          above, not the thing a dashboard is for. */}
      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <UploadDropzone
          contextLabel="Global document upload"
          buttonLabel="Add a document"
          className="mb-6"
          onUpload={async (file) => {
            if (!data?.household?.id) return;
            const document = await uploadDocumentAsset(data.household.id, file, 'general');
            await invokeDocumentExtraction(document.id);
            await refresh();
          }}
        />
        <DocumentExtractionReview
          householdId={data?.household?.id ?? ''}
          extractions={(data?.documentExtractions ?? []).filter(
            // Insurance and legal documents are reviewed on their own pages against
            // the full extraction. Showing the compatibility row here too gave two
            // routes to confirm the same document, creating duplicates.
            (extraction) =>
              !(data?.insuranceExtractions ?? []).some(
                (insurance) => insurance.document_id === extraction.document_id,
              ) &&
              !(data?.legalExtractions ?? []).some(
                (legalExtraction) => legalExtraction.document_id === extraction.document_id,
              ) &&
              !(data?.creditStatements ?? []).some(
                (statement) => statement.document_id === extraction.document_id,
              ) &&
              !(data?.mortgageStatements ?? []).some(
                (statement) => statement.document_id === extraction.document_id,
              ) &&
              !(data?.applianceExtractions ?? []).some(
                (appliance) => appliance.document_id === extraction.document_id,
              ),
          )}
          onChange={refresh}
        />
      </section>
    </div>
  );
}
