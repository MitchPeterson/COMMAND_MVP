# COMMAND – Project Context

> **Last Updated:** March 4, 2026 (Session 2 — Onboarding Flow + Auth Fixes)  
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
| Deployment | Vercel |

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
- ❌ "Revolutionizing the way families manage life"
- ✅ "Run your household with clarity and confidence."

### Design Philosophy
> If something feels clever, trendy, or decorative – remove it.  
> Command should feel like: "This was built by someone who runs things."

---

## File Structure

```
COMMAND_MVP/
├── public/
│   └── command-icon.svg
├── src/
│   ├── lib/
│   │   └── supabase.ts           ← Supabase client + TypeScript types + data functions
│   ├── useHousehold.ts           ← Primary data hook (lives in src root, NOT src/hooks/)
│   ├── AuthScreen.tsx            ← Login/signup UI (lives in src root, NOT src/components/)
│   ├── OnboardingFlow.tsx        ← New user setup flow (6 steps + setup animation)
│   ├── App.tsx                   ← Main application (~3100 lines, monolithic)
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── supabase_schema.sql           ← Full DB schema (run once in Supabase SQL Editor)
├── adam_bailey_seed.sql          ← Seed data for Adam Bailey test account
├── SUPABASE_INTEGRATION.md       ← Step-by-step wiring guide
├── CONTEXT.md                    ← This file
├── index.html
├── package.json                  ← Includes @supabase/supabase-js ^2.39.0
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

**IMPORTANT — Import paths:**  
`useHousehold.ts` and `AuthScreen.tsx` live directly in `src/` (not subdirectories).  
Imports must use `./useHousehold` and `./AuthScreen` (not `./hooks/` or `./components/`).  
`supabase.ts` lives in `src/lib/` — imported as `./lib/supabase`.

---

## Database Schema (Supabase / Postgres) — LIVE

All tables have Row Level Security (RLS) enabled. Users can only access their own household data.

| Table | Purpose |
|-------|---------|
| `households` | Root record per user, owns `health_score` |
| `household_profile` | Demographic data (name, income, net worth, family size, onboarding answers) |
| `insurance_policies` | Home, auto, umbrella, life, health policies |
| `legal_documents` | Will, trust, POA, healthcare directive, beneficiary |
| `assets` | Real estate, vehicles, investments, retirement, 529s |
| `maintenance_records` | Home/asset maintenance tasks and history |
| `priority_actions` | AI + user action items with severity levels |
| `timeline_events` | Upcoming deadlines and completed activity |
| `documents` | File vault (Supabase Storage paths) |
| `section_scores` | Per-pillar scores (0–100) for all 9 sections |

**Key pattern:** All child tables have `household_id` FK → `households.id`  
**RLS helper:** `household_owner(hid UUID)` function used in all child table policies

---

## Environment Variables

```
VITE_SUPABASE_URL=https://dkvmnhaekwcnwxbbyjfe.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

Set in **Vercel → Settings → Environment Variables** for production.  
Never commit to GitHub. No `.env.local` file needed (web-only workflow).

---

## Test Accounts

| Email | Password | Persona | Status |
|-------|----------|---------|--------|
| `adam@command-test.com` | `Command2026!` | Adam Bailey | ✅ Created + fully seeded |
| `rachel@command-test.com` | `Command2026!` | Rachel Kim | ⬜ Auth created, no seed data |
| `tom@command-test.com` | `Command2026!` | Tom Reeves | ⬜ Auth created, no seed data |

**Adam Bailey user UUID:** `21a95967-4bcf-4793-8076-92b4be9ffcf0`  
**Adam Bailey household UUID:** `a1b2c3d4-0001-0001-0001-000000000001`

---

## Core Functional Areas (9 Pillars)

1. **Advisory Coordination** – Connects financial, legal, tax, insurance advisors
2. **Insurance & Risk** – Home, auto, umbrella, health, life coverage tracking
3. **Legal & Estate** – Wills, trusts, POAs, beneficiaries
4. **Family & Life Administration** – Life events trigger updates
5. **Home & Asset Maintenance** – Proactive maintenance scheduling
6. **Tax Planning** – Documents, deadlines, planning opportunities
7. **Healthcare & Coverage** – Insurance, providers, benefits coordination
8. **Finances & Budget Planning** – Cash flow, commitments, decisions
9. **Credit & Rewards Optimization** – Card selection, rewards strategy

---

## What's Been Built

### Authentication — LIVE ✅
- [x] Supabase Auth — email/password sign up and sign in
- [x] `AuthScreen.tsx` — login/signup UI matching Command brand
- [x] Auth guard in App.tsx — shows AuthScreen when no session
- [x] Loading spinner while auth initializes (dark screen, gold spinner)
- [x] Sign Out button in Profile view

