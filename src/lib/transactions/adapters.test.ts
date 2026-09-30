import { describe, expect, it } from 'vitest';
import { ADAPTERS, detectAdapter } from './adapters';

describe('detection is by header, never by file name', () => {
  it('knows a Chase checking export', () => {
    const a = detectAdapter(['Details', 'Posting Date', 'Description', 'Amount', 'Type', 'Balance', 'Check or Slip #']);
    expect(a?.id).toBe('chase_checking');
    expect(a?.signConvention).toBe('negative_is_spending');
  });

  it('knows a Chase card export, and that its purchases are negative', () => {
    const a = detectAdapter(['Transaction Date', 'Post Date', 'Description', 'Category', 'Type', 'Amount', 'Memo']);
    expect(a?.id).toBe('chase_card');
    // The whole point of the registry: nothing in a header says this.
    expect(a?.signConvention).toBe('negative_is_spending');
    expect(a?.sourceKind).toBe('card');
  });

  it('knows an Amex export, and that its charges are positive', () => {
    const a = detectAdapter(['Date', 'Description', 'Card Member', 'Account #', 'Amount', 'Category']);
    expect(a?.id).toBe('amex');
    expect(a?.signConvention).toBe('positive_is_spending');
  });

  it('tolerates a bank adding a column', () => {
    expect(detectAdapter(['Date', 'Description', 'Card Member', 'Account #', 'Amount', 'Extended Details', 'Reference'])?.id)
      .toBe('amex');
  });

  it('is unaffected by header case and punctuation', () => {
    expect(detectAdapter(['DETAILS', 'posting_date', 'Description', 'AMOUNT', 'type', 'Balance'])?.id)
      .toBe('chase_checking');
  });

  it('prefers the more specific format when two could match', () => {
    // Satisfies both discover (5 headers) and chase_card (6). The longer claim wins.
    const a = detectAdapter(['Trans Date', 'Transaction Date', 'Post Date', 'Description', 'Amount', 'Category', 'Type']);
    expect(a?.id).toBe('chase_card');
  });

  it('claims nothing for a file no format covers', () => {
    // Not a failure. The generic scorer reads it, which is how every export
    // worked before adapters existed.
    expect(detectAdapter(['Date', 'Merchant', 'Amount'])).toBeNull();
    expect(detectAdapter([])).toBeNull();
  });
});

describe('the registry itself', () => {
  it('has unique ids', () => {
    const ids = ADAPTERS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('requires at least three headers, so nothing matches by accident', () => {
    for (const a of ADAPTERS) expect(a.requires.length).toBeGreaterThanOrEqual(3);
  });

  it('states a sign convention, which is why most of them exist', () => {
    for (const a of ADAPTERS) expect(a.signConvention).toBeDefined();
  });
});
