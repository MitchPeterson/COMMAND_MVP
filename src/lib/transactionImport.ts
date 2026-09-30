// Reading a grid of strings as transactions.
//
// Every bank exports a different file and none of them document it. The column
// holding the merchant is called Description, Payee, Name, Memo, Merchant or
// Details; the amount is one signed column, or two called Debit and Credit, or
// an amount plus a Type column saying which way it went. Dates are MM/DD/YYYY,
// DD/MM/YYYY, YYYY-MM-DD or an Excel day count.
//
// So this guesses, and then shows its guess. Every decision here -- which
// column is which, which way the signs run, what a row was for -- is surfaced
// in the preview and can be overridden before anything is written. A silent
// guess that is wrong 5% of the time is worse than no import, because the
// household has no way to notice the 5%.
//
// The one thing guessed with real consequences is the sign convention. Read it
// backwards and every expense becomes income; the grade, the savings rate and
// every finding invert. It is inferred from evidence in the file itself --
// which rows are payroll, how the majority runs -- and the reasoning is
// printed above the preview.

import type { SheetGrid } from './transactionFile';
import { classify, looksLikeIncome, type ClassifiedSource } from './transactions/classify';
import { cleanCounterparty } from './transactions/counterparty';
import { fingerprint as makeFingerprint } from './transactions/fingerprint';
import { detectAdapter, applyAdapter, type Adapter } from './transactions/adapters';
import { categoryByCode, categoryFromDescription } from './transactions/taxonomy';

export type ColumnRole =
  | 'date' | 'posted_date' | 'description' | 'amount' | 'debit' | 'credit'
  | 'category' | 'type' | 'balance' | 'cardholder' | 'transaction_id' | 'ignore';

export type SignConvention = 'negative_is_spending' | 'positive_is_spending' | 'debit_credit_columns';

// Re-exported from where they live now, for the callers that have always
// imported them from here.
export type { Flow } from './transactions/classify';
export { classifyFlow } from './transactions/classify';
export { fingerprint } from './transactions/fingerprint';
import type { Flow } from './transactions/classify';

export interface ColumnMapping {
  /** Index into the header row, or -1 for a role the file does not carry. */
  date: number;
  postedDate: number;
  description: number;
  amount: number;
  debit: number;
  credit: number;
  category: number;
  type: number;
  balance: number;
  cardholder: number;
  /** The bank's own row identifier, which beats any hash Command can compute. */
  transactionId: number;
}

export interface ParsedTransaction {
  date: string;
  postedDate: string | null;
  description: string;
  /** Always signed the same way: negative is money leaving the household. */
  amount: number;
  flow: Flow;
  category: string;
  /** The issuer's own category, when the file carried one. */
  rawCategory: string | null;
  /** The taxonomy code, which is what gets stored. */
  categoryCode: string;
  categorySource: ClassifiedSource;
  /** The cleaned merchant identity, and the name to show for it. */
  counterpartyKey: string;
  counterpartyName: string;
  /** The bank's own row id, when the export carried one. */
  sourceRecordId: string | null;
  reviewState: 'none' | 'needs_review';
  reviewReason: string | null;
  fingerprint: string;
  /** The row as it appeared, for the preview and for a support question later. */
  rowNumber: number;
}

export interface SkippedRow {
  rowNumber: number;
  reason: string;
  preview: string;
}

export interface ImportReading {
  headerRow: number;
  headers: string[];
  mapping: ColumnMapping;
  /** Roles Command could not find. A missing date or amount blocks the import. */
  missing: ColumnRole[];
  signConvention: SignConvention;
  /** Why the signs were read this way, in the user's words. */
  signBasis: string;
  /** True when the evidence was thin, so the preview leads with the question. */
  signUncertain: boolean;
  dateOrder: 'mdy' | 'dmy' | 'iso' | 'unknown';
  transactions: ParsedTransaction[];
  skipped: SkippedRow[];
  totalRows: number;
  /** The format this file was recognised as, or null for "nothing claimed it". */
  adapter: Adapter | null;
  periodStart: string | null;
  periodEnd: string | null;
  /**
   * The running balance on the newest row, where the file carries one.
   *
   * Worth pulling out because it answers a question the household would
   * otherwise have to answer by hand: an account created from this import
   * starts with a real balance and a real as-of date instead of a blank.
   */
  closingBalance: number | null;
  /** Digits that look like an account number's last four, from the file name. */
  accountHint: { institution: string | null; lastFour: string | null };
}

