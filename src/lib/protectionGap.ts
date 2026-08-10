// What the family would need if a parent died, against what is actually in force.
//
// Every input comes from something the household already gave Command: income
// and net worth from the profile, the mortgage balance from the loan record,
// children's ages from family members, and life coverage from the policies
// extracted out of their own documents.
//
// The assumptions that are *not* theirs are named on screen with the number
// beside them, because the answer moves a long way on each. A protection gap
// stated as a single confident figure would be the most misleading number in
// Command — it is a method, not a fact, and the UI shows the arithmetic.

import type { FamilyMember, HouseholdProfile, InsurancePolicy, MortgageAccount } from './supabase';
import { yearsToIndependence } from './familyTimeline';

export interface GapComponent {
  label: string;
  amount: number;
  basis: string;
  /** True when the figure rests on an assumption rather than the household's data. */
  assumed: boolean;
}

export interface ProtectionGapResult {
  /** Null when there is nobody financially dependent, which makes the question moot. */
  need: number | null;
  coverage: number;
  gap: number | null;
  needComponents: GapComponent[];
  offsetComponents: GapComponent[];
  policies: InsurancePolicy[];
  yearsOfSupport: number | null;
  dependents: number;
  /** What Command could not see, which bounds how much the figure is worth. */
  caveats: string[];
}

/**
 * A four-year public in-state degree at today's prices, used only where the
 * household has not said otherwise. Deliberately round: a precise-looking
 * education figure invites more confidence than the estimate deserves.
 */
export const EDUCATION_PER_CHILD = 120_000;

/** Funeral, estate administration and the immediate months after a death. */
export const FINAL_EXPENSES = 25_000;

export function computeProtectionGap(
  members: FamilyMember[],
  profile: HouseholdProfile | null | undefined,
  policies: InsurancePolicy[],
  mortgage: MortgageAccount | null | undefined,
): ProtectionGapResult {
  const caveats: string[] = [];

  const children = members.filter((m) =>
    ['child', 'son', 'daughter'].includes((m.relationship ?? '').toLowerCase()));
  const yearsOfSupport = yearsToIndependence(members);
  const income = profile?.household_income ?? null;

  const lifePolicies = policies.filter((p) => p.type === 'life');
  const coverage = lifePolicies.reduce((sum, p) => sum + (p.coverage_amount ?? 0), 0);

  // ── Nothing to protect against ─────────────────────────────────────────────
  if (children.length === 0) {
    return {
      need: null, coverage, gap: null,
      needComponents: [], offsetComponents: [], policies: lifePolicies,
      yearsOfSupport: null, dependents: 0,
      caveats: ['No children recorded, so there is no dependency period to cover.'],
    };
  }

  // ── What would be needed ───────────────────────────────────────────────────
  const needComponents: GapComponent[] = [];

  if (income != null && yearsOfSupport != null) {
    // Replacing the whole household income overstates it — one earner's death
    // does not remove both incomes, and the household is one person smaller.
    // 70% is the conventional planning figure and is named as such.
    const replacementRate = 0.7;
    needComponents.push({
      label: 'Income replacement',
      amount: Math.round(income * replacementRate * yearsOfSupport),
      basis:
        `${Math.round(replacementRate * 100)}% of $${income.toLocaleString()} for ${yearsOfSupport} years, ` +
        `until your youngest is 22`,
      assumed: true,
    });
  } else {
    caveats.push(
      income == null
        ? 'Household income is not recorded, so income replacement could not be included.'
        : 'No birth dates on file, so the dependency period could not be worked out.',
    );
  }

  if (mortgage?.principal_balance) {
    needComponents.push({
      label: 'Clear the mortgage',
      amount: Math.round(mortgage.principal_balance),
      basis: 'The balance on your loan record',
      assumed: false,
    });
  } else {
    caveats.push('No mortgage balance on file — if there is a loan, the need is higher than shown.');
  }

  needComponents.push({
    label: `Education for ${children.length} child${children.length === 1 ? '' : 'ren'}`,
    amount: EDUCATION_PER_CHILD * children.length,
    basis: `$${EDUCATION_PER_CHILD.toLocaleString()} each — a four-year public in-state degree at today's prices`,
    assumed: true,
  });

  needComponents.push({
    label: 'Final expenses',
    amount: FINAL_EXPENSES,
    basis: 'Funeral, estate administration and the months immediately after',
    assumed: true,
  });

  // ── What already offsets it ────────────────────────────────────────────────
  const offsetComponents: GapComponent[] = [];

  // Net worth includes the house, which cannot be spent while the family lives
  // in it. Counting it in full would understate the gap badly, so the mortgage
  // payoff above is treated as the housing answer and equity is left out.
  const liquidish = profile?.net_worth != null && profile?.home_value != null
    ? Math.max(0, profile.net_worth - profile.home_value)
    : profile?.net_worth ?? null;

  if (liquidish != null) {
    offsetComponents.push({
      label: 'Assets outside the house',
      amount: Math.round(liquidish),
      basis:
        profile?.home_value != null
          ? 'Net worth less home value — equity is excluded because the family still needs somewhere to live'
          : 'Net worth as recorded; no home value on file to exclude',
      assumed: profile?.home_value == null,
    });
  } else {
    caveats.push('Net worth is not recorded, so nothing was offset against the need.');
  }

  offsetComponents.push({
    label: 'Life insurance in force',
    amount: coverage,
    basis:
      lifePolicies.length === 0
        ? 'No life policies on file'
        : `${lifePolicies.length} polic${lifePolicies.length === 1 ? 'y' : 'ies'} on file`,
    assumed: false,
  });

  if (lifePolicies.length === 0) {
    caveats.push(
      'No life policies on file. Cover through an employer is easy to forget and is often the ' +
      'largest piece — and it usually ends when the job does.',
    );
  }

  const need = needComponents.reduce((sum, c) => sum + c.amount, 0);
  const offsets = offsetComponents.reduce((sum, c) => sum + c.amount, 0);

  caveats.push(
    'Disability is the likelier event and is not covered by any of this — a long-term disability ' +
    'policy answers a different question than life insurance does.',
  );

  return {
    need,
    coverage,
    gap: need - offsets,
    needComponents,
    offsetComponents,
    policies: lifePolicies,
    yearsOfSupport,
    dependents: children.length,
    caveats,
  };
}
