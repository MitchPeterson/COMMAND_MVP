// The application's version history.
//
// This file is the changelog *and* the version number: `RELEASE_NOTES[0].version`
// is what ships, and `package.json` is kept in step with it. Every deploy gets an
// entry — run `npm run release` on the branch rather than editing by hand:
//
//   npm run release -- patch --title "Profile you can edit" "Add a spouse or child" "…"
//
// Levels: patch for fixes and small changes, minor for a feature someone would
// notice, major only for a release that changes what the product is. Major
// versions should be rare.
//
// Keep items about what changed for the user, not what changed in the code.

import pkg from '../../package.json';

export interface ReleaseNote {
  /** Semver, and the identity of the release. Never reuse or rewrite one. */
  version: string;
  /** ISO date (YYYY-MM-DD) the release shipped. */
  date: string;
  title: string;
  items: string[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '0.15.0',
    date: '2026-08-09',
    title: 'A dashboard that points at the work',
    items: [
      'Action items are now ranked by what actually matters — live findings from your coverage and legal documents, merged with your saved actions, ordered by severity and value. Stale items the current data has overtaken drop off.',
      'Each action links straight to the section that resolves it.',
      'Anything waiting on you is listed by document name, and clicking it opens that document\'s review directly rather than dropping you at the top of a page.',
      'Document upload moved to the bottom of the dashboard. The summary comes first.',
    ],
  },
  {
    version: '0.14.0',
    date: '2026-08-09',
    title: 'One shape for every section',
    items: [
      'Legal now reads like Insurance: the grade leads, your documents follow, and the uploader sits at the bottom where it belongs.',
      'The dashboard no longer tells a stale story. Legal is scored live from your documents the way Insurance already was, so uploading or confirming something moves the household score immediately.',
      'A new \'Waiting on you\' panel shows anything still being read, waiting for review, or that failed — and clicking it takes you straight there.',
      'Section rows on the dashboard are clickable.',
    ],
  },
  {
    version: '0.13.0',
    date: '2026-08-09',
    title: 'Review what Command read, then decide',
    items: [
      'Every detail Command reads from a legal document can now be confirmed, edited, rejected or left for later — and only what you confirm reaches your profile.',
      'People named in a document can be matched to your household, added as new members, or marked as outsiders. A different spelling never rewrites someone\'s existing profile.',
      'Confidence decides how much work you have to do: high and moderate values can be confirmed in bulk, low-confidence ones need a look each.',
      'A second document of the same type never overwrites the first. Command keeps both and asks you which one is current.',
    ],
  },
  {
    version: '0.12.0',
    date: '2026-08-08',
    title: 'Legal health, graded',
    items: [
      'The Legal section now carries a grade, the way Insurance does — scored on how well what you have fits your household, not on how many files you have uploaded.',
      'Findings are sized to your situation: minor children make a will critical rather than advisable, a net worth above $1M raises the trust question, and a business interest without an operating agreement gets called out.',
      'Command says what it has and has not seen, never what you do or do not have. Where an answer depends on your state or on how a document was signed, it says an attorney is the right person to ask.',
      'US spelling throughout.',
    ],
  },
  {
    version: '0.11.0',
    date: '2026-08-08',
    title: 'Legal documents, read in full',
    items: [
      'Command now reads a legal document end to end: the dates, the jurisdiction, the recording details, everyone named in it and the role each one holds, and the provisions particular to that kind of document.',
      'Every value shows the page it came from, the wording behind it and how confident Command is. Click through to open the document at that page and check it yourself.',
      'What Command could not see is stated as plainly as what it could — a missing notarization page is reported as not detected in your copy, never as a judgement about the document.',
      'Social Security numbers, tax IDs and account numbers are masked on screen until you choose to reveal them.',
    ],
  },
  {
    version: '0.10.0',
    date: '2026-08-08',
    title: 'Legal documents, recognized',
    items: [
      'Upload a will, trust, power of attorney, healthcare directive, deed or business agreement from the Legal section and Command tells you what it is — with the reason it thinks so and how confident it is.',
      'Fifty-odd legal document types across five categories. When Command is not sure, it says so, keeps the file exactly as uploaded, and lets you set the type yourself.',
      'Identical re-uploads are recognized as duplicates rather than filed twice, and re-reading a document adds a new version instead of overwriting the last one.',
    ],
  },
  {
    version: '0.9.0',
    date: '2026-08-08',
    title: 'A profile you can edit',
    items: [
      'Add, edit and remove the people in your household — spouse or partner and children — each with a birth date, so ages stay current without anyone re-typing them.',
      'Household income and net worth can be corrected in place. Coverage health grades against these figures, so an out-of-date net worth was quietly skewing your liability findings.',
      'The app version now has a history behind it. Click the version number to see every release and what changed in it.',
      'The household change log is now labeled Activity, separately from release history — it tracks what you changed, not what we shipped.',
    ],
  },
  {
    version: '0.8.0',
    date: '2026-08-08',
    title: 'Policies you control',
    items: [
      'Policies can be added manually when you cannot find the document, and every policy can be edited — useful when a carrier writes its own name three different ways.',
      'Fixed phantom vehicles and false duplicate warnings on the insurance page.',
      'Every change to a policy is versioned. Open History on any policy to see what changed, when, and what it was before.',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-08-08',
    title: 'Coverage health',
    items: [
      'Coverage health grades how well your policies fit your household, comparing liability against net worth and dwelling limits against home value.',
      'Gaps in your paperwork are reported separately from gaps in your coverage, so a missing declarations page never drags the grade down.',
      'Each policy carries an executive summary and per-vehicle deductibles.',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-08-08',
    title: 'Insurance, in depth',
    items: [
      'Upload a policy or declarations page and Command reads the coverages, limits, deductibles and covered vehicles — with the exact line it came from, so you can check any figure against the document.',
      'Extraction runs its passes concurrently, so a long policy finishes instead of timing out.',
      'The insurance page was rebuilt around coverage rather than paperwork.',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-08-08',
    title: 'Sign-in that stays signed in',
    items: [
      'Fixed the hang that could leave the app on a loading spinner forever, and the sign-out button that silently did nothing.',
      'Onboarding no longer locks you out when one write fails.',
      'Your documents now live in a vault you can open, retry extraction on, and delete from — including the option to remove what a document added to your profile.',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-08-03',
    title: 'Upload a document',
    items: [
      'Drag a document into Command and it is stored, read and filed against your household.',
      'Extracted detail is shown for review before anything is written to your profile.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-08-02',
    title: 'Family and returning users',
    items: [
      'Family milestones track the dates that trigger a review — a birthday, a graduation, a move.',
      'Returning users are recognized instead of being sent back through onboarding.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-05-31',
    title: 'Live household data',
    items: ['The Home view reads your real household data rather than sample content.'],
  },
  {
    version: '0.1.0',
    date: '2026-03-04',
    title: 'Accounts and onboarding',
    items: [
      'Create an account, answer a guided set of questions, and Command builds your household profile.',
    ],
  },
];

/** The running version. `npm run release` moves this and package.json together. */
export const APP_VERSION: string = RELEASE_NOTES[0]?.version ?? pkg.version;

if (import.meta.env.DEV && RELEASE_NOTES[0]?.version !== pkg.version) {
  console.warn(
    `Version drift: package.json is ${pkg.version} but the newest release note is ` +
      `${RELEASE_NOTES[0]?.version}. Use \`npm run release\` so the two move together.`,
  );
}

export function formatReleaseDate(iso: string): string {
  // Parsed as UTC; formatting in local time would show the previous day west of
  // Greenwich.
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? iso
    : new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}

const STORAGE_KEY = 'command:last-seen-version';

export function latestRelease(): ReleaseNote | null {
  return RELEASE_NOTES[0] ?? null;
}

/** Releases shipped since the user last looked, newest first. */
export function unseenReleases(): ReleaseNote[] {
  let lastSeen: string | null = null;
  try {
    lastSeen = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode). Showing the notes once per
    // session is a better failure than suppressing them entirely.
  }
  if (!lastSeen) return RELEASE_NOTES.slice(0, 1);

  const index = RELEASE_NOTES.findIndex((r) => r.version === lastSeen);
  // An unrecognized version means the stored value predates this build; show the
  // newest rather than assuming everything has been seen.
  return index === -1 ? RELEASE_NOTES.slice(0, 1) : RELEASE_NOTES.slice(0, index);
}

export function markReleasesSeen(): void {
  const latest = latestRelease();
  if (!latest) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, latest.version);
  } catch {
    // Nothing to do — it will simply prompt again next time.
  }
}
