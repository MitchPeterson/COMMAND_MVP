// The one thing worth saying first.
//
// A household uploads a document, Command reads it, and the finding that would
// genuinely surprise them is three clicks inside a pillar they have not opened
// yet. The insight already exists — the scorers produce it on the first render —
// it is simply buried under the sections a new user has no reason to visit.
//
// This picks one. No analysis of its own: it ranks findings the scorers have
// already produced and returns the single most striking, plus where to go to see
// the working. If the selection here disagrees with the section, the section is
// right — this is a pointer, never a second opinion.
//
// What "most striking" means, in order:
//
//   1. It spans pillars. "Your umbrella is below your net worth" reaches across
//      Insurance and Finances, and no single view of either would show it. That
//      is the whole claim being made — that Command saw something a spreadsheet
//      with one tab per topic could not.
//   2. It carries a figure. A number is what makes it land, and what makes it
//      checkable.
//   3. It is severe. Between two equally cross-cutting findings, the one that
//      costs more comes first.

import type { CoverageHealthResult } from './coverageHealth';
import type { LegalHealthResult } from './legalHealth';
import type { FamilyHealthResult } from './familyHealth';
import type { FinancesHealthResult } from './financesHealth';

export interface InsightSource {
  /** The section that owns the finding, for the link. */
  section: string;
  label: string;
  findings: Array<{ severity: string; title: string; detail: string }>;
  /** Sections whose data this scorer reads besides its own. */
  spans: string[];
}

export interface FirstInsight {
  section: string;
  label: string;
  title: string;
  detail: string;
  severity: string;
  /** Every section the finding drew on, the first being where it lives. */
  spans: string[];
}

/** A figure in the title is what makes a finding land rather than read as advice. */
const CARRIES_A_FIGURE = /\$[\d,]+|\d+\s*(years?|months?|%)/i;

const SEVERITY_RANK: Record<string, number> = { critical: 3, attention: 2, high: 2, info: 1 };

/**
 * Ranks the findings the scorers already produced. Cross-pillar first, then
 * whether it carries a number, then severity — so a household is told the thing
 * they could not have worked out themselves rather than the thing with the
 * loudest label.
 */
export function selectFirstInsight(sources: InsightSource[]): FirstInsight | null {
  const candidates: Array<FirstInsight & { score: number }> = [];

  for (const source of sources) {
    for (const finding of source.findings) {
      // dataFindings are excluded by the caller: "we could not check this" is a
      // limitation, and opening with one would be the opposite of the point.
      const crossPillar = source.spans.length > 0 ? 1 : 0;
      const hasFigure = CARRIES_A_FIGURE.test(finding.title) ? 1 : 0;
      const severity = SEVERITY_RANK[finding.severity] ?? 0;
      candidates.push({
        section: source.section,
        label: source.label,
        title: finding.title,
        detail: finding.detail,
        severity: finding.severity,
        spans: [source.label, ...source.spans],
        score: crossPillar * 100 + hasFigure * 10 + severity,
      });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  const { score, ...best } = candidates[0];
  return score > 0 ? best : null;
}

/**
 * Whether this is still a first session.
 *
 * It shows once there is something to have found it in, and stops once the
 * household is established — at which point the sections themselves are the
 * right place for findings and a permanent banner is just noise. Dismissal is
 * remembered, because being told the same thing every visit is how a good
 * insight becomes wallpaper.
 */
export function shouldShowFirstInsight(documentCount: number, confirmedRecords: number): boolean {
  return documentCount >= 1 && confirmedRecords <= 12;
}

const STORAGE_KEY = 'command.firstInsight.dismissed';

export function isInsightDismissed(title: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Keyed by the finding, so dismissing one does not silence the next.
    return (window.localStorage.getItem(STORAGE_KEY) ?? '').split('|').includes(hash(title));
  } catch {
    return false;
  }
}

export function dismissInsight(title: string): void {
  if (typeof window === 'undefined') return;
  try {
    const held = (window.localStorage.getItem(STORAGE_KEY) ?? '').split('|').filter(Boolean);
    window.localStorage.setItem(STORAGE_KEY, [...new Set([...held, hash(title)])].slice(-20).join('|'));
  } catch {
    // A browser refusing storage should cost the user a repeated card, nothing more.
  }
}

/** Short, stable, and not a title with a pipe in it breaking the delimiter. */
function hash(value: string): string {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  return String(h);
}

/**
 * Builds the ranked source list from results the Dashboard already computed.
 * `spans` names the other sections each scorer reads, which is what makes a
 * finding cross-pillar rather than merely severe.
 */
export function insightSources(results: {
  coverage: CoverageHealthResult;
  finances: FinancesHealthResult;
  family: FamilyHealthResult;
  legal: LegalHealthResult;
}): InsightSource[] {
  return [
    // Coverage weighs policies against net worth and the household's own facts.
    { section: 'insurance', label: 'Insurance', spans: ['Finances'], findings: results.coverage.findings },
    // Finances reconciles a stated figure against records from Home and Credit.
    { section: 'finances', label: 'Finances', spans: ['Home', 'Credit'], findings: results.finances.findings },
    // The protection gap is income, dependants and cover read together.
    { section: 'family', label: 'Family', spans: ['Insurance', 'Finances'], findings: results.family.findings },
    // Legal findings lean on family composition and assets.
    { section: 'legal', label: 'Legal', spans: ['Family'], findings: results.legal.findings },
  ];
}
