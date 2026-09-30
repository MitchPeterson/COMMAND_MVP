// Knowing a file by its header row.
//
// The requirement is to detect a format from the header and to make adding a
// new one a single entry. Worth being clear about what that adds here, because
// Command already reads files it has never seen: mapColumns() scores every
// header against a synonym list and picks the best fit, which is why Chase, Amex,
// a semicolon-delimited UK export and a generated workbook all worked without
// anyone writing a format for them.
//
// So an adapter is not the primary mechanism and should not become one. A
// registry of formats is only ever as good as its coverage, and the long tail
// of credit unions and小 banks is where a household's second account usually
// lives. The generic scorer stays in front; an adapter is a *named override*
// for the cases where scoring cannot win.
//
// Those cases are real and they are mostly about sign. Nothing in a header row
// says whether a purchase is positive or negative, and the inference from the
// data ("most rows are negative, so negative is spending") is right until
// someone imports a fortnight where it is not. A Chase card export is always
// negative-for-purchases and an Amex export is always positive, and knowing
// the format is the only way to be certain rather than probably right.
//
// Adding a format is one entry in ADAPTERS.

import type { ColumnMapping, SignConvention } from '../transactionImport';

export interface Adapter {
  id: string;
  label: string;
  /**
   * Normalized header names that must all be present. Matched as a subset, so
   * a bank adding a column does not stop its own format being recognised.
   */
  requires: string[];
  /** Overrides applied over the generic scorer's result. */
  mapping?: Partial<ColumnMapping>;
  /** The whole reason most of these exist. */
  signConvention?: SignConvention;
  sourceKind?: 'bank' | 'card';
  /** Shown in the preview, so the household can see what Command decided. */
  note?: string;
}

const normalize = (value: string) =>
  value.toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Ordered most specific first: an adapter requiring five headers is checked
 * before one requiring three, so a Chase card export is not read as the
 * generic Chase shape.
 */
export const ADAPTERS: Adapter[] = [
  {
    id: 'chase_card',
    label: 'Chase credit card',
    requires: ['transaction date', 'post date', 'description', 'category', 'type', 'amount'],
    sourceKind: 'card',
    // Chase cards export a purchase as a negative number, which is the
    // opposite of most issuers and exactly the thing a household would not
    // think to check.
    signConvention: 'negative_is_spending',
    note: 'Chase card exports write a purchase as a negative amount.',
  },
  {
    id: 'chase_checking',
    label: 'Chase checking',
    requires: ['details', 'posting date', 'description', 'amount', 'type', 'balance'],
    sourceKind: 'bank',
    signConvention: 'negative_is_spending',
    // The Details column holds the literal word DEBIT, and it beat the real
    // Description column until header scoring was taught to rank synonyms.
    // Pinned here so it can never regress for this format.
    note: 'The Details column is the direction, not the merchant.',
  },
  {
    id: 'amex',
    label: 'American Express',
    requires: ['date', 'description', 'card member', 'account #', 'amount'],
    sourceKind: 'card',
    signConvention: 'positive_is_spending',
    note: 'Amex writes a charge as a positive amount.',
  },
  {
    id: 'capital_one_card',
    label: 'Capital One card',
    requires: ['transaction date', 'posted date', 'card no', 'description', 'category', 'debit', 'credit'],
    sourceKind: 'card',
    signConvention: 'debit_credit_columns',
  },
  {
    id: 'discover',
    label: 'Discover',
    requires: ['trans date', 'post date', 'description', 'amount', 'category'],
    sourceKind: 'card',
    signConvention: 'positive_is_spending',
    note: 'Discover writes a purchase as a positive amount.',
  },
  {
    id: 'citi',
    label: 'Citi',
    requires: ['status', 'date', 'description', 'debit', 'credit'],
    sourceKind: 'card',
    signConvention: 'debit_credit_columns',
  },
  {
    id: 'usbank',
    label: 'U.S. Bank',
    requires: ['date', 'transaction', 'name', 'memo', 'amount'],
    sourceKind: 'bank',
    signConvention: 'negative_is_spending',
  },
];

/**
 * Which format this header row is, or null for "nothing claimed it".
 *
 * Null is the ordinary case and not a failure: the generic scorer handles it,
 * and it handles it well enough that most households never learn whether their
 * bank has an adapter.
 */
export function detectAdapter(headers: string[]): Adapter | null {
  const present = new Set(headers.map(normalize).filter(Boolean));
  const matches = ADAPTERS.filter((a) => a.requires.every((r) => present.has(r)));
  if (matches.length === 0) return null;

  // The most specific claim wins, so a format requiring six headers beats one
  // requiring four on a file that satisfies both.
  return matches.sort((a, b) => b.requires.length - a.requires.length)[0];
}

/** The adapter's fixed columns laid over what the scorer worked out. */
export function applyAdapter(mapping: ColumnMapping, adapter: Adapter | null): ColumnMapping {
  return adapter?.mapping ? { ...mapping, ...adapter.mapping } : mapping;
}