### New User Onboarding Flow — BUILT ✅
- [x] `OnboardingFlow.tsx` — standalone component, 6-step progressive form
- [x] Welcome screen — brand moment, sets tone ("You're in command now.")
- [x] Step 1: Household — name, spouse, city/state
- [x] Step 2: Home — own/rent, home value, year built, HVAC age, roof age
- [x] Step 3: Financial picture — income range, net worth range, emergency fund status
- [x] Step 4: Family — number of children, aging parents, life event multi-select (8 options)
- [x] Step 5: Protection gaps — will status, trust, umbrella policy, life insurance review date
- [x] Step 6: Confirmation — summary card showing identified risks before launch
- [x] Setup animation screen — animated step-by-step "Building your Command" loading state
- [x] Auto-creates `households` record on completion
- [x] Auto-creates `household_profile` with all onboarding fields
- [x] Auto-creates 9 blank `section_scores` rows
- [x] Auto-generates `priority_actions` based on answers (up to 5 immediate issues)
- [x] Calculates initial `health_score` (50 baseline + bonuses for good answers, capped at 85)
- [x] New user detection: `isNewUser = !data?.household && userId && !loading`
- [x] App.tsx wired: 3 targeted changes (import, state, render guard)
- [x] On complete: `window.location.reload()` re-fetches all household data

### Database Layer — LIVE ✅
- [x] Full Postgres schema — 10 tables, RLS on all
- [x] `src/lib/supabase.ts` — typed Supabase client + data access functions
- [x] `src/useHousehold.ts` — React hook that loads all household data on login
- [x] Adam Bailey fully seeded: 7 priority actions, 10 timeline events, 5 insurance policies, 5 legal docs, 8 assets, 8 section scores, full profile

### Dashboard
- [x] Household health score (live from `data.household.health_score`)
- [x] Section scores with visual ring indicators
- [x] Priority actions list with severity badges (Critical, High, Medium)
- [x] Dismiss / restore priority actions
- [x] Timeline — upcoming events + recent activity
- [x] Weekly Command Brief modal

### Insurance Section
- [x] Policy cards grouped by type
- [x] Carrier, coverage, premium, renewal date, status badges
- [x] Policy detail drill-down view with coverage breakdown
- [x] Recommendations per policy

### Legal Section
- [x] Estate document list with status tracking
- [x] Attorney contact card (Jennifer Morrison)
- [x] Document detail drill-down with recommendations
- [x] Revocable Trust alert banner

### Home & Assets
- [x] Assets grouped by category (HVAC, Roof, Plumbing, Appliances, Exterior)
- [x] Life expectancy progress bars
- [x] Maintenance history per asset
- [x] Planned replacement timeline by year

### Finances
- [x] Monthly budget vs actual bar chart
- [x] Upcoming financial obligations
- [x] Savings rate, emergency fund, income summary cards

### Tax Planning
- [x] Tax document checklist (W-2s, 1099s, returns)
- [x] Charitable contributions tracker with add + bulk upload
- [x] Business expense tracker with add + bulk upload
- [x] Tax optimization recommendations (dismissable)
- [x] 2025 tax law updates
- [x] CPA contact card (Michael Chen)

### Family & Life Admin
- [x] Household member cards with upcoming milestones
- [x] College savings progress bars (Emma + Jack 529s)
- [x] Aging parents tracker
- [x] Life events impact timeline

### Credit & Rewards
- [x] Credit card portfolio (Chase Sapphire, Freedom, Amex Blue, Ink Business)
- [x] Spending optimization by category
- [x] Monthly optimization opportunity calculation

### Navigation & UI
- [x] Sticky top nav with section icons
- [x] Mobile hamburger menu
- [x] Document upload modal (UI only — no storage yet)
- [x] Document version history modal
- [x] Dev Persona Switcher (bottom left corner, dev tool)
- [x] All Documents view with search + filter UI

---

## In Progress / Next Up

### Outstanding Issue — Infinite Loading on Page Load
The app sometimes shows a permanent spinner on the Vercel URL. Suspected cause: Supabase client failing to initialize before `getSession()` is called. Mitigated with an 8-second safety timeout in `useHousehold.ts` but root cause not yet confirmed. **Next session: open browser console on the hanging page and check for red errors — paste into Claude to diagnose.**

### Dashboard Still Shows Adam Bailey's Hardcoded Data
The onboarding correctly writes new user data to Supabase, but most of App.tsx renders hardcoded arrays (insurance policies, legal docs, assets, finances, etc.) that are all Adam Bailey's data. Every new user sees Adam's info until each section is wired to live Supabase queries. **This is the next major dev session.**

### Onboarding — Supabase Schema Additions Needed
Run this SQL in Supabase SQL Editor if not already done:
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

### Future Priorities
- [ ] Wire App.tsx dashboard sections to live Supabase data (replace hardcoded Adam Bailey data)
- [ ] Document upload to Supabase Storage (currently UI-only)
- [ ] Break up monolithic App.tsx into modular components
- [ ] Seed data for Rachel Kim and Tom Reeves personas
- [ ] Realtime Supabase subscriptions for live updates
- [ ] Mobile app version
- [ ] Onboarding: skip HVAC/roof questions for renters
- [ ] Onboarding: guard against duplicate household creation on refresh

---

