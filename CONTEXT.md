# COMMAND — Project Context

> **Last Updated:** February 6, 2026  
> **Purpose:** This document maintains continuity across Claude conversations. Update it as the project evolves.

---

## What is Command?

Command is an AI-powered operating system for households. It brings order, foresight, and automation to everything a family is accountable for — insurance, legal documents, finances, healthcare, taxes, and home assets.

**Positioning:** "Household COO" — not a passive vault or budgeting tool, but an active system that monitors, prioritizes, and optimizes.

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
| Deployment | Vercel |
| Data Storage | localStorage (no backend yet) |

**Live URL:** https://command-xi.vercel.app  
**Repository:** https://github.com/MitchPeterson/COMMAND_MVP (private)

---

## Brand Guidelines (Quick Reference)

### Colors
- **Command Black:** `#0F0F10` — primary text, UI anchors
- **Command Gold:** `#C9A24D` — icon, accents, CTAs (use sparingly: 80% neutral / 20% gold)
- **Charcoal:** `#1C1D20` — card backgrounds, secondary surfaces
- **Off-White:** `#F6F6F4` — light mode text (if needed)

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
> If something feels clever, trendy, or decorative — remove it.  
> Command should feel like: "This was built by someone who runs things."

---

## File Structure

COMMAND_MVP/
├── public/
│   └── command-icon.svg          # Favicon
├── src/
│   ├── components/               # Reusable components (future)
│   ├── App.tsx                   # Main application (~4785 lines, monolithic)
│   ├── index.css                 # Global styles + Tailwind
│   ├── main.tsx                  # React entry point
│   └── vite-env.d.ts
├── Command_Logo.png
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md

**Note:** The app is currently monolithic (App.tsx contains everything). Future refactoring should break this into modular components.

---

## What's Been Built

### Onboarding Flow (NEW — Feb 6, 2026)
- [x] 4-step progressive wizard
- [x] Step 1: Household type + Housing status
- [x] Step 2: State selection (searchable dropdown, 50 states + DC)
- [x] Step 3: Income range + Age range
- [x] Step 4: Optional connection (insurance/credit card/financial/skip)
- [x] Profile stored in localStorage
- [x] Routes to Weekly Brief after completion (not dashboard)

### Weekly Brief (NEW — Feb 5-6, 2026)
- [x] Default landing screen after onboarding
- [x] Dynamic content based on user profile (generateBriefForProfile)
- [x] Risk, Leakage, Action sections
- [x] Expandable "Why this matters" sections
- [x] isAssumption flag for new users
- [x] Returns weekly (session-based dismissal)

### Admin/Dev Panel (NEW — Feb 6, 2026)
- [x] Accessible via sparkle icon in header or Ctrl+Shift+D
- [x] 4 tabs: Test Personas, Current Profile, Custom User, Actions
- [x] Pre-built test personas:
  - Adam Bailey (Default) — VP, married+kids, homeowner, high income
  - Young Professional — Single renter, early career
  - DINK Couple — Dual income, no kids, homeowners
  - Near Retirement — Empty nesters, high net worth
  - New Family — First-time parents, new home
  - Brand New User — Triggers onboarding reset
- [x] View current profile data (raw JSON)
- [x] Create custom test users with any attributes
- [x] Quick actions: Reset Onboarding, Show Weekly Brief, Clear All Data
- [x] Floating button during onboarding for testing

### All Other Sections
- [x] Dashboard with health score and priority actions
- [x] Insurance with policy management
- [x] Legal with estate documents
- [x] Home & Assets with maintenance tracking
- [x] Tax with documents and recommendations
- [x] Family with college planning
- [x] Credit with card optimization
- [x] Finances with budget tracking

---

## Data Persistence (Current)

### localStorage Keys
- commandOnboardingComplete — "true" if onboarding finished
- commandUserProfile — JSON of OnboardingData

### sessionStorage Keys  
- commandBriefDismissed — timestamp of last dismissal

### Reset Commands (Browser Console)
localStorage.removeItem('commandOnboardingComplete');
localStorage.removeItem('commandUserProfile');
sessionStorage.removeItem('commandBriefDismissed');
location.reload();

---

## Key TypeScript Interfaces

### OnboardingData
interface OnboardingData {
  householdType: 'single' | 'partnered' | 'partnered-kids' | null;
  housingStatus: 'own' | 'rent' | null;
  state: string | null;
  incomeRange: string | null;
  ageRange: string | null;
  optionalConnection: {
    type: 'insurance' | 'credit-card' | 'financial' | 'skip' | null;
    provider?: string;
  };
}

### TestPersona (Admin Panel)
interface TestPersona {
  id: string;
  name: string;
  description: string;
  profile: OnboardingData;
}

---

## User Flow

New User:
  Onboarding (4 steps) → Weekly Brief → Dashboard

Returning User (same session):
  Dashboard OR Weekly Brief (if not dismissed)

Returning User (>7 days since last brief):
  Weekly Brief → Dashboard

---

## Change Log

| Date | Change |
|------|--------|
| Feb 6, 2026 | Added Admin/Dev Panel with test personas |
| Feb 6, 2026 | Added 4-step Onboarding Flow |
| Feb 6, 2026 | Dynamic Weekly Brief generation based on profile |
| Feb 5, 2026 | Created WeeklyBrief component |
| Feb 5, 2026 | Created CONTEXT.md |
| Feb 4, 2026 | Initial deployment to Vercel |
