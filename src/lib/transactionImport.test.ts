// What the importer does today.
//
// These are characterization tests: they assert current behavior so that the
// taxonomy unification in a later phase cannot quietly change a figure. Where
// a test documents something that is arguably wrong, it says so rather than
// asserting the behavior we wish it had -- the point is to notice the change
// when it happens, not to pretend it already did.

import { describe, expect, it } from 'vitest';
import { parseDelimited, detectDelimiter, excelSerialToISO } from './transactionFile';
import {
  findHeaderRow, mapColumns, detectDateOrder, parseDate, parseAmount,
  categorize, hintFromFileName, readTransactions,
} from './transactionImport';

const grid = (csv: string) => ({
  rows: parseDelimited(csv),
  sheetName: null,
  otherSheets: [] as string[],
});

// ─── Delimited reading ──────────────────────────────────────────────────────

describe('parseDelimited', () => {
  it('reads quoted fields containing the delimiter', () => {
    expect(parseDelimited('a,b\n"SMITH, JOHN",5')).toEqual([['a', 'b'], ['SMITH, JOHN', '5']]);
  });

  it('honors the doubled-quote escape', () => {
    expect(parseDelimited('a\n"He said ""hi"""')).toEqual([['a'], ['He said "hi"']]);
  });

  it('strips a UTF-8 BOM so the first header still matches', () => {
    const [header] = parseDelimited('﻿Date,Amount\n01/02/2026,5');
    expect(header[0]).toBe('Date');
  });

  it('drops fully blank lines', () => {
    expect(parseDelimited('a,b\n\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('detectDelimiter', () => {
  it.each([
    [',', 'Date,Description,Amount\n01/02/2026,X,5'],
    [';', 'Date;Description;Amount\n01/02/2026;X;5'],
    ['\t', 'Date\tDescription\tAmount\n01/02/2026\tX\t5'],
  ])('finds %j', (expected, csv) => {
    expect(detectDelimiter(csv)).toBe(expected);
  });

  it('is not fooled by a comma inside a quoted field', () => {
    expect(detectDelimiter('Date;Name;Amt\n01/02/2026;"SMITH, JOHN";5\n02/02/2026;"DOE, JANE";6')).toBe(';');
  });
});

// ─── Values ─────────────────────────────────────────────────────────────────

describe('parseAmount', () => {
  it.each([
    ['-1,234.56', -1234.56],
    ['($1,234.56)', -1234.56],
    ['1.234,56', 1234.56],   // European decimal comma
    ['1234.56 DR', -1234.56],
    ['$45.00', 45],
    ['', null],
    ['n/a', null],
  ])('reads %j as %j', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });
});

describe('parseDate', () => {
  it('resolves an ambiguous date by the column order', () => {
    expect(parseDate('03/04/2026', 'mdy')).toBe('2026-03-04');
    expect(parseDate('03/04/2026', 'dmy')).toBe('2026-04-03');
  });

  it('reads a day over 12 as the day whatever the column order says', () => {
    expect(parseDate('13/04/2026', 'mdy')).toBe('2026-04-13');
  });

  it('reads named months in either order', () => {
    expect(parseDate('Jan 5, 2026', 'mdy')).toBe('2026-01-05');
    expect(parseDate('05-JAN-26', 'mdy')).toBe('2026-01-05');
  });

  it('pivots a two-digit year at 70', () => {
    expect(parseDate('01/02/26', 'mdy')).toBe('2026-01-02');
    expect(parseDate('01/02/98', 'mdy')).toBe('1998-01-02');
  });

  it('reads a bare Excel serial that arrived as text', () => {
    expect(parseDate('45900', 'unknown')).toBe('2025-08-31');
  });
});

describe('detectDateOrder', () => {
  it('calls it day-first only when a first part exceeds 12', () => {
    expect(detectDateOrder(['13/04/2026', '02/05/2026'])).toBe('dmy');
  });

  it('defaults to month-first without evidence, because that is where the accounts are', () => {
    expect(detectDateOrder(['03/04/2026', '02/05/2026'])).toBe('mdy');
  });

  it('recognises ISO', () => {
    expect(detectDateOrder(['2026-04-13', '2026-05-02'])).toBe('iso');
  });
});

describe('excelSerialToISO', () => {
  it('uses 1899-12-30 as day zero', () => {
    expect(excelSerialToISO(45900)).toBe('2025-08-31');
  });

  it('refuses a value outside a plausible range', () => {
    expect(excelSerialToISO(0)).toBeNull();
    expect(excelSerialToISO(90000)).toBeNull();
  });
});

// ─── Header mapping ─────────────────────────────────────────────────────────

describe('header detection', () => {
  it('finds the header below a bank preamble', () => {
    const rows = parseDelimited(
      'Statement for account 12345678\nPeriod: 01 Aug to 31 Aug\n\nDate;Description;Debit;Credit;Balance\n28/08/2026;TESCO;54,20;;1.204,88',
    );
    expect(findHeaderRow(rows)).toBe(2);
  });

  it('prefers Description over Details, which holds the word DEBIT on a Chase export', () => {
    // The regression this guards: first-match-wins put the literal string
    // "DEBIT" in every merchant field.
    const mapping = mapColumns(['Details', 'Posting Date', 'Description', 'Amount', 'Type', 'Balance']);
    expect(mapping.description).toBe(2);
    expect(mapping.date).toBe(1);
    expect(mapping.amount).toBe(3);
  });

  it('keeps Debit and Credit as separate columns when both exist', () => {
    const mapping = mapColumns(['Date', 'Description', 'Debit', 'Credit', 'Balance']);
    expect(mapping.debit).toBe(2);
    expect(mapping.credit).toBe(3);
    expect(mapping.amount).toBe(-1);
  });

  it('promotes a lone posted date to be the date', () => {
    const mapping = mapColumns(['Posting Date', 'Description', 'Amount']);
    expect(mapping.date).toBe(0);
    expect(mapping.postedDate).toBe(-1);
  });

  it('detects the format from the header, not the file name', () => {
    // Same headers, nonsense name: still mapped.
    const reading = readTransactions(
      grid('Date,Description,Amount\n09/14/2026,CUB FOODS,-42.10'),
      { accountLabel: 'A', sourceKind: 'bank', fileName: 'notes-final-v2.csv' },
    );
    expect(reading.missing).toEqual([]);
    expect(reading.transactions).toHaveLength(1);
  });
});

// ─── Flow ───────────────────────────────────────────────────────────────────

// The classifyFlow tests moved to transactions/classify.test.ts with the
// function. Two of them changed there on purpose and say so:
//
//   a credit on a card is 'expense' now, not 'refund' -- direction already
//   carries the sign, so a fourth flow value only meant "expense, backwards"
//
//   money leaving toward savings is 'savings', not 'transfer' -- the arriving
//   half stays a transfer, which is what stops the same $800 counting twice

// ─── Categories (today's behavior, pre-unification) ─────────────────────────

describe('categorize', () => {
  it.each([
    ['TRADER JOES #712', 'Groceries'],          // plural must match
    ['MCDONALDS F1234', 'Dining and takeout'],
    ['SHELL SERVICE STATION', 'Fuel'],
    ['NETFLIX.COM 866-579-7172', 'Entertainment'],
    ['XCEL ENERGY AUTOPAY', 'Utilities'],
    ['HOME DEPOT #2841', 'Home and improvement'],
    // DELIBERATE CHANGE: was 'Loan payments'. The rule label and the group
    // label used to be two different names for one thing -- 'Loan payments'
    // for the importer, 'Housing and loans' for the chart. There is one
    // category now, so there is one name. The grouping is unchanged.
    ['MORTGAGE PAYMENT WELLS FARGO', 'Housing and loans'],
  ])('puts %s in %s', (description, expected) => {
    expect(categorize(description)).toBe(expected);
  });

  it('does not match a prefix that is only part of a longer word', () => {
    expect(categorize('GASKET SUPPLY CO')).not.toBe('Fuel');
  });

  it('returns null rather than guessing', () => {
    expect(categorize('ZZQQ UNKNOWN VENDOR')).toBeNull();
  });
});

// ─── Fingerprints ───────────────────────────────────────────────────────────

// The fingerprint tests moved to transactions/fingerprint.test.ts along with
// the function, which also learned to prefer the bank's own row id where the
// export carries one.

describe('overlapping re-import', () => {
  it('produces identical fingerprints for the rows two exports share', () => {
    const september = grid(
      'Date,Description,Amount\n09/01/2026,RENT,-2400\n09/14/2026,CUB FOODS,-42.10',
    );
    // The second export repeats September and adds October.
    const wider = grid(
      'Date,Description,Amount\n09/01/2026,RENT,-2400\n09/14/2026,CUB FOODS,-42.10\n10/02/2026,CUB FOODS,-51.30',
    );
    const options = { accountLabel: 'Chase checking', sourceKind: 'bank' as const };

    const first = readTransactions(september, options).transactions.map((t) => t.fingerprint);
    const second = readTransactions(wider, options).transactions.map((t) => t.fingerprint);

    // Every row from the first export is recognised in the second.
    expect(first.every((f) => second.includes(f))).toBe(true);
    // And exactly one row is genuinely new.
    expect(second.filter((f) => !first.includes(f))).toHaveLength(1);
  });

  it('keeps both copies of a real same-day duplicate through a re-import', () => {
    const csv = 'Date,Description,Amount\n09/14/2026,STARBUCKS,-6.85\n09/14/2026,STARBUCKS,-6.85';
    const options = { accountLabel: 'Chase checking', sourceKind: 'bank' as const };
    const once = readTransactions(grid(csv), options).transactions;
    const twice = readTransactions(grid(csv), options).transactions;

    expect(once).toHaveLength(2);
    expect(new Set(once.map((t) => t.fingerprint)).size).toBe(2);
    // Re-reading the same file yields the same two identities, so a re-import
    // adds nothing rather than doubling the day.
    expect(twice.map((t) => t.fingerprint)).toEqual(once.map((t) => t.fingerprint));
  });
});

// ─── Sign convention ────────────────────────────────────────────────────────

describe('sign convention', () => {
  it('takes its evidence from the deposits in the file', () => {
    const reading = readTransactions(
      grid('Date,Description,Amount\n09/10/2026,ACME PAYROLL,5240\n09/12/2026,CUB FOODS,-142.87'),
      { accountLabel: 'A', sourceKind: 'bank' },
    );
    expect(reading.signConvention).toBe('negative_is_spending');
    expect(reading.signUncertain).toBe(false);
    expect(reading.signBasis).toMatch(/deposit/i);
  });

  it('reads a card export where a purchase is positive', () => {
    const reading = readTransactions(
      grid('Date,Description,Amount\n09/14/2026,DELTA AIR LINES,412.30\n09/13/2026,WHOLE FOODS,211.04\n09/02/2026,NETFLIX.COM,22.99\n09/11/2026,ONLINE PAYMENT - THANK YOU,-1500'),
      { accountLabel: 'A', sourceKind: 'card' },
    );
    expect(reading.signConvention).toBe('positive_is_spending');
    const delta = reading.transactions.find((t) => t.description.includes('DELTA'))!;
    expect(delta.amount).toBeLessThan(0);
    expect(delta.flow).toBe('expense');
  });

  it('uses separate Debit and Credit columns without inferring anything', () => {
    const reading = readTransactions(
      grid('Date;Description;Debit;Credit\n28/08/2026;TESCO STORES;54,20;\n25/08/2026;SALARY ACME;;2.850,00'),
      { accountLabel: 'A', sourceKind: 'bank' },
    );
    expect(reading.signConvention).toBe('debit_credit_columns');
    expect(reading.transactions.find((t) => t.description.includes('TESCO'))!.amount).toBe(-54.2);
    expect(reading.transactions.find((t) => t.description.includes('SALARY'))!.amount).toBe(2850);
  });
});

// ─── Skips ──────────────────────────────────────────────────────────────────

describe('rows that are not transactions', () => {
  it('skips a totals row rather than importing it as a purchase', () => {
    const reading = readTransactions(
      grid('Date,Description,Amount\n09/14/2026,CUB FOODS,-42.10\nTOTAL,,-42.10'),
      { accountLabel: 'A', sourceKind: 'bank' },
    );
    expect(reading.transactions).toHaveLength(1);
    expect(reading.skipped).toHaveLength(1);
    expect(reading.skipped[0].reason).toMatch(/date/i);
  });

  it('reports which columns are missing instead of importing nothing silently', () => {
    const reading = readTransactions(
      grid('Reference,Notes\nabc,def'),
      { accountLabel: 'A', sourceKind: 'bank' },
    );
    expect(reading.missing.length).toBeGreaterThan(0);
    expect(reading.transactions).toHaveLength(0);
  });
});

// ─── File name hints ────────────────────────────────────────────────────────

describe('hintFromFileName', () => {
  it.each([
    ['Chase8841_Activity_20260926.csv', 'Chase', '8841'],
    ['Chase2085_Activity_20260926.csv', 'Chase', '2085'],   // not a year
    ['CapitalOne_360Checking_9902.csv', 'Capital One', '9902'],  // not the product number
    ['Bank of America 5567 activity.csv', 'Bank of America', '5567'],
  ])('reads %s as %s %s', (file, institution, lastFour) => {
    expect(hintFromFileName(file)).toEqual({ institution, lastFour });
  });

  it('returns nothing rather than guessing', () => {
    expect(hintFromFileName('DownloadTxnHistory.csv')).toEqual({ institution: null, lastFour: null });
  });
});
