// Whether it is worth shopping this insurance.
//
// The honest constraint first: Command holds no pricing data. It does not know
// what a household in Edina should pay to insure a $985,000 house, and nothing
// here pretends to. "You are overpaying" is a claim about a market Command
// cannot see, and inventing a benchmark to make the product feel smarter would
// be the single most damaging thing it could do.
//
// What it can see is the household's own paperwork, and that turns out to carry
// most of the signals that actually send someone to get quotes:
//
//   - a premium that went up at renewal, read from two declarations pages
//   - home and auto sitting with different carriers, where the market almost
//     always discounts having both
//   - a renewal date close enough that quotes are worth gathering now
//   - a policy that has been rolling for years without being tested
//   - what each policy costs per thousand dollars of cover, next to its peers
//
// Every one of those is a fact about the documents. None of them says what
// anything ought to cost, and none estimates a saving.

import type { InsurancePolicy, InsurancePolicyExtraction } from './supabase';
import { carrierGroup, sameCarrier } from './carriers';

export type PremiumSeverity = 'act' | 'consider' | 'context';

export interface PremiumFinding {
  id: string;
  severity: PremiumSeverity;
  title: string;
  detail: string;
  /** What the household would do about it, in their words. */
  action?: string;
}

export interface PremiumReview {
  annualTotal: number;
  /** Policies whose premium Command could read. */
  priced: number;
  /** Policies on file with no premium recorded. */
  unpriced: number;
  findings: PremiumFinding[];
  /** True when nothing on file carries a premium, so the total means nothing. */
  blind: boolean;
}

const money = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const daysUntil = (date: string | null | undefined, now: Date): number | null => {
  if (!date) return null;
  const when = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(when.getTime())) return null;
  return Math.round((when.getTime() - now.getTime()) / 86400000);
};

/** home / auto / umbrella and the rest, normalized across the three vocabularies. */
function lineOf(value: string | null | undefined): string {
  const v = (value ?? '').toLowerCase();
  if (v.includes('home') || v.includes('dwelling') || v.includes('property')) return 'home';
  if (v.includes('auto') || v.includes('vehicle') || v.includes('car')) return 'auto';
  if (v.includes('umbrella') || v.includes('excess')) return 'umbrella';
  if (v.includes('life')) return 'life';
  if (v.includes('disab')) return 'disability';
  if (v.includes('renter')) return 'renters';
  return v || 'other';
}

