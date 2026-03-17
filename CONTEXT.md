# COMMAND – Project Context

> **Last Updated:** March 16, 2026 (Session 4 — TypeScript Build Fix)  
> **Purpose:** This document maintains continuity across Claude conversations. Update it at the end of every working session.

---

## What is Command?

Command is an AI-powered operating system for households. It brings order, foresight, and automation to everything a family is accountable for – insurance, legal documents, finances, healthcare, taxes, and home assets.

**Positioning:** "Household COO" – not a passive vault or budgeting tool, but an active system that monitors, prioritizes, and optimizes.

**Target User:** Dual-income homeowners, $100k–$500k HHI, meaningful financial + asset complexity. The "Adam Bailey" persona (age 44, VP-level, married, 2 kids, $750K home, $2.8M net worth) is the reference user.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 |
| Language | TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Database | Supabase (Postgres) — LIVE |
| Auth | Supabase Auth (email/password) — LIVE |
| Deployment | Vercel — **now Git-connected to GitHub, auto-deploys on push to main** |

**Live URL:** https://command-xi.vercel.app  
**Repository:** https://github.com/MitchPeterson/COMMAND_MVP (private)  
**Supabase Project ID:** `dkvmnhaekwcnwxbbyjfe`  
**Supabase URL:** `https://dkvmnhaekwcnwxbbyjfe.supabase.co`

---

## Brand Guidelines (Quick Reference)

### Colors
- **Command Black:** `#0F0F10` – primary text, UI anchors
- **Command Gold:** `#C9A24D` – icon, accents, CTAs (use sparingly: 80% neutral / 20% gold)
- **Charcoal:** `#1C1D20` – card backgrounds, secondary surfaces
- **Off-White:** `#F6F6F4` – light mode text (if needed)

### Typography
- **Primary:** Inter or SF Pro Display
- **Headlines:** SemiBold → Bold, slightly tight tracking (-1% to -2%)
- **Body:** Inter Regular/Medium
- **"COMMAND" wordmark:** Always all caps

### Voice & Tone
- Direct, calm, confident, executive
- Short sentences, no hype, no emojis in marketing

### Design Philosophy
> If something feels clever, trendy, or decorative – remove it.  
> Command should feel like: "This was built by someone who runs things."

---

## File Structure

```
COMMAND_MVP/
├── public/
│   └── Command_Logo.png
├── src/
│   ├── lib/
│   │   └── supabase.ts           ← Supabase client + TypeScript types + data functions
│   ├── useHousehold.ts           ← Primary data hook (src root, NOT src/hooks/)
│   ├── AuthScreen.tsx            ← Login/signup UI (src root, NOT src/components/)
│   ├── OnboardingFlow.tsx        ← New user setup flow (6 steps + setup animation)
│   ├── App.tsx                   ← Main application (~3,740 lines)
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── CONTEXT.md
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

**IMPORTANT — Import paths:**  
All source files live directly in `src/` (not subdirectories except `lib/`).  
Imports: `./useHousehold`, `./AuthScreen`, `./OnboardingFlow`, `./lib/supabase`

---

## Database Schema (Supabase / Postgres) — LIVE

All tables have Row Level Security (RLS) enabled.

| Table | Purpose |
|-------|---------|
| `households` | Root record per user, owns `health_score` |
| `household_profile` | Demographic data + all onboarding answers |
| `insurance_policies` | Home, auto, umbrella, life, health policies |
| `legal_documents` | Will, trust, POA, healthcare directive, beneficiary |
| `assets` | Real estate, vehicles, investments, retirement, 529s |
| `maintenance_records` | Home/asset maintenance tasks and history |
| `priority_actions` | AI + user action items with severity levels |
| `timeline_events` | Upcoming deadlines and completed activity |
| `documents` | File vault (Supabase Storage paths) |
| `section_scores` | Per-pillar scores (0–100) for all 9 sections |

### household_profile extra columns (run in Supabase SQL Editor if not done)
```sql
ALTER TABLE household_profile
  ADD COLUMN IF NOT EXISTS primary_first_name TEXT,
  ADD COLUMN IF NOT EXISTS primary_last_name TEXT,
  ADD COLUMN IF NOT EXISTS spouse_first_name TEXT,
  ADD COLUMN IF NOT EXISTS home_ownership TEXT,
  ADD COLUMN IF NOT EXISTS year_built INTEGER,
  ADD COLUMN IF NOT EXISTS emergency_fund_status TEXT,
  ADD COLUMN IF NOT EXISTS has_aging_parents BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS upcoming_life_events TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS has_will TEXT,
  ADD COLUMN IF NOT EXISTS has_trust TEXT,
  ADD COLUMN IF NOT EXISTS has_umbrella TEXT,
  ADD COLUMN IF NOT EXISTS life_insurance_review TEXT,
  ADD COLUMN IF NOT EXISTS hvac_age TEXT,
  ADD COLUMN IF NOT EXISTS roof_age TEXT;