/**
 * What a bank calls its export tells you what the account is.
 *
 * "Chase8841_Activity_20260926.csv" carries both the institution and the last
 * four, which is exactly what is needed to offer the right account rather than
 * a blank dropdown.
 */
const INSTITUTIONS = [
  'chase', 'wells fargo', 'wellsfargo', 'bank of america', 'bofa', 'citi',
  'capital one', 'capitalone', 'us bank', 'usbank', 'pnc', 'truist', 'ally',
  'discover', 'amex', 'american express', 'schwab', 'fidelity', 'navy federal',
  'usaa', 'regions', 'huntington', 'citizens', 'td bank', 'synchrony', 'sofi',
  'marcus', 'barclays', 'santander', 'keybank', 'fifth third', 'bmo', 'venmo',
];

export function hintFromFileName(fileName: string): { institution: string | null; lastFour: string | null } {
  const raw = fileName.toLowerCase().replace(/\.[^.]+$/, '');
  const letters = raw.replace(/[^a-z ]/g, '');
  const found = INSTITUTIONS.find((i) => letters.includes(i));

  // Digits stuck to the bank's own name are the account, whatever they look
  // like. Chase2085_Activity_20260926.csv is account 2085 exported in 2026,
  // and a rule that threw out anything resembling a year threw out the
  // account number along with it.
  let lastFour: string | null = null;
  if (found) {
    // Exactly four, and not the leading four of a longer run. Anything else
    // picks up a product name: CapitalOne_360Checking_9902 is account 9902,
    // and a looser pattern read it as 360.
    const attached = raw.match(new RegExp(`${found.replace(/ /g, '[ _-]?')}[ _-]?(\\d{4})(?!\\d)`));
    if (attached) [, lastFour] = attached;
  }

  // Failing that, a standalone group of exactly four digits that is not a
  // year -- an eight-digit date cannot produce one, since every four-digit
  // window inside it touches another digit.
  if (!lastFour) {
    lastFour = (raw.match(/(?:^|[^0-9])(\d{4})(?:[^0-9]|$)/g) ?? [])
      .map((d) => d.replace(/[^0-9]/g, ''))
      .find((d) => !/^(19|20)\d\d$/.test(d)) ?? null;
  }

  return {
    institution: found
      ? found.replace(/\b\w/g, (c) => c.toUpperCase())
        // Title case turns "bank of america" into "Bank Of America".
        .replace(/ Of /g, ' of ')
        .replace('Bofa', 'Bank of America').replace('Wellsfargo', 'Wells Fargo')
        .replace('Capitalone', 'Capital One').replace('Usbank', 'US Bank')
        .replace('Td Bank', 'TD Bank').replace('Bmo', 'BMO').replace('Sofi', 'SoFi')
      : null,
    lastFour,
  };
}

// ============================================================
// Finding the header row
// ============================================================

/**
 * Header synonyms, strongest first within each role.
 *
 * Order matters and first-match-wins is not enough. A Chase checking export
 * has both "Details" -- which holds the literal word DEBIT -- and
 * "Description", which holds the merchant. Taking the first column that looked
 * like a description put the word DEBIT in every merchant field, which is not
 * a subtly wrong import: it is every transaction uncategorized, no recurring
 * charge ever found, and no transfer ever recognized.
 *
 * So candidates are scored instead. An exact match beats a substring match,
 * and an earlier synonym beats a later one, and the best column for each role
 * wins it outright.
 */
