// Legal health.
//
// The same question coverageHealth asks, asked of legal documents: how well does
// what this household has in place fit THIS household? Scored against who is in
// it, what it owns, and where it lives — not against how many files have been
// uploaded.
//
// Two rules carry most of the weight here:
//
// 1. Absence of a document in Command is never a claim that the household does
//    not have one. Every finding says "not found in Command", and the wording of
//    the finding is part of the finding.
//
// 2. Nothing states or implies that a document is valid, current, or legally
//    sufficient. Findings describe what is on file and what a household in this
//    situation typically wants to have reviewed. Where the answer depends on
//    jurisdiction or execution formalities, the finding says an attorney is the
//    right person to ask.
//
// Thresholds are stated openly in each finding, as they are in coverage health,
// so the reasoning can be argued with rather than taken on faith.

import type {
  Asset,
  FamilyMember,
  HouseholdProfile,
  LegalDocument,
  LegalDocumentExtraction,
} from './supabase';
import { legalType } from './legalTaxonomy';

export type LegalFindingSeverity = 'critical' | 'attention' | 'info';

export interface LegalFinding {
  severity: LegalFindingSeverity;
  title: string;
  detail: string;
  /** Set when the answer genuinely depends on a lawyer, not on more data. */
  attorneyReview?: boolean;
}

export interface LegalHealthResult {
  score: number | null;
  grade: string;
  status: 'good' | 'review' | 'action_needed' | 'unknown';
  /** Fit for this household. Drives the grade. */
  findings: LegalFinding[];
  /** What Command could not determine. Affects confidence, never the grade. */
  dataFindings: LegalFinding[];
  confidence: 'high' | 'moderate' | 'limited';
  confidenceReason: string;
  /** Per-adult essentials, for the summary strip. */
  essentials: Array<{ label: string; state: 'found' | 'not_found' | 'unconfirmed' }>;
  documentCount: number;
}

/** Documents whose absence matters for every adult household member. */
const CORE_TYPES = {
  will: ['last_will_and_testament', 'pour_over_will'],
  financial_poa: ['durable_financial_poa', 'limited_or_general_poa'],
  healthcare: ['healthcare_poa', 'advance_healthcare_directive', 'living_will'],
  trust: ['revocable_living_trust', 'irrevocable_trust', 'testamentary_trust'],
  deed: ['warranty_deed', 'quitclaim_deed', 'transfer_on_death_deed', 'life_estate_deed'],
};

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

/** Whole years since an ISO date, or null when it is unusable. */
function yearsSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const then = new Date(`${iso}T00:00:00Z`).getTime();
  if (Number.isNaN(then)) return null;
  return (Date.now() - then) / YEAR_MS;
}

function isMinor(member: FamilyMember): boolean {
  const age = yearsSince(member.birth_date);
  return age !== null && age < 18;
}

