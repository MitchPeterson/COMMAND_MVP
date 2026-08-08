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
}

/** Header plus every child row in one round trip, via PostgREST embedding. */
export async function getInsurancePolicyExtractions(householdId: string): Promise<InsurancePolicyExtraction[]> {
  const { data, error } = await supabase
    .from('insurance_policy_extractions')
    .select(
      '*,insurance_coverages(*),insurance_deductibles(*),insurance_exclusions(*),' +
      'insurance_endorsements(*),insurance_insured_parties(*),insurance_insured_assets(*),' +
      'insurance_underlying_requirements(*)',
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
    const message = detail?.error ?? error.message;
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