const HEADER_WORDS: Array<{ role: ColumnRole; words: string[] }> = [
  { role: 'posted_date', words: ['posted date', 'post date', 'posting date', 'date posted', 'settlement date'] },
  { role: 'date', words: ['transaction date', 'trans date', 'trans. date', 'date of transaction', 'purchase date', 'activity date', 'booking date', 'value date', 'date', 'datum'] },
  { role: 'description', words: ['merchant description', 'transaction description', 'description', 'merchant name', 'merchant', 'payee', 'narrative', 'particulars', 'name', 'memo', 'details', 'transaction', 'reference'] },
  { role: 'debit', words: ['debit amount', 'amount debit', 'withdrawal', 'withdrawals', 'money out', 'paid out', 'debit', 'charges'] },
  { role: 'credit', words: ['credit amount', 'amount credit', 'deposit', 'deposits', 'money in', 'paid in', 'credit', 'payments'] },
  { role: 'amount', words: ['transaction amount', 'amount (usd)', 'amount', 'value', 'betrag', 'sum'] },
  { role: 'category', words: ['spending category', 'transaction category', 'category', 'categories', 'classification'] },
  { role: 'type', words: ['transaction type', 'debit/credit', 'dr/cr', 'cr/dr', 'trans type', 'direction', 'type'] },
  { role: 'balance', words: ['running balance', 'ending balance', 'account balance', 'balance'] },
  { role: 'cardholder', words: ['cardholder', 'card member', 'card holder', 'account holder'] },
  // Deliberately last and deliberately narrow. A column called "reference" is
  // as often a memo as an identifier, and reading a memo as an id would give
  // every row in the file the same identity.
  { role: 'transaction_id', words: ['transaction id', 'transaction number', 'transaction ref', 'trans id', 'unique id'] },
];

const normalize = (value: string) =>
  value.toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();

interface RoleCandidate { role: ColumnRole; score: number }

/** Every role a header could be, with how well it fits. */
function roleCandidates(header: string): RoleCandidate[] {
  const value = normalize(header);
  if (!value) return [];
  const found: RoleCandidate[] = [];

  for (const { role, words } of HEADER_WORDS) {
    let best = 0;
    words.forEach((word, rank) => {
      // A later synonym is a weaker claim, so its rank costs it points.
      const strength = 100 - rank * 4;
      if (value === word) best = Math.max(best, 1000 + strength);
      // A substring match on a long header is weaker still: "appears on your
      // statement as" containing "name" should not beat a column called Name.
      else if (value.includes(word)) best = Math.max(best, 300 + strength - Math.min(value.length, 60));
    });
    if (best > 0) found.push({ role, score: best });
  }
  return found;
}

function roleOf(header: string): ColumnRole | null {
  const best = roleCandidates(header).sort((a, b) => b.score - a.score)[0];
  return best ? best.role : null;
}

export function findHeaderRow(rows: string[][]): number {
  let best = -1;
  let bestScore = 1;
  for (let i = 0; i < Math.min(rows.length, 15); i += 1) {
    const roles = rows[i].map(roleOf).filter(Boolean) as ColumnRole[];
    const unique = new Set(roles);
    const anchored = unique.has('date') || unique.has('amount') || unique.has('debit') || unique.has('credit');
    if (!anchored || unique.size < 2) continue;
    if (unique.size > bestScore) { bestScore = unique.size; best = i; }
  }
  return best;
}

