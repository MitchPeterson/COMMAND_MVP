# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # tsc + vite build (what Vercel runs)
npm run lint      # ESLint (zero warnings policy)
npm run preview   # Preview production build locally
```

No test suite exists yet. Build success (`npm run build`) is the primary correctness gate.

## Architecture

**COMMAND** is a single-page React app — an AI-powered household operating system. The entire UI lives in `src/App.tsx` (~3,700+ lines), a monolithic component with a string-based router (`activeView`).

### Data flow

```
Supabase (Postgres + Auth)
  └── src/lib/supabase.ts       ← typed client, all DB interfaces, data-fetch functions
        └── src/useHousehold.ts ← useHousehold() hook, loads all data for the session user
              └── src/App.tsx   ← consumes data, renders all views via renderView()
```

**Auth gate:** `useHousehold()` manages auth state. No session → `<AuthScreen />`. No household record → `<OnboardingFlow />`. Both complete before `App.tsx` renders.

### Key files

| File | Role |
|------|------|
| `src/App.tsx` | All UI: header, sidebar, every section view, all modals |
| `src/lib/supabase.ts` | Supabase client, all TypeScript row types, async fetch functions |
| `src/useHousehold.ts` | `useHousehold()` — session auth + parallel data load, returns `{ data, loading, error, userId, refresh }` |
| `src/AuthScreen.tsx` | 3-state login/signup UI (`choose` → `signin`/`signup`) |
| `src/OnboardingFlow.tsx` | 6-step new-user form; writes to `households`, `household_profile`, `section_scores`, `priority_actions` |

### Navigation

`activeView` string controls which section renders: `'dashboard' | 'insurance' | 'legal' | 'home' | 'finances' | 'taxes' | 'family' | 'credit' | 'documents' | 'profile'`

### Live vs. demo data

- **Dashboard** — health score is live (`data?.household?.health_score`); rest of dashboard still demo
- **Home** — wired to live `data.assets` + `data.maintenanceRecords` via `useHousehold()`, with empty states
- **Insurance, Legal, Finances, Tax, Family, Credit, Profile** — still render from hardcoded demo arrays defined inline in `App.tsx` (`insurancePolicies`, `legalDocuments`, etc.). Despite older notes, these are NOT yet wired to Supabase.

The live-data pattern to follow (established by Home): add a `getX()` fetch fn in `src/lib/supabase.ts`, load it in `useHousehold.ts` (HouseholdData + EMPTY_DATA + the `Promise.all`), then read `data?.x ?? []` in the view with an empty-state fallback.

### Database (Supabase — live)

All tables use Row Level Security (RLS). Key tables: `households`, `household_profile`, `insurance_policies`, `legal_documents`, `assets`, `maintenance_records`, `priority_actions`, `timeline_events`, `documents`, `section_scores`.

Environment variables required (in `.env.local` and Vercel):
```
VITE_SUPABASE_URL=https://dkvmnhaekwcnwxbbyjfe.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key from Supabase dashboard>
```

## Critical TypeScript rules

These caused repeated Vercel build failures and must be followed:

- **All `interface` declarations must be at module (top-level) scope** — never inside a function body. `tsc` rejects interfaces inside functions, causing cascading TS2304 errors.
- **`noUnusedLocals` and `noUnusedParameters` are `false`** — intentional; the monolith makes these flags impractical.
- **Unused variables must be deleted entirely** — renaming with `_` prefix does not suppress TS6133 on `const` declarations (only works on function parameters).
- **Explicit types on `prev` callbacks** — `setState((prev: Type[]) => ...)` required under `"strict": true`.
- All state vars referenced in JSX must be declared, even if their setter is never called.

## Brand / styling

- **Command Black:** `#0F0F10` | **Command Gold:** `#C9A24D` | **Charcoal:** `#1C1D20` | **Off-White:** `#F6F6F4`
- Gold is an accent, not a fill — 80% neutral / 20% gold rule.
- Apply gold via inline style: `style={{ color: '#C9A24D' }}` (Tailwind doesn't have a preset for it).
- Card pattern: `bg-white border border-gray-200 rounded-xl`
- Empty state pattern: `p-12 text-center` with icon + heading + subtext, icon in `text-gray-200`.

## Deployment

- Vercel auto-deploys on push to `main` (GitHub-connected).
- Live URL: https://command-xi.vercel.app
- Build command Vercel runs: `tsc && vite build` — TypeScript errors block deploy.

## Test accounts

| Email | Password | Data |
|-------|----------|------|
| `adam@command-test.com` | `Command2026!` | Fully seeded (Adam Bailey persona) |
| `rachel@command-test.com` | `Command2026!` | Auth only |
| `tom@command-test.com` | `Command2026!` | Auth only |

Adam Bailey seeded UUIDs:
- User UUID: `21a95967-4bcf-4793-8076-92b4be9ffcf0`
- Household UUID: `a1b2c3d4-0001-0001-0001-000000000001`

## Adam Bailey — demo persona reference

The reference user the seeded demo data is built around (target persona: dual-income homeowners, $100k–$500k HHI, meaningful financial/asset complexity).

- **Name:** Adam Bailey | **Spouse:** Sarah Bailey (42)
- **Age:** 44 — turns 45 May 15, 2026
- **Kids:** Emma (12), Jack (9)
- **HHI:** $325K | **Net Worth:** $2.8M
- **Home:** 1847 Oakwood Drive, Savage MN 55378 — $750K
- **Key issues (drive priority actions):** No trust, outdated will, $1M umbrella vs $2.8M net worth, HVAC 14 years old

## Roadmap / next up

- **Wire Insurance + Legal** to live `data.insurancePolicies` / `data.legalDocuments` (hook already loads them; views still use hardcoded arrays)
- **Finances / Tax / Family / Credit** — no dedicated tables yet; needs scoping before wiring
- Document upload to Supabase Storage (UI exists, no backend)
- Seed data for Rachel Kim and Tom Reeves personas
- Realtime Supabase subscriptions (`postgres_changes` → `refresh()`)
- Onboarding: skip HVAC/roof questions for renters
- Mobile app version

## Change log

| Date | Change |
|------|--------|
| Mar 16, 2026 | Session 4: Set `noUnusedLocals`/`noUnusedParameters` to `false` (root cause of 10+ failed deploys) |
| Mar 16, 2026 | Session 4: Moved 12 interfaces from inside `CommandApp` body to module scope |
| Mar 16, 2026 | Session 4: Added explicit types to `setState` prev callbacks |
| Mar 16, 2026 | Fixed all TS build errors; re-inserted live data block; restored `PriorityDetailView` |
| Mar 16, 2026 | All sections show clean empty states for new users — no Adam Bailey data bleed-through |
| Mar 16, 2026 | Insurance + Legal + Timeline + Dashboard + Profile wired to live Supabase data |
| Mar 16, 2026 | Vercel-GitHub integration fixed — recreated project from GitHub import |
| Mar 16, 2026 | App.tsx reduced from ~3,700 to ~1,692 lines by deleting hardcoded demo data |
| Mar 4, 2026 | useHousehold: 8-second safety timeout, fixed auth race condition |
| Mar 4, 2026 | AuthScreen rebuilt with 3-state flow; OnboardingFlow built (fixed 4 Supabase insert bugs) |
| Mar 4, 2026 | Built full Supabase layer — schema, typed client, useHousehold hook |
| Feb 5, 2026 | WeeklyBrief component added |
| Feb 4, 2026 | Initial deployment to Vercel |
