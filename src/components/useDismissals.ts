// Dismissal wiring, so a section card gets it in two lines.
//
// Each card partitions its own findings and writes back through the household
// loader, which means one refresh brings the whole app back into agreement --
// a finding dismissed on the Insurance page is also gone from the dashboard
// spotlight, because both read the same rows.

import { useHousehold } from '../useHousehold';
import { dismissFinding, restoreFindings } from '../lib/supabase';
import { partitionFindings, type FingerprintableFinding } from '../lib/dismissals';

export function useDismissals<T extends FingerprintableFinding>(section: string, findings: T[]) {
  const { data, refresh } = useHousehold();
  const householdId = data?.household?.id ?? null;
  const forSection = (data?.dismissedFindings ?? []).filter((d) => d.section === section);
  const { visible, hidden } = partitionFindings(section, findings, forSection);

  return {
    visible,
    hiddenCount: hidden.length,
    onDismiss: async (input: { fingerprint: string; title: string; snoozedUntil: string | null }) => {
      if (!householdId) return;
      await dismissFinding(householdId, { ...input, section });
      await refresh();
    },
    onRestore: async () => {
      if (!householdId) return;
      await restoreFindings(householdId, section);
      await refresh();
    },
  };
}