export function mapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    date: -1, postedDate: -1, description: -1, amount: -1, debit: -1,
    credit: -1, category: -1, type: -1, balance: -1, cardholder: -1,
    transactionId: -1,
  };
  const field: Record<string, keyof ColumnMapping> = {
    date: 'date', posted_date: 'postedDate', description: 'description',
    amount: 'amount', debit: 'debit', credit: 'credit', category: 'category',
    type: 'type', balance: 'balance', cardholder: 'cardholder',
    transaction_id: 'transactionId',
  };

  // Every column against every role it could fill, best fit first. Assigned
  // greedily: the strongest claim anywhere in the file is settled before any
  // weaker one, so "Description" takes the description before "Details" can.
  const claims = headers.flatMap((header, index) =>
    roleCandidates(header).map((c) => ({ index, ...c })));
  claims.sort((a, b) => b.score - a.score);

  const takenColumns = new Set<number>();
  for (const claim of claims) {
    const key = field[claim.role];
    if (!key || mapping[key] !== -1 || takenColumns.has(claim.index)) continue;
    mapping[key] = claim.index;
    takenColumns.add(claim.index);
  }

  // A file with only a posted date has one date, not none.
  if (mapping.date === -1 && mapping.postedDate !== -1) {
    mapping.date = mapping.postedDate;
    mapping.postedDate = -1;
  }
  return mapping;
}

// ============================================================
// Values
// ============================================================

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * 03/04/2026 is March 4 in the US and April 3 nearly everywhere else, and
 * nothing in the row says which. Resolved across the whole column instead: if
 * any first part exceeds 12 the order is day-first, and absent that evidence
 * the US reading is used, because that is where the accounts are.
 */
export function detectDateOrder(values: string[]): 'mdy' | 'dmy' | 'iso' | 'unknown' {
  let slashed = 0;
  let firstOver12 = 0;
  let secondOver12 = 0;
  let iso = 0;

  for (const value of values) {
    const text = value.trim();
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(text)) { iso += 1; continue; }
    const parts = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
    if (!parts) continue;
    slashed += 1;
    if (Number(parts[1]) > 12) firstOver12 += 1;
    if (Number(parts[2]) > 12) secondOver12 += 1;
  }

  if (iso > slashed) return 'iso';
  if (slashed === 0) return 'unknown';
  // Both cannot be the day. Whichever exceeds 12 is the day; if both do the
  // file is inconsistent and the US reading is the safer default.
  if (firstOver12 > 0 && secondOver12 === 0) return 'dmy';
  return 'mdy';
}

export function parseDate(value: string, order: 'mdy' | 'dmy' | 'iso' | 'unknown'): string | null {
  const text = value.trim();
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) return `${isoMatch[1]}-${pad(Number(isoMatch[2]))}-${pad(Number(isoMatch[3]))}`;

  const numeric = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    let year = Number(numeric[3]);
    // A two-digit year: 26 is 2026, 98 is 1998. Statements do not predate the
    // 1970s, so the pivot can sit high.
    if (year < 100) year += year <= 70 ? 2000 : 1900;
    // Even when the column reads month-first, a single row with a first part
    // over 12 can only be day-first.
    const dayFirst = order === 'dmy' ? second <= 12 : first > 12;
    const month = dayFirst ? second : first;
    const day = dayFirst ? first : second;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  // "Jan 5, 2026", "5 Jan 2026", "05-JAN-26"
  const named = text.match(/^(\d{1,2})[\s\-]*([a-z]{3,})[\s\-,]*(\d{2,4})$/i)
    ?? text.match(/^([a-z]{3,})[\s\-]*(\d{1,2})[\s\-,]*(\d{2,4})$/i);
  if (named) {
    const monthToken = /^\d/.test(named[1]) ? named[2] : named[1];
    const dayToken = /^\d/.test(named[1]) ? named[1] : named[2];
    const month = MONTHS[monthToken.slice(0, 3).toLowerCase()];
    let year = Number(named[3]);
    if (year < 100) year += year <= 70 ? 2000 : 1900;
    if (!month) return null;
    return `${year}-${pad(month)}-${pad(Number(dayToken))}`;
  }

  // An Excel day count that reached here as text.
  if (/^\d{5}(\.\d+)?$/.test(text)) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(Number(text)) * 86400000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }
  return null;
}

