# COMMAND â€” Project Context

> **Last Updated:** February 5, 2026  
> **Purpose:** This document maintains continuity across Claude conversations. Update it as the project evolves.

---

## What is Command?

Command is an AI-powered operating system for households. It brings order, foresight, and automation to everything a family is accountable for â€” insurance, legal documents, finances, healthcare, taxes, and home assets.

**Positioning:** "Household COO" â€” not a passive vault or budgeting tool, but an active system that monitors, prioritizes, and optimizes.

**Target User:** Dual-income homeowners, $100kâ€“$500k HHI, meaningful financial + asset complexity. The "Adam Bailey" persona (age 44, VP-level, married, 2 kids, $750K home, $2.8M net worth) is the reference user.

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
- **Command Black:** `#0F0F10` â€” primary text, UI anchors
- **Command Gold:** `#C9A24D` â€” icon, accents, CTAs (use sparingly: 80% neutral / 20% gold)
- **Charcoal:** `#1C1D20` â€” card backgrounds, secondary surfaces
- **Off-White:** `#F6F6F4` â€” light mode text (if needed)

### Typography
- **Primary:** Inter or SF Pro Display
- **Headlines:** SemiBold â†’ Bold, slightly tight tracking (-1% to -2%)
- **Body:** Inter Regular/Medium
- **"COMMAND" wordmark:** Always all caps

### Voice & Tone
- Direct, calm, confident, executive
- Short sentences, no hype, no emojis in marketing
- âŒ "Revolutionizing the way families manage life"
- âœ… "Run your household with clarity and confidence."

### Design Philosophy
> If something feels clever, trendy, or decorative â€” remove it.  
> Command should feel like: "This was built by someone who runs things."

---

## File Structure

```
COMMAND_MVP/
â”œâ”€â”€ public/
â”‚   â””â”€â”€ command-icon.svg          # Favicon
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ components/               # Reusable components
â”‚   â”‚   â””â”€â”€ (WeeklyBrief.tsx)     # To be added
â”‚   â”œâ”€â”€ App.tsx                   # Main application (~3100 lines, monolithic)
â”‚   â”œâ”€â”€ index.css                 # Global styles + Tailwind
â”‚   â”œâ”€â”€ main.tsx                  # React entry point
â”‚   â””â”€â”€ vite-env.d.ts
â”œâ”€â”€ Command_Logo.png
â”œâ”€â”€ index.html
â”œâ”€â”€ package.json
â”œâ”€â”€ tailwind.config.js
â”œâ”€â”€ tsconfig.json
â”œâ”€â”€ vite.config.ts
â””â”€â”€ README.md
```

**Note:** The app is currently monolithic (`App.tsx` contains everything). Future refactoring should break this into modular components.

---

## Core Functional Areas

These are the 9 pillars of household management that Command addresses:

1. **Advisory Coordination** â€” Connects financial, legal, tax, insurance advisors
2. **Insurance & Risk** â€” Home, auto, umbrella, health, life coverage tracking
3. **Legal & Estate** â€” Wills, trusts, POAs, beneficiaries
4. **Family & Life Administration** â€” Life events trigger updates
5. **Home & Asset Maintenance** â€” Proactive maintenance scheduling
6. **Tax Planning** â€” Documents, deadlines, planning opportunities
7. **Healthcare & Coverage** â€” Insurance, providers, benefits coordination
8. **Finances & Budget Planning** â€” Cash flow, commitments, decisions
9. **Credit & Rewards Optimization** â€” Card selection, rewards strategy

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
- [x] AI-driven insights (e.g., "Revocable Trust Needed" based on net worth)

### Navigation
- [x] Top nav with all section icons
- [x] Upload button
- [x] User profile icon
- [x] Mobile menu support

### Data Model (TypeScript Interfaces)
- `HouseholdSection` â€” id, icon, title, score, status, summary, keyMetrics, items
- `SectionItem` â€” label, value, status
- `TimelineEvent` â€” id, date, title, category, type
- `Document` â€” id, name, type, category, status, versions, recommendations
- `LegalDocument` â€” specialized for estate docs
- `MaintenanceRecord` â€” for home/asset tracking

---

## In Progress / Planned

### Weekly Command Brief (NEW â€” Feb 5, 2026)
- [ ] Add `WeeklyBrief.tsx` to `src/components/`
- [ ] Integrate into App.tsx as first view after login
- [ ] Shows: Risk, Leakage, Recommended Action
- [ ] Expandable "Why this matters" sections
- [ ] Cannot be permanently dismissed (returns weekly)
- **Files created:** `WeeklyBrief.tsx`, `INTEGRATION_GUIDE.md`

### Future Priorities
- [ ] Break up monolithic App.tsx into components
- [ ] Build out remaining sections (Finances, Tax, Family, Credit, Home, Healthcare)
- [ ] Document upload functionality
- [ ] Data persistence (backend/database)
- [ ] User authentication
- [ ] Mobile app version

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

### Status Badge Colors
- Critical/Error: `bg-[#ef4444]/10 text-[#ef4444]`
- Warning/Medium: `bg-[#f59e0b]/10 text-[#f59e0b]`
- Success/Good: `bg-[#22c55e]/10 text-[#22c55e]`
- Gold/Action: `bg-[#C9A24D]/10 text-[#C9A24D]`

### State Management
- Currently using React `useState` for all state
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
- **Issues:** Outdated will (pre-kids), umbrella gap, auto overpayment, aging HVAC

---

## How to Work With Claude on This Project

1. **Share the GitHub URL** at the start of conversation if code access is needed
2. **Reference this CONTEXT.md** â€” it's in the project files
3. **Update this document** when significant changes are made
4. **Upload key code files** to project files for instant access (recommended: App.tsx, package.json)

---

## Claude Code Session Instructions

> Paste this opener at the top of your first message in every code session:

**Session Opener Template:**
```
COMMAND CODE SESSION — I'm working on [specific feature/file].
Refer to CONTEXT.md for project state. Do NOT re-read brand guidelines,
sample data, or completed sections unless I ask. Only reference what's
relevant to this task.
```

### Token Optimization Rules for Claude

**Only load what's needed:**
- Don't re-summarize the project — CONTEXT.md exists for this
- Don't repeat back styling conventions or brand guidelines unless asked
- Skip preamble — go straight to code or clarifying questions

**When editing App.tsx (monolithic file):**
- Request ONLY the relevant section/component via `str_replace`, not full file rewrites
- Ask Claude: "Edit only the [section name] portion of App.tsx"
- Claude should output only the changed block + a brief diff summary

**Response format for code tasks:**
- Code first, explanation after (keep explanation under 5 sentences)
- GitHub commit notes: 1–3 bullet points max
- No long explanations — use inline code comments instead

**End of every code session:**
- Claude updates CONTEXT.md change log with date + summary
- Claude does NOT rewrite unchanged sections of CONTEXT.md

---

## Change Log

| Date | Change |
|------|--------|
| Feb 22, 2026 | Added Claude Code Session Instructions + token optimization rules to CONTEXT.md |
| Feb 5, 2026 | Created CONTEXT.md |
| Feb 5, 2026 | Created WeeklyBrief component (not yet integrated) |
| Feb 4, 2026 | Latest deployment to Vercel |

