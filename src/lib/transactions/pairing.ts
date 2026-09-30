// The two halves of one internal move.
//
// $800 leaving checking and $800 arriving in savings is one decision and two
// rows. Counted as they stand, the household saved $1,600. So when both sides
// are on file the legs are linked and the arriving one is left out of the
// totals.
//
// The risk in doing this by matching rather than by an account reference --
// which no bank export carries -- is two equal transfers in the same week.
// Pair them the wrong way round and nothing looks wrong: the totals are
// identical, the dates are close, and the household has no way to notice.
//
// So this refuses rather than guesses. A tie produces no pair at all and
// flags both legs for review. That is deliberately the worse-looking outcome
// and the better one: an unpaired leg leaves a row in a queue, where a
// mispaired one silently changes what the household believes it saved.
//
// Pure, and takes plain rows, so the awkward cases can be written down as
// tests rather than argued about.

export interface PairableRow {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** Signed: negative is money leaving. */
  amount: number;
  /** The account or card this row belongs to. Null means no source on file. */
  sourceId: string | null;
  flow: 'expense' | 'income' | 'savings' | 'transfer';
  /** A pair a person made or broke by hand is never reconsidered. */
  lockedBy?: 'user' | null;
}

export interface Pair {
  /** The leg that left an account. */
  out: string;
  /** The leg that arrived, and which is left out of the totals. */
  in: string;
}

export interface PairingResult {
  pairs: Pair[];
  /** Legs Command declined to pair, and why, in the household's words. */
  ambiguous: Array<{ id: string; reason: string }>;
}

const DEFAULT_WINDOW_DAYS = 3;

const dayNumber = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000);
};

/** To the cent, so 800 and 800.00 match and 800 and 800.01 do not. */
const cents = (amount: number) => Math.round(Math.abs(amount) * 100);

/**
 * Link the legs of internal moves.
 *
 * Only rows whose flow is savings or transfer are considered: an expense and
 * an income of the same size in the same week are a coincidence, not a move,
 * and pairing them would delete a real purchase from the totals.
 */
export function pairTransfers(
  rows: PairableRow[],
  options: { windowDays?: number } = {},
): PairingResult {
  const window = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const movable = rows.filter(
    (r) => (r.flow === 'savings' || r.flow === 'transfer')
      && r.sourceId != null && r.lockedBy !== 'user' && r.date,
  );

  const pairs: Pair[] = [];
  const ambiguous: Array<{ id: string; reason: string }> = [];
  const used = new Set<string>();

  // Grouped by amount first: nothing pairs across amounts, and grouping keeps
  // the comparison to rows that could plausibly match.
  const byAmount = new Map<number, PairableRow[]>();
  for (const row of movable) {
    const key = cents(row.amount);
    byAmount.set(key, [...(byAmount.get(key) ?? []), row]);
  }

  for (const group of byAmount.values()) {
    // Deterministic order, so the same input always produces the same pairs.
    const outbound = group.filter((r) => r.amount < 0).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const inbound = group.filter((r) => r.amount > 0);
    if (outbound.length === 0 || inbound.length === 0) continue;

    for (const out of outbound) {
      if (used.has(out.id)) continue;

      const candidates = inbound
        .filter((i) => !used.has(i.id) && i.sourceId !== out.sourceId)
        .map((i) => ({ row: i, distance: Math.abs(dayNumber(i.date) - dayNumber(out.date)) }))
        .filter((c) => c.distance <= window)
        .sort((a, b) => a.distance - b.distance);

      // Nothing to pair with. Not a problem and not flagged: the other account
      // is simply not loaded, which is the ordinary case for a household that
      // has imported one export.
      if (candidates.length === 0) continue;

      if (candidates.length === 1) {
        used.add(out.id);
        used.add(candidates[0].row.id);
        pairs.push({ out: out.id, in: candidates[0].row.id });
        continue;
      }

      // More than one. Only a single strictly-closest candidate is good enough
      // to act on; anything else is the case this function exists to refuse.
      const [best, next] = candidates;
      if (best.distance < next.distance) {
        used.add(out.id);
        used.add(best.row.id);
        pairs.push({ out: out.id, in: best.row.id });
        continue;
      }

      const tied = candidates.filter((c) => c.distance === best.distance);
      const reason = `Two transfers of the same amount are equally close to this one, `
        + `so Command left them unlinked rather than guessing which is which.`;
      ambiguous.push({ id: out.id, reason });
      for (const c of tied) ambiguous.push({ id: c.row.id, reason });
      // Deliberately not marked used: another outbound with a clearer claim
      // should still be allowed to pair with one of them.
    }
  }

  // A row can be reached twice through two tied outbounds; report it once.
  const seen = new Set<string>();
  return {
    pairs,
    ambiguous: ambiguous.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true))),
  };
}
