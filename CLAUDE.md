# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## How to work here

Mitch's benchmark is a session that turned around **41 changes at a median of 2.6 minutes each**,
every one of them merged and live on Vercel before he replied. Match that pace. What made it work:

- **Ship without being asked.** Branch, commit, push, open the PR, merge, confirm the deploy — one
  compound Bash call, not six. `main` is protected, so a direct push stalls silently. "Done" means
  deployed, not written.
- **Don't open with a question.** Pick the sensible default, say which assumption you made in one
  line, and build. A follow-up commit is cheaper than a blocking question. Ask only when the wrong
  guess would be unsafe or would waste the whole build.
- **Verify with the build.** `npm run build` is the gate. Skip live-Supabase probes and throwaway
  e2e scripts unless the thing genuinely cannot be judged any other way — an Edge Function change
  can be; a React view cannot justify it.
- **Confirm a deploy by content, one call:**
  ```bash
  until curl -s "https://command-mvp.vercel.app/$(curl -s https://command-mvp.vercel.app/ \
    | grep -o 'assets/index-[A-Za-z0-9_-]*\.js')" | grep -q "<a string only the new code has>"; \
    do sleep 15; done
  ```
  Bundle hashes differ between local and Vercel builds, so never compare those.
- **Hand off manual steps on the clipboard**, never as a code block to select:
  ```bash
  pbcopy < supabase/migrations/<file>.sql && echo "Clipboard: <file>.sql ($(wc -l < …) lines) → Supabase SQL editor"
  ```
  Applying SQL and redeploying the Edge Function are the only things he should have to do by hand.
- **One clipboard at a time, and wait.** Copy one artifact, say plainly what to do with it, and do
  not copy anything else until he confirms it is applied. Copying a second thing silently destroys
  the first — that is how a migration went unapplied for two PRs while the code that depended on it
  shipped. When two steps are needed, name the order and hand over only step one.
- **Every handoff states the line count and the expected result**, so a bad paste is obvious before
  it becomes a bug: how many lines are on the clipboard, where they go, what the editor should say
  on success (`Success. No rows returned` for DDL), and what the change should have created. Then
  verify it yourself over the REST API rather than asking him to run a check query.
- **Verify manual steps landed** before building on them. A table is one query away:
  `select 1 from <table> limit 1` through the REST API with a test account returns 404 (PGRST205)
  when the migration was never applied. Never assume a hand-off was completed.
- **Split a multi-part request into shipped increments.** Four features in one message is four
  merges with visible progress between them, not one fifteen-minute silence.

## Commands

```bash
npm run dev       # Vite dev server
npm run build     # tsc + vite build — what Vercel runs, and the correctness gate
npm run preview   # Preview the production build
npm run release   # Bump the version + add a changelog entry — see Versioning
npm run lint      # BROKEN — no ESLint config exists in the repo
```

No test suite. `npm run build` passing is the bar; TypeScript errors block the Vercel deploy.

## Versioning

`src/lib/releaseNotes.ts` is both the changelog and the version number; `package.json` is kept in
step with it. Every merge to `main` is a deploy and carries exactly one entry:

```bash
npm run release -- patch --title "What this release is" "Bullet one" "Bullet two"
```

`patch` for fixes, `minor` for something a user would notice, `major` only when the product itself
changes — major should stay rare. Clicking the version on the Profile screen opens the history.
Do not hand-edit the version in either file; the script moves both and refuses if they have drifted.

## Architecture

**COMMAND** is a React SPA — an AI-powered household operating system.

```
src/
  main.tsx              HouseholdProvider wraps App
  App.tsx               auth gate + string router (activeView) + sidebar shell
  useHousehold.tsx      the single data loader, exposed via context
  lib/
    supabase.ts         client, all row types, every fetch/mutate function
    coverageHealth.ts   pure scoring/findings for insurance adequacy
    releaseNotes.ts     what's-new changelog
  views/                one file per section (Dashboard, Insurance, Documents, …)
  components/           UploadDropzone, InsurancePolicyReview, CoverageHealth, …
supabase/
  functions/extract-document/index.ts   Deno Edge Function (document extraction)
  migrations/                           SQL, applied by hand — see Deployment
```

**`useHousehold` is a provider, not a bare hook.** `HouseholdProvider` is mounted once in `main.tsx`; `useHousehold()` reads context. Calling the loader per view was a real bug — eleven independent copies of the data, each doing its own 17-query load, so `refresh()` in one view never reached another.

**Auth gate** in `App.tsx`, in order: `loading` → spinner; no `userId` → `<AuthScreen />`; no `data.household` → returning-user prompt, then `<OnboardingFlow />`; otherwise the app. The gate is derived directly from state — do not reintroduce a `useEffect` that decides which screen shows, it races with the first render.

