// Family health.
//
// Graded on whether the household is ready for the things its own calendar says
// are coming — not on how much has been entered. The dates come from birth
// dates, the money from documents already extracted, and every threshold is
// stated in its finding.

import type { FamilyMember, HouseholdProfile, InsurancePolicy, LegalDocument, MortgageAccount } from './supabase';
import { computeProtectionGap } from './protectionGap';
import { ageOf, familyTimeline, minorChildren, trumpAccountStanding } from './familyTimeline';
import { listOf } from './text';

export type FamilyFindingSeverity = 'critical' | 'attention' | 'info';

export interface FamilyFinding {
  severity: FamilyFindingSeverity;
  title: string;
  detail: string;
}

export interface FamilyHealthResult {
  score: number | null;
  grade: string;
  status: 'good' | 'review' | 'action_needed' | 'unknown';
  findings: FamilyFinding[];
  dataFindings: FamilyFinding[];
  confidence: 'high' | 'moderate' | 'limited';
  confidenceReason: string;
  dependents: number;
  nextEventYear: number | null;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export function computeFamilyHealth(
  members: FamilyMember[],
  profile: HouseholdProfile | null | undefined,
  policies: InsurancePolicy[],
  mortgage: MortgageAccount | null | undefined,
  legalDocuments: LegalDocument[],
): FamilyHealthResult {
  const findings: FamilyFinding[] = [];
  const dataFindings: FamilyFinding[] = [];

  const gap = computeProtectionGap(members, profile, policies, mortgage);
  const minors = minorChildren(members);
  const timeline = familyTimeline(members, profile?.state);
  const nextEventYear = timeline[0]?.year ?? null;

  // ── The protection gap ─────────────────────────────────────────────────────
  if (gap.gap != null && gap.gap > 0) {
    const severe = gap.coverage === 0 || gap.gap > (profile?.household_income ?? 0) * 5;
    findings.push({
      severity: severe ? 'critical' : 'attention',
      title:
        gap.coverage === 0
          ? `No life cover on file against a ${money(gap.need ?? 0)} need`
          : `${money(gap.gap)} short of what the family would need`,
      detail:
        `Against ${money(gap.coverage)} of cover on file. The figure rests on assumptions Command ` +
        `states beside each line — the point is the size of the gap, not the precision of the number.`,
    });
  }

  // ── Guardians ──────────────────────────────────────────────────────────────
  if (minors.length > 0) {
    const hasWill = legalDocuments.some((d) =>
      ['will', 'last_will_and_testament', 'pour_over_will'].includes(d.document_type ?? d.type ?? ''));
    if (!hasWill) {
      findings.push({
        severity: 'critical',
        title: `No will on file, with ${minors.length} child${minors.length === 1 ? '' : 'ren'} under 18`,
        detail:
          'A will is where a guardian is named. Without one, who raises your children if neither ' +
          'parent can is decided by a court that never met you.',
      });
    }
  }

  // ── The 18 cliff ───────────────────────────────────────────────────────────
  const approachingEighteen = members.filter((m) => {
    const age = ageOf(m.birth_date);
    return age !== null && age >= 17 && age < 18
      && ['child', 'son', 'daughter'].includes((m.relationship ?? '').toLowerCase());
  });
  if (approachingEighteen.length > 0) {
    findings.push({
      severity: 'attention',
      title: `${listOf(approachingEighteen.map((m) => m.name.split(/\s+/)[0]))} turns 18 within the year`,
      detail:
        'From that birthday you have no automatic right to their medical information or to act for ' +
        'them financially. A HIPAA authorization, a healthcare power of attorney and a financial ' +
        'power of attorney — signed by them — are what restore it.',
    });
  }

  // ── Teen driver ────────────────────────────────────────────────────────────
  const nearingDriving = members.filter((m) => {
    const age = ageOf(m.birth_date);
    return age !== null && age >= 15 && age < 16;
  });
  if (nearingDriving.length > 0) {
    findings.push({
      severity: 'info',
      title: `A teenage driver is about a year away`,
      detail:
        'Adding one typically raises an auto premium by half again or more. Worth asking the carrier ' +
        'what it will cost while there is still time to shop.',
    });
  }

  // ── Trump accounts ─────────────────────────────────────────────────────────
  const trump = trumpAccountStanding(members);
  const seedEligible = trump.filter((t) => t.seedEligible);
  if (seedEligible.length > 0) {
    findings.push({
      severity: 'attention',
      title: `${seedEligible.length} child${seedEligible.length === 1 ? ' is' : 'ren are'} eligible for the $1,000 federal contribution`,
      detail:
        `Born between 2025 and 2028, which is the window for the one-time $1,000 Treasury contribution ` +
        `to a Trump account. It requires an election filed on the child's behalf — it does not arrive ` +
        `on its own.`,
    });
  }

  // ── What limits the assessment ─────────────────────────────────────────────
  const noBirthDate = members.filter((m) => !m.birth_date);
  if (noBirthDate.length > 0) {
    dataFindings.push({
      severity: 'info',
      title: `${noBirthDate.length} person${noBirthDate.length === 1 ? '' : 's'} without a birth date`,
      detail: `${listOf(noBirthDate.map((m) => m.name))} cannot be placed on the timeline.`,
    });
  }
  if (members.length === 0) {
    dataFindings.push({
      severity: 'info',
      title: 'No family members recorded',
      detail: 'Add them on your profile and everything here computes itself from their birth dates.',
    });
  }
  for (const caveat of gap.caveats) {
    dataFindings.push({ severity: 'info', title: 'Protection estimate', detail: caveat });
  }

  if (members.length === 0) {
    return {
      score: null, grade: '—', status: 'unknown', findings, dataFindings,
      confidence: 'limited', confidenceReason: 'Nobody recorded yet.',
      dependents: 0, nextEventYear: null,
    };
  }

  const weights: Record<FamilyFindingSeverity, number> = { critical: 30, attention: 12, info: 4 };
  const penalty = findings.reduce((sum, f) => sum + weights[f.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const status = score >= 75 ? 'good' : score >= 60 ? 'review' : 'action_needed';

  const confidence: FamilyHealthResult['confidence'] =
    dataFindings.length <= 1 ? 'high' : dataFindings.length <= 3 ? 'moderate' : 'limited';

  return {
    score, grade, status, findings, dataFindings, confidence,
    confidenceReason:
      dataFindings.length <= 1
        ? 'Birth dates, income, net worth and policies are all on file.'
        : `${dataFindings.length} gaps limit how much could be checked.`,
    dependents: gap.dependents,
    nextEventYear,
  };
}
