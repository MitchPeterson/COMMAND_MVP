// Two names, one carrier.
//
// A household with one insurer saw two: "Owners Insurance Company" on the
// declarations page and "Auto-Owners Insurance Company" on the policy. Neither
// is a misread. Both are real member companies of the Auto-Owners group, and
// large insurers routinely underwrite through subsidiaries whose names never
// appear in their advertising — Travelers writes homeowners as The Standard
// Fire Insurance Company, USAA writes some auto through Garrison.
//
// So the document is not corrected. What it printed is what it printed, and
// that string is still what gets shown; this only decides when two of them are
// the same company for the purposes of grouping and duplicate detection.
//
// The table is deliberately short. Merging two carriers that are genuinely
// different is a worse error than showing two names for one, so an entry earns
// its place by being a documented member company, not by looking similar.

/** Words that describe a corporate form rather than name a company. */
const CORPORATE_FORMS = new Set([
  'insurance', 'insurances', 'assurance', 'company', 'companies', 'co', 'corp',
  'corporation', 'inc', 'incorporated', 'llc', 'ltd', 'plc', 'group', 'holdings',
  'agency', 'services', 'the', 'of', 'and', 'usa', 'us',
]);

/**
 * A carrier name reduced to the part that identifies it.
 *
 * Words that distinguish subsidiaries — mutual, casualty, indemnity, fire,
 * exchange, automobile — are deliberately kept. Stripping those would merge
 * companies by accident; the table below merges them on purpose.
 */
export function normalizeCarrier(name: string | null | undefined): string {
  return (name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w && !CORPORATE_FORMS.has(w))
    .join(' ')
    .trim();
}

/**
 * Member companies that write under one group, keyed by the normalized form of
 * the name a document is likely to print. Each entry is a company that appears
 * on real paperwork for the group it is listed under.
 */
const GROUPS: Array<{ label: string; members: string[] }> = [
  // The observed case: home written by Owners, auto by Auto-Owners.
  { label: 'Auto-Owners', members: ['auto owners', 'owners', 'home owners', 'property owners'] },
  { label: 'State Farm', members: ['state farm', 'state farm mutual automobile', 'state farm fire casualty', 'state farm general'] },
  { label: 'Travelers', members: ['travelers', 'travelers home marine', 'standard fire', 'charter oak fire', 'phoenix'] },
  { label: 'USAA', members: ['usaa', 'usaa casualty', 'usaa general indemnity', 'garrison property casualty'] },
  { label: 'Farmers', members: ['farmers', 'farmers exchange', 'fire exchange', 'truck exchange', 'mid century'] },
  { label: 'Nationwide', members: ['nationwide', 'nationwide mutual fire', 'nationwide general', 'nationwide property casualty'] },
  { label: 'Allstate', members: ['allstate', 'allstate fire casualty', 'allstate vehicle property', 'allstate indemnity', 'allstate northbrook indemnity'] },
  { label: 'Progressive', members: ['progressive', 'progressive casualty', 'progressive direct', 'progressive universal', 'progressive specialty'] },
  { label: 'Liberty Mutual', members: ['liberty mutual', 'liberty mutual fire', 'liberty', 'lm general', 'first liberty'] },
  { label: 'The Hartford', members: ['hartford', 'hartford casualty', 'hartford underwriters', 'trumbull', 'property casualty hartford'] },
  { label: 'Chubb', members: ['chubb', 'federal', 'great northern', 'pacific indemnity', 'vigilant', 'chubb national'] },
  { label: 'Erie', members: ['erie', 'erie exchange', 'erie indemnity'] },
  { label: 'American Family', members: ['american family', 'american family mutual', 'amfam', 'midvale indemnity'] },
  { label: 'Cincinnati', members: ['cincinnati', 'cincinnati casualty', 'cincinnati indemnity'] },
];

const MEMBER_TO_GROUP = new Map<string, string>();
for (const group of GROUPS) {
  for (const member of group.members) MEMBER_TO_GROUP.set(member, group.label);
}

export interface CarrierGroup {
  /** Stable key for grouping. Never shown. */
  key: string;
  /**
   * What to call the group. The group's common name where one is known,
   * otherwise the carrier's own words, untouched.
   */
  label: string;
  /** True when a table entry decided this, rather than the name matching itself. */
  known: boolean;
}

/** The company behind a name as a document printed it. */
export function carrierGroup(name: string | null | undefined): CarrierGroup {
  const normalized = normalizeCarrier(name);
  if (!normalized) return { key: '', label: name?.trim() || 'Carrier not recorded', known: false };
  const label = MEMBER_TO_GROUP.get(normalized);
  if (label) return { key: normalizeCarrier(label), label, known: true };
  return { key: normalized, label: (name ?? '').trim(), known: false };
}

/**
 * True when two carrier names are one company.
 *
 * Two names Command cannot place are the same only when they reduce to the same
 * string — an unknown carrier is never merged with another unknown one on a
 * guess.
 */
export function sameCarrier(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = carrierGroup(a);
  const right = carrierGroup(b);
  return Boolean(left.key) && left.key === right.key;
}
