import { describe, expect, it } from 'vitest';
import { cleanCounterparty, merchantKey } from './counterparty';

describe('processor prefixes', () => {
  it.each([
    ['SQ *BLUE DOOR COFFEE', 'blue door coffee'],
    ['TST* HANNAH BISTRO', 'hannah bistro'],
    ['PAYPAL *STEAM GAMES', 'steam games'],
    ['SP  * THREAD WALLETS', 'thread wallets'],
    ['TOAST* PIZZERIA LOLA', 'pizzeria lola'],
  ])('takes the processor off %s without eating the merchant', (raw, key) => {
    // The old merchantKey stripped the star-plus-name as a reference code,
    // which removed the merchant and kept the processor.
    expect(merchantKey(raw)).toBe(key);
  });

  it('no longer collapses unrelated merchants into one processor key', () => {
    expect(merchantKey('PAYPAL *STEAM GAMES')).not.toBe(merchantKey('PAYPAL *ETSY SELLER'));
  });
});

describe('store numbers, cities and codes', () => {
  it('drops a store number', () => {
    expect(merchantKey('STARBUCKS STORE 08812')).toBe('starbucks');
  });

  it('drops a trailing city and state', () => {
    expect(merchantKey('CUB FOODS #1234 SAVAGE MN')).toBe('cub foods');
  });

  it('keeps a word that only looks like a city', () => {
    // MILLS is not a state code, so nothing licenses removing it.
    expect(merchantKey('GENERAL MILLS')).toBe('general mills');
  });

  it('gives two branches of one chain the same key', () => {
    expect(merchantKey('STARBUCKS #04821 SEATTLE WA'))
      .toBe(merchantKey('STARBUCKS #11902 MINNEAPOLIS MN'));
  });

  it('drops rail noise', () => {
    expect(merchantKey('PURCHASE AUTHORIZED ON 09/14 WHOLE FOODS')).toBe('whole foods');
    expect(merchantKey('XCEL ENERGY AUTOPAY')).toBe('xcel energy');
  });

  it('survives a description that is only a code', () => {
    const c = cleanCounterparty('4829183');
    expect(c.key).toBe('4829183');
    expect(c.name).toBe('4829183');
  });
});

describe('display name', () => {
  it('reads as a name, not as a receipt', () => {
    expect(cleanCounterparty('CUB FOODS #1234 SAVAGE MN').name).toBe('Cub Foods');
    expect(cleanCounterparty('SQ *BLUE DOOR COFFEE').name).toBe('Blue Door Coffee');
  });

  it('takes the household rename when there is one', () => {
    const aliases = new Map([['cub foods', "Cub (Sarah's card)"]]);
    expect(cleanCounterparty('CUB FOODS #1234 SAVAGE MN', aliases).name).toBe("Cub (Sarah's card)");
  });

  it('keys the rename on the cleaned key, so it survives a new phrasing', () => {
    const aliases = { 'cub foods': 'Cub' };
    expect(cleanCounterparty('CUB FOODS 5567 EDINA MN', aliases).name).toBe('Cub');
  });
});
