// What changed since you last looked.
//
// Every figure here already exists: the seven scorers produce the findings and
// the scores on first render, and the deadlines are already computed for the Tax
// and Dashboard timelines. Nothing new is calculated. What was missing was the
// comparison — Command could always tell you the state of things and never that
// the state had moved.
//
// The comparison needs a previous state to compare against, and there is no
// history of scores anywhere: section_scores holds onboarding-time rows that
// nothing recalculates, and record_history tracks table rows rather than
// assessments. So the digest keeps its own snapshot, written when you read it.
//
// That makes it per-device, which is the honest trade. A digest is a reading
// experience — "since you last looked" means since *you* last looked — and
// storing it server-side would mean one device marking another's brief as read.

export interface SectionSnapshot {
  score: number | null;
  /** Finding titles, which are stable enough to diff and specific enough to matter. */
  findings: string[];
}

export interface DigestSnapshot {
  at: string;
  sections: Record<string, SectionSnapshot>;
}

export interface ScoreMove {
  section: string;
  label: string;
  from: number;
  to: number;
  delta: number;
}

export interface NewFinding {
  section: string;
  label: string;
  title: string;
  detail: string;
  severity: string;
}

export interface Deadline {
  date: string;
  label: string;
  detail: string;
  /** Negative once it has passed. */
  daysAway: number;
}

export interface Digest {
  since: string | null;
  isFirst: boolean;
  newFindings: NewFinding[];
  resolved: NewFinding[];
  moves: ScoreMove[];
  deadlines: Deadline[];
  /** True when there is genuinely nothing to report. */
  quiet: boolean;
}

export interface DigestInput {
  section: string;
  label: string;
  score: number | null;
  findings: Array<{ severity: string; title: string; detail: string }>;
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const DIGEST_INTERVAL_DAYS = 7;
const STORAGE_KEY = 'command:last-digest';

export function readSnapshot(): DigestSnapshot | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DigestSnapshot;
    return parsed && typeof parsed.at === 'string' && parsed.sections ? parsed : null;
  } catch {
    // Unavailable or corrupt storage means every visit looks like the first,
    // which shows a brief that is merely unhelpful rather than wrong.
    return null;
  }
}

export function writeSnapshot(sections: DigestInput[], now = new Date()): void {
  try {
    const snapshot: DigestSnapshot = {
      at: now.toISOString(),
      sections: Object.fromEntries(sections.map((s) => [
        s.section, { score: s.score, findings: s.findings.map((f) => f.title) },
      ])),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Nothing to do. The cost is a brief that reappears.
  }
}

/** Due after a week, and on a first visit only once there is something to say. */
export function isDigestDue(snapshot: DigestSnapshot | null, now = new Date()): boolean {
  if (!snapshot) return true;
  const last = new Date(snapshot.at).getTime();
  if (!Number.isFinite(last)) return true;
  return now.getTime() - last >= DIGEST_INTERVAL_DAYS * DAY_MS;
}

/**
 * Diffs the current assessments against the stored snapshot.
 *
 * A first run reports no changes rather than reporting everything as new — the
 * point is what moved, and on day one nothing has. Deadlines still show, because
 * those are true whether or not there is anything to compare against.
 */
export function buildDigest(
  sections: DigestInput[],
  deadlines: Deadline[],
  snapshot: DigestSnapshot | null,
  now = new Date(),
): Digest {
  const isFirst = snapshot === null;
  const newFindings: NewFinding[] = [];
  const resolved: NewFinding[] = [];
  const moves: ScoreMove[] = [];

  if (!isFirst) {
    for (const section of sections) {
      const before = snapshot!.sections[section.section];
      if (!before) continue;

      const seen = new Set(before.findings);
      for (const finding of section.findings) {
        if (!seen.has(finding.title)) {
          newFindings.push({ section: section.section, label: section.label, ...finding });
        }
      }

      const nowTitles = new Set(section.findings.map((f) => f.title));
      for (const title of before.findings) {
        if (!nowTitles.has(title)) {
          resolved.push({
            section: section.section, label: section.label, title,
            detail: 'No longer flagged.', severity: 'info',
          });
        }
      }

      if (before.score !== null && section.score !== null && before.score !== section.score) {
        moves.push({
          section: section.section, label: section.label,
          from: before.score, to: section.score, delta: section.score - before.score,
        });
      }
    }
  }

  const severityRank: Record<string, number> = { critical: 3, attention: 2, high: 2, info: 1 };
  newFindings.sort((a, b) => (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0));
  moves.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  // The same date arrives from two places — the household's own timeline and the
  // statutory tax dates — under labels that differ by a word. Keyed on the exact
  // string they both survived, and "Q3 estimated payment" sat directly above
  // "Q3 estimated tax payment". Same day, one obligation, so the fuller label
  // wins and the other is dropped.
  // Compared as word sets, not as strings. The extra word sits in the middle —
  // "Q3 estimated payment" against "Q3 estimated tax payment" — so neither
  // contains the other and a substring test misses it entirely. One is a
  // duplicate of the other when its words are a subset, and two shared words are
  // required so a pair of one-word labels cannot collapse by accident.
  const words = (label: string) =>
    new Set(label.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const subsumes = (a: Set<string>, b: Set<string>) =>
    b.size >= 2 && [...b].every((w) => a.has(w));

  const deduped: Deadline[] = [];
  for (const candidate of deadlines) {
    const mine = words(candidate.label);
    const clash = deduped.findIndex((held) => {
      if (held.date !== candidate.date) return false;
      const theirs = words(held.label);
      return subsumes(theirs, mine) || subsumes(mine, theirs);
    });
    if (clash === -1) { deduped.push(candidate); continue; }
    // The fuller label is the more useful one to keep.
    if (words(candidate.label).size > words(deduped[clash].label).size) deduped[clash] = candidate;
  }

  const upcoming = deduped
    .map((d) => ({ ...d, daysAway: Math.round((new Date(`${d.date}T00:00:00Z`).getTime() - now.getTime()) / DAY_MS) }))
    .filter((d) => d.daysAway >= -30 && d.daysAway <= 60)
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, 6);

  return {
    since: snapshot?.at ?? null,
    isFirst,
    newFindings: newFindings.slice(0, 6),
    resolved: resolved.slice(0, 4),
    moves,
    deadlines: upcoming,
    quiet: newFindings.length === 0 && resolved.length === 0 && moves.length === 0 && upcoming.length === 0,
  };
}