## Data flow

```
Supabase (Postgres + Auth + Storage)
  └── src/lib/supabase.ts        typed client, row types, queries
        └── src/useHousehold.tsx  one parallel load of all household data
              └── views/          read data, call refresh() after writes
```

To add a table: write `getX()` in `lib/supabase.ts`, add it to `HouseholdData`, `EMPTY_DATA` and the `Promise.all` in `useHousehold.tsx`, then read `data?.x ?? []` in the view.

## Document extraction

`supabase/functions/extract-document/index.ts` — invoked from the client after upload.

1. **Classify** (low effort) — declarations page vs full policy vs quote vs ID card. A quote must never be filed as an active policy.
2. **Insurance** → three passes run **concurrently** via `Promise.all`: identity, coverages, terms. Terms is degradable; its failure records a gap instead of losing the other two.
3. **Everything else** → one lightweight pass into `document_extractions`.

Extracted insurance lands in nine normalized tables plus the `insurance_liability_stack` view. Every material value carries `raw_value`, `source_page`, `evidence`, `confidence`, and `value_type` (`explicit` / `calculated` / `inferred` / `unknown`). **"Not found in the documents" and "not covered" are different states** — that distinction is load-bearing throughout the UI and the scoring.

### Hard-won constraints — read before touching the schema

- **Structured outputs cap union-typed parameters at 16.** A nullable field is a union. The first schema had 29 and returned a 400. Nothing in the extraction schema is nullable; "unknown" rides on `value_type`.
- **Total compiled grammar size is a separate limit.** Even with zero unions, one large schema was rejected. Large enums (coverage codes, field names) live in prompt *descriptions* and are normalized server-side, not in the grammar.
- **Edge Functions have a ~150s wall clock** on the free plan. Three sequential passes on a 12-page policy took 133s. They run concurrently for this reason.
- **Long policies need streaming.** Passes stream and take `finalMessage()`; a high `max_tokens` on a non-streaming request risks HTTP timeouts.

### What it costs — measured Aug 11, 2026

A bank-branded credit card statement, cold: **$0.17**. Classify on Haiku is 3% of
that; the two Opus passes are the other 97%. **68% of the total is output tokens**,
not input — so `ANTHROPIC_EFFORT` and the model's output rate ($25/MTok on Opus
against $15 on Sonnet) are the levers that matter, and input caching is not.

The concurrent passes do **not** share a document cache. Both wrote their own
entry and neither read the other's (0% hit cold); a re-run then read both back at
exactly the counts the first run wrote, which is how you can tell. The cache key
appears to cover the output schema, not just the message prefix — unverified.
Caching therefore only pays on a re-read, worth about 25%.

Every model is a Supabase secret, so the cost profile changes without a deploy:
`ANTHROPIC_MODEL` (insurance and legal), `ANTHROPIC_FORM_MODEL` (mortgage,
appliance, tax return), `ANTHROPIC_CREDIT_MODEL`, `ANTHROPIC_CLASSIFY_MODEL`,
`ANTHROPIC_GENERIC_MODEL`, `ANTHROPIC_EFFORT`.

## Database

All tables use RLS via `household_owner(household_id)`. Core: `households`, `household_profile`, `insurance_policies`, `legal_documents`, `assets`, `maintenance_records`, `priority_actions`, `timeline_events`, `documents`, `document_extractions`, `section_scores`, plus the v2 pillar tables (`finance_accounts`, `budget_summary`, `tax_documents`, `tax_recommendations`, `family_members`, `family_milestones`, `credit_cards`).

Insurance extraction: `insurance_policy_extractions` + `insurance_coverages`, `insurance_deductibles`, `insurance_exclusions`, `insurance_endorsements`, `insurance_insured_parties`, `insurance_insured_assets`, `insurance_beneficiaries`, `insurance_underlying_requirements`, and the `insurance_liability_stack` view.

`record_history` captures versions of tracked tables via an `AFTER` trigger. It is **read-only to users** — no insert/update/delete policy, because an editable audit trail is not an audit trail.

Storage bucket **`raw-uploads`** (private). Upload paths are `<household_id>/<timestamp>-<filename>`; storage policies key off the first path segment.

**The same concept is named three ways** and matching on one alone silently fails:

| Concept | `requirement_type` | extraction `insurance_type` | `insurance_policies.type` |
|---|---|---|---|
| Home liability | `home_liability` | `homeowners` | `home` |

Environment (`.env.local` and Vercel):

```
VITE_SUPABASE_URL=https://dkvmnhaekwcnwxbbyjfe.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key>
```