export function computeLegalHealth(
  extractions: LegalDocumentExtraction[],
  documents: LegalDocument[],
  profile?: HouseholdProfile | null,
  familyMembers: FamilyMember[] = [],
  assets: Asset[] = [],
): LegalHealthResult {
  const findings: LegalFinding[] = [];
  const dataFindings: LegalFinding[] = [];

  // A user's correction of the type outranks the model's reading.
  const typeOf = (e: LegalDocumentExtraction) => e.user_document_type ?? e.document_type ?? '';
  const live = extractions.filter((e) => e.processing_state !== 'deleted' && e.recognition !== 'not_legal');
  const confirmed = live.filter((e) => e.review_status === 'confirmed');

  // Confirmed readings are what the grade leans on. Unconfirmed ones are
  // acknowledged so the household is never told a document is missing when it is
  // sitting in the review queue.
  const has = (codes: string[]) => {
    const inConfirmed = confirmed.some((e) => codes.includes(typeOf(e)));
    if (inConfirmed) return 'found' as const;
    const canonical = documents.some((d) => codes.includes(d.document_type ?? ''));
    if (canonical) return 'found' as const;
    const pending = live.some((e) => codes.includes(typeOf(e)));
    return pending ? ('unconfirmed' as const) : ('not_found' as const);
  };

  const netWorth = profile?.net_worth ?? null;
  const minorChildren = familyMembers.filter(isMinor);
  const adults = Math.max(1, (profile?.partner_name ? 2 : 1));
  const homeowner = (profile?.home_ownership ?? '').toLowerCase().includes('own') || (profile?.home_value ?? 0) > 0;
  const businessAssets = assets.filter((a) => a.type === 'business');
  const householdState = (profile?.state ?? '').trim();

  const willState = has(CORE_TYPES.will);
  const poaState = has(CORE_TYPES.financial_poa);
  const healthcareState = has(CORE_TYPES.healthcare);
  const trustState = has(CORE_TYPES.trust);
  const deedState = has(CORE_TYPES.deed);

  // ── Core documents ─────────────────────────────────────────────────────────
  if (willState === 'not_found') {
    findings.push({
      severity: minorChildren.length > 0 || (netWorth ?? 0) > 500_000 ? 'critical' : 'attention',
      title: 'No will found in Command',
      detail:
        minorChildren.length > 0
          ? `With ${minorChildren.length} child${minorChildren.length === 1 ? '' : 'ren'} under 18, a will is where guardians are named. If one exists, upload it; if not, it is the first conversation to have.`
          : 'A will directs what happens to what you own. If one exists, uploading it lets Command track its terms and dates.',
      attorneyReview: minorChildren.length > 0,
    });
  }
  if (poaState === 'not_found') {
    findings.push({
      severity: 'attention',
      title: 'No financial power of attorney found in Command',
      detail:
        `A financial power of attorney names who can act on your behalf if you cannot. ` +
        `${adults > 1 ? 'Each adult normally has their own.' : ''}`.trim(),
    });
  }
  if (healthcareState === 'not_found') {
    findings.push({
      severity: 'attention',
      title: 'No healthcare directive found in Command',
      detail:
        'A healthcare directive or healthcare power of attorney records who speaks for you about ' +
        'medical care, and what you want. Hospitals ask for it at the worst possible moment.',
    });
  }

  // ── Guardians ──────────────────────────────────────────────────────────────
  if (minorChildren.length > 0 && willState === 'found') {
    // The will is on file, so whether guardians are named in it is answerable —
    // but only once provisions have been read and confirmed.
    dataFindings.push({
      severity: 'info',
      title: 'Guardian nomination not yet verified',
      detail:
        'A will is on file. Confirming its provisions will let Command check whether guardians ' +
        'and alternates are named for your children.',
    });
  }

  // ── Trust, sized to the household ──────────────────────────────────────────
  if (trustState === 'not_found' && netWorth !== null && netWorth >= 1_000_000) {
    findings.push({
      severity: 'attention',
      title: 'No trust found in Command',
      detail:
        `At a net worth of ${money(netWorth)}, households commonly ask whether a revocable trust ` +
        `is worth having — usually to keep an estate out of probate. Whether it suits you depends ` +
        `on your state and your assets.`,
      attorneyReview: true,
    });
  }
  if (trustState === 'found' && homeowner && deedState === 'not_found') {
    findings.push({
      severity: 'attention',
      title: 'A trust is on file, but no deed is',
      detail:
        'A trust document shows the trust exists. It does not show that any property was ever ' +
        'transferred into it. Uploading the deed lets Command see how the home is currently titled.',
      attorneyReview: true,
    });
  }

  // ── Property ───────────────────────────────────────────────────────────────
  if (homeowner && deedState === 'not_found') {
    findings.push({
      severity: 'info',
      title: 'No deed found in Command',
      detail:
        'The deed records how your home is titled, which decides what happens to it regardless of ' +
        'what a will says. It is usually available from your county recorder.',
    });
  }

  // ── Business ───────────────────────────────────────────────────────────────
  if (businessAssets.length > 0) {
    const hasBusinessDocs = confirmed.some((e) => legalType(typeOf(e))?.category === 'business');
    if (!hasBusinessDocs) {
      findings.push({
        severity: 'attention',
        title: 'A business interest is recorded, but no business documents are on file',
        detail:
          'Operating agreements and buy-sell agreements decide what happens to an ownership stake ' +
          'on death, disability or divorce — often overriding a will.',
        attorneyReview: true,
      });
    }
  }

  // ── Age and jurisdiction ───────────────────────────────────────────────────
  for (const extraction of confirmed) {
    const age = yearsSince(extraction.execution_date);
    if (age !== null && age >= 5) {
      findings.push({
        severity: 'info',
        title: `${extraction.document_title || 'A document'} was executed ${Math.floor(age)} years ago`,
        detail:
          'Command has not seen a newer version. Estate documents are usually revisited every three ' +
          'to five years, and after a marriage, birth, move or change in assets.',
      });
    }
    const jurisdiction = (extraction.governing_jurisdiction ?? '').trim();
    if (jurisdiction && householdState && !jurisdiction.toLowerCase().includes(householdState.toLowerCase())) {
      findings.push({
        severity: 'attention',
        title: 'A document names a different state than your household',
        detail:
          `${extraction.document_title || 'A document'} is governed by ${jurisdiction}, and your ` +
          `household is in ${householdState}. Requirements differ by state.`,
        attorneyReview: true,
      });
    }
  }

  // ── Drafts ─────────────────────────────────────────────────────────────────
  // Confirmed only. A finding moves the grade, and a draft flag on a reading the
  // user has not agreed to is Command's opinion, not a fact about the household.
  // Unconfirmed readings are already acknowledged separately below.
  const drafts = confirmed.filter((e) => e.document_status === 'draft');
  if (drafts.length > 0) {
    findings.push({
      severity: 'attention',
      title: `${drafts.length} document${drafts.length === 1 ? ' is' : 's are'} marked draft`,
      detail: 'If a signed version exists, uploading it gives Command the executed terms instead.',
    });
  }

  // ── What limits the assessment ─────────────────────────────────────────────
  const unconfirmed = live.filter((e) => e.review_status === 'pending_review');
  if (unconfirmed.length > 0) {
    dataFindings.push({
      severity: 'info',
      title: `${unconfirmed.length} reading${unconfirmed.length === 1 ? '' : 's'} not yet confirmed`,
      detail: 'Confirming what Command read lets those documents count toward this assessment.',
    });
  }
  if (!profile || profile.net_worth === null) {
    dataFindings.push({
      severity: 'info',
      title: 'Net worth is not recorded',
      detail: 'Several checks — whether a trust is worth discussing, in particular — are sized against it.',
    });
  }
  if (familyMembers.length === 0) {
    dataFindings.push({
      severity: 'info',
      title: 'No household members recorded',
      detail: 'Adding your family on the profile screen lets Command check guardianship and beneficiaries.',
    });
  }
  const unknownType = live.filter((e) => (typeOf(e) === 'unknown_legal_document' || e.recognition === 'possibly_legal'));
  if (unknownType.length > 0) {
    dataFindings.push({
      severity: 'info',
      title: `${unknownType.length} document${unknownType.length === 1 ? '' : 's'} could not be classified`,
      detail: 'Setting the type yourself lets Command read them properly.',
    });
  }

  const essentials = [
    { label: 'Will', state: willState },
    { label: 'Financial POA', state: poaState },
    { label: 'Healthcare directive', state: healthcareState },
    { label: 'Trust', state: trustState },
  ];

  if (live.length === 0 && documents.length === 0) {
    return {
      score: null,
      grade: '—',
      status: 'unknown',
      findings,
      dataFindings,
      confidence: 'limited',
      confidenceReason: 'No legal documents on file yet.',
      essentials,
      documentCount: 0,
    };
  }

  // Same weighting as coverage health: fit drives the grade, documentation gaps
  // move confidence instead.
  const weights: Record<LegalFindingSeverity, number> = { critical: 30, attention: 12, info: 4 };
  const penalty = findings.reduce((sum, f) => sum + weights[f.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const status = score >= 75 ? 'good' : score >= 60 ? 'review' : 'action_needed';

  const confidence: LegalHealthResult['confidence'] =
    dataFindings.length === 0 ? 'high' : dataFindings.length <= 2 ? 'moderate' : 'limited';
  const confidenceReason =
    dataFindings.length === 0
      ? 'Confirmed documents and household details are both on file.'
      : `${dataFindings.length} gap${dataFindings.length === 1 ? '' : 's'} limit how much could be checked.`;

  return {
    score,
    grade,
    status,
    findings,
    dataFindings,
    confidence,
    confidenceReason,
    essentials,
    documentCount: live.length + documents.length,
  };
}
