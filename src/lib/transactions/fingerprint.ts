// A stable identity for one transaction.
//
// Two things have to be true at once, and they pull against each other:
//
//   Re-importing an overlapping export must add nothing. Banks hand out the
//   same fortnight twice as a matter of course, and a household that ends up
//   with a doubled month has no way to tell which half is real.
//
//   Two genuinely identical rows on one day must both survive. Two coffees at
//   the same shop for the same price is two transactions, and collapsing them
//   silently removes money the household actually spent.
//
// So identity is everything about the row plus an occurrence number, which
// makes the first coffee and the second coffee different while keeping both
// stable across re-reads of the same file.
//
// Where the export carries the bank's own identifier, that is better than
// anything computed: it is the one identity that survives the bank restating a
// description, which they do -- a pending charge and its posted form are the
// same transaction with different text.

/** FNV-1a. Not a security hash — an identity for a row, short enough to index. */
function hash(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export interface FingerprintInput {
  /** The account these rows belong to, so one charge on two cards is two rows. */
  accountLabel: string;
  date: string;
  description: string;
  /** Signed. The sign is part of the identity: -40 and +40 are not the same row. */
  amount: number;
  /** 1 for the first identical row that day, 2 for the second. */
  occurrence: number;
  /** The source system's own id, when the file carried one. */
  sourceRecordId?: string | null;
}

export function fingerprint(input: FingerprintInput): string {
  // The bank's own id, scoped to the account so two institutions cannot
  // collide on a short sequential number -- and plenty of them are short and
  // sequential.
  if (input.sourceRecordId && input.sourceRecordId.trim()) {
    return `src_${hash(`${input.accountLabel.toLowerCase()}|${input.sourceRecordId.trim()}`)}`;
  }

  const merchant = input.description.toLowerCase().replace(/\s+/g, ' ').trim();
  return `imp_${hash(
    `${input.accountLabel.toLowerCase()}|${input.date}|${merchant}|${input.amount.toFixed(2)}|${input.occurrence}`,
  )}`;
}

/**
 * Whether a fingerprint came from the source system rather than from a hash of
 * the row's contents.
 *
 * Worth being able to ask: a source-id fingerprint survives the description
 * changing, a computed one does not, so a re-import after a bank restates its
 * text will duplicate the computed ones and not the others. Naming that is
 * better than letting it look like a dedup failure.
 */
export const isSourceFingerprint = (value: string) => value.startsWith('src_');