```

---

## Environment Variables

```
VITE_SUPABASE_URL=https://dkvmnhaekwcnwxbbyjfe.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...  (Supabase → Settings → API Keys → Publishable key)
```

Set in **Vercel → Settings → Environment Variables → All Environments**.  
Never commit to GitHub.

---

## Test Accounts

| Email | Password | Persona | Status |
|-------|----------|---------|--------|
| `adam@command-test.com` | `Command2026!` | Adam Bailey | ✅ Fully seeded |
| `rachel@command-test.com` | `Command2026!` | Rachel Kim | ⬜ Auth only, no seed data |
| `tom@command-test.com` | `Command2026!` | Tom Reeves | ⬜ Auth only, no seed data |

**Adam Bailey user UUID:** `21a95967-4bcf-4793-8076-92b4be9ffcf0`  
**Adam Bailey household UUID:** `a1b2c3d4-0001-0001-0001-000000000001`

---

## What's Been Built

### Authentication — LIVE ✅
- [x] Email/password sign up and sign in
- [x] Auth guard, loading spinner, sign out

### Onboarding Flow — LIVE ✅
- [x] 6-step progressive form for new users
- [x] Auto-creates household, profile, section_scores, priority_actions
- [x] Calculates initial health_score

### Vercel + GitHub — LIVE ✅
- [x] Auto-deploys on push to main
- [x] Environment variables set
- [x] Was broken (project created via file upload) — fixed by recreating project from GitHub import
- [x] tsconfig.json: `noUnusedLocals` and `noUnusedParameters` set to `false` (Session 4 — fixed 10+ consecutive build failures)

### Dashboard — FULLY LIVE ✅
- [x] User's real first name in welcome
- [x] Live health score from DB
- [x] Live section score rings from DB
- [x] Live priority actions from DB (empty state if none)
- [x] Live timeline from DB (empty state if none)

### Insurance — LIVE ✅
- [x] Reads from `data.insurancePolicies`
- [x] Grouped by type, clean empty state

### Legal — LIVE ✅
- [x] Reads from `data.legalDocuments`
- [x] Status uses DB enum values
- [x] Clean empty state

### Profile — LIVE ✅
- [x] Live name, initials, location from DB

### Home / Finances / Tax / Family / Credit — Empty States ✅
- [x] All show clean empty states — no Adam Bailey data bleeds through

---

## Current App.tsx Architecture (~3,740 lines)

The file is a monolithic single-component app. As of Session 4, **all 25 interfaces are at module (top-level) scope** — none inside the component function body.

Contents:
- 25 top-level TypeScript interfaces
- State declarations + hardcoded demo data arrays for Home, Tax, Family, Credit, Finances sections
- Live data derived vars: `firstName`, `userInitials`, `displayName`, `livePriorities`, `liveSections`, `liveHealthScore`
- UI components (modals, Header, SectionScoreCard, PriorityCard, WeeklyBrief, etc.)
- Section views: Dashboard/Insurance/Legal use live Supabase data; Home/Tax/Family/Credit/Finances still use hardcoded demo data
- `renderView()` router

---

## In Progress / Next Up

### Immediate — Verify Deployment
- [ ] Confirm Vercel build succeeds after tsconfig + App.tsx push (Session 4 fix)
- [ ] Verify live site loads at https://command-xi.vercel.app

### Wire Remaining Sections to Live Data
- **Home:** `assets` + `maintenance_records` tables already in DB — ready to wire
- **Finances / Tax / Family / Credit:** No dedicated tables yet — needs scoping first

### Future Priorities
- [ ] Wire Home section to `assets` + `maintenance_records`
- [ ] Document upload to Supabase Storage (UI exists, no backend)
- [ ] Seed data for Rachel Kim and Tom Reeves personas
- [ ] Realtime Supabase subscriptions
- [ ] Onboarding: skip HVAC/roof for renters
- [ ] Mobile app version

---

## Coding Patterns & Conventions

### Live Data Pattern
```tsx
// Derived from useHousehold() at top of CommandApp:
const firstName = data?.profile?.primary_first_name ?? 'there';
const livePriorities = (data?.priorityActions ?? [])
  .filter((a: any) => a.status !== 'dismissed' && a.status !== 'completed')
  .map((action: any, idx: number) => ({ /* mapped to Priority shape */ }));

