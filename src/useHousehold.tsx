// src/useHousehold.tsx
// Primary data hook — loads all household data from Supabase

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from './lib/supabase';
import {
  getHousehold,
  getInsurancePolicies,
  getLegalDocuments,
  getAssets,
  getMaintenanceRecords,
  getPriorityActions,
  getTimelineEvents,
  getSectionScores,
  getFinanceAccounts,
  getBudgetSummary,
  getTaxDocuments,
  getTaxRecommendations,
  getFamilyMembers,
  getFamilyMilestones,
  getCreditCards,
  getDocuments,
  getDocumentExtractions,
  getInsurancePolicyExtractions,
  getLegalExtractions,
  getLegalIssueFlags,
  getCreditStatements,
  getCreditTransactions,
  getCardOfferCandidates,
  type Household,
  type InsurancePolicy,
  type LegalDocument,
  type Asset,
  type MaintenanceRecord,
  type PriorityAction,
  type TimelineEvent,
  type SectionScore,
  type HouseholdProfile,
  type FinanceAccount,
  type BudgetSummary,
  type TaxDocument,
  type TaxRecommendation,
  type FamilyMember,
  type FamilyMilestone,
  type CreditCard,
  type Document as StoredDocument,
  type DocumentExtraction,
  type InsurancePolicyExtraction,
  type LegalDocumentExtraction,
  type LegalIssueFlag,
  type CreditStatement,
  type CreditTransaction,
  type CardOfferCandidate,
} from './lib/supabase';

export interface HouseholdData {
  household: Household | null;
  profile: HouseholdProfile | null;
  insurancePolicies: InsurancePolicy[];
  legalDocuments: LegalDocument[];
  assets: Asset[];
  maintenanceRecords: MaintenanceRecord[];
  priorityActions: PriorityAction[];
  timelineEvents: TimelineEvent[];
  sectionScores: SectionScore[];
  financeAccounts: FinanceAccount[];
  budgetSummary: BudgetSummary | null;
  taxDocuments: TaxDocument[];
  taxRecommendations: TaxRecommendation[];
  familyMembers: FamilyMember[];
  familyMilestones: FamilyMilestone[];
  creditCards: CreditCard[];
  documents: StoredDocument[];
  documentExtractions: DocumentExtraction[];
  insuranceExtractions: InsurancePolicyExtraction[];
  legalExtractions: LegalDocumentExtraction[];
  legalIssueFlags: LegalIssueFlag[];
  creditStatements: CreditStatement[];
  creditTransactions: CreditTransaction[];
  cardOffers: CardOfferCandidate[];
}

export interface UseHouseholdReturn {
  data: HouseholdData | null;
  loading: boolean;
  error: string | null;
  userId: string | null;
  refresh: () => Promise<void>;
}

const EMPTY_DATA: HouseholdData = {
  household: null,
  profile: null,
  insurancePolicies: [],
  legalDocuments: [],
  assets: [],
  maintenanceRecords: [],
  priorityActions: [],
  timelineEvents: [],
  sectionScores: [],
  financeAccounts: [],
  budgetSummary: null,
  taxDocuments: [],
  taxRecommendations: [],
  familyMembers: [],
  familyMilestones: [],
  creditCards: [],
  documents: [],
  documentExtractions: [],
  insuranceExtractions: [],
  legalExtractions: [],
  legalIssueFlags: [],
  creditStatements: [],
  creditTransactions: [],
  cardOffers: [],
};

/**
 * The single loader. Not exported directly — every consumer goes through the
 * provider below so the whole app shares one instance.
 */
