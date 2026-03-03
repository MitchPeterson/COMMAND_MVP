# COMMAND – Project Context

> **Last Updated:** March 2, 2026  
> **Purpose:** This document maintains continuity across Claude conversations. Update it as the project evolves.

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
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (email/password) |
| Deployment | Vercel |

**Live URL:** https://command-xi.vercel.app  
**Repository:** https://github.com/MitchPeterson/COMMAND_MVP (private)

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
│   ├── components/
│   │   ├── AuthScreen.tsx        # Login/signup UI (NEW)
│   │   └── (WeeklyBrief.tsx)     # Planned
│   ├── hooks/
│   │   └── useHousehold.ts       # Primary Supabase data hook (NEW)
│   ├── lib/
│   │   └── supabase.ts           # Supabase client + types + data functions (NEW)
│   ├── App.tsx                   # Main application (~3100 lines, monolithic)
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── supabase_schema.sql           # Run in Supabase SQL Editor (NEW)
├── SUPABASE_INTEGRATION.md       # Step-by-step wiring guide (NEW)
├── .env.local                    # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (NOT committed)
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Database Schema (Supabase / Postgres)

All tables have RLS enabled. Users can only access their own household data.

| Table | Purpose |
|-------|---------|
| `households` | Root record, owns health_score |
| `household_profile` | Adam Bailey demographic data |
| `insurance_policies` | Home, auto, umbrella, life, health |
| `legal_documents` | Will, trust, POA, directives |
| `assets` | Real estate, vehicles, investments |
| `maintenance_records` | Home/asset maintenance tasks |
| `priority_actions` | AI + user action items with severity |
| `timeline_events` | Upcoming deadlines and recent activity |
| `documents` | File vault (Supabase Storage paths) |
| `section_scores` | Per-pillar scores (0–100) for 9 sections |

**Key pattern:** All child tables have `household_id` FK → `households.id`

---

## Core Functional Areas

These are the 9 pillars of household management that Command addresses:

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

### Dashboard (Default View)
- [x] Household health score (0-100)
- [x] Section scores with visual indicators
- [x] Priority actions list with severity badges (Critical, High, Medium)
- [x] Timeline with Upcoming events and Recent Activity
- [x] Welcome header with user name

### Insurance Section
- [x] Policy cards (Home, Auto, Umbrella, Life)
- [x] Carrier, coverage amounts, premiums
- [x] Status badges (Renewal Soon, Action Needed)
- [x] Renewal dates

### Legal Section
- [x] Estate document list (Will, Trust, Healthcare Directive, POA, Beneficiaries)
- [x] Status tracking (Needs Review, Outdated, Not Established)
- [x] Recommendations count per document
- [x] AI-driven insights

### Database Layer (NEW — March 2, 2026)
- [x] Supabase project schema (10 tables, full RLS)
- [x] `src/lib/supabase.ts` — typed client + data access functions
- [x] `src/hooks/useHousehold.ts` — React hook for all household data
- [x] `src/components/AuthScreen.tsx` — login/signup UI
- [x] `SUPABASE_INTEGRATION.md` — wiring guide for App.tsx
- [x] Seed data for Adam Bailey demo (in schema SQL, commented)

### Navigation
- [x] Top nav with all section icons
- [x] Upload button
- [x] User profile icon
- [x] Mobile menu support

---

## In Progress / Planned

### Immediate Next Step: Wire App.tsx to Supabase
- [ ] `npm install @supabase/supabase-js`
- [ ] Add `.env.local` with Supabase URL + anon key
- [ ] Run schema in Supabase SQL Editor
- [ ] Import `useHousehold` hook in `App.tsx`
- [ ] Guard app with `AuthScreen` when no user session
- [ ] Replace hardcoded arrays with `data.*` from hook
- [ ] Run seed data for Adam Bailey demo

### Weekly Command Brief
- [ ] Add `WeeklyBrief.tsx` to `src/components/`
- [ ] Integrate into App.tsx as first view after login

### Future Priorities
- [ ] Break up monolithic App.tsx into components
- [ ] Build out remaining sections (Finances, Tax, Family, Credit, Home, Healthcare)
- [ ] Document upload functionality (Supabase Storage)
- [ ] File upload wired to `documents` table
- [ ] Realtime subscriptions for live data updates
- [ ] Mobile app version

---

## Coding Patterns & Conventions

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
- Use Tailwind utility classes
- Custom colors via hex values in brackets: `bg-[#1C1D20]`
- Card pattern: `bg-[#1C1D20] rounded-xl border border-[#2a2b2e]`
- Gold accents: `text-[#C9A24D]` or `bg-[#C9A24D]`
- Muted text: `text-[#808084]` or `text-[#a0a0a4]`

### Status Badge Colors
- Critical/Error: `bg-[#ef4444]/10 text-[#ef4444]`
- Warning/Medium: `bg-[#f59e0b]/10 text-[#f59e0b]`
- Success/Good: `bg-[#22c55e]/10 text-[#22c55e]`
- Gold/Action: `bg-[#C9A24D]/10 text-[#C9A24D]`

### State Management
- React `useState` for UI state
- `useHousehold()` hook for all server data
- `activeView` controls which section is displayed
- Views: `'dashboard'`, `'insurance'`, `'legal'`, `'home'`, `'finances'`, `'tax'`, `'family'`, `'credit'`

### Supabase Data Pattern
```tsx
// At top of App.tsx
const { data, loading, userId } = useHousehold();

// Guard
if (!userId) return <AuthScreen />;

// Use data
const actions = data?.priorityActions ?? [];
```

---

## Sample Data Reference

The app uses "Adam Bailey" as the demo user:
- **Name:** Adam Bailey
- **Age:** 44
- **Role:** VP / Senior Director
- **Family:** Married, 2 kids (ages 9 & 12)
- **Home Value:** $750K
- **HHI:** $325K
- **Net Worth:** $2.8M
- **Insurance:** State Farm (home, auto, umbrella), Northwestern Mutual (life)
- **Issues:** Outdated will (pre-kids), umbrella gap, auto overpayment, aging HVAC

---

## Environment Variables

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Set in `.env.local` locally and in Vercel dashboard for production.

---

## Change Log

| Date | Change |
|------|--------|
| Mar 2, 2026 | Added Supabase database layer — schema, client, hook, AuthScreen |
| Feb 5, 2026 | Created CONTEXT.md |
| Feb 5, 2026 | Created WeeklyBrief component (not yet integrated) |
| Feb 4, 2026 | Latest deployment to Vercel |
