import { describe, expect, it } from 'vitest';
import { classify, classifyFlow } from './classify';

const base = { sourceKind: 'bank' as const, counterpartyKey: 'some merchant', amount: -50 };

describe('classifyFlow', () => {
  it('no longer returns refund — an expense that came back is an expense', () => {
    // direction='credit' already carries the sign, so a fourth flow value only
    // ever meant "expense, backwards".
    expect(classifyFlow('AMAZON RETURN', 40, 'card')).toBe('expense');
    expect(classifyFlow('SOME MERCHANT', 50, 'card')).toBe('expense');
  });

  it('still keeps a bank credit as income', () => {
    expect(classifyFlow('SOME DEPOSIT', 50, 'bank')).toBe('income');
    expect(classifyFlow('ACME CORP DIRECT DEP', 5240, 'bank')).toBe('income');
  });

  it('reads a card payment as a transfer either direction', () => {
    expect(classifyFlow('Payment to Chase card 4417', -1200, 'bank')).toBe('transfer');
    expect(classifyFlow('ONLINE PAYMENT - THANK YOU', 1500, 'card')).toBe('transfer');
  });

  it('does not treat a bare AUTOPAY as a transfer', () => {
    expect(classifyFlow('XCEL ENERGY AUTOPAY', -188.42, 'bank')).toBe('expense');
  });

  it('calls money leaving toward savings a saving, not a transfer', () => {
    expect(classifyFlow('Transfer to Savings 9921', -800, 'bank')).toBe('savings');
    expect(classifyFlow('TRANSFER TO VANGUARD BROKERAGE', -2000, 'bank')).toBe('savings');
  });

  it('calls the arriving half a transfer, which is what stops double counting', () => {
    // Inbound on the savings account. If this were also 'savings' the same
    // $800 would be counted twice the moment both accounts are loaded.
    expect(classifyFlow('Transfer from Checking 8841', 800, 'bank')).toBe('transfer');
  });
});

describe('category precedence', () => {
  it('puts a taught rule above the issuer own column', () => {
    const result = classify({
      ...base,
      description: 'SQ *BLUE DOOR COFFEE',
      counterpartyKey: 'blue door coffee',
      issuerCategory: 'Merchandise',
      rules: { 'blue door coffee': 'dining' },
    });
    expect(result.categoryCode).toBe('dining');
    expect(result.categorySource).toBe('user_set');
    expect(result.reviewState).toBe('none');
  });

  it('lets a taught rule settle the flow, so a transfer can be marked savings', () => {
    const result = classify({
      ...base,
      description: 'ZELLE TO FIDELITY',
      counterpartyKey: 'zelle fidelity',
      rules: { 'zelle fidelity': 'savings' },
    });
    expect(result.flow).toBe('savings');
  });

  it('ignores a taught rule naming a category that no longer exists', () => {
    const result = classify({
      ...base, description: 'CUB FOODS', counterpartyKey: 'cub foods',
      rules: { 'cub foods': 'a_category_since_deleted' },
    });
    expect(result.categoryCode).toBe('groceries');
    expect(result.categorySource).toBe('rule_matched');
  });

  it('uses the issuer column before its own patterns', () => {
    const result = classify({
      ...base, description: 'ZZQQ UNKNOWN', counterpartyKey: 'zzqq',
      issuerCategory: 'Travel-Airline',
    });
    expect(result.categoryCode).toBe('travel');
    expect(result.categorySource).toBe('issuer_provided');
  });

  it('ignores an issuer column that says nothing useful', () => {
    const result = classify({
      ...base, description: 'CUB FOODS #1234', counterpartyKey: 'cub foods',
      issuerCategory: 'Other',
    });
    expect(result.categoryCode).toBe('groceries');
    expect(result.categorySource).toBe('rule_matched');
  });

  it('does not push a paycheck through the merchant patterns', () => {
    // "ACME CORP DIRECT DEP" would otherwise match whatever the employer's
    // name resembles.
    const result = classify({
      ...base, description: 'ACME CORP DIRECT DEP PPD', amount: 5240, counterpartyKey: 'acme corp',
    });
    expect(result.categoryCode).toBe('income');
    expect(result.flow).toBe('income');
  });
});

describe('what gets flagged, and why', () => {
  it('flags a row nothing could place, with a plain reason', () => {
    const result = classify({ ...base, description: 'ZZQQ VENDOR 88', counterpartyKey: 'zzqq vendor' });
    expect(result.categoryCode).toBe('other');
    expect(result.reviewState).toBe('needs_review');
    expect(result.reviewReason).toMatch(/could not tell/i);
  });

  it('says so when the payee is a person', () => {
    const result = classify({ ...base, description: 'VENMO PAYMENT JORDAN', counterpartyKey: 'venmo jordan' });
    expect(result.reviewState).toBe('needs_review');
    expect(result.reviewReason).toMatch(/person/i);
  });

  it('says so when it is a check', () => {
    const result = classify({ ...base, description: 'CHECK #1041', counterpartyKey: 'check' });
    expect(result.reviewState).toBe('needs_review');
    expect(result.reviewReason).toMatch(/check/i);
  });

  it('flags a transfer it could not trace to an account', () => {
    const result = classify({ ...base, description: 'ACCOUNT TO ACCOUNT XFER', counterpartyKey: 'xfer' });
    expect(result.flow).toBe('transfer');
    expect(result.reviewState).toBe('none');  // SELF_TRANSFER named it
  });

  it('does not flag something it placed confidently', () => {
    const result = classify({ ...base, description: 'CUB FOODS #1234 SAVAGE MN', counterpartyKey: 'cub foods' });
    expect(result.reviewState).toBe('none');
    expect(result.reviewReason).toBeNull();
  });
});