Edge Function secret: `ANTHROPIC_API_KEY` (set in Supabase, not Vercel).

## Deployment

- **Frontend** — Vercel auto-deploys on merge to `main`. Live at **https://command-mvp.vercel.app** (the `command-xi` URL in older notes is dead).
- **`main` is protected.** Direct pushes are rejected; use a branch and a PR.
- **Migrations are applied by hand** in the Supabase SQL Editor. The CLI is installed but not authenticated, and committing a migration does not apply it. `INSERT INTO storage.buckets` is permission-blocked on hosted Supabase — create buckets in the Storage UI.
- **The Edge Function is deployed by hand** via the dashboard editor. Merging does not deploy it.

Verify a frontend deploy by **content**, not bundle hash — Vercel's build produces different hashes than a local build. Repeated automated requests will trigger a bot challenge.

## Critical TypeScript rules

These caused repeated Vercel build failures:

- **All `interface` declarations at module scope** — never inside a function body.
- `noUnusedLocals` / `noUnusedParameters` are `false`, intentionally.
- **Delete unused variables outright** — an `_` prefix does not suppress TS6133 on `const`.
- Explicit types on `setState` callbacks: `setState((prev: Type[]) => ...)`.

## Supabase client gotchas

- **`onAuthStateChange` must be synchronous.** supabase-js holds an auth lock for the callback's duration; awaiting a query inside it deadlocks and the app hangs forever on the loading screen. Defer with `setTimeout(…, 0)`.
- **A wedged Web Lock blocks every call in every tab.** The client supplies a custom `auth.lock` that gives up after 5s and proceeds. Do not remove it.
- **`signOut()` uses `scope: 'local'`** and clears `sb-*-auth-token` itself. The default `global` scope hits the network first and leaves the session intact when that fails, making sign-out a silent no-op.
- **Never swallow a failure.** `uploadDocumentAsset`, `confirmInsuranceExtraction` and friends throw rather than returning `null`/`false`. Returning a falsy value that callers ignore produced several "nothing happens" bugs where the UI reported success.

## Section anatomy

Every pillar section (Insurance, Legal, Home, Finances, Taxes, Family, Credit) reads top to bottom
in the same order, so the second section a user opens teaches them nothing new. Insurance, Legal and
Credit are the reference implementations; match them.

1. **The grade leads.** A `<SectionHealth>` card is the first element — letter grade, score out of
   100, plain-language status, assessment confidence, findings, and a "what limits this assessment"
   list. No page banner above it: the grade card *is* the header.
2. **Items needing review** come next — extractions the user has not confirmed.
3. **The inventory**, under a small label strip (`Your policies`, `Your documents`), grouped where
   grouping helps.
4. **Manual entry**, if the section has it.
5. **The uploader last**, in a plain `bg-cmd-black/40` card. It is a means to the section's content,
   not the point of the page — never put it at the top.

The scoring module is `src/lib/<section>Health.ts` and always returns the same shape:
`{ score, grade, status, findings, dataFindings, confidence, confidenceReason }`. Findings move the
grade; `dataFindings` move confidence only. Weighting is shared: critical 30, attention 12, info 4.
Reuse `gradeTone()` from `coverageHealth.ts` so an A looks the same everywhere.

**The Dashboard is the summary layer and must never go stale.** `section_scores` and
`priority_actions` are onboarding-time rows that nothing recalculates, so a section with a live
scorer adds itself to the `liveScores` map in `Dashboard.tsx`, which overrides the stored row. When
you add a section scorer, wire it there in the same commit — otherwise the section page and the
dashboard disagree, and the dashboard is the one the user believes. Anything a document produced
that is still waiting on the user belongs in the "Waiting on you" strip.

## Writing

- **US English everywhere** — UI copy, comments, commit messages, release notes. recognize, not
  recognise; labeled, not labelled; license, not licence; -ize endings throughout. This applies to
  model prompts too, since extracted text is shown to the user.
- Say what is on file, never what the household has: "no will found in Command", not "you have no
  will". The distinction is load-bearing in the Legal section and in coverage findings.
- No legal or financial conclusions. Command reports what a document says and what it could not
  see; whether something is valid, enforceable or sufficient is an attorney's call.

## Brand / styling

- **Command Black** `#0F0F10` · **Command Gold** `#C9A24D` · **Charcoal** `#1C1D20` · **Off-White** `#F6F6F4`
- Gold is an accent, not a fill — roughly 80% neutral / 20% gold.
- Tailwind tokens exist: `bg-cmd-black`, `text-cmd-gold`, `border-cmd-border`, `text-cmd-muted`, `text-cmd-offwhite`.
- Cards: `rounded-3xl border border-cmd-border bg-cmd-charcoal`.
- Empty states: `p-8 text-center text-cmd-muted` inside a dashed border.

