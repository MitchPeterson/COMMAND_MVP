// src/useHousehold.ts
// Primary data hook — loads all household data from Supabase
// Usage: const { data, loading, error, refresh } = useHousehold()

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './lib/supabase';
import {
  getHousehold,
  getInsurancePolicies,
  getLegalDocuments,
  getPriorityActions,
  getTimelineEvents,
  getSectionScores,
  type Household,
  type InsurancePolicy,
  type LegalDocument,
  type PriorityAction,
  type TimelineEvent,
  type SectionScore,
  type HouseholdProfile,
} from './lib/supabase';

export interface HouseholdData {
  household: Household | null;
  profile: HouseholdProfile | null;
  insurancePolicies: InsurancePolicy[];
  legalDocuments: LegalDocument[];
  priorityActions: PriorityAction[];
  timelineEvents: TimelineEvent[];
  sectionScores: SectionScore[];
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
  priorityActions: [],
  timelineEvents: [],
  sectionScores: [],
};

export function useHousehold(): UseHouseholdReturn {
  const [data, setData] = useState<HouseholdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // FIX 2: Ref to prevent double-load from onAuthStateChange + getSession race
  const initialLoadDone = useRef(false);

  const loadData = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);

    try {
      // FIX 1: Do NOT auto-create household — return null if none exists.
      // A null household means the user is brand new → App.tsx shows OnboardingFlow.
      const household = await getHousehold(uid);

      if (!household) {
        // New user — no household yet. Onboarding flow will create it.
        setData(EMPTY_DATA);
        setLoading(false);
        return;
      }

      const hid = household.id;

      // Fetch all data in parallel
      const [
        profile,
        insurancePolicies,
        legalDocuments,
        priorityActions,
        timelineEvents,
        sectionScores,
      ] = await Promise.all([
        supabase
          .from('household_profile')
          .select('*')
          .eq('household_id', hid)
          .single()
          .then(({ data }) => data as HouseholdProfile | null),
        getInsurancePolicies(hid),
        getLegalDocuments(hid),
        getPriorityActions(hid),
        getTimelineEvents(hid),
        getSectionScores(hid),
      ]);

      setData({
        household,
        profile,
        insurancePolicies,
        legalDocuments,
        priorityActions,
        timelineEvents,
        sectionScores,
      });
    } catch (err) {
      console.error('Failed to load household data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData(EMPTY_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // FIX 2: Get session once on mount — source of truth for initial load.
    // onAuthStateChange handles all subsequent changes (sign in, sign out).
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        loadData(uid);
      } else {
        setLoading(false);
      }
      initialLoadDone.current = true;
    });

    // Subscribe to auth state changes — but skip the initial INITIAL_SESSION
    // event since getSession() above already handles it.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        // Skip the first event if getSession already ran
        if (!initialLoadDone.current) return;

        const uid = session?.user?.id ?? null;
        setUserId(uid);
        if (uid) {
          await loadData(uid);
        } else {
          // User signed out — clear everything
          setData(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadData]);

  const refresh = useCallback(async () => {
    if (userId) await loadData(userId);
  }, [userId, loadData]);

  return { data, loading, error, userId, refresh };
}
