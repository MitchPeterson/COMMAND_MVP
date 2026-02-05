# COMMAND — Project Context

> **Last Updated:** February 5, 2026  
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
│   ├── components/               # Reusable components
│   │   └── (WeeklyBrief.tsx)     # Can be extracted if needed
│   ├── App.tsx                   # Main application (~3450 lines, includes WeeklyBrief)
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
```

**Note:** The app is currently monolithic (`App.tsx` contains everything including WeeklyBrief). Future refactoring should break this into modular components.

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

### Weekly Command Brief (NEW — Feb 5, 2026) ✅
- [x] Default landing screen after login
- [x] Three sections: Risk, Leakage, Recommended Action
- [x] Short plain-language explanations (1-2 sentences)
- [x] Expandable "Why this matters" sections
- [x] Calm, direct, non-alarmist tone
- [x] Dismiss/review later option (session-based)
- [x] Cannot be permanently hidden (accessible via header)
- [x] Re-openable via header button (desktop & mobile)
- [x] Shows week date range
- [x] Gold accent CTA buttons
- [x] Mobile responsive design

### Dashboard (Default View after Brief dismissed)
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
- [x] Policy detail view with recommendations

### Legal Section
- [x] Estate document list (Will, Trust, Healthcare Directive, POA, Beneficiaries)
- [x] Status tracking (Needs Review, Outdated, Not Established)
- [x] Recommendations count per document
- [x] AI-driven insights (e.g., "Revocable Trust Needed" based on net worth)
- [x] Attorney contact information

### Home & Assets Section
- [x] Asset tracking by category (HVAC, Roof, Appliances, etc.)
- [x] Life progress bars (age vs expected lifespan)
- [x] Condition indicators
- [x] Replacement cost estimates
- [x] Maintenance history
- [x] Planned replacement timeline

### Tax Section
- [x] Tax document tracking (W-2s, 1099s, etc.)
- [x] Charitable contributions
- [x] Business expenses (1099)
- [x] Tax recommendations with potential savings
- [x] Tax law updates
- [x] CPA contact information

### Family Section
- [x] Family member profiles with milestones
- [x] College planning progress bars
- [x] Aging parents tracking
- [x] Upcoming life events with impact analysis

### Credit Section
- [x] Credit card portfolio overview
- [x] Spending optimization by category
- [x] Rewards balance tracking
- [x] Optimization recommendations

### Finances Section
- [x] Monthly budget vs actual chart
- [x] Savings rate display
- [x] Emergency fund status
- [x] Upcoming obligations list

### Navigation
- [x] Top nav with all section icons
- [x] Weekly Brief button in header
- [x] Upload button
- [x] User profile icon
- [x] Mobile menu support with Weekly Brief option

### Data Model (TypeScript Interfaces)
- `BriefSection` — id, type, title, summary, whyItMatters, category, potentialImpact
- `HouseholdSection` — id, icon, title, score, status, summary, keyMetrics, items
- `SectionItem` — label, value, status
- `TimelineEvent` — id, date, title, category, type
- `Document` — id, name, type, category, status, versions, recommendations
- `LegalDocument` — specialized for estate docs
- `MaintenanceRecord` — for home/asset tracking
- `InsurancePolicy` — for insurance tracking
- `CreditCard` — for credit management
- `BudgetCategory` — for finances

---

## Weekly Brief Implementation Details

### State Management
```typescript
// Weekly Brief state - shows by default, can be dismissed for the session
const [showWeeklyBrief, setShowWeeklyBrief] = useState<boolean>(() => {
  const dismissed = sessionStorage.getItem('commandBriefDismissed');
  const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return !dismissed || (now - dismissedTime > sevenDays);
});
```

### Behavior
- Shows on first load (default state: true)
- Dismisses for the browser session when "Review later" or "Go to Dashboard" clicked
- Always accessible via header button
- Re-appears after 7 days of dismissal
- Navigation from brief auto-dismisses and navigates to section

### Brief Data Structure
```typescript
const defaultBriefData = {
  risk: {
    id: 'risk-1',
    type: 'risk',
    title: 'Umbrella coverage gap',
    summary: '...',
    whyItMatters: '...',
    category: 'Insurance',
    potentialImpact: 'Up to $1.8M exposure'
  },
  leakage: { /* similar structure */ },
  action: { 
    /* similar structure */
    actionLabel: 'Start Insurance Review'  // CTA button text
  }
};
```

---

## In Progress / Planned

### Future Priorities
- [ ] Break up monolithic App.tsx into components
- [ ] Extract WeeklyBrief to separate file
- [ ] Add dynamic brief data based on actual household analysis
- [ ] Document upload functionality
- [ ] Data persistence (backend/database)
- [ ] User authentication
- [ ] Mobile app version
- [ ] Multiple household member support

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
- Card pattern: `bg-[#1C1D20] rounded-xl border border-[#2a2b2e]`
- Gold accents: `text-[#C9A24D]` or `bg-[#C9A24D]`
- Muted text: `text-[#808084]` or `text-[#a0a0a4]`

### Brief Section Colors
- **Risk:** Red tones (`bg-red-50`, `border-red-200`, `text-red-600`)
- **Leakage:** Amber tones (`bg-amber-50`, `border-amber-200`, `text-amber-600`)
- **Action:** Blue tones (`bg-blue-50`, `border-blue-200`, `text-blue-600`)

### Status Badge Colors
- Critical/Error: `bg-[#ef4444]/10 text-[#ef4444]`
- Warning/Medium: `bg-[#f59e0b]/10 text-[#f59e0b]`
- Success/Good: `bg-[#22c55e]/10 text-[#22c55e]`
- Gold/Action: `bg-[#C9A24D]/10 text-[#C9A24D]`

### State Management
- Using React `useState` for all state
- `showWeeklyBrief` controls if brief is shown
- `activeView` controls which section is displayed
- Views: `'dashboard'`, `'insurance'`, `'legal'`, `'home'`, `'finances'`, `'tax'`, `'family'`, `'credit'`

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
- **Issues:** Outdated will (pre-kids), umbrella gap ($1M vs $2.8M net worth), auto overpayment (~18% above market), aging HVAC (14 years old)

---

## How to Work With Claude on This Project

1. **Share the GitHub URL** at the start of conversation if code access is needed
2. **Reference this CONTEXT.md** — it's in the project files
3. **Update this document** when significant changes are made
4. **Upload key code files** to project files for instant access (recommended: App.tsx, package.json)

---

## Change Log

| Date | Change |
|------|--------|
| Feb 5, 2026 | Added Weekly Command Brief as default first screen |
| Feb 5, 2026 | Added header buttons to access Weekly Brief |
| Feb 5, 2026 | Updated CONTEXT.md with Brief implementation details |
| Feb 5, 2026 | Created CONTEXT.md |
| Feb 4, 2026 | Latest deployment to Vercel |
