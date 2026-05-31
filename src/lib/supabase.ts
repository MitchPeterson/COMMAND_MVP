// src/lib/supabase.ts
// Supabase client + full TypeScript types for COMMAND MVP
// Install: npm install @supabase/supabase-js
// Add to .env: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
      section_scores: {
        Row: SectionScore;
        Insert: Omit<SectionScore, 'id'>;
        Update: Partial<Omit<SectionScore, 'id'>>;
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
  uploaded_at: string;
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
