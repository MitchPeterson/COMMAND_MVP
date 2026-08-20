// What Command does with your data, stated as mechanisms.
//
// A household hands this product its insurance, its will, its tax return and
// its balances before it has any reason to trust it, so the controls that exist
// are worth saying plainly. Everything here describes something the code
// actually does, and each claim carries the thing that makes it true so a
// future change to that mechanism is an obvious edit here too.
//
// Two rules for anything added to this list:
//
//   1. Describe a mechanism, never an outcome. "Files are reached through links
//      that expire in minutes" is checkable; "your files are safe" is not, and
//      it is the kind of sentence that quietly stops being true.
//   2. Nothing implies completeness. This is what is in place, not a claim that
//      it is everything worth doing — hence "the controls in place today"
//      rather than a title promising the full picture.

export interface SecurityClaim {
  id: string;
  title: string;
  detail: string;
  /**
   * What in the codebase makes this true. Not shown to users — it is here so
   * that whoever changes the mechanism finds the sentence that describes it.
   */
  mechanism: string;
}

/** Restated when a claim is added, removed or re-checked against the code. */
export const POSTURE_VERIFIED_ON = 'August 20, 2026';

/** The version for enrollment: short enough to actually be read. */
export const SECURITY_SUMMARY =
  'Your documents are stored privately and reached through links that expire in minutes. '
  + 'Social Security, bank and card numbers are stripped before anything is recorded, and the '
  + 'database is set up to refuse them. Every record is isolated to your household, and you can '
  + 'export or delete all of it whenever you want.';

/** The version for the moment a file is being handed over. */
export const SECURITY_ONE_LINER =
  'Stored privately. Social Security and account numbers are stripped before anything is recorded.';

export const SECURITY_CLAIMS: SecurityClaim[] = [
  {
    id: 'isolation',
    title: 'Your records are isolated at the database level',
    detail:
      'Every table enforces row-level security, so a query made by your account can only return '
      + 'rows belonging to your own household. This is enforced by the database rather than by the '
      + 'app asking politely.',
    mechanism: 'RLS via household_owner(household_id) on every table',
  },
  {
    id: 'files',
    title: 'Uploaded files are stored privately',
    detail:
      'Files go to a private bucket that is not reachable over the open web. Command generates a '
      + 'link when you open a document, and that link expires within minutes.',
    mechanism: 'private raw-uploads bucket; createSignedUrl at 300s (client) and 120s (extraction)',
  },
  {
    id: 'identifiers',
    title: 'Identifying numbers are stripped before anything is recorded',
    detail:
      'Social Security and tax ID numbers, bank and card account numbers and driver’s license '
      + 'numbers are removed from everything Command stores. The database enforces this with a '
      + 'constraint of its own, so the rule holds even if the code above it changes. Your original '
      + 'file keeps whatever it always had.',
    mechanism: 'scrubIdentifiers() in extract-document, plus the carries_identifier() CHECK',
  },
  {
    id: 'services',
    title: 'The outside services involved are named',
    detail:
      'Command runs on Supabase, which hosts the database and the file storage. To read a document, '
      + 'Command sends it to Anthropic’s API. Those are the outside services your information '
      + 'passes through.',
    mechanism: 'Supabase (Postgres, Auth, Storage); Anthropic Messages API from the Edge Function',
  },
  {
    id: 'review',
    title: 'Insurance, legal, credit and home records wait for your review',
    detail:
      'What Command reads from these documents is held rather than recorded. You see each value '
      + 'and the page it came from, and it is written to your profile only once you accept it.',
    // Deliberately enumerated rather than stated as a rule. Tax returns upsert
    // with review_status 'confirmed' and W-2/1099 arrivals insert tax_documents
    // directly (the F1/F2 gap), so a blanket claim here would be untrue. Widen
    // this sentence only when those paths gain a review step.
    mechanism: 'review_status on insurance/legal/credit/home extractions; confirm handlers write '
      + 'the pillar tables. NOT tax — see F1/F2 in CLAUDE.md',
  },
  {
    id: 'history',
    title: 'The history of changes cannot be edited',
    detail:
      'Command keeps a version history of the records it holds, so you can see what changed and '
      + 'when. That history is read-only from inside the app — there is no way to alter or '
      + 'remove an entry, including by you.',
    mechanism: 'record_history has no insert/update/delete policy',
  },
  {
    id: 'portability',
    title: 'You can take everything, or remove everything',
    detail:
      'Download every record Command holds as a single file at any time. Deleting removes every '
      + 'record and every uploaded file, files first, and is not reversible.',
    mechanism: 'exportHouseholdData / deleteAllHouseholdData in lib/supabase.ts',
  },
  {
    id: 'publishable-key',
    title: 'The key visible in your browser is meant to be public',
    detail:
      'Command’s connection key can be seen in the page source, by design. On its own it opens '
      + 'nothing: the database decides what each signed-in account is allowed to see, and an '
      + 'unauthenticated key is allowed nothing.',
    mechanism: 'VITE_SUPABASE_ANON_KEY is the publishable key; RLS is the access boundary',
  },
];