## Coding Patterns & Conventions

### Supabase Data Pattern
```tsx
// Top of App.tsx
const { data, loading, userId } = useHousehold();

// Auth guard
if (!userId && !loading) return <AuthScreen />;

// Loading state
if (loading) return <LoadingSpinner />;

// Use live data with hardcoded fallback during transition
const healthScore = data?.household?.health_score ?? 72;
const actions = data?.priorityActions ?? [];
```

### Component Structure
```tsx
const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => {
  const [state, setState] = useState<Type>(initialValue);
  return (
    <div className="bg-[#1C1D20] rounded-xl border border-[#2a2b2e]">
      {/* Content */}
    </div>
  );
};
```

### Styling Conventions
- Tailwind utility classes throughout
- Custom hex colors in brackets: `bg-[#1C1D20]`, `text-[#C9A24D]`
- Card pattern: `bg-[#1C1D20] rounded-xl border border-[#2a2b2e]`
- Muted text: `text-[#808084]` or `text-[#a0a0a4]`

### Status Badge Colors
- Critical/Error: `bg-[#ef4444]/10 text-[#ef4444]`
- Warning/Medium: `bg-[#f59e0b]/10 text-[#f59e0b]`
- Success/Good: `bg-[#22c55e]/10 text-[#22c55e]`
- Gold/Action: `bg-[#C9A24D]/10 text-[#C9A24D]`

### State Management
- React `useState` for all UI/interaction state
- `useHousehold()` hook for all Supabase data
- `activeView` string controls which section renders
- Views: `'dashboard'`, `'insurance'`, `'legal'`, `'home'`, `'finances'`, `'taxes'`, `'family'`, `'credit'`, `'documents'`, `'profile'`

---

## Adam Bailey — Demo Persona Reference

- **Name:** Adam Bailey | **Spouse:** Sarah Bailey (42)
- **Age:** 44 — turns 45 May 15, 2026
- **Kids:** Emma (12, Sep 2013), Jack (9, Mar 2016)
- **Role:** VP / Senior Director at Acme Corp
- **Home:** 1847 Oakwood Drive, Savage MN 55378 — $750K
- **HHI:** $325K ($285K W-2 + $40K spouse + $45K consulting 1099)
- **Net Worth:** $2.8M
- **Insurance:** State Farm (home, auto, umbrella), Northwestern Mutual (life ×2)
- **Attorney:** Jennifer Morrison, Morrison & Associates — last contact March 2019
- **CPA:** Michael Chen, Chen & Associates Tax Advisors
- **Key Issues:** Will predates children, no trust, $1M umbrella gap vs $2.8M NW, auto premium 23% above market, HVAC 14 years old

---

## How to Work With Claude on This Project

1. **Start each session** by sharing this CONTEXT.md
2. **Paste current App.tsx** (raw from GitHub) when making code changes
3. **Update this file** at the end of every session
4. **All edits via GitHub web UI** — no local dev environment
5. **Vercel auto-deploys** on every commit to main
6. **GitHub commit comments** are provided at the end of each Claude session

---

## Change Log

| Date | Change |
|------|--------|
| Mar 4, 2026 | useHousehold: added 8-second safety timeout + error handling on initAuth |
| Mar 4, 2026 | AuthScreen: rebuilt with 3-state flow (choose → signup or signin), logo full-width |
| Mar 4, 2026 | OnboardingFlow: fixed 4 silent Supabase insert bugs (section column, status values, severity case, is_dismissed→status) |
| Mar 4, 2026 | OnboardingFlow: replaced window.location.reload() with refresh() to fix post-onboarding hang |
| Mar 4, 2026 | useHousehold: removed auto-createHousehold call so new users route to OnboardingFlow |
| Mar 4, 2026 | useHousehold: fixed dual auth event race condition (getSession + onAuthStateChange) |
| Mar 4, 2026 | Deleted orphan household rows for non-Adam test users in Supabase |
| Mar 4, 2026 | Disabled Supabase email confirmation for dev environment |
| Mar 4, 2026 | Built OnboardingFlow.tsx — 6-step new user setup, auto-creates household + scores + priority actions |
| Mar 4, 2026 | New user onboarding flow scoped for next session |
| Mar 4, 2026 | Adam Bailey seed data fully inserted — all tables populated |
| Mar 4, 2026 | Auth confirmed working on Vercel production |
| Mar 4, 2026 | Fixed import paths (files in src root not subdirectories) |
| Mar 4, 2026 | Fixed TS errors — added `any` types in useHousehold, removed unused useEffect |
| Mar 4, 2026 | Added `@supabase/supabase-js` to package.json |
| Mar 4, 2026 | Wired Supabase into App.tsx — auth guard, loading state, live health score, sign out |
| Mar 4, 2026 | Built full Supabase layer — schema, typed client, useHousehold hook, AuthScreen |
| Feb 5, 2026 | Created CONTEXT.md |
| Feb 5, 2026 | WeeklyBrief component integrated into App.tsx |
| Feb 4, 2026 | Initial deployment to Vercel |
