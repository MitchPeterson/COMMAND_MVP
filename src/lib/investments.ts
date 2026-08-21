// What the household holds, and how it is taxed.
//
// What this is not, and the boundary matters more here than anywhere else in
// Command: it is not investment advice, a return projection, a view on any
// holding, or an opinion on whether an allocation is right. Command has no
// market data and no business having a view. Every figure here is arithmetic
// over what the household recorded, and every one carries the date it was
// recorded on.
//
// What it can honestly say: how the money is split by asset class, which tax
// bucket each dollar sits in, and when one company is a large share of the
// whole. That last one is a fact about concentration, not a recommendation to
// sell -- an employer's stock being a quarter of a portfolio is worth knowing
// whether or not anybody thinks it should be.

import type { FinanceAccount } from './supabase';

export type AssetClass = 'us_equity' | 'intl_equity' | 'bonds' | 'cash' | 'real_assets' | 'crypto' | 'other';
export type TaxTreatment = 'taxable' | 'tax_deferred' | 'tax_free' | 'hsa' | 'education';

export interface Holding {
  id: string;
  account_id: string;
  symbol: string | null;
  name: string;
  asset_class: AssetClass;
  is_single_security: boolean;
  value: number | null;
  cost_basis: number | null;
  as_of: string | null;
}

export const ASSET_LABEL: Record<AssetClass, string> = {
  us_equity: 'US stocks',
  intl_equity: 'International stocks',
  bonds: 'Bonds',
  cash: 'Cash and equivalents',
  real_assets: 'Real assets',
  crypto: 'Crypto',
  other: 'Other',
};

export const TAX_LABEL: Record<TaxTreatment, string> = {
  taxable: 'Taxable',
  tax_deferred: 'Tax-deferred',
  tax_free: 'Tax-free',
  hsa: 'HSA',
  education: 'Education (529)',
};

/** Account types that hold investments rather than spending money. */
const INVESTED_TYPES = ['brokerage', 'retirement', 'education', 'hsa', 'investment'];

export const isInvested = (account: FinanceAccount): boolean =>
  INVESTED_TYPES.some((t) => (account.account_type ?? '').toLowerCase().includes(t));

export interface TaxBucket {
  treatment: TaxTreatment;
  label: string;
  value: number;
  share: number;
  /** True when Command worked it out rather than being told. */
  inferred: boolean;
}

/**
 * Where an account sits for tax, from the column when it is set and from the
 * account's own type and name when it is not.
 *
 * The inference is stated rather than hidden: a 401(k) and a Roth are both
 * "retirement" and are taxed in opposite directions, so a household should know
 * when Command guessed which one it is looking at.
 */
export function taxTreatmentOf(account: FinanceAccount & { tax_treatment?: TaxTreatment | null }): {
  treatment: TaxTreatment; inferred: boolean;
} {
  if (account.tax_treatment) return { treatment: account.tax_treatment, inferred: false };
  const text = `${account.account_type ?? ''} ${account.account_name ?? ''}`.toLowerCase();
  if (text.includes('529') || text.includes('education')) return { treatment: 'education', inferred: true };
  if (text.includes('hsa')) return { treatment: 'hsa', inferred: true };
  if (text.includes('roth')) return { treatment: 'tax_free', inferred: true };
  if (/401|403|457|ira|pension|retirement/.test(text)) return { treatment: 'tax_deferred', inferred: true };
  return { treatment: 'taxable', inferred: true };
}

export interface InvestmentPicture {
  /** Every account Command counts as invested. */
  accounts: Array<FinanceAccount & { tax_treatment?: TaxTreatment | null }>;
  total: number;
  /** Allocation across asset classes, largest first. Empty without holdings. */
  allocation: Array<{ assetClass: AssetClass; label: string; value: number; share: number }>;
  /** Total covered by holdings, which is usually less than every balance. */
  holdingsCovered: number;
  taxBuckets: TaxBucket[];
  /** Any one company worth more than a tenth of the whole. */
  concentrations: Array<{ name: string; symbol: string | null; value: number; share: number }>;
  /** The oldest as-of date behind any figure, so staleness is visible. */
  oldestAsOf: string | null;
  anyInferredTax: boolean;
}

export function buildInvestmentPicture(
  accounts: Array<FinanceAccount & { tax_treatment?: TaxTreatment | null }>,
  holdings: Holding[],
  concentrationFloor = 0.1,
): InvestmentPicture {
  const invested = accounts.filter(isInvested);
  const total = invested.reduce((sum, a) => sum + (a.balance ?? 0), 0);

  const byClass = new Map<AssetClass, number>();
  let holdingsCovered = 0;
  for (const holding of holdings) {
    const value = holding.value ?? 0;
    if (value <= 0) continue;
    holdingsCovered += value;
    byClass.set(holding.asset_class, (byClass.get(holding.asset_class) ?? 0) + value);
  }
  const allocation = [...byClass.entries()]
    .map(([assetClass, value]) => ({
      assetClass,
      label: ASSET_LABEL[assetClass],
      value,
      share: holdingsCovered > 0 ? Math.round((value / holdingsCovered) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const buckets = new Map<TaxTreatment, { value: number; inferred: boolean }>();
  let anyInferredTax = false;
  for (const account of invested) {
    const { treatment, inferred } = taxTreatmentOf(account);
    if (inferred) anyInferredTax = true;
    const current = buckets.get(treatment) ?? { value: 0, inferred: false };
    buckets.set(treatment, { value: current.value + (account.balance ?? 0), inferred: current.inferred || inferred });
  }
  const taxBuckets = [...buckets.entries()]
    .map(([treatment, b]) => ({
      treatment,
      label: TAX_LABEL[treatment],
      value: b.value,
      share: total > 0 ? Math.round((b.value / total) * 1000) / 10 : 0,
      inferred: b.inferred,
    }))
    .sort((a, b) => b.value - a.value);

  // Concentration is measured against everything invested, not just the part
  // holdings cover -- otherwise a single recorded position looks like 100%.
  const single = new Map<string, { symbol: string | null; value: number }>();
  for (const holding of holdings) {
    if (!holding.is_single_security) continue;
    const key = holding.symbol ?? holding.name;
    const current = single.get(key) ?? { symbol: holding.symbol, value: 0 };
    single.set(key, { symbol: current.symbol, value: current.value + (holding.value ?? 0) });
  }
  const concentrations = [...single.entries()]
    .map(([name, s]) => ({
      name,
      symbol: s.symbol,
      value: s.value,
      share: total > 0 ? Math.round((s.value / total) * 1000) / 10 : 0,
    }))
    .filter((c) => total > 0 && c.value / total >= concentrationFloor)
    .sort((a, b) => b.value - a.value);

  const dates = [
    ...invested.map((a) => a.as_of_date),
    ...holdings.map((h) => h.as_of),
  ].filter((d): d is string => Boolean(d)).sort();

  return {
    accounts: invested,
    total,
    allocation,
    holdingsCovered,
    taxBuckets,
    concentrations,
    oldestAsOf: dates[0] ?? null,
    anyInferredTax,
  };
}
