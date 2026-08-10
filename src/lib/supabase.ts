// src/lib/supabase.ts
// Supabase client + full TypeScript types for COMMAND MVP
// Install: npm install @supabase/supabase-js
// Add to .env: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const storageBucket = (import.meta.env.VITE_SUPABASE_STORAGE_BUCKET as string) ?? 'raw-uploads';

/**
 * supabase-js serializes token refreshes behind a Web Lock, which is shared
 * across every tab on the origin. If a tab dies mid-refresh — or wedges holding
 * it — the lock is never released and every subsequent Supabase call in every
 * tab blocks forever. That is not a network error and produces no console
 * output; it simply never resolves. It is what made onboarding hang on its
 * first insert while the same insert over REST completed in 0.6s.
 *
 * Keep the cross-tab lock for the normal case, but give up after 5s and proceed
 * without it. A duplicate token refresh is a far cheaper failure than an app
 * that hangs with no way out.
 */
async function resilientAuthLock<R>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  const locks = (globalThis as { navigator?: { locks?: LockManager } }).navigator?.locks;
  if (!locks?.request) return fn();

  let started = false;
  const guarded = () => {
    started = true;
    return fn();
  };

  const controller = new AbortController();
  const giveUp = setTimeout(() => controller.abort(), 5000);
  try {
    return await locks.request(name, { signal: controller.signal }, guarded);
  } catch (err) {
    // If fn() already started, this is its own failure — don't run it twice.
    if (started) throw err;
    console.warn('Supabase auth lock unavailable; proceeding without it:', err);
    return await fn();
  } finally {
    clearTimeout(giveUp);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { lock: resilientAuthLock },
});

// ============================================================
// DATABASE TYPES
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      households: {
        Row: Household;
        Insert: Omit<Household, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Household, 'id'>>;
      };
      household_profile: {
        Row: HouseholdProfile;
        Insert: Omit<HouseholdProfile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<HouseholdProfile, 'id'>>;
      };
      insurance_policies: {
        Row: InsurancePolicy;
        Insert: Omit<InsurancePolicy, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<InsurancePolicy, 'id'>>;
      };
      legal_documents: {
        Row: LegalDocument;
        Insert: Omit<LegalDocument, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<LegalDocument, 'id'>>;
      };
      assets: {
        Row: Asset;
        Insert: Omit<Asset, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Asset, 'id'>>;
      };
      maintenance_records: {
        Row: MaintenanceRecord;
        Insert: Omit<MaintenanceRecord, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<MaintenanceRecord, 'id'>>;
      };
      priority_actions: {
        Row: PriorityAction;
        Insert: Omit<PriorityAction, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PriorityAction, 'id'>>;
      };
      timeline_events: {
        Row: TimelineEvent;
        Insert: Omit<TimelineEvent, 'id' | 'created_at'>;
        Update: Partial<Omit<TimelineEvent, 'id'>>;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, 'id' | 'created_at' | 'uploaded_at'>;
        Update: Partial<Omit<Document, 'id'>>;
      };
      document_extractions: {
        Row: DocumentExtraction;
        Insert: Omit<DocumentExtraction, 'id' | 'created_at'>;
        Update: Partial<Omit<DocumentExtraction, 'id'>>;
      };
      section_scores: {
        Row: SectionScore;
        Insert: Omit<SectionScore, 'id'>;
        Update: Partial<Omit<SectionScore, 'id'>>;
      };
      finance_accounts: {
        Row: FinanceAccount;
        Insert: Omit<FinanceAccount, 'id' | 'created_at'>;
        Update: Partial<Omit<FinanceAccount, 'id'>>;
      };
      budget_summary: {
        Row: BudgetSummary;
        Insert: Omit<BudgetSummary, 'id' | 'created_at'>;
        Update: Partial<Omit<BudgetSummary, 'id'>>;
      };
      tax_documents: {
        Row: TaxDocument;
        Insert: Omit<TaxDocument, 'id' | 'created_at'>;
        Update: Partial<Omit<TaxDocument, 'id'>>;
      };
      tax_recommendations: {
        Row: TaxRecommendation;
        Insert: Omit<TaxRecommendation, 'id' | 'created_at'>;
        Update: Partial<Omit<TaxRecommendation, 'id'>>;
      };
      family_members: {
        Row: FamilyMember;
        Insert: Omit<FamilyMember, 'id' | 'created_at'>;
        Update: Partial<Omit<FamilyMember, 'id'>>;
      };
      family_milestones: {
        Row: FamilyMilestone;
        Insert: Omit<FamilyMilestone, 'id' | 'created_at'>;
        Update: Partial<Omit<FamilyMilestone, 'id'>>;
      };
      credit_cards: {
        Row: CreditCard;
        Insert: Omit<CreditCard, 'id' | 'created_at'>;
        Update: Partial<Omit<CreditCard, 'id'>>;
      };
    };
  };
}

// ============================================================
// ROW TYPES
// ============================================================

export interface Household {
  id: string;
  user_id: string;
  name: string;
  household_name?: string | null;
  city?: string | null;
  state?: string | null;
  health_score: number;
  created_at: string;
  updated_at: string;
}

export interface HouseholdProfile {
  id: string;
  household_id: string;
  primary_name: string | null;
  primary_first_name?: string | null;
  primary_last_name?: string | null;
  partner_name: string | null;
  spouse_first_name?: string | null;
  num_children: number;
  home_value: number | null;
  home_ownership?: string | null;
  year_built?: number | null;
  hvac_age?: string | null;
  roof_age?: string | null;
  household_income: number | null;
  net_worth: number | null;
  emergency_fund_status?: string | null;
  has_aging_parents?: boolean | null;
  upcoming_life_events?: string[] | null;
  has_will?: string | null;
  has_trust?: string | null;
  has_umbrella?: string | null;
  life_insurance_review?: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  updated_at: string;
}

export type InsurancePolicyType = 'home' | 'auto' | 'umbrella' | 'life' | 'health' | 'disability' | 'other';
export type PolicyStatus = 'active' | 'renewal_soon' | 'action_needed' | 'expired' | 'inactive';

