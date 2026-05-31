// src/useHousehold.ts
// Primary data hook — loads all household data from Supabase

import { useState, useEffect, useCallback } from 'react';
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
  type Household,
  type InsurancePolicy,
  type LegalDocument,
  type Asset,
  type MaintenanceRecord,
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
  assets: Asset[];
  maintenanceRecords: MaintenanceRecord[];
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
  assets: [],
  maintenanceRecords: [],
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

    // Only handle explicit sign in / sign out — not INITIAL_SESSION
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
