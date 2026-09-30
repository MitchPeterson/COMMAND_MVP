import { describe, expect, it } from 'vitest';
import {
  CATEGORIES, allCategories, categoryByCode, categoryFromDescription,
  categoryFromLabel, isCommittedCategory, isVariableCategory, kindOf,
} from './taxonomy';

describe('the list is internally consistent', () => {
  it('has no duplicate codes', () => {
    const codes = CATEGORIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('orders aliases over exactly the same codes it defines', () => {
    // The two orders may disagree about precedence. They must never disagree
    // about what exists -- that is how four lists drifted apart in the first
    // place.
    expect(new Set(allCategories().map((c) => c.code)))
      .toEqual(new Set(CATEGORIES.map((c) => c.code)));
    expect(allCategories()).toHaveLength(CATEGORIES.length);
  });

  it('gives every category a kind', () => {
    for (const c of CATEGORIES) {
      expect(['income', 'expense', 'savings', 'transfer']).toContain(c.kind);
    }
  });
});

describe('categoryFromLabel replaces categoryGroup', () => {
  it.each([
    ['Groceries', 'groceries'],
    ['Merchandise & Supplies-Groceries', 'groceries'],   // an issuer's wording
    ['Travel-Airline', 'travel'],
    ['Loan payments', 'housing'],
    ['Fees and interest', 'fees'],
  ])('reads %j as %j, as it always did', (input, code) => {
    expect(categoryFromLabel(input).code).toBe(code);
  });

  it('keeps "not read" and "read but unrecognised" apart', () => {
    expect(categoryFromLabel('').code).toBe('uncategorized');
    expect(categoryFromLabel(null).code).toBe('uncategorized');
    expect(categoryFromLabel('ZZQQ').code).toBe('other');
  });

  it('resolves a stored code without going through the aliases', () => {
    expect(categoryFromLabel('home_services').code).toBe('home_services');
    expect(categoryFromLabel('housing').code).toBe('housing');
  });

  it('FIXED: home_services is reachable at last', () => {
    // It was shadowed by the home group for its whole existence, because
    // "home_services" contains "home" and home was tested first.
    expect(categoryFromLabel('contractor').code).toBe('home_services');
    expect(categoryFromLabel('lawn').code).toBe('home_services');
  });

  it('still puts a home loan in housing rather than hardware', () => {
    expect(categoryFromLabel('Home loan').code).toBe('housing');
  });
});

describe('categoryFromDescription replaces categorize', () => {
  it.each([
    ['TRADER JOES #712', 'groceries'],
    ['MCDONALDS F1234', 'dining'],
    ['SHELL SERVICE STATION', 'gas'],
    ['NETFLIX.COM 866-579-7172', 'entertainment'],
    ['XCEL ENERGY AUTOPAY', 'utilities'],
    ['HOME DEPOT #2841', 'home'],
    ['MORTGAGE PAYMENT WELLS FARGO', 'housing'],
    ['ADOBE CREATIVE CLOUD', 'subscriptions'],
  ])('reads %s as %s', (description, code) => {
    expect(categoryFromDescription(description)?.code).toBe(code);
  });

  it('keeps a gym in entertainment, not subscriptions', () => {
    // "PLANET FITNESS MEMBERSHIP" matches both. Matcher order decides, and
    // entertainment first is why a gym is a gym.
    expect(categoryFromDescription('PLANET FITNESS MEMBERSHIP')?.code).toBe('entertainment');
  });

  it('does not match a prefix inside a longer word', () => {
    expect(categoryFromDescription('GASKET SUPPLY CO')?.code).not.toBe('gas');
  });

  it('returns null rather than guessing', () => {
    expect(categoryFromDescription('ZZQQ UNKNOWN VENDOR')).toBeNull();
  });
});

describe('the properties that replaced two whole lists', () => {
  it('knows which categories are bills whose amount moves', () => {
    // Was BILL_CATEGORIES in recurring.ts.
    expect(isVariableCategory('utilities')).toBe(true);
    expect(isVariableCategory('insurance')).toBe(true);
    expect(isVariableCategory('subscriptions')).toBe(true);
    expect(isVariableCategory('housing')).toBe(true);
    // A restaurant repeating for a different amount is not a bill.
    expect(isVariableCategory('dining')).toBe(false);
    expect(isVariableCategory('entertainment')).toBe(false);
  });

  it('knows which categories cannot be cancelled next month', () => {
    // Was COMMITTED in spendingInsights.ts.
    expect(isCommittedCategory('housing')).toBe(true);
    expect(isCommittedCategory('insurance')).toBe(true);
    expect(isCommittedCategory('taxes')).toBe(true);
    expect(isCommittedCategory('fees')).toBe(true);
    expect(isCommittedCategory('subscriptions')).toBe(false);
    expect(isCommittedCategory('dining')).toBe(false);
  });

  it('knows what each category does to the totals', () => {
    expect(kindOf('groceries')).toBe('expense');
    expect(kindOf('income')).toBe('income');
    expect(kindOf('savings')).toBe('savings');
    expect(kindOf('transfer')).toBe('transfer');
  });

  it('treats an unknown code as an expense rather than dropping it', () => {
    expect(kindOf('something_a_household_invented')).toBe('expense');
    expect(categoryByCode('nope')).toBeNull();
  });
});
