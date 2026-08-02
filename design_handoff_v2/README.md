# Handoff: Command App v2.0 Redesign

## Overview

This is a complete redesign of the Command household OS interface, rebranded as **Command v2.0**. The redesign transforms the current dashboard from a generic SaaS look into an executive-grade, institutional-feeling platform appropriate for the "Household COO" positioning.

**Target codebase:** [github.com/MitchPeterson/COMMAND_MVP](https://github.com/MitchPeterson/COMMAND_MVP)  
**Current live version:** https://command-mvp.vercel.app  
**Tech stack:** React 18 + TypeScript + Vite + Tailwind CSS + Supabase + Lucide React + Vercel  
**App structure:** Monolithic `src/App.tsx` (~3,740 lines)

## About the Design Files

The files in `design_files/` are **design references created in HTML/React JSX** — interactive prototypes showing intended look and behavior, NOT production code to copy directly. The task is to **recreate these designs in the target codebase's existing environment** (React + TypeScript + Tailwind) using its established patterns.

Specifically:
- The prototype uses inline JSX with `React.createElement()` — production uses standard JSX
- The prototype uses inline `style={}` objects — production uses Tailwind classes (with `style={{ color: '#C9A24D' }}` only where Tailwind can't express it)
- The prototype uses hardcoded persona data — production reads from `useHousehold()` Supabase hook
- The prototype uses CDN Lucide via `window.lucide` — production uses `import { ... } from 'lucide-react'`

## Fidelity

**High-fidelity (hifi).** Final colors, typography, spacing, and interactions are specified. Recreate pixel-perfect.

---

## Recommended Implementation Workflow

```bash
# 1. Create feature branch
git checkout -b feat/v2.0-redesign

# 2. Vercel will auto-create a preview URL for this branch when you push.
#    Check: https://vercel.com/<your-team>/command_mvp/deployments

# 3. The current production stays untouched on `main`.
#    Roll back at any time: git push origin :feat/v2.0-redesign (delete branch)
#    Or rollback after merge: git revert <merge-commit>
```

### Suggested refactor strategy

The monolithic `App.tsx` is too large to redesign in-place safely. Split during the refactor:

```
src/
├── App.tsx                       (router only, ~100 lines)
├── AuthScreen.tsx                (existing — REDESIGN)
├── OnboardingFlow.tsx            (existing — apply new tokens)
├── useHousehold.ts               (existing — no changes)
├── lib/supabase.ts               (existing — no changes)
└── views/                        NEW FOLDER
    ├── Dashboard.tsx
    ├── Insurance.tsx
    ├── Legal.tsx
    ├── Home.tsx
    ├── Finances.tsx
    ├── Taxes.tsx
    ├── Family.tsx
    ├── Credit.tsx
    ├── Documents.tsx
    ├── Profile.tsx
    └── components/               shared UI primitives
        ├── Sidebar.tsx
        ├── HubMark.tsx           (inline SVG logo)
        ├── CommandBrief.tsx
        ├── ScoreRing.tsx
        ├── StatusBadge.tsx
        └── EmptySection.tsx
```

Keep the existing `useHousehold()` data hook. Each view reads from `data?.<table>` and falls back to empty states (already documented in CONTEXT.md).

---

## Design Tokens

### Colors (add to `tailwind.config.js`)

```js
theme: {
  extend: {
    colors: {
      'cmd-black':       '#0F0F10',  // App background
      'cmd-charcoal':    '#1A1B1F',  // Cards, surfaces
      'cmd-border':      '#2E2F34',  // Default borders
      'cmd-border-hi':   '#484950',  // Hover borders
      'cmd-dim':         '#606068',  // Tertiary text
      'cmd-muted':       '#9A9AA4',  // Secondary text
      'cmd-offwhite':    '#F0F0EE',  // Primary text
      'cmd-gold':        '#C9A24D',  // Accent
      'cmd-gold-hover':  '#D4AE5A',
    },
  },
},
```

### Semantic colors (status only)

| Use case | Hex |
|---|---|
| Success / On track | `#22C55E` (with red-tint `#FF6B6B` for high-contrast danger text) |
| Warning / Monitor | `#EAB308` / `#F59E0B` |
| Critical / At risk | `#EF4444` |
| Info / Neutral | `#3B82F6` |
| Orange (Outdated) | `#F97316` |

### Typography

- **Font:** IBM Plex Sans (already loaded via Google Fonts — `weights 400, 500, 600, 700`)
- **Mono:** IBM Plex Mono (for dates, dollar amounts, percentages)
- **Body:** 14px / weight 500 / color `cmd-offwhite`
- **Muted:** 12-13px / weight 400-500 / color `cmd-muted`
- **Section labels:** 11px / weight 600 / uppercase / letter-spacing 0.1em / color `cmd-muted`
- **Hero numbers:** 56-80px / weight 700 / letter-spacing -0.03em / color `cmd-offwhite`
- **H1:** 22px / weight 700 / letter-spacing -0.01em
- **H2:** 16px / weight 700 / letter-spacing -0.005em

### Spacing & layout

- **Card padding:** 14-18px vertical, 18-22px horizontal
- **Card border-radius:** 8px (rows), 10px (cards), 12px (large modals)
- **Section padding:** 24-28px vertical, 32px horizontal
- **Card border:** `1px solid #2E2F34` (default), `1px solid #484950` (hover)
- **Critical row:** Add `border-left: 3px solid #EF4444` and background `rgba(239,68,68,0.06)`

### Iconography

- **Library:** `lucide-react` (already in `package.json`)
- **Default size:** 14-16px in rows, 18-20px in detail headers, 12-14px in pills
- **Stroke width:** 1.5
- **Color:** `text-cmd-muted` for default, `text-cmd-gold` for accent, semantic colors for status

---

## Screens / Views

### 1. Sidebar (`Sidebar.tsx`)

**Layout:** Fixed left, 200px wide, full height, `bg-cmd-black`, `border-r-cmd-border`.

**Structure:**
1. **Top:** Logo lockup — inline SVG `<HubMark>` (22px) + "COMMAND" wordmark (13px / 700 / letter-spacing 0.1em) + "Household OS" sub (8px / 600 / uppercase / `cmd-muted`)
2. **Nav items:** 9 items with Lucide icons (`LayoutDashboard`, `Shield`, `FileText`, `Home`, `Wallet`, `Receipt`, `Users`, `CreditCard`, `Folder`)
3. **Active state:** Background `rgba(201,162,77,0.08)` + 2px left border `cmd-gold` + text `cmd-gold` / 600
4. **Inactive:** Text `cmd-muted` / 400, icon `#4A4B4E`
5. **Bottom:** User avatar (28px, gold tinted bg) + name + city

**Key file:** See `design_files/Sidebar.jsx` — note the `HubMark` component is an inline SVG showing a hub network icon (8 outer nodes connected to a center, with spokes). Use this; do not load PNG.

### 2. App Header (`Dashboard.tsx` top bar)

**Layout:** 58px tall, `bg-cmd-charcoal`, `border-b-cmd-border`, `padding: 0 28px`, flex space-between.

**Left side:** `<HubMark size={18}>` + divider + "Good morning, Adam" (Adam from `data.profile.primary_first_name`)

**Right side:** Date in `cmd-muted` + divider + **Weekly Brief button** (gold-tinted bg, gold text, red dot badge). Clicking opens the `<CommandBrief>` modal.

### 3. Dashboard (`Dashboard.tsx`)

**Layout:** Two-column split — left column wider (`flex: 1.4`), right column (`flex: 1`).

**Left column:**
- **Health Score Hero** — Padding 28px/32px, border-b. Large 80px score (`cmd-offwhite`), "NEEDS ATTENTION" label in gold to the right of the number, "3 items require action this week" muted line below. Score bar visualization (10 vertical segments) on the right side, color-coded by score band.
- **Section Status List** — Title "SECTION STATUS" in uppercase label style. Vertical list sorted worst→best (Legal 4.0 first, Family 8.5 last). Each row: icon, name, status label (e.g. "3 actions needed" in red for critical), score in colored 16px number. Critical row has red left border + red-tinted bg.

**Right column:**
- **Priority Actions Panel** — Title + count badge ("4 open" in red). Grouped by severity (CRITICAL → HIGH → MEDIUM). Each card has icon-in-tinted-square, title, **consequence-first** copy (1-2 sentences quantifying cost of inaction), urgency line in muted, action CTA in gold.
- **Timeline Strip** — "UPCOMING — 90 DAYS" label. Compact rows: monospace date (44px wide, gold if urgent), event title, category in dim uppercase.

**Data sources:**
- Health score: `data.household.health_score`
- Section status: `data.sectionScores` (sort by score ASC, map status to bad/warn/good)
- Priorities: `data.priorityActions` (filter status != dismissed)
- Timeline: `data.timelineEvents` (next 90 days, ordered by date)

### 4. Insurance (`Insurance.tsx`)

**Structure:**
1. **Hero** — Total Coverage (sum of policy `coverage_amount`) + Annual Premium (normalize monthly × 12) in 56px gold/white. Status indicator ("1 critical gap" if any policy has `status: 'gap'`). Add Policy CTA in gold.
2. **Recommendations** — Severity-grouped (Critical/High/Review). Each card: icon-in-tinted-square, label pill (e.g. "CRITICAL"), title, consequence (2-3 lines), action CTA in gold. Generate from coverage gap analysis on the data.
3. **Active Policies** grouped by type:
   - **Liability Protection** (umbrella)
   - **Property & Auto** (home + auto)
   - **Life Insurance** (life policies)
   - Each group has label + count + group total premium.
   - Each row: icon, name, carrier+policyNumber, coverage, renewal date, premium, status badge, chevron-right.

**Policy detail:** Coverage / Premium / Deductible / Renewal in a 4-up metric grid + coverage gap callout (if applicable) with red bg.

**Data source:** `data.insurancePolicies` from existing hook.

### 5. Legal (`Legal.tsx`)

**Structure:**
1. **Hero** — "Estate Exposure $2.8M" (from `data.household.net_worth`) with "AT RISK" label in red + Section Score 4.0 in red + Upload Document CTA.
2. **Critical Alert** — Red-tinted callout: "No living trust established for a $2.8M estate" + consequence quantifying probate cost ($15K-$40K) + "Schedule attorney consultation" CTA.
3. **Attorney Card** — Avatar with initials + name + firm + specialty + Contact button.
4. **Document Status** grouped by purpose:
   - **Estate Documents** (will, trust)
   - **Directives** (healthcare, POA)
   - **Beneficiary Designations**
   - Each row: icon, name, age ("7 years old"), status badge, chevron.
   - Critical rows (`not-established`) have red left border + red-tinted bg.

**Data source:** `data.legalDocuments`.

### 6. Home (`Home.tsx`)

**Structure:**
1. **Hero** — Property Value ($750K from `data.profile.home_value`) + Replacement Reserve (sum of `assets.estimated_replacement_cost`). Approaching-EOL indicator if any asset has `age/lifespan > 0.75`. Add Asset CTA.
2. **Replacement Window Alert** — Yellow-tinted callout for any asset >78% of lifespan with quantified cost (e.g. HVAC).
3. **Tracked Systems** grouped by category:
   - **HVAC & Climate**
   - **Structure & Exterior**
   - **Plumbing**
   - **Appliances**
   - Each row: icon, name+brand, **lifespan bar** (`<LifespanBar age lifespan>` — visualizes age/lifespan ratio with color-coded fill), replacement cost, condition badge.

**Asset detail:** Age/Lifespan/Replacement/Last Service in 4-up grid + large lifespan percentage visualization.

**Data source:** `data.assets` + `data.maintenanceRecords`.

### 7. Finances (`Finances.tsx`)

**Structure:**
1. **Hero** — Monthly Income + Savings Rate (% in green). Over-budget indicator if total actual > total budgeted.
2. **Budget Table** — Full-width table with columns: Category (icon + name), Budgeted ($), Actual ($), Usage (progress bar + %), Δ (delta in red/green/muted). Use monospace for all dollar amounts.
3. **Upcoming Obligations** — List of upcoming payments with description, due date (gold if urgent), amount. Urgent items get gold left border.

**Data sources:** No dedicated table yet — see CONTEXT.md note. Use hardcoded persona data initially, build `budget_categories` and `financial_obligations` tables later.

### 8. Taxes (`Taxes.tsx`)

**Structure:**
1. **Hero** — 2025 Reported Income (sum of W-2 + 1099 amounts) + Recoverable Savings (sum of `tax_recommendation.potential_savings`). Filing Deadline in monospace gold.
2. **CPA Card** — Strip showing tax professional.
3. **Tax Recommendations** — Severity-grouped, each shows title + description + savings amount in green monospace on the right.
4. **Tax Documents** — Table with green/yellow status dots: name, source, amount, "RECEIVED" or "PENDING" status label.

**Data:** Hardcoded persona data initially; add `tax_documents`, `tax_recommendations` tables later.

### 9. Family (`Family.tsx`)

**Structure:**
1. **Hero** — Household count (4) + College Funding status ("On Track" in green).
2. **Members** — 2-column grid of member cards (avatar with initials + name + relationship + age + next milestone in gold).
3. **College Funding** — 2 cards (one per child) with saved/target progress bar.
4. **Upcoming Milestones** — Table: date (gold monospace), who, event, trigger (e.g. "→ Auto insurance +$1,200/yr").
5. **Aging Parents** — List with name, relationship, age, location, health status badge.

**Data:** `data.profile` + new tables for `family_members`, `milestones`, `college_plans`.

### 10. Credit (`Credit.tsx`)

**Structure:**
1. **Hero** — Rewards Value (gold) + Utilization % (green if low). Unoptimized leakage indicator.
2. **Cards** — 2-column grid of cards (issuer label + card name + points value in gold monospace + balance/limit + "best for" categories).
3. **Spending Optimization** — Table: Category, Monthly Spend, Current Card, Best Card (gold if mismatch), Δ leakage (yellow if any).

**Data:** New tables `credit_cards`, `spending_categories`.

### 11. Documents (`Documents.tsx`)

**Structure:**
1. **Hero** — Total Documents count + "X need attention" + Upload Document CTA. Below: tab strip (All / Legal / Insurance / Home / Tax) with count badges and gold underline for active.
2. **Document Table** — Columns: file icon (gold-tinted square with "PDF"), name (+ versions count if >1), category, modified date (monospace), status pill (current/needs-review/outdated), size (monospace).

**Data:** `data.documents` (Supabase Storage paths).

### 12. Auth Screen (`AuthScreen.tsx`) — REDESIGN

**Layout:** Split-screen, two columns.

**Left panel (42%, `bg-cmd-black`):**
- Hub mark + COMMAND lockup at top
- "THE HOUSEHOLD OPERATING SYSTEM" eyebrow label in gold
- H1: "Every obligation. Every deadline. One system." (30px / 700)
- Body paragraph explaining Command
- 2-column pillar list (Insurance, Legal, Home, Finances, Taxes, Family, Credit, Documents)
- Bottom: "COMMAND · Household Operating System" footer in dim

**Right panel (58%, `bg-cmd-charcoal`):**
- Three modes: `choose` / `signin` / `signup`
- Choose mode: Eyebrow label, H2 headline, body, two buttons (gold primary "Create an account", outlined secondary "Sign in")
- Form mode: Back button → eyebrow → headline → email + password inputs (`bg-cmd-black` with focus ring in gold) → submit button → toggle link in gold

### 13. Weekly Command Brief Modal (`CommandBrief.tsx`)

Triggered from header bell. Three-section briefing modal:
1. **RISK** (red): Headline + summary + italic context block
2. **LEAKAGE** (orange): Same structure  
3. **RECOMMENDED ACTION** (gold): Same structure

Each section: icon-in-tinted-square + uppercase tag + 15px bold headline + 13px summary + left-bordered italic context block.

Modal: 580px max-width, `bg-cmd-charcoal`, `border-cmd-border`, `border-radius: 12px`, backdrop `bg-black/72`.

---

## Interactions & Behavior

- **Hover states:** Cards lift via border color change (`#2E2F34` → `#484950`). No transforms or shadows.
- **Click navigation:** Sidebar items update `activeView` state. Section status rows in dashboard navigate to that section.
- **Detail views:** Each section has list view → detail view with back button.
- **Modals:** `<CommandBrief>` opens on bell click. Click outside backdrop or X to close.
- **No animations** on entry — calm and immediate. Only `transition-colors 150ms` on hover states.

## State Management

Keep existing `useHousehold()` hook. Each view component takes no props (or `{ onNav }` for views that navigate to other sections from rows).

## Assets

- **Logo:** Use the inline SVG `<HubMark>` component — see `design_files/Sidebar.jsx` for the source. Do not import the PNG logo into the app sidebar; the SVG is crisper and works at any scale.
- **PNG logo** at `assets/Command_Logo_dark.png` is the original brand asset — can be used for marketing, the Executive Brief PDF, or onboarding only.

## Design Files (reference only — do not copy directly)

```
design_files/
├── index.html                Entry point
├── App.jsx                   Root component + view router
├── Sidebar.jsx               Sidebar + Icon helper + HubMark inline SVG + C color object
├── Auth.jsx                  AuthScreen (split-screen)
├── CommandBrief.jsx          Weekly Brief modal
├── Dashboard.jsx             Dashboard view + Health Score hero + Section Status + Priority Panel + Timeline
├── Insurance.jsx             Insurance view + grouped policies
├── Legal.jsx                 Legal view + critical alert + grouped docs
├── Home.jsx                  Home view + lifespan bars
├── Finances.jsx              Finances view + budget table
├── Taxes.jsx                 Taxes view + recommendations + doc collection
├── Family.jsx                Family view + members + college + milestones
├── Credit.jsx                Credit view + cards + spending optimization
└── Documents.jsx             Documents view + category tabs + table
```

`colors_and_type.css` documents the full design token system.

## Rollback Plan

- Current production deploys from `main` — leave untouched.
- Feature branch `feat/v2.0-redesign` gets its own auto-generated Vercel preview URL (visible in PR or under Vercel dashboard → Deployments).
- After merge to `main`, Vercel auto-deploys. To rollback: `git revert <merge-commit> && git push origin main` — Vercel re-deploys the prior version within 60 seconds.
- Alternative: in Vercel dashboard, find the last `main` deployment from before the merge and click **Promote to Production**. Instant rollback, no git history changes.

## Implementation Order Recommendation

1. Add new colors to `tailwind.config.js`
2. Build shared primitives (`HubMark`, `Sidebar`, `EmptySection`)
3. Refactor `AuthScreen.tsx` (low risk, mostly visual)
4. Build `Dashboard.tsx` and wire to `useHousehold()` (highest impact)
5. Build `Insurance.tsx` and `Legal.tsx` (wire to existing Supabase tables)
6. Build remaining sections — most use empty states until tables exist
7. Build `CommandBrief.tsx` modal
8. Strip old monolithic code from `App.tsx`, replace with router
9. Push branch → review preview URL → iterate → merge

Total estimated effort with Claude Code: 2-4 hours of focused work.
