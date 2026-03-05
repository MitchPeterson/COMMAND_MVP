// src/useHousehold.ts
// Primary data hook — loads all household data from Supabase
// Usage: const { data, loading, error, refresh } = useHousehold()

import { useState, useEffect, useCallback } from 'react';
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

  const loadData = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);

    try {
      // Do NOT auto-create household — null means new user → OnboardingFlow
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
    // mounted flag prevents state updates after component unmounts
    let mounted = true;

    // Step 1: getSession() is the single source of truth for the initial load.
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      const uid = session?.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        await loadData(uid);
      } else {
        // No session — show login screen
        setLoading(false);
      }
    };

    initAuth();

    // Step 2: onAuthStateChange only handles explicit sign in / sign out events.
    // INITIAL_SESSION is intentionally ignored — getSession() above handles it.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN') {
          const uid = session?.user?.id ?? null;
          setUserId(uid);
          if (uid) await loadData(uid);
        } else if (event === 'SIGNED_OUT') {
          setUserId(null);
          setData(null);
          setLoading(false);
        }
        // TOKEN_REFRESHED, USER_UPDATED, INITIAL_SESSION — all ignored
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadData]);

  const refresh = useCallback(async () => {
    if (userId) await loadData(userId);
  }, [userId, loadData]);

  return { data, loading, error, userId, refresh };
}