/**
 * Amounts arrive as -1,234.56, ($1,234.56), 1.234,56 EUR, or "1234.56 DR".
 * Returns the magnitude and the sign separately so a Debit column holding
 * unsigned numbers still reads as an outflow.
 */
export function parseAmount(value: string): number | null {
  let text = value.trim();
  if (!text) return null;

  let negative = false;
  // Accounting parentheses, and the DR/CR suffix some exports use.
  if (/^\(.*\)$/.test(text)) { negative = true; text = text.slice(1, -1); }
  if (/\bdr\b/i.test(text)) negative = true;
  if (/\bcr\b/i.test(text)) negative = false;
  if (/^-/.test(text) || /-$/.test(text)) negative = true;

  const digits = text.replace(/[^\d.,]/g, '');
  if (!digits) return null;

  // Which separator is the decimal: the last one to appear, provided it has
  // two digits after it. "1.234,56" is European, "1,234.56" is not.
  const lastComma = digits.lastIndexOf(',');
  const lastDot = digits.lastIndexOf('.');
  let cleaned: string;
  if (lastComma > lastDot && digits.length - lastComma <= 3) {
    cleaned = digits.replace(/\./g, '').replace(',', '.');
  } else {
    cleaned = digits.replace(/,/g, '');
  }

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -Math.abs(parsed) : parsed;
}

// ============================================================
// What the money did
// ============================================================

/**
 * The category a merchant description names.
 *
 * Was CATEGORY_RULES, eighteen label/regex pairs whose labels were chosen so
 * that spending.ts's separate substring list would happen to catch them. The
 * patterns live on the categories themselves now, so there is no second list
 * to keep in step and no label to get wrong.
 */
export function categorize(description: string): string | null {
  return categoryFromDescription(description)?.label ?? null;
}

// ============================================================
// Fingerprint
// ============================================================

// ============================================================
// The read
// ============================================================

export interface ReadOptions {
  accountLabel: string;
  /** counterparty_key -> category_code, as the household taught it. */
  rules?: Map<string, string> | Record<string, string>;
  /** counterparty_key -> display name, where the household renamed one. */
  aliases?: Map<string, string> | Record<string, string>;
  /** Used only to guess the institution and last four for the account step. */
  fileName?: string;
  /** Omit and the adapter decides; a recognised format knows what it is. */
  sourceKind?: 'bank' | 'card';
  /** Overrides, when the household has corrected the guess. */
  mapping?: ColumnMapping;
  signConvention?: SignConvention;
  headerRow?: number;
}

function inferSign(
  rows: string[][], mapping: ColumnMapping, sourceKind: 'bank' | 'card',
): { convention: SignConvention; basis: string; uncertain: boolean } {
  if (mapping.debit !== -1 && mapping.credit !== -1) {
    return {
      convention: 'debit_credit_columns',
      basis: 'The file has separate Debit and Credit columns, so nothing has to be inferred.',
      uncertain: false,
    };
  }

  const amounts: Array<{ value: number; description: string }> = [];
  for (const row of rows) {
    const value = parseAmount(row[mapping.amount] ?? '');
    if (value == null || value === 0) continue;
    amounts.push({ value, description: mapping.description === -1 ? '' : (row[mapping.description] ?? '') });
  }
  if (amounts.length === 0) {
    return {
      convention: sourceKind === 'card' ? 'positive_is_spending' : 'negative_is_spending',
      basis: 'No amounts could be read, so the usual convention for this kind of account is assumed.',
      uncertain: true,
    };
  }

  // The strongest evidence in the file: a payroll deposit is money arriving,
  // and its sign says which direction positive means.
  const payroll = amounts.filter((a) => looksLikeIncome(a.description));
  if (payroll.length > 0) {
    const positive = payroll.filter((a) => a.value > 0).length;
    if (positive === payroll.length) {
      return {
        convention: 'negative_is_spending',
        basis: `${payroll.length} deposit${payroll.length === 1 ? '' : 's'} in this file — payroll and the like — ${payroll.length === 1 ? 'is' : 'are'} positive, so a negative amount is money leaving.`,
        uncertain: false,
      };
    }
    if (positive === 0) {
      return {
        convention: 'positive_is_spending',
        basis: `The deposits in this file are negative, so a positive amount is money leaving. That is how ${sourceKind === 'card' ? 'most card issuers' : 'some banks'} export.`,
        uncertain: false,
      };
    }
  }

  // Failing that, the shape of the file. An account has many more purchases
  // than deposits, so the sign that dominates is the spending sign.
  const negative = amounts.filter((a) => a.value < 0).length;
  const share = negative / amounts.length;
  if (share >= 0.65) {
    return {
      convention: 'negative_is_spending',
      basis: `${Math.round(share * 100)}% of the amounts are negative. An account has far more purchases than deposits, so negative is money leaving.`,
      uncertain: false,
    };
  }
  if (share <= 0.35) {
    return {
      convention: 'positive_is_spending',
      basis: `${Math.round((1 - share) * 100)}% of the amounts are positive, and an account has far more purchases than deposits — so positive is money leaving here.`,
      uncertain: false,
    };
  }
  return {
    convention: sourceKind === 'card' ? 'positive_is_spending' : 'negative_is_spending',
    basis: `The amounts are split almost evenly between positive and negative (${Math.round(share * 100)}% negative), so the file does not say which way it runs. Check the preview before importing.`,
    uncertain: true,
  };
}

