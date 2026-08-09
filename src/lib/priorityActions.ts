// What the household should do next, ranked.
//
// `priority_actions` rows are written once at onboarding and never recalculated,
// so on their own they drift out of date the moment anything changes — a policy
// gets uploaded, a will gets confirmed, net worth gets corrected, and the list
// still shows what was true months ago.
//
// The live scorers already know what is wrong right now. This merges their
// findings with the stored rows, drops stored rows the live data has overtaken,
// and ranks the result by how much it actually matters. The dashboard shows the
// top of that list, which is the only part anyone reads.
//
// Ranking is severity first, then money, then live before stored. It is not
// clever, and it is stated openly so it can be argued with.

import type { CoverageHealthResult } from './coverageHealth';
import type { LegalHealthResult } from './legalHealth';
import type { PriorityAction } from './supabase';

/** Local to the ranking; supabase.ts exports its own row-level RankedSeverity. */
export type RankedSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface RankedAction {
  id: string;
  title: string;
  detail: string;
  severity: RankedSeverity;
  /** Which section resolves it, for the link. */
  section: string | null;
  estimatedValue: number | null;
  dueDate: string | null;
  origin: 'live' | 'stored';
  attorneyReview: boolean;
}

const SEVERITY_WEIGHT: Record<RankedSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

/** Findings grade adequacy; actions are things to do. The mapping is direct. */
const FINDING_SEVERITY: Record<string, RankedSeverity> = {
  critical: 'critical',
  attention: 'high',
  info: 'medium',
};

/** Loose comparison so "Umbrella coverage is low" matches a stored row saying the same. */
function titleKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter((w) => w.length > 3).sort().join(' ');
}

function overlaps(a: string, b: string): boolean {
  const left = new Set(titleKey(a).split(' ').filter(Boolean));
  const right = titleKey(b).split(' ').filter(Boolean);
  if (left.size === 0 || right.length === 0) return false;
  const shared = right.filter((w) => left.has(w)).length;
  return shared / Math.max(left.size, right.length) >= 0.6;
}

export function buildPriorityActions(
  stored: PriorityAction[],
  coverage: CoverageHealthResult,
  legal: LegalHealthResult,
): RankedAction[] {
  const live: RankedAction[] = [];

  for (const finding of coverage.findings) {
    if (finding.severity === 'info') continue; // Informational findings are not tasks.
    live.push({
      id: `coverage:${titleKey(finding.title)}`,
      title: finding.title,
      detail: finding.detail,
      severity: FINDING_SEVERITY[finding.severity] ?? 'medium',
      section: 'insurance',
      estimatedValue: null,
      dueDate: null,
      origin: 'live',
      attorneyReview: false,
    });
  }

  for (const finding of legal.findings) {
    if (finding.severity === 'info') continue;
    live.push({
      id: `legal:${titleKey(finding.title)}`,
      title: finding.title,
      detail: finding.detail,
      severity: FINDING_SEVERITY[finding.severity] ?? 'medium',
      section: 'legal',
      estimatedValue: null,
      dueDate: null,
      origin: 'live',
      attorneyReview: finding.attorneyReview === true,
    });
  }

  // A stored row saying what a live finding already says is the stale copy.
  const kept = stored
    .filter((action) => action.status !== 'dismissed' && action.status !== 'completed')
    .filter((action) => !live.some((l) => overlaps(l.title, action.title)))
    .map<RankedAction>((action) => ({
      id: action.id,
      title: action.title,
      detail: action.description ?? '',
      severity: (action.severity as RankedSeverity) ?? 'medium',
      section: action.category ?? null,
      estimatedValue: action.estimated_value ?? null,
      dueDate: action.due_date ?? null,
      origin: 'stored',
      attorneyReview: false,
    }));

  return [...live, ...kept].sort((a, b) => {
    const bySeverity = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
    if (bySeverity !== 0) return bySeverity;
    const byValue = (b.estimatedValue ?? 0) - (a.estimatedValue ?? 0);
    if (byValue !== 0) return byValue;
    // A live finding reflects the household as it stands today; a stored row
    // reflects it as it stood at onboarding. Today wins ties.
    if (a.origin !== b.origin) return a.origin === 'live' ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}
