// Letting someone put a finding down.
//
// A finding that cannot be answered is nagging. "State Farm renews in 40 days"
// is useful once; on the fortieth consecutive day, after the household has
// compared quotes and decided to stay, it is noise that buries whatever sits
// under it.
//
// The identity of a finding is the sentence it makes, not a row in a table.
// Nothing generates a stable id for these -- they are recomputed from the
// household's data on every render -- so the fingerprint is taken from the
// section, the title and the detail together.
//
// That choice is the whole design, and it is what makes dismissal safe:
//
//   - Dismiss "State Farm home renews in 40 days / Renewal 2026-10-01" and it
//     stays gone.
//   - Next year's renewal reads 2027-10-01, which is a different sentence, so
//     it comes back on its own. Nobody has to remember to un-dismiss anything.
//   - A finding whose severity worsens usually rewords itself, so it returns
//     rather than staying silently hidden.
//
// Snoozing is the same mechanism with a date attached. Dismissing is a snooze
// with no end, and neither destroys anything: hidden findings are counted and
// can be brought back.

export interface DismissalRecord {
  fingerprint: string;
  /** Null means dismissed outright rather than snoozed until a date. */
  snoozed_until: string | null;
}

export interface FingerprintableFinding {
  title: string;
  detail: string;
}

/**
 * A stable, short fingerprint for the sentence a finding makes.
 *
 * djb2 over the section, title and detail. Not cryptographic -- it only needs
 * to be stable across renders and reloads, and to change when the wording does.
 */
export function fingerprintFinding(section: string, finding: FingerprintableFinding): string {
  const input = `${section} ${finding.title.trim()} ${finding.detail.trim()}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return `${section}:${hash.toString(36)}`;
}

/** True when this dismissal is still in force. */
export function isHidden(record: DismissalRecord, now: Date): boolean {
  if (!record.snoozed_until) return true;
  const until = new Date(`${record.snoozed_until}T23:59:59Z`);
  if (Number.isNaN(until.getTime())) return true;
  return until.getTime() > now.getTime();
}

export interface Partitioned<T> {
  visible: T[];
  /** Still true, still on file -- just not being shown. */
  hidden: T[];
}

/**
 * Splits findings into what to show and what the household has put down.
 * A dismissal whose snooze has run out simply stops applying.
 */
export function partitionFindings<T extends FingerprintableFinding>(
  section: string,
  findings: T[],
  dismissals: DismissalRecord[],
  now: Date = new Date(),
): Partitioned<T> {
  const active = new Set(
    dismissals.filter((d) => isHidden(d, now)).map((d) => d.fingerprint),
  );
  const visible: T[] = [];
  const hidden: T[] = [];
  for (const finding of findings) {
    (active.has(fingerprintFinding(section, finding)) ? hidden : visible).push(finding);
  }
  return { visible, hidden };
}

/** The date a snooze of `days` should run to, as a plain YYYY-MM-DD. */
export function snoozeUntil(days: number, now: Date = new Date()): string {
  return new Date(now.getTime() + days * 86400000).toISOString().slice(0, 10);
}

export const SNOOZE_OPTIONS: Array<{ days: number; label: string }> = [
  { days: 30, label: 'Remind me in a month' },
  { days: 90, label: 'Remind me in three months' },
];