// In views:
const livePolicies = data?.insurancePolicies ?? [];
const liveLegalDocs = data?.legalDocuments ?? [];
```

### Empty State Pattern
```tsx
{liveData.length === 0 ? (
  <div className="p-12 text-center">
    <Icon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
    <h3 className="font-medium text-gray-500 mb-1">Nothing here yet</h3>
    <p className="text-sm text-gray-400">Descriptive message.</p>
  </div>
) : (
  <div className="divide-y divide-gray-100">
    {liveData.map(item => ( ... ))}
  </div>
)}
```

### TypeScript Rules (critical — learned Sessions 3 & 4)
- **`noUnusedLocals` and `noUnusedParameters` are now `false` in tsconfig.json** — this was the root cause of 10+ consecutive Vercel build failures. With a 3,740-line monolithic file edited via GitHub web UI (no local linter), these flags are impractical.
- **All `interface` declarations MUST be at module (top-level) scope** — never inside a function body. `tsc` rejects interfaces inside functions, causing cascading TS2304 "Cannot find name" errors.
- **Explicit types on `prev` callbacks** — `setState((prev: Type[]) => ...)` to avoid TS7006 implicit `any` errors under `"strict": true`.
- **NEVER use `_` prefix to suppress TS6133 on `const` declarations** — TypeScript still flags them. Only works for function parameters.
- **Unused variables must be deleted entirely**, not renamed or commented out.
- **Commented-out state vars** that are referenced in JSX elsewhere still cause TS2304.
- **All state vars used in JSX must be declared**, even if their setter is never called.

### Styling Conventions
- Tailwind utility classes throughout
- Gold accent: `style={{ color: '#C9A24D' }}` or `style={{ backgroundColor: '#C9A24D' }}`
- Card: `bg-white border border-gray-200 rounded-xl`
- Empty states: `p-12 text-center` with icon + heading + subtext

### State Management
- React `useState` for all UI state
- `useHousehold()` for all Supabase data
- `activeView` string: `'dashboard'` | `'insurance'` | `'legal'` | `'home'` | `'finances'` | `'taxes'` | `'family'` | `'credit'` | `'documents'` | `'profile'`

---

## Adam Bailey — Demo Persona Reference

- **Name:** Adam Bailey | **Spouse:** Sarah Bailey (42)
- **Age:** 44 — turns 45 May 15, 2026
- **Kids:** Emma (12), Jack (9)
- **HHI:** $325K | **Net Worth:** $2.8M
- **Home:** 1847 Oakwood Drive, Savage MN 55378 — $750K
- **Key Issues:** No trust, outdated will, $1M umbrella vs $2.8M NW, HVAC 14 years old

---

## How to Work With Claude on This Project

1. **Start each session** by sharing this CONTEXT.md
2. **Upload current App.tsx** from GitHub when making code changes
3. **Update this file** at the end of every session
4. **All edits via GitHub web UI** — no local dev environment
5. **Vercel auto-deploys** on every push to `main`
6. **Commit comments** provided at end of each Claude session

---

## Change Log

| Date | Change |
|------|--------|
| Mar 16, 2026 | Session 4: Set noUnusedLocals/noUnusedParameters to false in tsconfig.json (root cause of 10+ failed deploys) |
| Mar 16, 2026 | Session 4: Moved 12 interfaces from inside CommandApp function body to module scope |
| Mar 16, 2026 | Session 4: Added explicit types to setState prev callbacks (CharitableContribution[], BusinessExpense[]) |
| Mar 16, 2026 | Fixed all TS build errors — deleted unused data arrays, restored needed state vars |
| Mar 16, 2026 | Re-inserted live data block (firstName, livePriorities, liveSections, liveHealthScore) |
| Mar 16, 2026 | Restored PriorityDetailView (accidentally dropped during cleanup) |
| Mar 16, 2026 | All sections show clean empty states for new users — no Adam Bailey data bleed-through |
| Mar 16, 2026 | Insurance + Legal + Timeline wired to live Supabase data |
| Mar 16, 2026 | Dashboard fully wired: name, health score, section scores, priorities, timeline |
| Mar 16, 2026 | ProfileView shows live name, initials, location |
| Mar 16, 2026 | supabase.ts: added missing optional fields to Household + HouseholdProfile interfaces |
| Mar 16, 2026 | Vercel-GitHub integration fixed — recreated project from GitHub import |
| Mar 16, 2026 | App.tsx reduced from ~3,700 to ~1,692 lines by deleting hardcoded demo data |
| Mar 4, 2026 | useHousehold: 8-second safety timeout, fixed auth race condition |
| Mar 4, 2026 | AuthScreen: rebuilt with 3-state flow |
| Mar 4, 2026 | OnboardingFlow: built and fixed 4 Supabase insert bugs |
| Mar 4, 2026 | Built full Supabase layer — schema, typed client, useHousehold hook |
| Feb 5, 2026 | WeeklyBrief component added |
| Feb 4, 2026 | Initial deployment to Vercel |
