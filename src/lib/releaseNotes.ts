// What's-new entries, newest first.
//
// Add a release at the top when shipping something a user would notice. The `id`
// is what gets remembered as seen — bump it and everyone is prompted once more,
// so leave it alone when only editing wording.
//
// Keep entries about what changed for the user, not what changed in the code.

export interface ReleaseNote {
  id: string;
  date: string;
  title: string;
  items: string[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    id: '2026-08-08-insurance',
    date: 'August 8, 2026',
    title: 'Insurance, in depth',
    items: [
      'Upload a policy or declarations page and Command reads the coverages, limits, deductibles and covered vehicles — with the exact line it came from, so you can check any figure against the document.',
      'Coverage health grades how well your policies fit your household, comparing liability against net worth and dwelling limits against home value. Gaps in your paperwork are reported separately so they never drag the grade down.',
      'Policies can be added manually when you cannot find the document, and every policy can be edited — useful when a carrier writes its own name three different ways.',
      'Your documents now live in a vault you can open, retry extraction on, and delete from — including the option to remove what a document added to your profile.',
      'Every change to a policy is now versioned. Open History on any policy to see what changed, when, and what it was before.',
    ],
  },
];

const STORAGE_KEY = 'command:last-seen-release';

export function latestRelease(): ReleaseNote | null {
  return RELEASE_NOTES[0] ?? null;
}

/** Unseen releases, newest first. Empty when the user is up to date. */
export function unseenReleases(): ReleaseNote[] {
  let lastSeen: string | null = null;
  try {
    lastSeen = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode). Showing the notes once per
    // session is a better failure than suppressing them entirely.
  }
  if (!lastSeen) return RELEASE_NOTES.slice(0, 1);

  const index = RELEASE_NOTES.findIndex((r) => r.id === lastSeen);
  // An unrecognised id means the stored release predates this build; show the
  // newest rather than assuming everything has been seen.
  return index === -1 ? RELEASE_NOTES.slice(0, 1) : RELEASE_NOTES.slice(0, index);
}

export function markReleasesSeen(): void {
  const latest = latestRelease();
  if (!latest) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, latest.id);
  } catch {
    // Nothing to do — it will simply prompt again next time.
  }
}
