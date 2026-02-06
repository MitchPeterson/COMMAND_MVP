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

```
COMMAND_MVP/
├── public/
│   └── command-icon.svg          # Favicon
├── src/
│   ├── components/               # Reusable components (future)
│   ├── App.tsx                   # Main application (~4240 lines)
│   ├── index.css                 # Global styles + Tailwind
│   ├── main.tsx                  # React entry point
│   └── vite-env.d.ts
├── Command_Logo.png
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
├── CONTEXT.md
├── DEPENDENCIES.md
└── README.md
```

**Note:** The app is currently monolithic (`App.tsx` contains everything). Future refactoring should break this into modular components.

---

## Core Functional Areas

These are the 9 pillars of household management that Command addresses:

1. **Advisory Coordination** — Connects financial, legal, tax, insurance advisors
2. **Insurance & Risk** — Home, auto, umbrella, health, life coverage tracking
3. **Legal & Estate** — Wills, trusts, POAs, beneficiaries
4. **Family & Life Administration** — Life events trigger updates
5. **Home & Asset Maintenance** — Proactive maintenance scheduling
6. **Tax Planning** — Documents, deadlines, planning opportunities
7. **Healthcare & Coverage** — Insurance, providers, benefits coordination
8. **Finances & Budget Planning** — Cash flow, commitments, decisions
9. **Credit & Rewards Optimization** — Card selection, rewards strategy

---

## What's Been Built

### NEW: Onboarding Flow (Feb 6, 2026)
- [x] 4-step progressive onboarding wizard
- [x] Step 1: Household type (single/partnered/family) + Housing (own/rent)
- [x] Step 2: State of residence with searchable dropdown
- [x] Step 3: Income range + Age band selection
- [x] Step 4: Optional connection (insurance/credit card/financial institution OR skip)
- [x] Explicit messaging: "You do not need to complete everything now"
- [x] Progress bar with gold accent
- [x] Routes to Weekly Brief after completion (not dashboard)
- [x] Profile stored in localStorage
- [x] Dynamic brief generation based on profile

### Weekly Command Brief (Feb 5, 2026)
- [x] Default landing screen after onboarding
- [x] Three sections: Risk, Leakage, Recommended Action
- [x] Expandable "Why this matters" sections
- [x] Session-based dismissal (returns after 7 days or browser close)
- [x] Header button to access anytime
- [x] Mobile responsive
- [x] Dynamic content based on user profile from onboarding
- [x] Assumption badges for new users without full data

### Dashboard (Default View after Brief dismissal)
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
- [x] AI-driven insights (e.g., "Revocable Trust Needed" based on net worth)

### Home & Assets Section
- [x] Asset tracking (HVAC, Roof, Appliances, etc.)
- [x] Condition indicators with life percentage bars
- [x] Maintenance history
- [x] Replacement cost estimates
- [x] Planned replacement timeline

### Tax Section
- [x] Tax document tracking
- [x] Charitable contributions
- [x] Business expenses (1099)
- [x] Tax law updates
- [x] CPA contact info
- [x] Optimization recommendations

### Family Section
- [x] Family member profiles
- [x] College planning progress
- [x] Aging parents tracking
- [x] Upcoming life events timeline

### Credit & Rewards Section
- [x] Credit card portfolio
- [x] Spending optimization analysis
- [x] Rewards value tracking
- [x] Category recommendations

### Finances Section
- [x] Budget vs. Actual chart
- [x] Savings rate tracking
- [x] Emergency fund progress
- [x] Upcoming obligations

### Navigation
- [x] Top nav with all section icons
- [x] Upload button
- [x] Weekly Brief button (desktop + mobile)
- [x] User profile icon
- [x] Mobile menu support

---

## Data Model (TypeScript Interfaces)

### User Profile (NEW)
```typescript
interface OnboardingData {
  householdType: 'single' | 'partnered' | 'partnered-kids' | null;
  housingStatus: 'own' | 'rent' | null;
  state: string | null;
  incomeRange: string | null;
  ageRange: string | null;
  optionalConnection: {
    type: 'insurance' | 'credit-card' | 'financial' | 'skip' | null;
    provider?: string;
    details?: string;
  };
}
```

### Other Key Interfaces
- `HouseholdSection` — id, icon, title, score, status, summary, keyMetrics, items
- `SectionItem` — label, value, status
- `TimelineEvent` — id, date, title, category, type
- `Document` — id, name, type, category, status, versions, recommendations
- `LegalDocument` — specialized for estate docs
- `MaintenanceRecord` — for home/asset tracking
- `BriefSection` — for Weekly Brief content

---

## State Management

### Key State Variables
```typescript
// Onboarding
showOnboarding: boolean  // localStorage check
userProfile: OnboardingData | null  // localStorage persisted

// Weekly Brief
showWeeklyBrief: boolean  // sessionStorage for dismissal

// Navigation
activeView: string  // 'dashboard', 'insurance', 'legal', etc.

// UI State
mobileMenuOpen: boolean
showDocumentUpload: boolean
selectedPolicy/selectedLegalDoc/selectedAsset: for detail views
```

### Storage Strategy
- **localStorage:** Onboarding completion, user profile (persists across sessions)
- **sessionStorage:** Brief dismissal (resets on browser close)

---

## User Flow

```
New User:
1. Onboarding (4 steps) → 2. Weekly Brief → 3. Dashboard/Sections

Returning User (same session):
1. Dashboard (Brief dismissed) OR Weekly Brief (if not dismissed)

Returning User (new session, within 7 days):
1. Dashboard (Brief auto-dismissed for 7 days)

Returning User (after 7 days):
1. Weekly Brief → 2. Dashboard
```

---

## Coding Patterns & Conventions

### Component Structure
```tsx
// Standard component pattern
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
- Card pattern: `bg-white rounded-xl border border-gray-200`
- Gold accents: `text-[#C9A24D]` or `bg-[#C9A24D]`
- Muted text: `text-gray-500` or `text-gray-600`

### Status Badge Colors
- Critical/Error: `bg-red-100 text-red-800`
- Warning/Medium: `bg-yellow-100 text-yellow-800`
- Success/Good: `bg-green-100 text-green-800`
- Gold/Action: `bg-[#C9A24D]/10 text-[#C9A24D]`

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

## Testing Onboarding

To reset onboarding and test as a new user:
```javascript
// In browser console:
localStorage.removeItem('commandOnboardingComplete');
localStorage.removeItem('commandUserProfile');
sessionStorage.removeItem('commandBriefDismissed');
location.reload();
```

---

## Change Log

| Date | Change |
|------|--------|
| Feb 6, 2026 | Added Onboarding flow (4 steps) |
| Feb 6, 2026 | Added dynamic brief generation based on user profile |
| Feb 6, 2026 | Updated WeeklyBrief to receive userProfile prop |
| Feb 5, 2026 | Created CONTEXT.md |
| Feb 5, 2026 | Created WeeklyBrief component |
| Feb 4, 2026 | Latest deployment to Vercel |

---

## Git Commit Messages

For Feb 6 changes:
```
feat: Add onboarding flow for new users

- 4-step progressive wizard (household, location, finances, optional connection)
- Stores profile in localStorage
- Routes to Weekly Brief after completion
- Dynamic brief content based on user profile
- "You don't need to complete everything now" messaging
```
