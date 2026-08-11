// One reading per document.
//
// Re-reading a document deliberately creates a new reading rather than
// overwriting the old one. The legal path has done this from the start —
// `extraction_version + 1`, `supersedes_extraction_id` pointing back — and it is
// the right model: the history of what Command read, and how that changed as the
// extractor improved, is worth keeping.
//
// Nothing downstream honored it. Every consumer loaded all readings and treated
// each as a separate document, so re-reading one will listed it twice in the
// Legal section and, worse, graded it twice — `legalHealth` counts every live
// reading, so one document read twice looked like two wills on file.
//
// The rule is deliberately blunt: the newest reading of a document is the
// current one. Not "the newest confirmed one" — if someone re-reads a document,
// the reading they have not looked at yet is the truth about that file, and
// showing an older confirmed reading in its place would hide that a newer one is
// waiting. Confirmation is unaffected either way: it writes to the canonical
// tables (`legal_documents`, `insurance_policies`), which this never touches.

export interface Reading {
  id: string;
  document_id: string | null;
  created_at: string;
  /** Present on legal readings; absent elsewhere, where created_at orders them. */
  extraction_version?: number;
  /** The reading this one replaced, where the writer records it. */
  supersedes_extraction_id?: string | null;
}

/**
 * Keeps the newest reading of each document and drops the ones it replaced.
 *
 * Ordering prefers `extraction_version`, falling back to `created_at` — rows
 * written before versioning existed have no version, and comparing a missing
 * version against a real one would silently prefer the older row.
 */
export function currentReadings<T extends Reading>(rows: T[]): T[] {
  // Anything another row explicitly replaced is out, whatever its timestamps say.
  const replaced = new Set(
    rows.map((r) => r.supersedes_extraction_id).filter((id): id is string => Boolean(id)),
  );

  const newest = new Map<string, T>();
  for (const row of rows) {
    if (replaced.has(row.id)) continue;
    // A reading with no document cannot be compared against another; keep it.
    const key = row.document_id ?? `orphan:${row.id}`;
    const held = newest.get(key);
    if (!held || isNewer(row, held)) newest.set(key, row);
  }
  return [...newest.values()];
}

function isNewer(candidate: Reading, held: Reading): boolean {
  const a = candidate.extraction_version;
  const b = held.extraction_version;
  if (typeof a === 'number' && typeof b === 'number' && a !== b) return a > b;
  return (candidate.created_at ?? '') > (held.created_at ?? '');
}

/** The readings a document has outgrown, newest first. For a history view. */
export function supersededReadings<T extends Reading>(rows: T[]): T[] {
  const current = new Set(currentReadings(rows).map((r) => r.id));
  return rows
    .filter((r) => !current.has(r.id))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}
