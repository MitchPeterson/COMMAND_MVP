import { describe, expect, it } from 'vitest';
import { fingerprint, isSourceFingerprint } from './fingerprint';

const base = { accountLabel: 'Chase checking', date: '2026-09-14', description: 'STARBUCKS', amount: -6.85, occurrence: 1 };

describe('computed identity', () => {
  it('is stable across runs, so a re-import recognises what is on file', () => {
    expect(fingerprint(base)).toBe(fingerprint({ ...base }));
  });

  it('separates two identical rows on the same day', () => {
    expect(fingerprint(base)).not.toBe(fingerprint({ ...base, occurrence: 2 }));
  });

  it('separates the same charge on two accounts', () => {
    expect(fingerprint(base)).not.toBe(fingerprint({ ...base, accountLabel: 'Amex gold' }));
  });

  it('treats a charge and a refund of the same size as different rows', () => {
    expect(fingerprint(base)).not.toBe(fingerprint({ ...base, amount: 6.85 }));
  });

  it('ignores whitespace and case in the description', () => {
    expect(fingerprint({ ...base, description: '  starbucks  ' })).toBe(fingerprint(base));
  });
});

describe('the source system own id', () => {
  it('wins over the computed hash when the file carries one', () => {
    const withId = fingerprint({ ...base, sourceRecordId: 'TXN-99182' });
    expect(withId).not.toBe(fingerprint(base));
    expect(isSourceFingerprint(withId)).toBe(true);
  });

  it('survives the bank restating the description', () => {
    // A pending charge and its posted form are one transaction with two
    // wordings. Only the source id can tell.
    const pending = fingerprint({ ...base, description: 'PENDING STARBUCKS', sourceRecordId: 'TXN-99182' });
    const posted = fingerprint({ ...base, description: 'STARBUCKS #4821 SEATTLE', sourceRecordId: 'TXN-99182' });
    expect(pending).toBe(posted);
  });

  it('scopes the id to the account, since plenty of them are short and sequential', () => {
    const a = fingerprint({ ...base, sourceRecordId: '1001' });
    const b = fingerprint({ ...base, accountLabel: 'Amex gold', sourceRecordId: '1001' });
    expect(a).not.toBe(b);
  });

  it('falls back to the hash when the id is blank', () => {
    expect(fingerprint({ ...base, sourceRecordId: '   ' })).toBe(fingerprint(base));
    expect(isSourceFingerprint(fingerprint(base))).toBe(false);
  });
});