export function reviewPremiums(
  policies: InsurancePolicy[],
  extractions: InsurancePolicyExtraction[],
  now: Date = new Date(),
): PremiumReview {
  const findings: PremiumFinding[] = [];
  const priced = policies.filter((p) => (p.annual_premium ?? 0) > 0);
  const annualTotal = priced.reduce((sum, p) => sum + (p.annual_premium ?? 0), 0);

  // ── A premium that moved, read from two readings of the same policy ────────
  //
  // The strongest reason to shop, and the only one here that is evidence of a
  // change rather than a standing condition.
  const byNumber = new Map<string, InsurancePolicyExtraction[]>();
  for (const extraction of extractions) {
    const key = (extraction.policy_number ?? '').trim().toLowerCase();
    if (!key || extraction.annual_premium == null) continue;
    byNumber.set(key, [...(byNumber.get(key) ?? []), extraction]);
  }
  for (const versions of byNumber.values()) {
    if (versions.length < 2) continue;
    const ordered = [...versions].sort(
      (a, b) => (a.effective_date ?? '').localeCompare(b.effective_date ?? ''),
    );
    const before = ordered[0];
    const after = ordered[ordered.length - 1];
    if (before.effective_date === after.effective_date) continue;
    const from = before.annual_premium!;
    const to = after.annual_premium!;
    if (from <= 0 || to <= from) continue;
    const pct = Math.round(((to - from) / from) * 100);
    if (pct < 5) continue;
    findings.push({
      id: `increase:${after.policy_number}`,
      severity: 'act',
      title: `${after.carrier ?? 'A policy'} went up ${pct}% at renewal`,
      detail: `${money(from)} a year on the ${before.effective_date ?? 'earlier'} declarations, `
        + `${money(to)} on the ${after.effective_date ?? 'later'} one. Command reports the change; `
        + 'why it happened is a question for the carrier.',
      action: 'Ask what drove it, and get comparison quotes before the next renewal.',
    });
  }

  // ── Home and auto with different carriers ──────────────────────────────────
  const homePolicy = policies.find((p) => lineOf(p.type) === 'home');
  const autoPolicy = policies.find((p) => lineOf(p.type) === 'auto');
  if (homePolicy && autoPolicy && !sameCarrier(homePolicy.carrier, autoPolicy.carrier)) {
    findings.push({
      id: 'unbundled',
      severity: 'consider',
      title: 'Your home and auto are with different carriers',
      detail: `Home is with ${homePolicy.carrier ?? 'one carrier'} and auto with ${autoPolicy.carrier ?? 'another'}. `
        + 'Carriers commonly discount writing both, so a quote for the pair is worth having '
        + 'alongside the separate ones. Whether it works out cheaper depends on their numbers, '
        + 'which Command cannot see.',
      action: 'Ask each carrier to quote both lines together.',
    });
  }

  // ── Renewals close enough to be worth quoting now ──────────────────────────
  const renewing = policies
    .map((p) => ({ policy: p, days: daysUntil(p.renewal_date, now) }))
    .filter((r): r is { policy: InsurancePolicy; days: number } => r.days != null && r.days >= 0 && r.days <= 60)
    .sort((a, b) => a.days - b.days);
  if (renewing.length > 0) {
    const soonest = renewing[0];
    findings.push({
      id: 'renewing',
      severity: 'act',
      title: renewing.length === 1
        ? `${soonest.policy.carrier ?? 'A policy'} renews in ${soonest.days} days`
        : `${renewing.length} policies renew within 60 days`,
      detail: 'Quotes take a few days to gather and a carrier will not usually backdate one. '
        + 'This is the window where shopping is still useful rather than academic.',
      action: 'Gather quotes now, while there is still time to switch.',
    });
  }

  // ── Rolling for years without being tested ─────────────────────────────────
  for (const extraction of extractions) {
    const years = extraction.effective_date
      ? (now.getTime() - new Date(`${extraction.effective_date}T00:00:00Z`).getTime()) / (365.25 * 86400000)
      : null;
    if (years == null || years < 3) continue;
    findings.push({
      id: `stale:${extraction.id}`,
      severity: 'consider',
      title: `${extraction.carrier ?? 'A policy'} has been in place ${Math.floor(years)} years`,
      detail: 'A policy that renews automatically is never re-priced against the market. '
        + 'Command is not saying it is expensive — only that it has not been checked.',
      action: 'Worth one round of quotes to see where it stands.',
    });
  }

  // ── What each policy costs per thousand of cover ───────────────────────────
  //
  // Reported, never judged. It compares a household's policies with each other,
  // which is the only comparison the data supports.
  const comparable = policies.filter(
    (p) => (p.annual_premium ?? 0) > 0 && (p.coverage_amount ?? 0) > 0,
  );
  if (comparable.length >= 2) {
    const rows = comparable
      .map((p) => ({
        label: `${p.carrier ?? 'Policy'} ${p.type}`,
        rate: (p.annual_premium! / p.coverage_amount!) * 1000,
      }))
      .sort((a, b) => b.rate - a.rate);
    findings.push({
      id: 'rate-per-thousand',
      severity: 'context',
      title: 'What each policy costs per $1,000 of cover',
      detail: rows
        .map((r) => `${r.label}: $${r.rate.toFixed(2)}`)
        .join(' · ')
        + '. Different lines cover different risks, so these are not directly comparable — '
        + 'they are here because a figure that is far out of line with the others is worth asking about.',
    });
  }

  const unpriced = policies.length - priced.length;
  if (unpriced > 0) {
    findings.push({
      id: 'unpriced',
      severity: 'context',
      title: `${unpriced} polic${unpriced === 1 ? 'y has' : 'ies have'} no premium on file`,
      detail: 'The total below excludes them, so it is lower than what the household actually pays. '
        + 'A declarations page carries the figure.',
    });
  }

  const order: Record<PremiumSeverity, number> = { act: 0, consider: 1, context: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  return { annualTotal, priced: priced.length, unpriced, findings, blind: priced.length === 0 };
}

// ── Who to ask ────────────────────────────────────────────────────────────────
//
// Not a ranking, and not based on price — Command has no pricing data and no way
// to know who is competitive for one household. This is a list of carriers that
// write these lines widely in the US, with the household's current group removed
// so nobody wastes a call getting quoted by the company they already have.

interface CarrierOption {
  name: string;
  lines: string[];
  note: string;
}

const CARRIERS: CarrierOption[] = [
  { name: 'State Farm', lines: ['home', 'auto', 'umbrella', 'life'], note: 'Agent-based, writes most lines' },
  { name: 'Auto-Owners', lines: ['home', 'auto', 'umbrella'], note: 'Independent agents only' },
  { name: 'Travelers', lines: ['home', 'auto', 'umbrella'], note: 'Often competitive on bundled home and auto' },
  { name: 'Erie', lines: ['home', 'auto', 'umbrella'], note: 'Regional; check availability in your state' },
  { name: 'Amica', lines: ['home', 'auto', 'umbrella'], note: 'Direct, consistently high service ratings' },
  { name: 'Chubb', lines: ['home', 'umbrella'], note: 'Aimed at higher-value homes' },
  { name: 'Progressive', lines: ['home', 'auto', 'umbrella'], note: 'Direct and through agents' },
  { name: 'Nationwide', lines: ['home', 'auto', 'umbrella', 'life'], note: 'Agent-based' },
  { name: 'USAA', lines: ['home', 'auto', 'umbrella', 'life'], note: 'Military service required' },
  { name: 'American Family', lines: ['home', 'auto', 'umbrella'], note: 'Agent-based, mostly central and western states' },
];

export interface ShoppingCandidate {
  name: string;
  note: string;
}

/**
 * Carriers to ask for a quote, for the lines this household actually carries,
 * excluding whoever writes them now.
 */
export function shoppingCandidates(policies: InsurancePolicy[], limit = 5): ShoppingCandidate[] {
  const lines = new Set(policies.map((p) => lineOf(p.type)));
  const held = new Set(
    policies.map((p) => carrierGroup(p.carrier).key).filter((key) => key.length > 0),
  );
  return CARRIERS
    .filter((c) => c.lines.some((line) => lines.has(line)))
    .filter((c) => !held.has(carrierGroup(c.name).key))
    .slice(0, limit)
    .map((c) => ({ name: c.name, note: c.note }));
}