## Test accounts

| Email | Password | Data |
|-------|----------|------|
| `adam@command-test.com` | `Command2026!` | Seeded (Adam Bailey persona) |
| `rachel@command-test.com` | `Command2026!` | Auth only |
| `tom@command-test.com` | `Command2026!` | Auth only |
| `test@command.com` | `Command123` | Seeded demo (Whitfield persona) — the one to show people |

Adam: user `21a95967-4bcf-4793-8076-92b4be9ffcf0`, household `a1b2c3d4-0001-0001-0001-000000000001`.

**Deleting a household needs its children removed first.** A plain
`DELETE FROM households` fails: the cascade removes tracked child rows, their
`AFTER DELETE` trigger writes `record_history`, and the household that row
points at is already gone. Clear the child tables, then the household.

**A section only appears in the dashboard's Section Status if it has a
`section_scores` row.** `liveScores` overrides a stored row; it does not create
one. A section with a live scorer and no stored row is invisible on the
dashboard while its own page grades it.

Useful for end-to-end testing without the browser: sign in via `/auth/v1/token?grant_type=password`, upload to Storage, insert a `documents` row, then invoke the function with that JWT. Clean up afterwards — it is a real household.

## Adam Bailey — demo persona

Dual-income homeowners, $100k–$500k HHI, meaningful asset complexity.

- **Adam** 44 (45 on May 15, 2026) · **Sarah** 42 · **Emma** 12 · **Jack** 9
- HHI $325K · Net worth $2.8M · Home $750K at 1847 Oakwood Drive, Savage MN 55378
- Drives the demo findings: no trust, outdated will, $1M umbrella against $2.8M net worth, 14-year-old HVAC

## Whitfield demo persona — `test@command.com`

The household to put in front of someone. Every figure is consistent across
sections, so the findings agree with each other rather than each inventing a story.

- **Marcus** 47 · **Priya** 44 · **Nina** 16 (17 on Oct 5) · **Dev** 10 · **Kai** infant
- Edina MN · HHI $412K · net worth $3.65M · home $985K · mortgage $421,840 at 3.125%
- Drives: $2M umbrella against $3.65M net worth, wills executed 2016 before Kai,
  no financial POA for Priya, a 19-year-old furnace flagged at its last service,
  a Citi card carrying $9,413 at 24.49%, and a 2025 return that puts the
  safe harbor at $78,364 with a $9,200 capital loss carrying forward.
- Six real PDFs in the vault: two declarations pages, a will, a mortgage
  statement, a card statement and the 1040.

## Roadmap

- **Recommendation layer** — `priority_actions` and `section_scores` are written once at onboarding and never recalculated. Coverage findings exist but nothing turns them into ranked actions.
- **Entity matching** — `matched_family_member_id` / `matched_asset_id` columns and confidence scores exist; nothing populates them.
- **More document types** — warranty, will, trust need enum values, extraction paths and confirm handlers.
- **Profile write-back** — confirming an extraction writes pillar tables but never updates `household_profile`.
- **Chunked extraction** for policies that exceed the per-pass token ceiling.
- Wire Legal / Home / Family views to live data as Insurance now is.
- Restore ESLint — `npm run lint` has no config and errors out.
- Seed Rachel Kim and Tom Reeves personas.

## Change log

| Date | Change |
|------|--------|
| Aug 10, 2026 | Tax planning: prior-year return as a baseline, deduction log, 1040 extraction |
| Aug 8, 2026 | Version history via DB trigger; what's-new prompt |
| Aug 8, 2026 | Editable policies; fixed phantom exposures and false duplicate detection |
| Aug 8, 2026 | Coverage health grades adequacy against household facts, not documentation completeness |
| Aug 8, 2026 | Insurance page rebuilt around coverage; policy detail, executive summaries, manual entry |
| Aug 8, 2026 | Structured insurance extraction: 9 tables, evidence per field, 3 concurrent passes |
| Aug 8, 2026 | `HouseholdProvider` — one shared data instance instead of 11 |
| Aug 8, 2026 | Fixed supabase-js auth-lock deadlock and wedged Web Lock hangs |
| Aug 3, 2026 | `extract-document` rewritten against the Messages API; upload/extraction pipeline working end to end |
| Aug 3, 2026 | Applied the schema that had been committed but never run (extraction tables, v2 pillars, storage bucket) |
| Mar 16, 2026 | Set `noUnusedLocals`/`noUnusedParameters` to `false`; moved 12 interfaces to module scope |
| Mar 4, 2026 | Supabase layer, `useHousehold`, AuthScreen, OnboardingFlow |
