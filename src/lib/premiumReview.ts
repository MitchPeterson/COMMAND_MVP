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

const LINE_LABEL: Record<string, string> = {
  home: 'Home', auto: 'Auto', umbrella: 'Umbrella', life: 'Life',
  disability: 'Disability', renters: 'Renters', other: 'Other',
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

  // ── Where the money actually goes ──────────────────────────────────────────
  //
  // This replaced a cost-per-$1,000-of-cover comparison, which was a metric
  // that looked analytical and was not: it invited a comparison between lines
  // in the same sentence that admitted the lines are not comparable, and it
  // offered no sense of what any figure should be. A share of the household's
  // own premium needs no benchmark to be read — it answers "where is my money
  // going", which is a question the data can actually settle.
  if (priced.length >= 2) {
    const byLine = new Map<string, number>();
    for (const p of priced) {
      const line = lineOf(p.type);
      byLine.set(line, (byLine.get(line) ?? 0) + (p.annual_premium ?? 0));
    }
    const rows = [...byLine.entries()]
      .map(([line, amount]) => ({ line, amount, share: Math.round((amount / annualTotal) * 100) }))
      .sort((a, b) => b.amount - a.amount);
    findings.push({
      id: 'premium-mix',
      severity: 'context',
      title: 'Where your premium goes',
      detail: rows
        .map((r) => `${LINE_LABEL[r.line] ?? r.line}: ${money(r.amount)} (${r.share}%)`)
        .join(' · ')
        + `. Covers ${priced.length} of ${policies.length} policies on file`
        + (policies.length - priced.length > 0 ? ', the rest having no premium recorded.' : '.'),
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

export interface MarketShareInput {
  naic_group_code: number;
  group_name: string;
  line: string;
  scope: string;
  data_year: number;
  market_share_pct: number | null;
  source: string;
}

export interface ShoppingCandidate {
  name: string;
  /** The verified fact that earns it a place. Never an opinion about price. */
  evidence: string;
  /** Command's own note. Distinguished from evidence on purpose. */
  note?: string;
  marketSharePct: number | null;
  naicGroupCode: number | null;
}

/** How Command describes a carrier it has no market data for. */
const NOTES: Record<string, string> = {
  'AUTO OWNERS GRP': 'Sold through independent agents',
  'AMICA MUT GRP': 'Sold direct',
  'CHUBB LTD GRP': 'Aimed at higher-value homes',
  'ERIE INS GRP': 'Regional — check it writes in your state',
  'USAA GRP': 'Military service required',
  'UNITED SERV AUTOMOBILE ASSN GRP': 'Military service required',
};

/** What a household calls these companies, where the NAIC's name is not it. */
const DISPLAY_NAME: Record<string, string> = {
  'UNITED SERV AUTOMOBILE ASSN GRP': 'USAA',
  'BERKSHIRE HATHAWAY GRP': 'GEICO (Berkshire Hathaway)',
  'AMERICAN INTL GRP': 'AIG',
  'CHUBB LTD GRP': 'Chubb',
  'NATIONWIDE CORP GRP': 'Nationwide',
  'HARTFORD FIRE & CAS GRP': 'The Hartford',
  'AUTO OWNERS GRP': 'Auto-Owners',
  'ALLSTATE INS GRP': 'Allstate',
  'FARMERS INS GRP': 'Farmers',
  'LIBERTY MUT GRP': 'Liberty Mutual',
  'AMERICAN FAMILY INS GRP': 'American Family',
  'ERIE INS GRP': 'Erie',
  'AMICA MUT GRP': 'Amica',
  'CINCINNATI FIN GRP': 'Cincinnati',
  'TRAVELERS GRP': 'Travelers',
  'STATE FARM GRP': 'State Farm',
  'PROGRESSIVE GRP': 'Progressive',
};

/** How the line reads in a sentence about the market. */
const MARKET_LABEL: Record<string, string> = {
  home: 'homeowners', auto: 'auto', umbrella: 'umbrella',
};

const TITLE_CASE = (name: string): string => name
  .replace(/\bGRP\b/g, '')
  .toLowerCase()
  .replace(/\b[a-z]/g, (c) => c.toUpperCase())
  .replace(/\bIns\b/g, 'Insurance')
  .replace(/\bMut\b/g, 'Mutual')
  .replace(/\bFin\b/g, 'Financial')
  .trim();

/**
 * Who to get quotes from, ranked by how much of the line they actually write.
 *
 * Market share is a verified fact about presence, not a claim about price —
 * Command has no pricing data and a large carrier is not necessarily a cheap
 * one. It is used for ranking because "writes a lot of this insurance" is the
 * strongest thing public data can say about whether a carrier is worth a call.
 *
 * The household's own group is removed so nobody is quoted by the company they
 * already have.
 */
export function shoppingCandidates(
  policies: InsurancePolicy[],
  market: MarketShareInput[] = [],
  limit = 4,
): ShoppingCandidate[] {
  const lines = new Set(policies.map((p) => lineOf(p.type)));
  const held = new Set(
    policies.map((p) => carrierGroup(p.carrier).naicGroupCode).filter((c): c is number => c != null),
  );

  // Only lines Command holds market data for. Life and disability are not in
  // the property/casualty report, so nothing is recommended for them rather
  // than something being invented.
  const wanted = [...lines].filter((line) => market.some((m) => m.line === line));
  if (wanted.length === 0) return [];

  const best = new Map<number, MarketShareInput>();
  for (const row of market) {
    if (!wanted.includes(row.line)) continue;
    if (held.has(row.naic_group_code)) continue;
    const current = best.get(row.naic_group_code);
    if (!current || (row.market_share_pct ?? 0) > (current.market_share_pct ?? 0)) {
      best.set(row.naic_group_code, row);
    }
  }

  return [...best.values()]
    .sort((a, b) => (b.market_share_pct ?? 0) - (a.market_share_pct ?? 0))
    .slice(0, limit)
    .map((row) => ({
      name: DISPLAY_NAME[row.group_name] ?? TITLE_CASE(row.group_name),
      evidence: `${row.market_share_pct}% of the US ${MARKET_LABEL[row.line] ?? row.line} market, ${row.data_year}`,
      note: NOTES[row.group_name],
      marketSharePct: row.market_share_pct,
      naicGroupCode: row.naic_group_code,
    }));
}