export interface InsurancePolicy {
  id: string;
  household_id: string;
  source_document_id?: string | null;
  source_extraction_id?: string | null;
  type: InsurancePolicyType;
  carrier: string | null;
  policy_number: string | null;
  coverage_amount: number | null;
  annual_premium: number | null;
  deductible: number | null;
  renewal_date: string | null;
  status: PolicyStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type LegalDocType = 'will' | 'trust' | 'poa' | 'healthcare_directive' | 'beneficiary' | 'prenup' | 'other';
export type LegalDocStatus = 'current' | 'needs_review' | 'outdated' | 'not_established';

export interface LegalDocument {
  id: string;
  household_id: string;
  name: string;
  type: LegalDocType;
  status: LegalDocStatus;
  last_reviewed: string | null;
  attorney: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Added with the legal extraction schema. Optional because rows written before
  // that migration — and by onboarding — do not carry them.
  document_type?: string | null;
  document_subtype?: string | null;
  category?: string | null;
  execution_date?: string | null;
  effective_date?: string | null;
  expiration_date?: string | null;
  governing_jurisdiction?: string | null;
  document_status?: string | null;
  source_document_id?: string | null;
  source_extraction_id?: string | null;
}

export type AssetType = 'real_estate' | 'vehicle' | 'investment' | 'retirement' | 'business' | 'other';

export interface Asset {
  id: string;
  household_id: string;
  name: string;
  type: AssetType;
  current_value: number | null;
  purchase_price: number | null;
  purchase_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type MaintenanceStatus = 'upcoming' | 'overdue' | 'completed' | 'in_progress';

export interface MaintenanceRecord {
  id: string;
  household_id: string;
  asset_id: string | null;
  title: string;
  category: string | null;
  status: MaintenanceStatus;
  due_date: string | null;
  completed_date: string | null;
  cost: number | null;
  vendor: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ActionSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ActionStatus = 'open' | 'in_progress' | 'dismissed' | 'completed';

export interface PriorityAction {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  category: string | null;
  severity: ActionSeverity;
  status: ActionStatus;
  due_date: string | null;
  estimated_value: number | null;
  source: 'ai_generated' | 'manual' | 'system';
  created_at: string;
  updated_at: string;
}

export type EventType = 'deadline' | 'renewal' | 'review' | 'info' | 'completed' | 'action';

export interface TimelineEvent {
  id: string;
  household_id: string;
  title: string;
  category: string | null;
  event_type: EventType;
  event_date: string | null;
  completed: boolean;
  notes: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  household_id: string;
  name: string;
  category: string | null;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  status: 'uploaded' | 'processed' | 'error';
  uploaded_at: string;
  created_at: string;
}

export type ExtractionConfidence = 'high' | 'medium' | 'low';
export type DocumentType =
  | 'mortgage_statement'
  | 'insurance_dec_page'
  | 'credit_card_statement'
  | 'bank_statement'
  | 'tax_document'
  | 'paystub'
  | 'unknown';

export interface DocumentExtraction {
  id: string;
  household_id: string;
  document_id: string;
  detected_type: DocumentType;
  confidence: ExtractionConfidence | null;
  extracted_fields: Json;
  status: 'pending_review' | 'confirmed' | 'discarded';
  created_at: string;
}

export type SectionKey = 'advisory' | 'insurance' | 'legal' | 'family' | 'home' | 'tax' | 'healthcare' | 'finances' | 'credit';
export type SectionStatus = 'good' | 'review' | 'action_needed';

export interface SectionScore {
  id: string;
  household_id: string;
  section: SectionKey;
  score: number;
  status: SectionStatus;
  summary: string | null;
  updated_at: string;
}

export interface FinanceAccount {
  id: string;
  household_id: string;
  account_name: string;
  account_type: string;
  institution: string | null;
  balance: number | null;
  as_of_date: string | null;
  created_at: string;
}

export interface BudgetSummary {
  id: string;
  household_id: string;
  monthly_income: number | null;
  monthly_expenses: number | null;
  savings_rate: number | null;
  emergency_fund_months: number | null;
  period_month: string | null;
  created_at: string;
}

export interface TaxDocument {
  id: string;
  household_id: string;
  name: string;
  tax_year: number;
  doc_type: string;
  status: string;
  due_date: string | null;
  amount: number | null;
  source: string | null;
  created_at: string;
  // Added with tax year tracking.
  form_type?: string | null;
  issuer?: string | null;
  received_on?: string | null;
  document_id?: string | null;
  notes?: string | null;
  /** The derived expectation this document satisfies, if any. */
  satisfies_expectation?: string | null;
}

/** Records that a form has arrived, ticking it off the derived checklist. */
export async function markTaxFormReceived(
  householdId: string,
  taxYear: number,
  expectationKey: string,
  form: string,
  issuer?: string | null,
  documentId?: string | null,
): Promise<boolean> {
  const { error } = await supabase.from('tax_documents').insert([{
    household_id: householdId,
    name: issuer ? `${form} — ${issuer}` : form,
    tax_year: taxYear,
    doc_type: form,
    form_type: form,
    issuer: issuer ?? null,
    status: 'received',
    received_on: new Date().toISOString().slice(0, 10),
    document_id: documentId ?? null,
    satisfies_expectation: expectationKey,
  }]);
  if (error) {
    console.error('Failed to record the form:', error);
    throw new Error(`Could not record that: ${error.message}`);
  }
  return true;
}

export async function unmarkTaxForm(documentId: string): Promise<boolean> {
  const { error } = await supabase.from('tax_documents').delete().eq('id', documentId);
  if (error) throw new Error(`Could not undo that: ${error.message}`);
  return true;
}

export interface TaxRecommendation {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  potential_savings: number | null;
  priority: string | null;
  deadline: string | null;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  household_id: string;
  name: string;
  relationship: string;
  birth_date: string | null;
  created_at: string;
}

/**
 * One model reading of one uploaded legal document. Raw, not canonical: nothing
 * here reaches `legal_documents` until the user confirms it. Re-running the
 * extraction adds a version rather than replacing this row.
 */
export interface LegalDocumentExtraction {
  id: string;
  household_id: string;
  document_id: string;
  recognition: 'legal' | 'possibly_legal' | 'not_legal';
  document_type: string | null;
  document_subtype: string | null;
  category: string | null;
  classification_confidence: number | null;
  classification_reason: string | null;
  user_document_type: string | null;
  user_corrected_at: string | null;
  document_status: string;
  document_title: string | null;
  execution_date: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  governing_jurisdiction: string | null;
  page_count: number | null;
  document_language: string | null;
  plain_language_summary: string | null;
  processing_state: string;
  review_status: 'pending_review' | 'confirmed' | 'partially_confirmed' | 'discarded';
  failure_reason: string | null;
  extraction_version: number;
  content_hash: string | null;
  extractor_version: string | null;
  model: string | null;
  created_at: string;
}

export interface LegalIssueFlag {
  id: string;
  household_id: string;
  extraction_id: string | null;
  flag_code: string;
  severity: 'informational' | 'worth_reviewing' | 'significant';
  confidence: number | null;
  explanation: string;
  suggested_action: string | null;
  attorney_review_suggested: boolean;
  source_page: number | null;
  evidence: string | null;
  state: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  created_at: string;
}

/**
 * One extracted value with the provenance that makes it checkable. No profile
 * fact produced by extraction exists without one of these behind it.
 */
export interface LegalExtractedField {
  id: string;
  extraction_id: string;
  household_id: string;
  field_code: string;
  field_group: string | null;
  value_text: string | null;
  value_number: number | null;
  value_date: string | null;
  raw_value: string | null;
  source_page: number | null;
  source_section: string | null;
  evidence: string | null;
  confidence: number | null;
  value_type: 'explicit' | 'calculated' | 'inferred' | 'unknown';
  is_sensitive: boolean;
  review_state: 'unreviewed' | 'confirmed' | 'edited' | 'rejected' | 'unresolved';
  user_value: string | null;
}

export interface LegalParty {
  id: string;
  extraction_id: string;
  household_id: string;
  party_kind: string;
  name: string;
  relationship: string | null;
  address: string | null;
  matched_family_member_id: string | null;
  match_confidence: number | null;
  match_state: 'unmatched' | 'suggested' | 'confirmed' | 'rejected' | 'conflict';
  match_conflict: string | null;
  source_page: number | null;
  evidence: string | null;
  confidence: number | null;
}

export interface LegalPartyRole {
  id: string;
  party_id: string;
  extraction_id: string;
  household_id: string;
  role_code: string;
  role_detail: string | null;
  priority: number | null;
  acts_jointly: string | null;
  source_page: number | null;
  evidence: string | null;
  confidence: number | null;
}

export interface LegalProvision {
  id: string;
  extraction_id: string;
  household_id: string;
  extractor: string;
  provision_code: string;
  label: string | null;
  summary: string | null;
  document_language: string | null;
  applies_to: string | null;
  amount: number | null;
  percentage: number | null;
  effective_condition: string | null;
  is_present: boolean | null;
  source_page: number | null;
  source_section: string | null;
  evidence: string | null;
  confidence: number | null;
  value_type: 'explicit' | 'calculated' | 'inferred' | 'unknown';
  review_state: 'unreviewed' | 'confirmed' | 'edited' | 'rejected' | 'unresolved';
}

export interface LegalExtractionDetail {
  fields: LegalExtractedField[];
  parties: LegalParty[];
  roles: LegalPartyRole[];
  provisions: LegalProvision[];
  flags: LegalIssueFlag[];
}

/** Everything one reading produced. Loaded on demand — the review screen only. */
export async function getLegalExtractionDetail(extractionId: string): Promise<LegalExtractionDetail> {
  const [fields, parties, roles, provisions, flags] = await Promise.all([
    supabase.from('legal_extracted_fields').select('*').eq('extraction_id', extractionId).order('field_code'),
    supabase.from('legal_parties').select('*').eq('extraction_id', extractionId).order('name'),
    supabase.from('legal_party_roles').select('*').eq('extraction_id', extractionId).order('priority'),
    supabase.from('legal_provisions').select('*').eq('extraction_id', extractionId).order('provision_code'),
    supabase.from('legal_issue_flags').select('*').eq('extraction_id', extractionId).eq('state', 'open'),
  ]);

  for (const result of [fields, parties, roles, provisions, flags]) {
    if (result.error) console.error('Error loading legal extraction detail:', result.error);
  }

  return {
    fields: (fields.data ?? []) as LegalExtractedField[],
    parties: (parties.data ?? []) as LegalParty[],
    roles: (roles.data ?? []) as LegalPartyRole[],
    provisions: (provisions.data ?? []) as LegalProvision[],
    flags: (flags.data ?? []) as LegalIssueFlag[],
  };
}

// ─────────────────────────────────────────────────────────────
// Review and confirmation
//
// The line between what a model read and what the household asserts is true
// runs through here. Extraction rows are a reading; legal_documents and
// legal_profile_facts are the household's record. Nothing crosses that line
// without a person deciding it should.
// ─────────────────────────────────────────────────────────────

/**
 * How much a value can be trusted on its own.
 *
 *   high   — prefilled and preselected, still labeled as extracted until confirmed
 *   medium — shown, never preselected; requires an explicit confirmation
 *   low    — a suggestion only. It cannot reach the canonical record as extracted;
 *            editing it makes the value the user's own, which can.
 */
export type ConfidenceBand = 'high' | 'medium' | 'low';

export function confidenceBand(confidence: number | null | undefined): ConfidenceBand {
  if (confidence == null) return 'low';
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

/**
 * Values that stay reviewable however confident the model is. Dates, names,
 * roles, ownership and beneficiary designations decide who gets what — a
 * confident misreading of any of them is worse than an unanswered question, so
 * none of them is ever auto-accepted.
 */
const ALWAYS_REVIEWABLE = /(date|name|role|owner|beneficiary|trustee|executor|guardian|agent|percent|share)/i;

export function alwaysReviewable(fieldCode: string): boolean {
  return ALWAYS_REVIEWABLE.test(fieldCode);
}

export type ReviewDecision = 'confirmed' | 'edited' | 'rejected' | 'unresolved';

/** One user decision about one extracted value. */
export async function reviewLegalField(
  fieldId: string,
  decision: ReviewDecision,
  userValue?: string | null,
): Promise<boolean> {
  const patch: Record<string, unknown> = {
    review_state: decision,
    reviewed_at: new Date().toISOString(),
  };
  if (decision === 'edited') patch.user_value = (userValue ?? '').trim() || null;
  if (decision === 'rejected') patch.user_value = null;

  const { error } = await supabase.from('legal_extracted_fields').update(patch).eq('id', fieldId);
  if (error) {
    console.error('Failed to record the field decision:', error);
    throw new Error(`Could not save that decision: ${error.message}`);
  }
  return true;
}

export async function reviewLegalProvision(provisionId: string, decision: ReviewDecision): Promise<boolean> {
  const { error } = await supabase
    .from('legal_provisions')
    .update({ review_state: decision })
    .eq('id', provisionId);
  if (error) {
    console.error('Failed to record the provision decision:', error);
    throw new Error(`Could not save that decision: ${error.message}`);
  }
  return true;
}

/**
 * Confirms or rejects the suggestion that a named party is a household member.
 * Confirming links them; it never rewrites the person's existing profile from
 * the document, because a document spelling a name differently is not evidence
 * that the profile is wrong.
 */
export async function resolveLegalPartyMatch(
  partyId: string,
  state: 'confirmed' | 'rejected' | 'unmatched',
  familyMemberId?: string | null,
): Promise<boolean> {
  const patch: Record<string, unknown> = { match_state: state };
  if (state === 'confirmed' && familyMemberId) {
    patch.matched_family_member_id = familyMemberId;
    patch.match_conflict = null;
  }
  if (state === 'rejected' || state === 'unmatched') {
    patch.matched_family_member_id = null;
  }

  const { error } = await supabase.from('legal_parties').update(patch).eq('id', partyId);
  if (error) {
    console.error('Failed to resolve the party match:', error);
    throw new Error(`Could not save that match: ${error.message}`);
  }
  return true;
}

/** Adds a named party to the household as a new person, on explicit request. */
export async function createFamilyMemberFromParty(
  householdId: string,
  party: LegalParty,
  relationship: string,
): Promise<FamilyMember> {
  const member = await addFamilyMember(householdId, {
    name: party.name,
    relationship,
    birth_date: null,
  });
  await resolveLegalPartyMatch(party.id, 'confirmed', member.id);
  return member;
}

/** The coarse bucket the existing Legal view renders, from the taxonomy code. */
function canonicalType(extractor: string, typeCode: string): string {
  if (typeCode === 'vehicle_title' || typeCode === 'boat_or_rv_title' || typeCode === 'property_title') return 'title';
  switch (extractor) {
    case 'will': return 'will';
    case 'trust': return 'trust';
    case 'power_of_attorney': return 'poa';
    case 'healthcare_directive': return 'healthcare_directive';
    case 'deed_property': return 'deed';
    case 'family': return 'family';
    case 'business': return 'business';
    default: return 'other';
  }
}

/** Which profile facts a confirmed document of this kind establishes. */
const FACTS_BY_EXTRACTOR: Record<string, string[]> = {
  will: ['has_will'],
  trust: ['has_trust'],
  power_of_attorney: ['has_financial_poa'],
  healthcare_directive: ['has_healthcare_directive'],
  deed_property: ['has_deed'],
  family: [],
  business: ['has_business_documents'],
  generic: [],
};

export interface LegalConfirmationResult {
  legalDocumentId: string;
  fieldsApplied: number;
  factsWritten: number;
  conflicts: string[];
  partial: boolean;
}

/**
 * Promotes one reviewed reading to the household's record.
 *
 * Only values the user confirmed or edited are carried across, and low-confidence
 * values are excluded unless the user edited them — at which point the value is
 * theirs, not the model's. Anything left unreviewed simply does not travel, and
 * the extraction is marked partially confirmed so it stays in the queue.
 *
 * An existing document of the same type is never overwritten. Both rows survive,
 * `supersedes_document_id` records the suspicion, and a flag asks the user which
 * one controls — because upload order is not evidence and neither is a date the
 * model read off a page.
 */
export async function confirmLegalExtraction(
  extraction: LegalDocumentExtraction,
  extractorKey: string,
): Promise<LegalConfirmationResult> {
  const householdId = extraction.household_id;
  const typeCode = extraction.user_document_type ?? extraction.document_type ?? 'unknown_legal_document';

  const { data: fieldRows, error: fieldError } = await supabase
    .from('legal_extracted_fields')
    .select('*')
    .eq('extraction_id', extraction.id);
  if (fieldError) {
    console.error('Could not read the reviewed fields:', fieldError);
    throw new Error(`Could not read this document's fields: ${fieldError.message}`);
  }

  const fields = (fieldRows ?? []) as LegalExtractedField[];
  const accepted = fields.filter((f) => {
    if (f.review_state === 'edited') return true;
    if (f.review_state !== 'confirmed') return false;
    // A confirmed low-confidence reading is still the model's reading. The user
    // confirming it is what makes it usable — which is exactly what happened.
    return true;
  });

  if (accepted.length === 0) {
    throw new Error(
      'Nothing has been confirmed yet. Confirm at least one detail before adding this document to your profile.',
    );
  }

  const valueOf = (code: string): string | null => {
    const hit = accepted.find((f) => f.field_code === code);
    return hit ? (hit.user_value ?? hit.value_text) : null;
  };

  const conflicts: string[] = [];

  // Never overwrite a document already on file. Two wills can both be real.
  const { data: existing } = await supabase
    .from('legal_documents')
    .select('id, name, execution_date, source_extraction_id, document_type')
    .eq('household_id', householdId)
    .eq('document_type', typeCode);

  const fromThisReading = (existing ?? []).find((d) => d.source_extraction_id === extraction.id);
  const others = (existing ?? []).filter((d) => d.source_extraction_id !== extraction.id);

  const row = {
    household_id: householdId,
    name: valueOf('document_title') ?? extraction.document_title ?? 'Untitled legal document',
    type: canonicalType(extractorKey, typeCode),
    document_type: typeCode,
    document_subtype: extraction.document_subtype,
    category: extraction.category,
    status: 'current' as const,
    document_status: extraction.document_status,
    execution_date: valueOf('execution_date') ?? extraction.execution_date,
    effective_date: valueOf('effective_date') ?? extraction.effective_date,
    expiration_date: valueOf('expiration_date') ?? extraction.expiration_date,
    governing_jurisdiction: valueOf('governing_jurisdiction') ?? extraction.governing_jurisdiction,
    attorney: valueOf('attorney_name') ?? valueOf('law_firm'),
    last_reviewed: new Date().toISOString().slice(0, 10),
    source_document_id: extraction.document_id,
    source_extraction_id: extraction.id,
    supersedes_document_id: others.length === 1 ? others[0].id : null,
    // Deliberately null, not true: which document controls is not ours to decide.
    is_controlling: null,
  };

  let legalDocumentId: string;
  if (fromThisReading) {
    const { error } = await supabase.from('legal_documents').update(row).eq('id', fromThisReading.id);
    if (error) throw new Error(`Could not update this document: ${error.message}`);
    legalDocumentId = fromThisReading.id;
  } else {
    const { data: inserted, error } = await supabase
      .from('legal_documents').insert([row]).select('id').single();
    if (error || !inserted) throw new Error(`Could not add this document: ${error?.message ?? 'no row returned'}`);
    legalDocumentId = inserted.id;
  }

  if (others.length > 0) {
    conflicts.push(
      `${others.length} other ${others.length === 1 ? 'document' : 'documents'} of this type ${others.length === 1 ? 'is' : 'are'} already on file.`,
    );
    await supabase.from('legal_issue_flags').insert([{
      household_id: householdId,
      extraction_id: extraction.id,
      flag_code: 'multiple_documents_same_type',
      severity: 'worth_reviewing',
      confidence: 1,
      explanation:
        `Your profile now holds more than one document of this type. Command has kept them all and ` +
        `has not decided which one is current.`,
      suggested_action: 'Check the execution dates and confirm which document is the current one.',
      attorney_review_suggested: true,
    }]);
  }

  // Profile facts. 'document_found' is the strongest claim available here: it
  // says a document is on file, never that the household is covered.
  const factCodes = FACTS_BY_EXTRACTOR[extractorKey] ?? [];
  let factsWritten = 0;
  for (const factCode of factCodes) {
    const { error } = await supabase.from('legal_profile_facts').upsert(
      {
        household_id: householdId,
        fact_code: factCode,
        subject_label: valueOf('document_title') ?? 'Household',
        value_text: row.name,
        value_date: row.execution_date,
        state: 'document_found',
        origin: 'user_confirmed',
        source_extraction_id: extraction.id,
        source_document_id: extraction.document_id,
        confidence: extraction.classification_confidence,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'household_id,fact_code,subject_label' },
    );
    if (error) console.error('Could not write a profile fact:', error);
    else factsWritten += 1;
  }

  // Anything still unreviewed keeps the reading in the queue rather than
  // declaring it done.
  const unreviewed = fields.filter((f) => f.review_state === 'unreviewed').length;
  const partial = unreviewed > 0;

  const { error: headerError } = await supabase
    .from('legal_document_extractions')
    .update({
      review_status: partial ? 'partially_confirmed' : 'confirmed',
      processing_state: partial ? 'partially_confirmed' : 'confirmed',
    })
    .eq('id', extraction.id);
  if (headerError) throw new Error(`Could not update the review status: ${headerError.message}`);

  return { legalDocumentId, fieldsApplied: accepted.length, factsWritten, conflicts, partial };
}

/** Sets every unreviewed value on a reading to one decision. */
export async function reviewAllLegalFields(
  extractionId: string,
  decision: ReviewDecision,
  onlyBands: ConfidenceBand[] = ['high', 'medium'],
): Promise<number> {
  const { data, error } = await supabase
    .from('legal_extracted_fields')
    .select('id, confidence, review_state')
    .eq('extraction_id', extractionId)
    .eq('review_state', 'unreviewed');
  if (error) {
    console.error('Could not read fields for bulk review:', error);
    throw new Error(`Could not confirm these details: ${error.message}`);
  }

  // Low-confidence values are excluded from a bulk confirm by default. They are
  // exactly the ones a person should look at individually.
  const targets = (data ?? []).filter((f) => onlyBands.includes(confidenceBand(f.confidence as number | null)));
  if (targets.length === 0) return 0;

  const { error: updateError } = await supabase
    .from('legal_extracted_fields')
    .update({ review_state: decision, reviewed_at: new Date().toISOString() })
    .in('id', targets.map((t) => t.id));
  if (updateError) {
    console.error('Could not apply the bulk review:', updateError);
    throw new Error(`Could not confirm these details: ${updateError.message}`);
  }
  return targets.length;
}

/** Newest reading per document, newest first. */
export async function getLegalExtractions(householdId: string): Promise<LegalDocumentExtraction[]> {
  const { data, error } = await supabase
    .from('legal_document_extractions')
    .select('*')
    .eq('household_id', householdId)
    .neq('processing_state', 'deleted')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching legal extractions:', error);
    return [];
  }
  return (data ?? []) as LegalDocumentExtraction[];
}

export async function getLegalIssueFlags(householdId: string): Promise<LegalIssueFlag[]> {
  const { data, error } = await supabase
    .from('legal_issue_flags')
    .select('*')
    .eq('household_id', householdId)
    .eq('state', 'open')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching legal issue flags:', error);
    return [];
  }
  return (data ?? []) as LegalIssueFlag[];
}

/**
 * The user's correction of a misclassified document. It is recorded alongside
 * the model's answer, never over it — what Command thought and what the user
 * says stay separately inspectable, and the reason text keeps making sense.
 */
export async function correctLegalDocumentType(extractionId: string, typeCode: string): Promise<boolean> {
  const { error } = await supabase
    .from('legal_document_extractions')
    .update({ user_document_type: typeCode, user_corrected_at: new Date().toISOString() })
    .eq('id', extractionId);

  if (error) {
    console.error('Failed to correct the document type:', error);
    throw new Error(`Could not change the document type: ${error.message}`);
  }
  return true;
}

export interface FamilyMilestone {
  id: string;
  family_member_id: string;
  household_id: string;
  title: string;
  event_date: string | null;
  status: string | null;
  category: string | null;
  triggers_review: string[] | null;
  created_at: string;
}

export interface CreditCard {
  id: string;
  household_id: string;
  card_name: string;
  issuer: string | null;
  credit_limit: number | null;
  current_balance: number | null;
  utilization_pct: number | null;
  rewards_type: string | null;
  rewards_value_ytd: number | null;
  annual_fee: number | null;
  created_at: string;
  // Added with the statement extraction schema; optional because cards entered
  // by hand before it do not carry them.
  institution?: string | null;
  last_four?: string | null;
  account_nickname?: string | null;
  primary_cardholder?: string | null;
  statement_balance?: number | null;
  statement_closing_date?: string | null;
  minimum_payment_due?: number | null;
  payment_due_date?: string | null;
  available_credit?: number | null;
  purchase_apr?: number | null;
  rewards_balance?: number | null;
  latest_statement_id?: string | null;
  last_confirmed_at?: string | null;
}

/** One reading of one uploaded statement. Raw until confirmed. */
export interface CreditStatement {
  id: string;
  household_id: string;
  document_id: string;
  credit_card_id: string | null;
  institution: string | null;
  card_product: string | null;
  account_nickname: string | null;
  last_four: string | null;
  primary_cardholder: string | null;
  statement_opening_date: string | null;
  statement_closing_date: string | null;
  payment_due_date: string | null;
  previous_balance: number | null;
  payments_and_credits: number | null;
  purchases: number | null;
  cash_advances: number | null;
  balance_transfers: number | null;
  fees_charged: number | null;
  interest_charged: number | null;
  statement_balance: number | null;
  minimum_payment_due: number | null;
  past_due_amount: number | null;
  credit_limit: number | null;
  available_credit: number | null;
  current_balance: number | null;
  annual_fee: number | null;
  rewards_program: string | null;
  rewards_beginning_balance: number | null;
  rewards_earned: number | null;
  rewards_redeemed: number | null;
  rewards_ending_balance: number | null;
  rewards_expiration_note: string | null;
  processing_state: string;
  review_status: 'pending_review' | 'confirmed' | 'partially_confirmed' | 'discarded';
  failure_reason: string | null;
  match_state: 'unmatched' | 'suggested' | 'confirmed' | 'rejected' | 'conflict';
  match_confidence: number | null;
  match_note: string | null;
  extraction_version: number;
  created_at: string;
}

export interface CreditStatementField {
  id: string;
  statement_id: string;
  household_id: string;
  field_code: string;
  field_group: string | null;
  value_text: string | null;
  value_number: number | null;
  value_date: string | null;
  raw_value: string | null;
  source_page: number | null;
  source_section: string | null;
  evidence: string | null;
  confidence: number | null;
  value_type: 'explicit' | 'calculated' | 'inferred' | 'unknown';
  is_sensitive: boolean;
  review_state: 'unreviewed' | 'confirmed' | 'edited' | 'rejected' | 'unresolved';
  user_value: string | null;
}

export interface CreditAprTerm {
  id: string;
  statement_id: string;
  apr_type: 'purchase' | 'cash_advance' | 'balance_transfer' | 'penalty' | 'promotional' | 'other';
  apr_percent: number | null;
  is_variable: boolean | null;
  balance_subject_to_rate: number | null;
  interest_charged: number | null;
  promotional_balance: number | null;
  promotional_expiration_date: string | null;
  description: string | null;
  source_page: number | null;
  evidence: string | null;
  confidence: number | null;
}

export interface CreditTransaction {
  id: string;
  statement_id: string;
  household_id: string;
  credit_card_id: string | null;
  transaction_date: string | null;
  posting_date: string | null;
  merchant_description: string;
  amount: number | null;
  direction: 'charge' | 'credit';
  category: string | null;
  category_source: 'issuer_provided' | 'ai_classified' | 'user_set';
  category_confidence: number | null;
  cardholder: string | null;
  source_page: number | null;
  confidence: number | null;
}

export interface CreditStatementDetail {
  fields: CreditStatementField[];
  aprTerms: CreditAprTerm[];
  transactions: CreditTransaction[];
}

/** One card found by searching the web. A lead, never a term sheet. */
export interface CardOfferCandidate {
  id: string;
  research_id: string;
  household_id: string;
  issuer: string;
  card_name: string;
  annual_fee: number | null;
  earn_rates: Array<{ category: string; rate: string; unit: string; note?: string }>;
  signup_bonus: string | null;
  signup_requirement: string | null;
  intro_apr: string | null;
  notable_benefits: string | null;
  credit_needed: string | null;
  /** Command's arithmetic on your own spend — not a figure from the page. */
  estimated_annual_value: number | null;
  value_basis: Record<string, unknown>;
  source_url: string;
  source_title: string | null;
  is_issuer_source: boolean;
  retrieved_at: string;
  confidence: number | null;
  verification_state: 'unverified' | 'user_confirmed' | 'user_rejected';
  user_note: string | null;
}

export interface CardOfferResearch {
  id: string;
  household_id: string;
  status: 'running' | 'complete' | 'failed';
  spend_profile: Record<string, number>;
  search_summary: string | null;
  failure_reason: string | null;
  searches_run: number | null;
  requested_at: string;
  completed_at: string | null;
}

export async function getCardOfferCandidates(householdId: string): Promise<CardOfferCandidate[]> {
  const { data, error } = await supabase
    .from('card_offer_candidates')
    .select('*')
    .eq('household_id', householdId)
    .neq('verification_state', 'user_rejected')
    .order('estimated_annual_value', { ascending: false, nullsFirst: false });
  if (error) {
    console.error('Error fetching card offers:', error);
    return [];
  }
  return (data ?? []) as CardOfferCandidate[];
}

export async function getLatestCardResearch(householdId: string): Promise<CardOfferResearch | null> {
  const { data, error } = await supabase
    .from('card_offer_research')
    .select('*')
    .eq('household_id', householdId)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('Error fetching card research:', error);
    return null;
  }
  return (data as CardOfferResearch) ?? null;
}

/**
 * Runs a fresh search. Slow by nature — several web searches and two model
 * passes — so the UI shows it working rather than pretending it is instant.
 */
export async function researchCardOffers(
  householdId: string,
  onStage?: (stage: 'searching' | 'reading') => void,
): Promise<{ candidates: number }> {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  if (!token) throw new Error('You need to be signed in to research offers.');

  const call = async (body: Record<string, string>) => {
    const response = await fetch(`${supabaseUrl}/functions/v1/research-card-offers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      // A worker resource limit is the edge wall clock, not a bad request — say
      // which it was, because the fix is different.
      const detail =
        payload?.code === 'WORKER_RESOURCE_LIMIT'
          ? 'The search ran longer than the server allows. Try again — it usually completes on a second run.'
          : payload?.error ?? `Research failed (${response.status}).`;
      throw new Error(detail);
    }
    return payload;
  };

  // Two invocations, not one. Searching and normalizing together exceed the
  // Edge Function wall clock; each stage on its own finishes comfortably.
  onStage?.('searching');
  const searched = await call({ household_id: householdId });
  if (!searched?.research_id) throw new Error('The search did not start.');

  onStage?.('reading');
  const structured = await call({ research_id: searched.research_id });
  return { candidates: structured.candidates ?? 0 };
}

/** The user's verdict on a researched offer. Nothing else moves it. */
export async function verifyCardOffer(
  candidateId: string,
  state: 'user_confirmed' | 'user_rejected',
  note?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('card_offer_candidates')
    .update({ verification_state: state, user_note: note ?? null })
    .eq('id', candidateId);
  if (error) {
    console.error('Failed to record the offer verdict:', error);
    throw new Error(`Could not save that: ${error.message}`);
  }
  return true;
}

export async function getCreditStatements(householdId: string): Promise<CreditStatement[]> {
  const { data, error } = await supabase
    .from('credit_statements')
    .select('*')
    .eq('household_id', householdId)
    .neq('processing_state', 'deleted')
    .order('statement_closing_date', { ascending: false, nullsFirst: false });
  if (error) {
    console.error('Error fetching credit statements:', error);
    return [];
  }
  return (data ?? []) as CreditStatement[];
}

/** Every transaction across the household, for spend analysis. */
export async function getCreditTransactions(householdId: string): Promise<CreditTransaction[]> {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('household_id', householdId)
    .order('transaction_date', { ascending: false, nullsFirst: false });
  if (error) {
    console.error('Error fetching credit transactions:', error);
    return [];
  }
  return (data ?? []) as CreditTransaction[];
}

export async function getCreditStatementDetail(statementId: string): Promise<CreditStatementDetail> {
  const [fields, aprTerms, transactions] = await Promise.all([
    supabase.from('credit_statement_fields').select('*').eq('statement_id', statementId).order('field_code'),
    supabase.from('credit_apr_terms').select('*').eq('statement_id', statementId).order('apr_type'),
    supabase.from('credit_transactions').select('*').eq('statement_id', statementId)
      .order('transaction_date', { ascending: false, nullsFirst: false }),
  ]);
  for (const result of [fields, aprTerms, transactions]) {
    if (result.error) console.error('Error loading statement detail:', result.error);
  }
  return {
    fields: (fields.data ?? []) as CreditStatementField[],
    aprTerms: (aprTerms.data ?? []) as CreditAprTerm[],
    transactions: (transactions.data ?? []) as CreditTransaction[],
  };
}

export async function reviewCreditField(
  fieldId: string,
  decision: ReviewDecision,
  userValue?: string | null,
): Promise<boolean> {
  const patch: Record<string, unknown> = { review_state: decision, reviewed_at: new Date().toISOString() };
  if (decision === 'edited') patch.user_value = (userValue ?? '').trim() || null;
  if (decision === 'rejected') patch.user_value = null;

  const { error } = await supabase.from('credit_statement_fields').update(patch).eq('id', fieldId);
  if (error) {
    console.error('Failed to record the field decision:', error);
    throw new Error(`Could not save that decision: ${error.message}`);
  }
  return true;
}

export async function reviewAllCreditFields(statementId: string): Promise<number> {
  const { data, error } = await supabase
    .from('credit_statement_fields')
    .select('id, confidence')
    .eq('statement_id', statementId)
    .eq('review_state', 'unreviewed');
  if (error) throw new Error(`Could not confirm these details: ${error.message}`);

  const targets = (data ?? []).filter((f) => confidenceBand(f.confidence as number | null) !== 'low');
  if (targets.length === 0) return 0;

  const { error: updateError } = await supabase
    .from('credit_statement_fields')
    .update({ review_state: 'confirmed', reviewed_at: new Date().toISOString() })
    .in('id', targets.map((t) => t.id));
  if (updateError) throw new Error(`Could not confirm these details: ${updateError.message}`);
  return targets.length;
}

export interface CreditMatchCandidate {
  card: CreditCard;
  confidence: number;
  reason: string;
}

/**
 * Institution plus last four identifies an account. Either alone does not: a
 * household can hold two Chase cards, and two issuers can both end in 4021.
 * A partial match is offered as a question, never applied.
 */
export function matchCreditCard(statement: CreditStatement, cards: CreditCard[]): CreditMatchCandidate | null {
  const institution = (statement.institution ?? '').trim().toLowerCase();
  const lastFour = (statement.last_four ?? '').trim();

  if (institution && lastFour) {
    const exact = cards.find(
      (c) => (c.institution ?? c.issuer ?? '').trim().toLowerCase() === institution && c.last_four === lastFour,
    );
    if (exact) return { card: exact, confidence: 0.97, reason: 'Same institution and last four digits.' };
  }
  if (lastFour) {
    const byDigits = cards.filter((c) => c.last_four === lastFour);
    if (byDigits.length === 1) {
      return {
        card: byDigits[0],
        confidence: 0.6,
        reason: 'The last four digits match, but the institution on file reads differently. Confirm this is the same card.',
      };
    }
  }
  if (institution) {
    const byInstitution = cards.filter(
      (c) => (c.institution ?? c.issuer ?? '').trim().toLowerCase() === institution,
    );
    if (byInstitution.length === 1 && !byInstitution[0].last_four) {
      return {
        card: byInstitution[0],
        confidence: 0.45,
        reason: 'Same institution, but the card on file has no last four digits recorded. Confirm before linking.',
      };
    }
  }
  return null;
}

export interface CreditConfirmationResult {
  cardId: string;
  created: boolean;
  fieldsApplied: number;
  partial: boolean;
}

/**
 * Promotes a reviewed statement onto a card account.
 *
 * Only confirmed or edited values travel. The statement's own numbers are
 * written to statement-scoped columns — `statement_balance`, not
 * `current_balance` — because a closed period does not tell you what is owed
 * today, and conflating them would make utilization quietly wrong.
 *
 * An older statement never overwrites a newer one's figures.
 */
export async function confirmCreditStatement(
  statement: CreditStatement,
  targetCardId: string | null,
): Promise<CreditConfirmationResult> {
  const { data: fieldRows, error } = await supabase
    .from('credit_statement_fields')
    .select('*')
    .eq('statement_id', statement.id);
  if (error) throw new Error(`Could not read this statement's fields: ${error.message}`);

  const fields = (fieldRows ?? []) as CreditStatementField[];
  const accepted = fields.filter((f) => f.review_state === 'confirmed' || f.review_state === 'edited');
  if (accepted.length === 0) {
    throw new Error('Nothing has been confirmed yet. Confirm at least one detail before adding this card.');
  }

  const valueOf = (code: string): string | null => {
    const hit = accepted.find((f) => f.field_code === code);
    return hit ? (hit.user_value ?? hit.value_text) : null;
  };
  const numberOf = (code: string): number | null => {
    const raw = valueOf(code);
    if (raw == null) return null;
    const parsed = Number(String(raw).replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const institution = valueOf('institution') ?? statement.institution;
  const lastFour = valueOf('last_four') ?? statement.last_four;
  const closingDate = valueOf('statement_closing_date') ?? statement.statement_closing_date;
  const limit = numberOf('credit_limit') ?? statement.credit_limit;
  const balance = numberOf('statement_balance') ?? statement.statement_balance;

  // Utilization from this statement's own limit and balance, marked as of its
  // closing date rather than presented as today's number.
  const utilization = limit && limit > 0 && balance != null ? (balance / limit) * 100 : null;

  const cardValues = {
    household_id: statement.household_id,
    card_name: valueOf('card_product') ?? statement.card_product ?? 'Credit card',
    issuer: institution,
    institution,
    last_four: lastFour,
    account_nickname: valueOf('account_nickname') ?? statement.account_nickname,
    primary_cardholder: valueOf('primary_cardholder') ?? statement.primary_cardholder,
    credit_limit: limit,
    available_credit: numberOf('available_credit') ?? statement.available_credit,
    statement_balance: balance,
    statement_closing_date: closingDate,
    minimum_payment_due: numberOf('minimum_payment_due') ?? statement.minimum_payment_due,
    payment_due_date: valueOf('payment_due_date') ?? statement.payment_due_date,
    // Only when the statement said so outright.
    current_balance: numberOf('current_balance') ?? statement.current_balance,
    utilization_pct: utilization,
    annual_fee: numberOf('annual_fee') ?? statement.annual_fee,
    rewards_type: valueOf('rewards_program') ?? statement.rewards_program,
    rewards_balance: numberOf('rewards_ending_balance') ?? statement.rewards_ending_balance,
    latest_statement_id: statement.id,
    source_document_id: statement.document_id,
    last_confirmed_at: new Date().toISOString(),
  };

  let cardId = targetCardId;
  let created = false;

  if (cardId) {
    const { data: existing } = await supabase
      .from('credit_cards').select('statement_closing_date').eq('id', cardId).single();
    const existingDate = existing?.statement_closing_date ?? null;
    // An older statement contributes history, not a rewrite of the newest figures.
    const isNewer = !existingDate || !closingDate || closingDate >= existingDate;
    const patch = isNewer
      ? cardValues
      : { institution: cardValues.institution, last_four: cardValues.last_four };

    const { error: updateError } = await supabase.from('credit_cards').update(patch).eq('id', cardId);
    if (updateError) throw new Error(`Could not update this card: ${updateError.message}`);
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('credit_cards').insert([cardValues]).select('id').single();
    if (insertError || !inserted) {
      throw new Error(`Could not add this card: ${insertError?.message ?? 'no row returned'}`);
    }
    cardId = inserted.id;
    created = true;
  }

  const unreviewed = fields.filter((f) => f.review_state === 'unreviewed').length;
  const partial = unreviewed > 0;

  const { error: statementError } = await supabase
    .from('credit_statements')
    .update({
      credit_card_id: cardId,
      match_state: 'confirmed',
      review_status: partial ? 'partially_confirmed' : 'confirmed',
      processing_state: partial ? 'partially_confirmed' : 'confirmed',
    })
    .eq('id', statement.id);
  if (statementError) throw new Error(`Could not link this statement: ${statementError.message}`);

  await supabase.from('credit_transactions').update({ credit_card_id: cardId }).eq('statement_id', statement.id);

  return { cardId: cardId as string, created, fieldsApplied: accepted.length, partial };
}

// ============================================================
// DATA ACCESS FUNCTIONS
// ============================================================

export async function getHousehold(userId: string): Promise<Household | null> {
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching household:', error);
    return null;
  }
  return data;
}

export async function createHousehold(userId: string, name = 'My Household'): Promise<Household | null> {
  const { data, error } = await supabase
    .from('households')
    .insert({ user_id: userId, name })
    .select()
    .single();

  if (error) {
    console.error('Error creating household:', error);
    return null;
  }
  return data;
}

export async function getInsurancePolicies(householdId: string): Promise<InsurancePolicy[]> {
  const { data, error } = await supabase
    .from('insurance_policies')
    .select('*')
    .eq('household_id', householdId)
    .order('type');

  if (error) {
    console.error('Error fetching insurance policies:', error);
    return [];
  }
  return data ?? [];
}

export async function getLegalDocuments(householdId: string): Promise<LegalDocument[]> {
  const { data, error } = await supabase
    .from('legal_documents')
    .select('*')
    .eq('household_id', householdId)
    .order('name');

  if (error) {
    console.error('Error fetching legal documents:', error);
    return [];
  }
  return data ?? [];
}

export async function getDocuments(householdId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('household_id', householdId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
  return data ?? [];
}

/**
 * Throws on failure rather than returning null. UploadDropzone already renders
 * whatever error propagates out of onUpload; returning null meant callers
 * silently skipped their success branch and the dropzone reported "Upload
 * completed" for an upload that never happened.
 */
export async function uploadDocumentAsset(householdId: string, file: File, category: string): Promise<Document> {
  const normalizedCategory = category || 'general';
  const uploadPath = `${householdId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from(storageBucket).upload(uploadPath, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (uploadError) {
    console.error('Error uploading file to storage:', uploadError);
    const message = /bucket not found/i.test(uploadError.message)
      ? `Storage bucket "${storageBucket}" does not exist. Create it in Supabase → Storage before uploading.`
      : `Could not upload the file: ${uploadError.message}`;
    throw new Error(message);
  }

  const { data, error } = await supabase
    .from('documents')
    .insert([
      {
        household_id: householdId,
        name: file.name,
        category: normalizedCategory,
        file_path: uploadPath,
        file_size: file.size,
        mime_type: file.type,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating document record:', error);
    throw new Error(`File uploaded but the document record could not be saved: ${error.message}`);
  }
  return data;
}

/**
 * Short-lived signed URL for a stored document. The bucket is private, so this
 * is the only way to open a file from the vault.
 */

// ============================================================
// INSURANCE POLICY EXTRACTION (structured, evidence-bearing)
// ============================================================

export type ExtractionValueType = 'explicit' | 'calculated' | 'inferred' | 'unknown';

export interface InsuranceCoverageRow {
  id: string;
  coverage_code: string;
  coverage_name_raw: string | null;
  applies_to: string | null;
  limit_amount: number | null;
  limit_basis: string | null;
  secondary_limit_amount: number | null;
  deductible_amount: number | null;
  deductible_percent: number | null;
  included_status: 'included' | 'excluded' | 'optional_not_purchased' | 'not_found';
  coverage_basis: string | null;
  notes: string | null;
  raw_value: string | null;
  source_page: number | null;
  source_section: string | null;
  evidence: string | null;
  confidence: number | null;
  value_type: ExtractionValueType;
  is_controlling: boolean;
}

export interface InsuranceDeductibleRow {
  id: string;
  deductible_type: string;
  amount: number | null;
  percent: number | null;
  calculation_basis: string | null;
  calculated_amount: number | null;
  calculation_confidence: number | null;
  applies_to: string | null;
  source_page: number | null;
  evidence: string | null;
  confidence: number | null;
  value_type: ExtractionValueType;
}

export interface InsuranceExclusionRow {
  id: string;
  category: string;
  summary: string | null;
  policy_language: string | null;
  affected_coverage: string | null;
  sublimit_amount: number | null;
  severity: 'informational' | 'meaningful' | 'significant' | 'critical';
  source_page: number | null;
  evidence: string | null;
  confidence: number | null;
}

export interface InsuranceEndorsementRow {
  id: string;
  endorsement_number: string | null;
  name: string | null;
  effective_date: string | null;
  modifies_coverage: string | null;
  coverage_added: string | null;
  coverage_removed: string | null;
  limit_amount: number | null;
  restrictions: string | null;
  source_page: number | null;
  confidence: number | null;
}

export interface InsuranceInsuredPartyRow {
  id: string;
  role: string;
  name: string | null;
  relationship: string | null;
  confidence: number | null;
}

export interface InsuranceInsuredAssetRow {
  id: string;
  asset_type: string;
  description: string | null;
  address: string | null;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  confidence: number | null;
}

export interface InsuranceBeneficiaryRow {
  id: string;
  designation: 'primary' | 'contingent' | 'irrevocable' | 'successor_owner';
  name: string | null;
  relationship: string | null;
  percentage: number | null;
  is_trust: boolean;
  is_employer_owned: boolean;
  source_page: number | null;
  evidence: string | null;
  confidence: number | null;
}

export interface InsuranceUnderlyingRequirementRow {
  id: string;
  requirement_type: string;
  required_limit: number | null;
  notes: string | null;
  confidence: number | null;
}

export interface InsurancePolicyExtraction {
  id: string;
  household_id: string;
  document_id: string;
  document_class: string;
  insurance_type: string;
  carrier: string | null;
  policy_number: string | null;
  policy_status: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  state_of_issuance: string | null;
  annual_premium: number | null;
  policy_fields: Array<Record<string, unknown>>;
  premiums: Array<Record<string, unknown>>;
  valuation_terms: Array<Record<string, unknown>>;
  conflicts: Array<Record<string, unknown>>;
  unresolved_items: Array<{ item?: string; why_unresolved?: string; needed_document?: string }>;
  extraction_quality: Record<string, unknown>;
  declarations_only: boolean;
  has_full_policy: boolean;
  endorsements_appear_missing: boolean;
  plain_language_summary: string | null;
  review_status: 'pending_review' | 'confirmed' | 'discarded';
  created_at: string;
  insurance_coverages: InsuranceCoverageRow[];
  insurance_deductibles: InsuranceDeductibleRow[];
  insurance_exclusions: InsuranceExclusionRow[];
  insurance_endorsements: InsuranceEndorsementRow[];
  insurance_insured_parties: InsuranceInsuredPartyRow[];
  insurance_insured_assets: InsuranceInsuredAssetRow[];
  insurance_underlying_requirements: InsuranceUnderlyingRequirementRow[];
  insurance_beneficiaries: InsuranceBeneficiaryRow[];
}

/** Header plus every child row in one round trip, via PostgREST embedding. */
export async function getInsurancePolicyExtractions(householdId: string): Promise<InsurancePolicyExtraction[]> {
  const { data, error } = await supabase
    .from('insurance_policy_extractions')
    .select(
      '*,insurance_coverages(*),insurance_deductibles(*),insurance_exclusions(*),' +
      'insurance_endorsements(*),insurance_insured_parties(*),insurance_insured_assets(*),' +
      'insurance_underlying_requirements(*),insurance_beneficiaries(*)',
    )
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching insurance policy extractions:', error);
    return [];
  }
  return (data ?? []) as unknown as InsurancePolicyExtraction[];
}

/**
 * Accept an extraction into the profile. Creates the insurance_policies record
 * the rest of the app reads, stamped with the document it came from so it can
 * later be removed alongside that document.
 */
export async function confirmInsuranceExtraction(extraction: InsurancePolicyExtraction): Promise<boolean> {
  const headline =
    extraction.insurance_coverages.find((c) => c.coverage_code === 'dwelling') ??
    extraction.insurance_coverages.find((c) => c.coverage_code === 'umbrella_liability') ??
    extraction.insurance_coverages.find((c) => c.coverage_code === 'death_benefit') ??
    extraction.insurance_coverages.find((c) => c.limit_amount !== null);

  const standardDeductible =
    extraction.insurance_deductibles.find((d) => d.deductible_type === 'standard') ??
    extraction.insurance_deductibles.find((d) => d.amount !== null);

  // Idempotency: the button was clickable while confirm was silently failing, so
  // a second successful click must not create a duplicate policy.
  const { data: existing } = await supabase
    .from('insurance_policies')
    .select('id')
    .eq('source_extraction_id', extraction.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('insurance_policy_extractions')
      .update({ review_status: 'confirmed' })
      .eq('id', extraction.id);
    return true;
  }

  const { error: insertError } = await supabase.from('insurance_policies').insert([
    {
      household_id: extraction.household_id,
      type: normalizePolicyType(extraction.insurance_type),
      carrier: extraction.carrier,
      policy_number: extraction.policy_number,
      coverage_amount: headline?.limit_amount ?? null,
      annual_premium: extraction.annual_premium,
      deductible: standardDeductible?.amount ?? null,
      renewal_date: extraction.expiration_date,
      status: 'active',
      notes: extraction.plain_language_summary,
      source_document_id: extraction.document_id,
      source_extraction_id: extraction.id,
    },
  ]);

  if (insertError) {
    console.error('Failed to create policy from extraction:', insertError);
    // Throw rather than return false: a silent false leaves the button looking
    // untouched and the user re-clicking a no-op.
    throw new Error(`Could not add this policy to your profile: ${insertError.message}`);
  }

  const { error } = await supabase
    .from('insurance_policy_extractions')
    .update({ review_status: 'confirmed' })
    .eq('id', extraction.id);
  if (error) {
    console.error('Failed to mark extraction confirmed:', error);
    throw new Error(`Policy was added but could not be marked reviewed: ${error.message}`);
  }
  return true;
}

export async function discardInsuranceExtraction(extractionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('insurance_policy_extractions')
    .update({ review_status: 'discarded' })
    .eq('id', extractionId);
  if (error) {
    console.error('Failed to discard extraction:', error);
    throw new Error(`Could not discard this extraction: ${error.message}`);
  }
  return true;
}

/** What deleting a document would take with it, so the user can decide knowingly. */
export async function getDocumentImpact(documentId: string): Promise<{ policies: number; accounts: number; cards: number; taxDocs: number }> {
  const count = async (table: string) => {
    const { count: n } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('source_document_id', documentId);
    return n ?? 0;
  };
  const [policies, accounts, cards, taxDocs] = await Promise.all([
    count('insurance_policies'),
    count('finance_accounts'),
    count('credit_cards'),
    count('tax_documents'),
  ]);
  return { policies, accounts, cards, taxDocs };
}

/**
 * Remove a document. Staged extractions cascade via FK. Records already
 * confirmed into the profile are only removed when the caller asks — they are
 * the user's own data, not a by-product of the file.
 */
export async function deleteDocument(
  documentId: string,
  filePath: string | null,
  alsoRemoveImported: boolean,
): Promise<boolean> {
  if (alsoRemoveImported) {
    for (const table of ['insurance_policies', 'finance_accounts', 'credit_cards', 'tax_documents']) {
      const { error } = await supabase.from(table).delete().eq('source_document_id', documentId);
      if (error) console.warn(`Could not remove imported rows from ${table}:`, error.message);
    }
  }

  // Delete the row first: the storage object is recoverable noise if this fails,
  // but a row pointing at a deleted file is a broken vault entry.
  const { error } = await supabase.from('documents').delete().eq('id', documentId);
  if (error) {
    console.error('Failed to delete document:', error);
    throw new Error(`Could not delete the document: ${error.message}`);
  }

  if (filePath) {
    const { error: storageError } = await supabase.storage.from(storageBucket).remove([filePath]);
    if (storageError) console.warn('Document row deleted but file remains in storage:', storageError.message);
  }
  return true;
}

/**
 * Remove a policy directly. Document-scoped deletion cannot help when one
 * document produced two rows, or when the source document is already gone.
 */
export interface ManualPolicyInput {
  type: InsurancePolicyType;
  carrier: string | null;
  policy_number: string | null;
  coverage_amount: string | number | null;
  deductible: string | number | null;
  annual_premium: string | number | null;
  renewal_date: string | null;
  notes: string | null;
}

/**
 * A policy the user typed in rather than uploaded. Everything is optional — the
 * point is to capture what they know now, not to gate the record behind a
 * document they cannot find. No source_document_id, so the UI correctly reports
 * it as having no extracted detail.
 */
export async function createManualPolicy(householdId: string, input: ManualPolicyInput): Promise<boolean> {
  const { error } = await supabase.from('insurance_policies').insert([
    {
      household_id: householdId,
      type: input.type,
      carrier: input.carrier,
      policy_number: input.policy_number,
      coverage_amount: parseNumber(input.coverage_amount as string | null),
      deductible: parseNumber(input.deductible as string | null),
      annual_premium: parseNumber(input.annual_premium as string | null),
      renewal_date: input.renewal_date || null,
      status: 'active',
      notes: input.notes,
    },
  ]);
  if (error) {
    console.error('Failed to add policy:', error);
    throw new Error(`Could not add the policy: ${error.message}`);
  }
  return true;
}

export interface PolicyEdit {
  type?: InsurancePolicyType;
  carrier?: string | null;
  policy_number?: string | null;
  coverage_amount?: string | number | null;
  deductible?: string | number | null;
  annual_premium?: string | number | null;
  renewal_date?: string | null;
  notes?: string | null;
}

/**
 * Edit any policy, extracted or manual. Extracted values are a reading of a
 * document and can be wrong or inconsistently worded — a carrier that writes
 * itself two different ways across three policies, for instance. This edits the
 * insurance_policies record only; the extraction and its evidence trail stay
 * untouched, so the original reading remains inspectable.
 */
export async function updateInsurancePolicy(policyId: string, edit: PolicyEdit): Promise<boolean> {
  const patch: Record<string, unknown> = {};
  if (edit.type !== undefined) patch.type = edit.type;
  if (edit.carrier !== undefined) patch.carrier = edit.carrier?.trim() || null;
  if (edit.policy_number !== undefined) patch.policy_number = edit.policy_number?.trim() || null;
  if (edit.notes !== undefined) patch.notes = edit.notes?.trim() || null;
  if (edit.renewal_date !== undefined) patch.renewal_date = edit.renewal_date || null;
  if (edit.coverage_amount !== undefined) patch.coverage_amount = parseNumber(edit.coverage_amount as string | null);
  if (edit.deductible !== undefined) patch.deductible = parseNumber(edit.deductible as string | null);
  if (edit.annual_premium !== undefined) patch.annual_premium = parseNumber(edit.annual_premium as string | null);

  const { error } = await supabase.from('insurance_policies').update(patch).eq('id', policyId);
  if (error) {
    console.error('Failed to update policy:', error);
    throw new Error(`Could not save the policy: ${error.message}`);
  }
  return true;
}

export interface RecordHistoryEntry {
  id: string;
  household_id: string;
  table_name: string;
  record_id: string;
  version: number;
  operation: 'created' | 'updated' | 'deleted';
  changed_fields: Record<string, { from: unknown; to: unknown }>;
  snapshot: Record<string, unknown>;
  changed_by: string | null;
  changed_at: string;
}

/** Full change log for one record, newest first. */
export async function getRecordHistory(tableName: string, recordId: string): Promise<RecordHistoryEntry[]> {
  const { data, error } = await supabase
    .from('record_history')
    .select('*')
    .eq('table_name', tableName)
    .eq('record_id', recordId)
    .order('version', { ascending: false });
  if (error) {
    console.error('Error fetching record history:', error);
    return [];
  }
  return (data ?? []) as RecordHistoryEntry[];
}

/** Recent activity across every tracked table in the household. */
export async function getHouseholdHistory(householdId: string, limit = 50): Promise<RecordHistoryEntry[]> {
  const { data, error } = await supabase
    .from('record_history')
    .select('*')
    .eq('household_id', householdId)
    .order('changed_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('Error fetching household history:', error);
    return [];
  }
  return (data ?? []) as RecordHistoryEntry[];
}

export async function deleteInsurancePolicy(policyId: string): Promise<boolean> {
  const { error } = await supabase.from('insurance_policies').delete().eq('id', policyId);
  if (error) {
    console.error('Failed to delete policy:', error);
    throw new Error(`Could not remove this policy: ${error.message}`);
  }
  return true;
}

export async function getDocumentUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(storageBucket).createSignedUrl(filePath, 300);
  if (error || !data?.signedUrl) {
    console.error('Could not create signed URL for document:', error);
    return null;
  }
  return data.signedUrl;
}

export async function invokeDocumentExtraction(documentId: string): Promise<boolean> {
  // Pass the object directly — supabase-js serializes it and sets the JSON content type.
  const { error } = await supabase.functions.invoke('extract-document', {
    body: { document_id: documentId },
  });
  if (error) {
    // The function returns a JSON body describing the failure; surface it rather than
    // logging an opaque FunctionsHttpError.
    const detail = await error.context?.json?.().catch(() => null);

    // Two different body shapes arrive here. Our own failures carry `error`.
    // Platform failures — chiefly the edge wall clock — carry `code` and
    // `message`, which the old code ignored, so a timeout surfaced as
    // "returned a non-2xx status code" and told the user nothing.
    const raw: string = detail?.error ?? detail?.message ?? error.message ?? '';

    // Out of API credit is the one failure that is neither a bad document nor a
    // bug, and the raw message buries that under a wall of JSON. Say what it is
    // and where to fix it.
    const outOfCredit = /credit balance is too low|insufficient.{0,20}credit/i.test(raw);

    const message = outOfCredit
      ? 'your Anthropic API account is out of credits, so nothing can be read right now. ' +
        'Top it up at platform.claude.com under Plans & Billing — the file is safe here and you ' +
        'can run extraction again from the vault afterwards.'
      : detail?.code === 'WORKER_RESOURCE_LIMIT'
        ? 'the document took longer to read than the server allows. Large or multi-account ' +
          'statements can exceed it — try a single statement, or retry from the vault.'
        : raw;

    console.error('Error invoking extraction function:', message);
    // The file is safely stored and the document row exists, so this is not a
    // failed upload — surface it as a partial success the user can retry.
    throw new Error(`Document saved, but extraction failed: ${message}`);
  }
  return true;
}

function parseNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.toString().replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Maps what a declarations page actually says to our policy enum. Carriers write
 * "Homeowners", "Personal Automobile", "Excess Liability" — an exact match against
 * the enum filed a real homeowners policy as 'other'. Substring matching, most
 * specific first so "excess liability" doesn't get claimed by 'life'.
 */
function normalizePolicyType(type: string | null | undefined): InsurancePolicyType {
  const normalized = type?.toLowerCase().trim();
  if (!normalized) return 'other';

  const patterns: Array<[InsurancePolicyType, RegExp]> = [
    ['umbrella', /umbrella|excess\s*liability/],
    ['disability', /disabilit|income\s*protection|\bltd\b|\bstd\b/],
    ['health', /health|medical|dental|vision/],
    ['home', /home|dwelling|hazard|renter|condo|property|\bho-?\d/],
    ['auto', /auto|vehicle|\bcar\b|motor/],
    ['life', /life/],
  ];

  for (const [value, pattern] of patterns) {
    if (pattern.test(normalized)) return value;
  }
  return 'other';
}

export async function confirmDocumentExtraction(
  extractionId: string,
  correctedFields: Record<string, string | number | null>,
  detectedType: DocumentType,
  householdId: string,
  documentId: string
): Promise<boolean> {
  const insertResult = async () => {
    switch (detectedType) {
      case 'insurance_dec_page': {
        const { carrier, policy_type, policy_number, coverage_amount, premium, renewal_date } = correctedFields;
        const { error } = await supabase.from('insurance_policies').insert([
          {
            household_id: householdId,
            type: normalizePolicyType(policy_type as string | undefined),
            carrier: carrier as string | null,
            policy_number: policy_number as string | null,
            coverage_amount: parseNumber(coverage_amount as string | null),
            annual_premium: parseNumber(premium as string | null),
            renewal_date: (renewal_date as string) || null,
            status: 'active',
          },
        ]);
        return error == null;
      }
      case 'credit_card_statement': {
        const { issuer, card_name_last4, current_balance, credit_limit } = correctedFields;
        const cardName = card_name_last4 ? `${issuer ?? 'Card'} ${card_name_last4}` : (issuer as string | null) ?? 'Credit card';
        const { error } = await supabase.from('credit_cards').insert([
          {
            household_id: householdId,
            card_name: cardName,
            issuer: issuer as string | null,
            credit_limit: parseNumber(credit_limit as string | null),
            current_balance: parseNumber(current_balance as string | null),
          },
        ]);
        return error == null;
      }
      case 'bank_statement': {
        const { institution, account_type, balance, as_of_date } = correctedFields;
        const { error } = await supabase.from('finance_accounts').insert([
          {
            household_id: householdId,
            account_name: `${institution ?? 'Bank'} ${account_type ?? 'Account'}`,
            account_type: (account_type as string) ?? 'bank',
            institution: institution as string | null,
            balance: parseNumber(balance as string | null),
            as_of_date: (as_of_date as string) || null,
          },
        ]);
        return error == null;
      }
      case 'tax_document': {
        const { doc_type, tax_year, source, amount } = correctedFields;
        const { error } = await supabase.from('tax_documents').insert([
          {
            household_id: householdId,
            name: `${doc_type ?? 'Tax'} ${tax_year ?? ''}`,
            tax_year: Number(tax_year) || null,
            doc_type: (doc_type as string) || 'other',
            status: 'uploaded',
            amount: parseNumber(amount as string | null),
            source: source as string | null,
          },
        ]);
        return error == null;
      }
      case 'mortgage_statement': {
        const { lender, current_balance, interest_rate, monthly_payment } = correctedFields;
        const { error } = await supabase.from('finance_accounts').insert([
          {
            household_id: householdId,
            account_name: `${lender ?? 'Mortgage'} Loan`,
            account_type: 'mortgage',
            institution: lender as string | null,
            balance: parseNumber(current_balance as string | null),
            as_of_date: null,
          },
        ]);
        return error == null;
      }
      case 'paystub': {
        const { employer, net_pay } = correctedFields;
        const { error } = await supabase.from('finance_accounts').insert([
          {
            household_id: householdId,
            account_name: `${employer ?? 'Employer'} Paystub`,
            account_type: 'paystub',
            institution: employer as string | null,
            balance: parseNumber(net_pay as string | null),
            as_of_date: null,
          },
        ]);
        return error == null;
      }
      default:
        return true;
    }
  };

  const success = await insertResult();
  if (!success) {
    console.error('Failed to insert extraction target data for type', detectedType);
    return false;
  }

  const { error } = await supabase
    .from('document_extractions')
    .update({ status: 'confirmed' })
    .eq('id', extractionId);

  if (error) {
    console.error('Failed to update extraction status:', error);
    return false;
  }

  return true;
}

export async function discardDocumentExtraction(extractionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('document_extractions')
    .update({ status: 'discarded' })
    .eq('id', extractionId);
  if (error) {
    console.error('Failed to discard extraction:', error);
    return false;
  }
  return true;
}

export async function getDocumentExtractions(householdId: string): Promise<DocumentExtraction[]> {
  const { data, error } = await supabase
    .from('document_extractions')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching document extractions:', error);
    return [];
  }
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// Home systems and the mortgage
// ─────────────────────────────────────────────────────────────

export interface HomeSystem {
  id: string;
  household_id: string;
  name: string;
  category: string;
  location: string | null;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  installed_on: string | null;
  approximate_age_years: number | null;
  purchase_price: number | null;
  purchased_from: string | null;
  expected_life_years: number | null;
  user_expected_life_years: number | null;
  replacement_cost_estimate: number | null;
  user_replacement_cost: number | null;
  warranty_provider: string | null;
  warranty_type: string | null;
  warranty_expires_on: string | null;
  warranty_notes: string | null;
  condition_note: string | null;
  last_serviced_on: string | null;
  notes: string | null;
  entry_source: string;
  source_document_id: string | null;
  created_at: string;
}

export interface HomeSystemDocument {
  id: string;
  household_id: string;
  system_id: string;
  document_id: string;
  doc_role: 'warranty' | 'manual' | 'receipt' | 'invoice' | 'service_contract' | 'inspection' | 'other';
}

export interface MortgageAccount {
  id: string;
  household_id: string;
  servicer: string | null;
  loan_number_last4: string | null;
  property_address: string | null;
  original_amount: number | null;
  principal_balance: number | null;
  interest_rate: number | null;
  rate_type: string | null;
  term_months: number | null;
  origination_date: string | null;
  maturity_date: string | null;
  monthly_payment: number | null;
  escrow_payment: number | null;
  escrow_balance: number | null;
  pmi_amount: number | null;
  payment_due_date: string | null;
  balance_as_of: string | null;
  entry_source: string;
  latest_statement_id: string | null;
  last_confirmed_at: string | null;
}

export async function getHomeSystems(householdId: string): Promise<HomeSystem[]> {
  const { data, error } = await supabase
    .from('home_systems').select('*').eq('household_id', householdId).order('category');
  if (error) {
    console.error('Error fetching home systems:', error);
    return [];
  }
  return (data ?? []) as HomeSystem[];
}

export async function getHomeSystemDocuments(householdId: string): Promise<HomeSystemDocument[]> {
  const { data, error } = await supabase
    .from('home_system_documents').select('*').eq('household_id', householdId);
  if (error) {
    console.error('Error fetching system documents:', error);
    return [];
  }
  return (data ?? []) as HomeSystemDocument[];
}

export async function getMortgageAccount(householdId: string): Promise<MortgageAccount | null> {
  const { data, error } = await supabase
    .from('mortgage_accounts').select('*').eq('household_id', householdId)
    .order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (error) {
    console.error('Error fetching mortgage:', error);
    return null;
  }
  return (data as MortgageAccount) ?? null;
}

/**
 * Form fields arrive as strings; the row stores numbers and dates. Widening the
 * numeric fields here means the caller passes what the input element gave it and
 * the parsing lives in one place, rather than every form doing its own Number().
 */
type FromForm<T> = { [K in keyof T]?: T[K] extends number | null ? string | number | null : T[K] };

export type HomeSystemInput = FromForm<Omit<HomeSystem, 'id' | 'household_id' | 'created_at'>> & {
  name: string;
  category: string;
};

/** Numbers arrive from text inputs; empty means "not known", not zero. */
function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSystem(input: Partial<HomeSystemInput>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const text = (v: unknown) => (String(v ?? '').trim() || null);

  if (input.name !== undefined) patch.name = String(input.name).trim();
  if (input.category !== undefined) patch.category = input.category;
  for (const key of ['location', 'make', 'model', 'serial_number', 'purchased_from', 'warranty_provider',
    'warranty_notes', 'condition_note', 'notes'] as const) {
    if (input[key] !== undefined) patch[key] = text(input[key]);
  }
  for (const key of ['installed_on', 'warranty_expires_on', 'last_serviced_on'] as const) {
    if (input[key] !== undefined) patch[key] = (input[key] as string) || null;
  }
  for (const key of ['approximate_age_years', 'purchase_price', 'user_expected_life_years',
    'user_replacement_cost'] as const) {
    if (input[key] !== undefined) patch[key] = numberOrNull(input[key]);
  }
  if (input.warranty_type !== undefined) patch.warranty_type = input.warranty_type || null;
  return patch;
}

export async function addHomeSystem(householdId: string, input: HomeSystemInput): Promise<HomeSystem> {
  const { data, error } = await supabase
    .from('home_systems')
    .insert([{ household_id: householdId, entry_source: 'manual', ...normalizeSystem(input) }])
    .select('*')
    .single();
  if (error || !data) {
    console.error('Failed to add the system:', error);
    throw new Error(`Could not add that: ${error?.message ?? 'no row returned'}`);
  }
  return data as HomeSystem;
}

export async function updateHomeSystem(systemId: string, input: Partial<HomeSystemInput>): Promise<boolean> {
  const patch = normalizeSystem(input);
  patch.updated_at = new Date().toISOString();
  const { error } = await supabase.from('home_systems').update(patch).eq('id', systemId);
  if (error) {
    console.error('Failed to update the system:', error);
    throw new Error(`Could not save that: ${error.message}`);
  }
  return true;
}

export async function deleteHomeSystem(systemId: string): Promise<boolean> {
  const { error } = await supabase.from('home_systems').delete().eq('id', systemId);
  if (error) {
    console.error('Failed to remove the system:', error);
    throw new Error(`Could not remove that: ${error.message}`);
  }
  return true;
}

/** Files a document against a system, which is how "where is the warranty" gets answered. */
export async function attachDocumentToSystem(
  householdId: string,
  systemId: string,
  documentId: string,
  role: HomeSystemDocument['doc_role'] = 'warranty',
): Promise<boolean> {
  const { error } = await supabase
    .from('home_system_documents')
    .upsert(
      { household_id: householdId, system_id: systemId, document_id: documentId, doc_role: role },
      { onConflict: 'system_id,document_id,doc_role' },
    );
  if (error) {
    console.error('Failed to attach the document:', error);
    throw new Error(`Could not attach that document: ${error.message}`);
  }
  return true;
}

export type MortgageInput = FromForm<Omit<MortgageAccount, 'id' | 'household_id'>>;

/**
 * One mortgage per household in this version. A second property is a real case
 * and a real schema change; pretending to support it with an unlabeled second
 * row would be worse than saying so.
 */
export async function saveMortgage(householdId: string, input: MortgageInput): Promise<MortgageAccount> {
  const patch: Record<string, unknown> = {};
  const text = (v: unknown) => (String(v ?? '').trim() || null);

  for (const key of ['servicer', 'property_address', 'rate_type'] as const) {
    if (input[key] !== undefined) patch[key] = text(input[key]);
  }
  if (input.loan_number_last4 !== undefined) {
    const digits = String(input.loan_number_last4 ?? '').replace(/\D/g, '');
    patch.loan_number_last4 = digits ? digits.slice(-4) : null;
  }
  for (const key of ['original_amount', 'principal_balance', 'interest_rate', 'term_months',
    'monthly_payment', 'escrow_payment', 'escrow_balance', 'pmi_amount'] as const) {
    if (input[key] !== undefined) patch[key] = numberOrNull(input[key]);
  }
  for (const key of ['origination_date', 'maturity_date', 'payment_due_date', 'balance_as_of'] as const) {
    if (input[key] !== undefined) patch[key] = (input[key] as string) || null;
  }
  patch.updated_at = new Date().toISOString();

  const existing = await getMortgageAccount(householdId);
  if (existing) {
    const { error } = await supabase.from('mortgage_accounts').update(patch).eq('id', existing.id);
    if (error) throw new Error(`Could not save the mortgage: ${error.message}`);
    return { ...existing, ...(patch as unknown as Partial<MortgageAccount>) };
  }

  const { data, error } = await supabase
    .from('mortgage_accounts')
    .insert([{ household_id: householdId, entry_source: 'manual', ...patch }])
    .select('*')
    .single();
  if (error || !data) throw new Error(`Could not save the mortgage: ${error?.message ?? 'no row returned'}`);
  return data as MortgageAccount;
}


export interface MortgageStatement {
  id: string;
  household_id: string;
  document_id: string;
  mortgage_account_id: string | null;
  servicer: string | null;
  loan_number_last4: string | null;
  property_address: string | null;
  borrower: string | null;
  statement_date: string | null;
  payment_due_date: string | null;
  principal_balance: number | null;
  original_amount: number | null;
  interest_rate: number | null;
  rate_type: string | null;
  maturity_date: string | null;
  monthly_payment: number | null;
  principal_portion: number | null;
  interest_portion: number | null;
  escrow_portion: number | null;
  escrow_balance: number | null;
  pmi_amount: number | null;
  past_due_amount: number | null;
  interest_paid_ytd: number | null;
  principal_paid_ytd: number | null;
  taxes_paid_ytd: number | null;
  insurance_paid_ytd: number | null;
  processing_state: string;
  review_status: 'pending_review' | 'confirmed' | 'partially_confirmed' | 'discarded';
  created_at: string;
}

export interface ApplianceExtraction {
  id: string;
  household_id: string;
  document_id: string;
  home_system_id: string | null;
  document_kind: string;
  product_name: string | null;
  suggested_category: string | null;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  purchased_on: string | null;
  installed_on: string | null;
  purchase_price: number | null;
  purchased_from: string | null;
  warranty_provider: string | null;
  warranty_type: string | null;
  warranty_starts_on: string | null;
  warranty_expires_on: string | null;
  warranty_length_months: number | null;
  coverage_summary: string | null;
  exclusions_summary: string | null;
  claim_contact: string | null;
  fields: Array<{ field: string; value: string; source_page?: number; evidence?: string; confidence?: number }>;
  review_status: 'pending_review' | 'confirmed' | 'partially_confirmed' | 'discarded';
  created_at: string;
}

export async function getMortgageStatements(householdId: string): Promise<MortgageStatement[]> {
  const { data, error } = await supabase
    .from('mortgage_statements').select('*').eq('household_id', householdId)
    .neq('processing_state', 'deleted')
    .order('statement_date', { ascending: false, nullsFirst: false });
  if (error) {
    console.error('Error fetching mortgage statements:', error);
    return [];
  }
  return (data ?? []) as MortgageStatement[];
}

export async function getApplianceExtractions(householdId: string): Promise<ApplianceExtraction[]> {
  const { data, error } = await supabase
    .from('appliance_extractions').select('*').eq('household_id', householdId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching appliance extractions:', error);
    return [];
  }
  return (data ?? []) as ApplianceExtraction[];
}

/**
 * Promotes a read statement onto the mortgage record.
 *
 * An older statement never overwrites a newer one's balance — a mortgage
 * balance only goes one direction, and a statement from March filed in August
 * would otherwise undo eight payments.
 */
export async function confirmMortgageStatement(statement: MortgageStatement): Promise<MortgageAccount> {
  const existing = await getMortgageAccount(householdIdOf(statement));
  const isNewer =
    !existing?.balance_as_of || !statement.statement_date || statement.statement_date >= existing.balance_as_of;

  const values: MortgageInput = {
    servicer: statement.servicer,
    loan_number_last4: statement.loan_number_last4,
    property_address: statement.property_address,
    original_amount: statement.original_amount,
    interest_rate: statement.interest_rate,
    rate_type: statement.rate_type,
    maturity_date: statement.maturity_date,
    monthly_payment: statement.monthly_payment,
    escrow_payment: statement.escrow_portion,
    escrow_balance: statement.escrow_balance,
    pmi_amount: statement.pmi_amount,
    payment_due_date: statement.payment_due_date,
  };
  if (isNewer) {
    values.principal_balance = statement.principal_balance;
    values.balance_as_of = statement.statement_date;
  }

  const account = await saveMortgage(statement.household_id, values);

  await supabase.from('mortgage_accounts')
    .update({ entry_source: 'extracted', latest_statement_id: statement.id,
      source_document_id: statement.document_id, last_confirmed_at: new Date().toISOString() })
    .eq('id', account.id);

  const { error } = await supabase.from('mortgage_statements')
    .update({ review_status: 'confirmed', processing_state: 'confirmed', mortgage_account_id: account.id })
    .eq('id', statement.id);
  if (error) throw new Error(`Could not link this statement: ${error.message}`);

  return account;
}

function householdIdOf(row: { household_id: string }): string {
  return row.household_id;
}

export async function discardMortgageStatement(statementId: string): Promise<boolean> {
  const { error } = await supabase.from('mortgage_statements')
    .update({ review_status: 'discarded', processing_state: 'deleted' }).eq('id', statementId);
  if (error) throw new Error(`Could not discard that: ${error.message}`);
  return true;
}

/**
 * Turns a read warranty into a tracked system, or files it against one that
 * already exists. Nothing about the house changes until this is called.
 */
export async function confirmApplianceExtraction(
  extraction: ApplianceExtraction,
  targetSystemId: string | null,
): Promise<string> {
  let systemId = targetSystemId;

  if (systemId) {
    // Filling gaps on an existing system, never overwriting what is already known.
    const { data: current } = await supabase
      .from('home_systems').select('*').eq('id', systemId).single();
    const patch: Record<string, unknown> = {};
    const fill = (key: string, value: unknown) => {
      if (value != null && value !== '' && (current as Record<string, unknown> | null)?.[key] == null) {
        patch[key] = value;
      }
    };
    fill('make', extraction.make);
    fill('model', extraction.model);
    fill('serial_number', extraction.serial_number);
    fill('installed_on', extraction.installed_on ?? extraction.purchased_on);
    fill('purchase_price', extraction.purchase_price);
    fill('purchased_from', extraction.purchased_from);
    fill('warranty_provider', extraction.warranty_provider);
    fill('warranty_type', extraction.warranty_type);
    fill('warranty_expires_on', extraction.warranty_expires_on);
    fill('warranty_notes', extraction.coverage_summary);
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('home_systems').update(patch).eq('id', systemId);
      if (error) throw new Error(`Could not update that system: ${error.message}`);
    }
  } else {
    const created = await addHomeSystem(extraction.household_id, {
      name: extraction.product_name ?? 'Untitled system',
      category: extraction.suggested_category ?? 'other',
      make: extraction.make,
      model: extraction.model,
      serial_number: extraction.serial_number,
      installed_on: extraction.installed_on ?? extraction.purchased_on,
      purchase_price: extraction.purchase_price,
      purchased_from: extraction.purchased_from,
      warranty_provider: extraction.warranty_provider,
      warranty_type: extraction.warranty_type as HomeSystem['warranty_type'],
      warranty_expires_on: extraction.warranty_expires_on,
      warranty_notes: extraction.coverage_summary,
    });
    systemId = created.id;
    await supabase.from('home_systems')
      .update({ entry_source: 'extracted', source_document_id: extraction.document_id })
      .eq('id', systemId);
  }

  await attachDocumentToSystem(
    extraction.household_id, systemId, extraction.document_id,
    (extraction.document_kind as HomeSystemDocument['doc_role']) ?? 'warranty',
  );

  const { error } = await supabase.from('appliance_extractions')
    .update({ review_status: 'confirmed', processing_state: 'confirmed', home_system_id: systemId })
    .eq('id', extraction.id);
  if (error) throw new Error(`Could not link this document: ${error.message}`);

  return systemId;
}

export async function discardApplianceExtraction(extractionId: string): Promise<boolean> {
  const { error } = await supabase.from('appliance_extractions')
    .update({ review_status: 'discarded', processing_state: 'deleted' }).eq('id', extractionId);
  if (error) throw new Error(`Could not discard that: ${error.message}`);
  return true;
}

export async function getAssets(householdId: string): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('household_id', householdId)
    .order('type');

  if (error) {
    console.error('Error fetching assets:', error);
    return [];
  }
  return data ?? [];
}

export async function getMaintenanceRecords(householdId: string): Promise<MaintenanceRecord[]> {
  const { data, error } = await supabase
    .from('maintenance_records')
    .select('*')
    .eq('household_id', householdId)
    .order('due_date');

  if (error) {
    console.error('Error fetching maintenance records:', error);
    return [];
  }
  return data ?? [];
}

export async function getPriorityActions(householdId: string): Promise<PriorityAction[]> {
  const { data, error } = await supabase
    .from('priority_actions')
    .select('*')
    .eq('household_id', householdId)
    .eq('status', 'open')
    .order('severity');

  if (error) {
    console.error('Error fetching priority actions:', error);
    return [];
  }
  return data ?? [];
}

export async function getTimelineEvents(householdId: string): Promise<TimelineEvent[]> {
  const { data, error } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('household_id', householdId)
    .order('event_date');

  if (error) {
    console.error('Error fetching timeline events:', error);
    return [];
  }
  return data ?? [];
}

export async function getSectionScores(householdId: string): Promise<SectionScore[]> {
  const { data, error } = await supabase
    .from('section_scores')
    .select('*')
    .eq('household_id', householdId);

  if (error) {
    console.error('Error fetching section scores:', error);
    return [];
  }
  return data ?? [];
}

export async function getFinanceAccounts(householdId: string): Promise<FinanceAccount[]> {
  const { data, error } = await supabase
    .from('finance_accounts')
    .select('*')
    .eq('household_id', householdId)
    .order('account_name');

  if (error) {
    console.error('Error fetching finance accounts:', error);
    return [];
  }
  return data ?? [];
}

export async function getBudgetSummary(householdId: string): Promise<BudgetSummary | null> {
  const { data, error } = await supabase
    .from('budget_summary')
    .select('*')
    .eq('household_id', householdId)
    .order('period_month', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') console.error('Error fetching budget summary:', error);
    return null;
  }
  return data;
}

export async function getTaxDocuments(householdId: string): Promise<TaxDocument[]> {
  const { data, error } = await supabase
    .from('tax_documents')
    .select('*')
    .eq('household_id', householdId)
    .order('tax_year', { ascending: false })
    .order('name');

  if (error) {
    console.error('Error fetching tax documents:', error);
    return [];
  }
  return data ?? [];
}

export async function getTaxRecommendations(householdId: string): Promise<TaxRecommendation[]> {
  const { data, error } = await supabase
    .from('tax_recommendations')
    .select('*')
    .eq('household_id', householdId)
    .order('priority');

  if (error) {
    console.error('Error fetching tax recommendations:', error);
    return [];
  }
  return data ?? [];
}

export async function getFamilyMembers(householdId: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('household_id', householdId)
    .order('name');

  if (error) {
    console.error('Error fetching family members:', error);
    return [];
  }
  return data ?? [];
}

export interface FamilyMemberInput {
  name: string;
  relationship: string;
  birth_date: string | null;
}

/** Spouse, partner, child, self — the relationships the profile editor writes. */
export type Relationship = 'Self' | 'Spouse' | 'Partner' | 'Child' | 'Other';

export function isSpouseRelationship(relationship: string | null | undefined): boolean {
  const value = (relationship ?? '').toLowerCase();
  return value === 'spouse' || value === 'partner' || value === 'husband' || value === 'wife';
}

export function isChildRelationship(relationship: string | null | undefined): boolean {
  const value = (relationship ?? '').toLowerCase();
  return value === 'child' || value === 'son' || value === 'daughter';
}

export function isSelfRelationship(relationship: string | null | undefined): boolean {
  const value = (relationship ?? '').toLowerCase();
  return value === 'self' || value === 'primary' || value === 'me';
}

export async function addFamilyMember(householdId: string, input: FamilyMemberInput): Promise<FamilyMember> {
  const { data, error } = await supabase
    .from('family_members')
    .insert([
      {
        household_id: householdId,
        name: input.name.trim(),
        relationship: input.relationship,
        birth_date: input.birth_date || null,
      },
    ])
    .select('*')
    .single();

  if (error || !data) {
    console.error('Failed to add family member:', error);
    throw new Error(`Could not add this person: ${error?.message ?? 'no row returned'}`);
  }
  await syncProfilePeople(householdId);
  return data as FamilyMember;
}

export async function updateFamilyMember(
  householdId: string,
  memberId: string,
  input: Partial<FamilyMemberInput>,
  previous?: FamilyMember,
): Promise<boolean> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.relationship !== undefined) patch.relationship = input.relationship;
  if (input.birth_date !== undefined) patch.birth_date = input.birth_date || null;

  const { error } = await supabase.from('family_members').update(patch).eq('id', memberId);
  if (error) {
    console.error('Failed to update family member:', error);
    throw new Error(`Could not save this person: ${error.message}`);
  }
  // Re-labeling the only spouse as something else vacates the role the same way
  // deleting them would.
  const vacated =
    previous && input.relationship !== undefined && previous.relationship !== input.relationship
      ? previous
      : undefined;
  await syncProfilePeople(householdId, vacated);
  return true;
}

/**
 * Removing a person takes their milestones with them (ON DELETE CASCADE). The
 * record_history trigger keeps a snapshot, so the removal stays inspectable.
 */
export async function deleteFamilyMember(householdId: string, member: FamilyMember): Promise<boolean> {
  const { error } = await supabase.from('family_members').delete().eq('id', member.id);
  if (error) {
    console.error('Failed to remove family member:', error);
    throw new Error(`Could not remove this person: ${error.message}`);
  }
  await syncProfilePeople(householdId, member);
  return true;
}

/**
 * household_profile carries denormalized copies of the household's people —
 * `partner_name`, `spouse_first_name`, `num_children` — which onboarding wrote
 * once and nothing has updated since. Scoring and the dashboard read them, so
 * every write to family_members reconciles them here.
 *
 * It reconciles in one direction only: an absence in family_members is not
 * evidence of an absence in the household. Onboarding recorded a partner's name
 * and a child count without necessarily creating rows for them — the seeded demo
 * household has a spouse and two children in the profile and no member rows at
 * all — so blindly writing what family_members says would erase them on the
 * first edit. A field is only cleared when the user actually removed the person
 * behind it, which `removed` reports.
 */
export async function syncProfilePeople(householdId: string, removed?: FamilyMember): Promise<void> {
  const members = await getFamilyMembers(householdId);
  const spouse = members.find((m) => isSpouseRelationship(m.relationship));
  const children = members.filter((m) => isChildRelationship(m.relationship));
  const self = members.find((m) => isSelfRelationship(m.relationship));

  const patch: HouseholdProfileEdit = {};

  if (spouse) {
    patch.partner_name = spouse.name;
    patch.spouse_first_name = spouse.name.trim().split(/\s+/)[0];
  } else if (removed && isSpouseRelationship(removed.relationship)) {
    patch.partner_name = null;
    patch.spouse_first_name = null;
  }

  const { data: current } = await supabase
    .from('household_profile')
    .select('num_children')
    .eq('household_id', householdId)
    .maybeSingle();
  const recorded = (current?.num_children as number | null) ?? 0;

  if (removed && isChildRelationship(removed.relationship)) {
    // One child left the household — a decrement, not a recount, so a profile
    // that knows about children this list never named keeps knowing.
    patch.num_children = Math.max(children.length, recorded - 1);
  } else if (children.length > recorded) {
    // Otherwise the count only rises to meet the list. A household that told
    // onboarding it has two children and has since named one of them has two
    // children, not one.
    patch.num_children = children.length;
  }

  if (self) patch.primary_name = self.name;

  await updateHouseholdProfile(householdId, patch);
}

export interface HouseholdProfileEdit {
  primary_name?: string | null;
  primary_first_name?: string | null;
  primary_last_name?: string | null;
  partner_name?: string | null;
  spouse_first_name?: string | null;
  num_children?: number;
  household_income?: string | number | null;
  net_worth?: string | number | null;
  home_value?: string | number | null;
  city?: string | null;
  state?: string | null;
}

/**
 * Writes the profile row, creating it if onboarding never did. Currency fields
 * accept what the user typed — "$325,000" parses the same as 325000.
 */
export async function updateHouseholdProfile(householdId: string, edit: HouseholdProfileEdit): Promise<boolean> {
  const patch: Record<string, unknown> = {};
  const text = (value: string | null | undefined) => (value ?? '').trim() || null;

  if (edit.primary_name !== undefined) patch.primary_name = text(edit.primary_name);
  if (edit.primary_first_name !== undefined) patch.primary_first_name = text(edit.primary_first_name);
  if (edit.primary_last_name !== undefined) patch.primary_last_name = text(edit.primary_last_name);
  if (edit.partner_name !== undefined) patch.partner_name = text(edit.partner_name);
  if (edit.spouse_first_name !== undefined) patch.spouse_first_name = text(edit.spouse_first_name);
  if (edit.num_children !== undefined) patch.num_children = edit.num_children;
  if (edit.city !== undefined) patch.city = text(edit.city);
  if (edit.state !== undefined) patch.state = text(edit.state);
  if (edit.household_income !== undefined) patch.household_income = parseNumber(edit.household_income as string | null);
  if (edit.net_worth !== undefined) patch.net_worth = parseNumber(edit.net_worth as string | null);
  if (edit.home_value !== undefined) patch.home_value = parseNumber(edit.home_value as string | null);

  if (Object.keys(patch).length === 0) return true;
  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('household_profile')
    .update(patch)
    .eq('household_id', householdId)
    .select('id');

  if (error) {
    console.error('Failed to update household profile:', error);
    throw new Error(`Could not save your profile: ${error.message}`);
  }

  // No profile row yet — an account that skipped or half-finished onboarding.
  // An update matching nothing succeeds silently, which would look like a save
  // that quietly did not happen.
  if (!data || data.length === 0) {
    const { error: insertError } = await supabase
      .from('household_profile')
      .insert([{ household_id: householdId, num_children: 0, ...patch }]);
    if (insertError) {
      console.error('Failed to create household profile:', insertError);
      throw new Error(`Could not save your profile: ${insertError.message}`);
    }
  }
  return true;
}

export async function getFamilyMilestones(householdId: string): Promise<FamilyMilestone[]> {
  const { data, error } = await supabase
    .from('family_milestones')
    .select('*')
    .eq('household_id', householdId)
    .order('event_date');

  if (error) {
    console.error('Error fetching family milestones:', error);
    return [];
  }
  return data ?? [];
}

export async function getCreditCards(householdId: string): Promise<CreditCard[]> {
  const { data, error } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('household_id', householdId)
    .order('issuer');

  if (error) {
    console.error('Error fetching credit cards:', error);
    return [];
  }
  return data ?? [];
}

export async function signOut(): Promise<boolean> {
  let ok = true;

  // scope:'local' clears the stored session without a server round-trip. The
  // default ('global') tries to revoke server-side first, and when that call
  // fails — expired token, stale refresh token, no network — supabase-js
  // returns an error and leaves the local session in place. The user stays
  // signed in, no SIGNED_OUT event fires, and the click appears to do nothing.
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      console.error('Error signing out:', error);
      ok = false;
    }
  } catch (err) {
    console.error('Error signing out:', err);
    ok = false;
  }

  // Belt and braces: if the call above failed for any reason, drop the
  // persisted session ourselves so sign-out is never a no-op.
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('sb-') && key.endsWith('-auth-token'))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // localStorage can be unavailable (private mode, blocked cookies).
  }

  return ok;
}

export async function dismissAction(actionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('priority_actions')
    .update({ status: 'dismissed', updated_at: new Date().toISOString() })
    .eq('id', actionId);

  return !error;
}

export async function completeAction(actionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('priority_actions')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', actionId);

  return !error;
}

// ─────────────────────────────────────────────────────────────
// Tax planning
// ─────────────────────────────────────────────────────────────

export interface TaxReturn {
  id: string;
  household_id: string;
  document_id: string | null;
  tax_year: number;
  filing_status: string | null;
  adjusted_gross_income: number | null;
  taxable_income: number | null;
  total_tax: number | null;
  total_payments: number | null;
  refund_amount: number | null;
  amount_owed: number | null;
  took_standard_deduction: boolean | null;
  standard_deduction_amount: number | null;
  itemized_total: number | null;
  itemized_medical: number | null;
  itemized_salt: number | null;
  itemized_mortgage_interest: number | null;
  itemized_charitable: number | null;
  federal_withheld: number | null;
  estimated_payments: number | null;
  child_tax_credit: number | null;
  dependent_care_credit: number | null;
  education_credits: number | null;
  capital_loss_carryforward: number | null;
  charitable_carryforward: number | null;
  wages: number | null;
  interest_income: number | null;
  dividend_income: number | null;
  capital_gains: number | null;
  business_income: number | null;
  rental_income: number | null;
  retirement_income: number | null;
  state: string | null;
  state_tax: number | null;
  preparer: string | null;
  entry_source: string;
  review_status: 'pending_review' | 'confirmed' | 'discarded';
  notes: string | null;
}

export interface DeductionLogEntry {
  id: string;
  household_id: string;
  tax_year: number;
  spent_on: string;
  category: string;
  amount: number;
  description: string;
  payee: string | null;
  payment_method: string | null;
  receipt_document_id: string | null;
  has_receipt: boolean;
  needs_receipt: boolean;
  source: 'manual' | 'card_transaction' | 'extracted';
  source_transaction_id: string | null;
  notes: string | null;
  created_at: string;
}

export async function getTaxReturns(householdId: string): Promise<TaxReturn[]> {
  const { data, error } = await supabase
    .from('tax_returns').select('*').eq('household_id', householdId)
    .neq('review_status', 'discarded').order('tax_year', { ascending: false });
  if (error) {
    console.error('Error fetching tax returns:', error);
    return [];
  }
  return (data ?? []) as TaxReturn[];
}

export async function getDeductionLog(householdId: string): Promise<DeductionLogEntry[]> {
  const { data, error } = await supabase
    .from('deduction_log').select('*').eq('household_id', householdId)
    .order('spent_on', { ascending: false });
  if (error) {
    console.error('Error fetching the deduction log:', error);
    return [];
  }
  return (data ?? []) as DeductionLogEntry[];
}

export type TaxReturnInput = FromForm<Omit<TaxReturn, 'id' | 'household_id'>>;

/** One return per year; saving the same year again updates it rather than duplicating. */
export async function saveTaxReturn(householdId: string, input: TaxReturnInput): Promise<TaxReturn> {
  const patch: Record<string, unknown> = { household_id: householdId, updated_at: new Date().toISOString() };
  const numeric = new Set([
    'adjusted_gross_income', 'taxable_income', 'total_tax', 'total_payments', 'refund_amount',
    'amount_owed', 'standard_deduction_amount', 'itemized_total', 'itemized_medical', 'itemized_salt',
    'itemized_mortgage_interest', 'itemized_charitable', 'federal_withheld', 'estimated_payments',
    'child_tax_credit', 'dependent_care_credit', 'education_credits', 'capital_loss_carryforward',
    'charitable_carryforward', 'wages', 'interest_income', 'dividend_income', 'capital_gains',
    'business_income', 'rental_income', 'retirement_income', 'state_tax',
  ]);

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (key === 'tax_year') patch[key] = Number(value);
    else if (key === 'took_standard_deduction') patch[key] = value === null ? null : Boolean(value);
    else if (numeric.has(key)) {
      const parsed = value === '' || value === null ? null : Number(String(value).replace(/[^0-9.\-]/g, ''));
      patch[key] = parsed !== null && Number.isFinite(parsed) ? parsed : null;
    } else patch[key] = (String(value ?? '').trim() || null);
  }

  const { data, error } = await supabase
    .from('tax_returns').upsert(patch, { onConflict: 'household_id,tax_year' }).select('*').single();
  if (error || !data) {
    console.error('Failed to save the return:', error);
    throw new Error(`Could not save that: ${error?.message ?? 'no row returned'}`);
  }
  return data as TaxReturn;
}

export type DeductionInput = FromForm<Omit<DeductionLogEntry, 'id' | 'household_id' | 'created_at'>>;

export async function addDeduction(householdId: string, input: DeductionInput): Promise<DeductionLogEntry> {
  const amount = Number(String(input.amount ?? '').replace(/[^0-9.\-]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Give it an amount.');
  if (!input.description) throw new Error('Say what it was for.');

  const { data, error } = await supabase.from('deduction_log').insert([{
    household_id: householdId,
    tax_year: Number(input.tax_year) || new Date().getFullYear(),
    spent_on: input.spent_on || new Date().toISOString().slice(0, 10),
    category: input.category ?? 'other',
    amount,
    description: String(input.description).trim(),
    payee: (String(input.payee ?? '').trim() || null),
    has_receipt: Boolean(input.has_receipt),
    needs_receipt: Boolean(input.needs_receipt),
    source: 'manual',
    notes: (String(input.notes ?? '').trim() || null),
  }]).select('*').single();

  if (error || !data) {
    console.error('Failed to log the deduction:', error);
    throw new Error(`Could not log that: ${error?.message ?? 'no row returned'}`);
  }
  return data as DeductionLogEntry;
}

export async function updateDeduction(id: string, input: Partial<DeductionInput>): Promise<boolean> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.has_receipt !== undefined) patch.has_receipt = Boolean(input.has_receipt);
  if (input.receipt_document_id !== undefined) patch.receipt_document_id = input.receipt_document_id || null;
  if (input.notes !== undefined) patch.notes = String(input.notes ?? '').trim() || null;
  const { error } = await supabase.from('deduction_log').update(patch).eq('id', id);
  if (error) throw new Error(`Could not save that: ${error.message}`);
  return true;
}

export async function deleteDeduction(id: string): Promise<boolean> {
  const { error } = await supabase.from('deduction_log').delete().eq('id', id);
  if (error) throw new Error(`Could not remove that: ${error.message}`);
  return true;
}

/**
 * Pulls card transactions already categorized as charitable into the log.
 * Deduplicated on the transaction id by a unique index, so importing twice
 * cannot double-count — the second attempt simply matches nothing new.
 */
export async function importCharitableFromCards(
  householdId: string,
  taxYear: number,
  transactions: CreditTransaction[],
): Promise<number> {
  const candidates = transactions.filter(
    (t) => t.direction === 'charge'
      && (t.category ?? '').toLowerCase().includes('charit')
      && (t.transaction_date ?? '').startsWith(String(taxYear)),
  );
  if (candidates.length === 0) return 0;

  const { data: existing } = await supabase
    .from('deduction_log').select('source_transaction_id')
    .eq('household_id', householdId).not('source_transaction_id', 'is', null);
  const already = new Set((existing ?? []).map((row) => row.source_transaction_id));

  const rows = candidates
    .filter((t) => !already.has(t.id))
    .map((t) => ({
      household_id: householdId,
      tax_year: taxYear,
      spent_on: t.transaction_date,
      category: 'charitable',
      amount: t.amount ?? 0,
      description: t.merchant_description,
      payee: t.merchant_description,
      has_receipt: false,
      needs_receipt: (t.amount ?? 0) >= 250,
      source: 'card_transaction' as const,
      source_transaction_id: t.id,
    }));
  if (rows.length === 0) return 0;

  const { error } = await supabase.from('deduction_log').insert(rows);
  if (error) throw new Error(`Could not import those: ${error.message}`);
  return rows.length;
}