function useHouseholdState(): UseHouseholdReturn {
  const [data, setData] = useState<HouseholdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const loadData = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);

    // The mount-time safety timeout is cleared once initAuth finishes, so
    // without this a later load that never settles spins forever. Releasing
    // loading with data still null lands on the returning-user prompt, which
    // is recoverable — an infinite spinner is not.
    const watchdog = setTimeout(() => {
      console.warn('Household load exceeded 12s — releasing the loading state');
      setLoading(false);
    }, 12000);

    try {
      // No auto-create — null household = new user → OnboardingFlow
      const household = await getHousehold(uid);

      if (!household) {
        setData(EMPTY_DATA);
        setLoading(false);
        return;
      }

      const hid = household.id;

      const [
        profile,
        insurancePolicies,
        legalDocuments,
        assets,
        maintenanceRecords,
        priorityActions,
        timelineEvents,
        sectionScores,
        financeAccounts,
        budgetSummary,
        taxDocuments,
        taxRecommendations,
        familyMembers,
        familyMilestones,
        creditCards,
        documents,
        documentExtractions,
        insuranceExtractions,
        legalExtractions,
        legalIssueFlags,
        creditStatements,
        creditTransactions,
        cardOffers,
      ] = await Promise.all([
        supabase
          .from('household_profile')
          .select('*')
          .eq('household_id', hid)
          .single()
          .then(({ data }) => data as HouseholdProfile | null),
        getInsurancePolicies(hid),
        getLegalDocuments(hid),
        getAssets(hid),
        getMaintenanceRecords(hid),
        getPriorityActions(hid),
        getTimelineEvents(hid),
        getSectionScores(hid),
        getFinanceAccounts(hid),
        getBudgetSummary(hid),
        getTaxDocuments(hid),
        getTaxRecommendations(hid),
        getFamilyMembers(hid),
        getFamilyMilestones(hid),
        getCreditCards(hid),
        getDocuments(hid),
        getDocumentExtractions(hid),
        getInsurancePolicyExtractions(hid),
        getLegalExtractions(hid),
        getLegalIssueFlags(hid),
        getCreditStatements(hid),
        getCreditTransactions(hid),
        getCardOfferCandidates(hid),
      ]);

      setData({
        household,
        profile,
        insurancePolicies,
        legalDocuments,
        assets,
        maintenanceRecords,
        priorityActions,
        timelineEvents,
        sectionScores,
        financeAccounts,
        budgetSummary,
        taxDocuments,
        taxRecommendations,
        familyMembers,
        familyMilestones,
        creditCards,
        documents,
        documentExtractions,
        insuranceExtractions,
        legalExtractions,
        legalIssueFlags,
        creditStatements,
        creditTransactions,
        cardOffers,
      });
    } catch (err) {
      console.error('Failed to load household data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData(EMPTY_DATA);
    } finally {
      clearTimeout(watchdog);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Safety net: if nothing resolves within 8 seconds, stop spinning
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth init timed out — forcing loading to false');
        setLoading(false);
      }
    }, 8000);

    const initAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          console.error('getSession error:', sessionError);
          setLoading(false);
          clearTimeout(safetyTimeout);
          return;
        }

        const uid = session?.user?.id ?? null;
        setUserId(uid);

        if (uid) {
          await loadData(uid);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth init failed:', err);
        if (mounted) setLoading(false);
      } finally {
        clearTimeout(safetyTimeout);
      }
    };

    initAuth();

    // This callback must stay synchronous. supabase-js holds an internal auth
    // lock for its duration, and every query needs that same lock to attach its
    // auth header — so awaiting loadData() here deadlocks: the callback waits on
    // the queries, the queries wait on the lock, and loading never clears.
    // Deferring with setTimeout lets the lock release first.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: any, session: any) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          const uid = session?.user?.id ?? null;
          setUserId(uid);
          if (uid) {
            setTimeout(() => {
              if (mounted) void loadData(uid);
            }, 0);
          } else {
            setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          setUserId(null);
          setData(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [loadData]);

  const refresh = useCallback(async () => {
    if (userId) await loadData(userId);
  }, [userId, loadData]);

  return { data, loading, error, userId, refresh };
}

// ─────────────────────────────────────────────
// Shared instance
//
// Eleven components used to call this hook directly. Each one ran its own auth
// init and its own 17-query load on mount — several seconds per view — and each
// held a separate copy of the data. refresh() after an upload therefore updated
// only the calling view; every other view kept showing stale data until it was
// remounted. One provider fixes both.
// ─────────────────────────────────────────────

const HouseholdContext = createContext<UseHouseholdReturn | null>(null);

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const value = useHouseholdState();
  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold(): UseHouseholdReturn {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold must be used inside <HouseholdProvider>');
  return ctx;
}