export function readTransactions(grid: SheetGrid, options: ReadOptions): ImportReading {
  const headerRow = options.headerRow ?? findHeaderRow(grid.rows);
  const headers = headerRow >= 0 ? grid.rows[headerRow] : [];
  const body = grid.rows.slice(headerRow + 1);
  // The format, if one claims this header row. Null is the ordinary case and
  // not a failure: the generic scorer below reads it either way, and an
  // adapter mostly exists to be certain about the sign rather than probably
  // right about it.
  const adapter = detectAdapter(headers);
  const sourceKind = options.sourceKind ?? adapter?.sourceKind ?? 'bank';
  const mapping = options.mapping ?? applyAdapter(mapColumns(headers), adapter);

  const missing: ColumnRole[] = [];
  if (mapping.date === -1) missing.push('date');
  if (mapping.description === -1) missing.push('description');
  if (mapping.amount === -1 && mapping.debit === -1 && mapping.credit === -1) missing.push('amount');

  const sign = options.signConvention
    ? { convention: options.signConvention, basis: 'Set by you.', uncertain: false }
    // A recognised format knows its own convention, which beats inferring it
    // from the data: the inference is right until someone imports a fortnight
    // where it is not.
    : adapter?.signConvention
      ? {
        convention: adapter.signConvention,
        basis: `This is a ${adapter.label} export.${adapter.note ? ` ${adapter.note}` : ''}`,
        uncertain: false,
      }
      : inferSign(body, mapping, sourceKind);

  const dateOrder = mapping.date === -1
    ? 'unknown'
    : detectDateOrder(body.map((r) => r[mapping.date] ?? ''));

  const transactions: ParsedTransaction[] = [];
  const skipped: SkippedRow[] = [];
  const seen = new Map<string, number>();

  body.forEach((row, index) => {
    const rowNumber = headerRow + index + 2; // 1-based, and past the header.
    const preview = row.filter(Boolean).slice(0, 4).join(' · ').slice(0, 90);
    if (missing.length > 0) return;

    const date = parseDate(row[mapping.date] ?? '', dateOrder);
    if (!date) {
      // A totals row at the foot of the file has no date and is not a
      // transaction. Saying so beats importing "TOTAL 4,182.11" as a purchase.
      skipped.push({ rowNumber, reason: 'No date Command could read', preview });
      return;
    }

    const description = (row[mapping.description] ?? '').replace(/\s+/g, ' ').trim();
    if (!description) {
      skipped.push({ rowNumber, reason: 'No description', preview });
      return;
    }

    // Signed so that negative is always money leaving, whatever the file did.
    let amount: number | null = null;
    if (sign.convention === 'debit_credit_columns') {
      const debit = mapping.debit === -1 ? null : parseAmount(row[mapping.debit] ?? '');
      const credit = mapping.credit === -1 ? null : parseAmount(row[mapping.credit] ?? '');
      if (debit != null && debit !== 0) amount = -Math.abs(debit);
      else if (credit != null && credit !== 0) amount = Math.abs(credit);
    } else {
      const raw = parseAmount(row[mapping.amount] ?? '');
      if (raw != null) amount = sign.convention === 'positive_is_spending' ? -raw : raw;
    }

    if (amount == null || amount === 0) {
      skipped.push({ rowNumber, reason: 'No amount Command could read', preview });
      return;
    }

    // Some exports carry the direction in a Type column and leave the amount
    // unsigned. Where that column exists it is the issuer's own word, so it
    // overrules the inferred sign.
    if (mapping.type !== -1) {
      const type = normalize(row[mapping.type] ?? '');
      if (/^(debit|withdrawal|purchase|sale|charge|dr|payment sent|outgoing)$/.test(type)) amount = -Math.abs(amount);
      else if (/^(credit|deposit|refund|cr|payment received|incoming)$/.test(type)) amount = Math.abs(amount);
    }

    const rawCategory = mapping.category === -1 ? null : (row[mapping.category] ?? '').trim() || null;
    const sourceRecordId = mapping.transactionId === -1
      ? null : (row[mapping.transactionId] ?? '').trim() || null;

    // Who was paid, cleaned of everything the payment rail added.
    const counterparty = cleanCounterparty(description, options.aliases);

    const verdict = classify({
      description,
      amount,
      sourceKind,
      counterpartyKey: counterparty.key,
      issuerCategory: rawCategory,
      rules: options.rules,
    });

    const key = `${date}|${description.toLowerCase()}|${amount.toFixed(2)}`;
    const occurrence = (seen.get(key) ?? 0) + 1;
    seen.set(key, occurrence);

    transactions.push({
      date,
      postedDate: mapping.postedDate === -1 ? null : parseDate(row[mapping.postedDate] ?? '', dateOrder),
      description,
      amount,
      flow: verdict.flow,
      category: categoryByCode(verdict.categoryCode)?.label ?? 'Not categorized',
      categoryCode: verdict.categoryCode,
      rawCategory,
      categorySource: verdict.categorySource,
      counterpartyKey: counterparty.key,
      counterpartyName: counterparty.name,
      sourceRecordId,
      reviewState: verdict.reviewState,
      reviewReason: verdict.reviewReason,
      fingerprint: makeFingerprint({
        accountLabel: options.accountLabel, date, description, amount, occurrence, sourceRecordId,
      }),
      rowNumber,
    });
  });

  const dates = transactions.map((t) => t.date).sort();

  // The balance beside the newest transaction in the file. Read off the row
  // rather than the last line of the file, because exports run newest-first
  // about as often as oldest-first.
  let closingBalance: number | null = null;
  if (mapping.balance !== -1 && transactions.length > 0) {
    const newest = transactions.reduce((a, b) => (a.date >= b.date ? a : b));
    const row = body[newest.rowNumber - headerRow - 2];
    const parsed = row ? parseAmount(row[mapping.balance] ?? '') : null;
    if (parsed != null) closingBalance = parsed;
  }

  return {
    adapter,
    closingBalance,
    accountHint: hintFromFileName(options.fileName ?? ''),
    headerRow,
    headers,
    mapping,
    missing,
    signConvention: sign.convention,
    signBasis: sign.basis,
    signUncertain: sign.uncertain,
    dateOrder,
    transactions,
    skipped,
    totalRows: body.length,
    periodStart: dates[0] ?? null,
    periodEnd: dates[dates.length - 1] ?? null,
  };
}
