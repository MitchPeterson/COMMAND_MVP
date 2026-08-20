// Lists, written the way they are read aloud.
//
// "Finances, Home and Family" was assembled by joining on " and ", which is
// fine for two things and wrong for three. Command uses the serial comma, so
// the conjunction gets one too.

/**
 * A list as a sentence fragment: "Finances", "Finances and Home",
 * "Finances, Home, and Family".
 */
export function listOf(items: string[], conjunction: 'and' | 'or' = 'and'): string {
  const parts = items.filter((item) => item && item.trim().length > 0);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} ${conjunction} ${parts[1]}`;
  // The serial comma: three or more take one before the conjunction.
  return `${parts.slice(0, -1).join(', ')}, ${conjunction} ${parts[parts.length - 1]}`;
}

/**
 * The separator that belongs before item `index` of a list of `total`, for
 * callers building a list out of elements rather than strings.
 */
export function listSeparator(index: number, total: number, conjunction: 'and' | 'or' = 'and'): string {
  if (index === 0) return '';
  if (index < total - 1) return ', ';
  return total === 2 ? ` ${conjunction} ` : `, ${conjunction} `;
}

/**
 * A label reduced to what identifies it, for deciding whether two entries are
 * the same thing. "4218 Sunnyside Road, Edina MN" and "4218 SUNNYSIDE ROAD
 * EDINA MN" are one house.
 */
export function normalizeLabel(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
