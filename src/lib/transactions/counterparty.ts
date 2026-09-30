// Who was actually paid.
//
// A merchant description is the merchant's name wrapped in everything the
// payment rail felt like adding: a processor prefix, a store number, a city
// and state, an authorization date, a reference code. Two charges at the same
// coffee shop rarely arrive as the same string, so anything that groups by the
// raw text -- recurrence, a taught rule, a "where the money lands" list --
// sees two merchants where there is one.
//
// This replaces merchantKey(), which did most of this and had a bug worth
// stating. Its reference-code stripper was /[*#]\s*[a-z0-9]{3,}/, which
// matches the merchant's own name when a processor put a star in front of it:
//
//   SQ *BLUE DOOR COFFEE   ->  "door coffee"     (ate BLUE)
//   TST* HANNAH BISTRO     ->  "tst bistro"      (ate HANNAH, kept the processor)
//   PAYPAL *STEAM GAMES    ->  "paypal games"    (ate STEAM,  kept the processor)
//
// So every Square, Toast and PayPal merchant was mis-keyed, and the ones that
// collapsed into "paypal ..." were silently merged with each other. The order
// below is the fix: take the processor off first, and only then look for
// reference codes -- and require a code to contain a digit, because a word
// after a star is a name, not a code.

/** What a cleaned description resolves to. */
export interface Counterparty {
  /** Stable identity. Lowercase, no punctuation, at most three words. */
  key: string;
  /** What to show a person. */
  name: string;
}

/**
 * Payment processors that put their own name in front of the merchant's.
 * Stripped with the star that follows, so the merchant survives intact.
 */
const PROCESSOR_PREFIX = new RegExp(
  '^\\s*(sq|tst|sp|ic|wpy|py|pp|pyp|paypal|venmo|cash ?app|toast|clover|shopify|'
  + 'squareup|stripe|sumup|izettle|ebay ?mktp|amzn ?mktp|amzn ?digital|googl|google)'
  + '\\s*\\*+\\s*',
  'i',
);

/** Rail noise that is never part of a name. */
const NOISE = [
  /\bpurchase authorized on \d{1,2}\/\d{1,2}\b/gi,
  /\bcheckcard\s*\d*/gi,
  /\b(pos|pos debit|debit card purchase|card purchase|point of sale)\b/gi,
  /\b(ach|ach debit|ach credit|eft|preauthorized|pre-authorized)\b/gi,
  /\b(recurring payment|autopay|auto pay|auto-pay|recurring|purchase|payment)\b/gi,
  /\bref(erence)?\s*#?\s*[a-z0-9]+/gi,
  /\bconf(irmation)?\s*#?\s*[a-z0-9]+/gi,
  /\bx{2,}\d+/gi,          // xxxx1234
  /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g,
];

/** US state codes, so a trailing " SAVAGE MN" comes off without eating a word. */
const STATES = new Set([
  'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il',
  'in', 'ia', 'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt',
  'ne', 'nv', 'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri',
  'sc', 'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy', 'dc',
]);

/** Words that are structure rather than identity. */
const FILLER = new Set(['the', 'and', 'inc', 'llc', 'ltd', 'co', 'corp', 'com', 'store', 'shop']);

/** A token that is a reference code rather than a word: it carries a digit. */
const isCode = (word: string) => /\d/.test(word);

/**
 * Split a description into the words that identify the merchant.
 *
 * Deliberately conservative about the trailing city: only a recognised state
 * code is removed, and only the single word before it. "CUB FOODS SAVAGE MN"
 * loses "savage mn"; "GENERAL MILLS" keeps both words, because MILLS is not a
 * state and nothing else licenses removing it.
 */
function identityWords(description: string): string[] {
  let text = description.toLowerCase();

  // 1. The processor comes off first, before anything looks for a star.
  text = text.replace(PROCESSOR_PREFIX, ' ');
  // 2. Rail noise.
  for (const pattern of NOISE) text = text.replace(pattern, ' ');
  // 3. Punctuation to spaces, keeping only letters and digits as separators.
  text = text.replace(/[^a-z0-9]+/g, ' ');

  let words = text.split(/\s+/).filter(Boolean);

  // 4. A trailing state code, and the city word in front of it.
  if (words.length > 2 && STATES.has(words[words.length - 1])) {
    words = words.slice(0, -2);
  }

  // 5. Reference codes and store numbers, then filler.
  return words.filter((w) => !isCode(w) && w.length > 2 && !FILLER.has(w));
}

const titleCase = (words: string[]) =>
  words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

/**
 * Clean a merchant description into a stable key and a readable name.
 *
 * `aliases` is the household's own renames, keyed by the key this function
 * produces, so a correction survives the next export phrasing the merchant
 * differently.
 */
export function cleanCounterparty(
  description: string,
  aliases?: Map<string, string> | Record<string, string>,
): Counterparty {
  const words = identityWords(description ?? '');

  // Nothing survived the cleaning -- a description that was only a reference
  // code. The raw text is a worse key than nothing, but it is an honest one.
  if (words.length === 0) {
    const fallback = (description ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
    return { key: fallback, name: (description ?? '').trim() || 'Unnamed' };
  }

  // Three words is enough to tell merchants apart and few enough that a store
  // in a second city still matches the first.
  const key = words.slice(0, 3).join(' ');
  const renamed = aliases instanceof Map ? aliases.get(key) : aliases?.[key];

  return { key, name: renamed ?? titleCase(words.slice(0, 4)) };
}

/**
 * Just the key.
 *
 * Kept as its own export because three modules only ever wanted the identity,
 * and because `merchantKey` is the name they already call it by.
 */
export function merchantKey(description: string): string {
  return cleanCounterparty(description).key;
}
