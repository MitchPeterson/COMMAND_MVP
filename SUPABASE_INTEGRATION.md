# COMMAND — Supabase Integration Guide

## Overview
This guide wires Supabase into the existing React/TypeScript app in 4 steps.

---

## Step 1: Install Dependencies

```bash
npm install @supabase/supabase-js
```

---

## Step 2: Create Supabase Project

1. Go to https://supabase.com → New Project
2. Name: `command-mvp`
3. Region: `us-east-1` (or closest to your users)
4. Save your **Database Password**

---

## Step 3: Run the Schema

1. In Supabase dashboard → **SQL Editor**
2. Paste and run `supabase_schema.sql`
3. After creating your first user in Auth → run the seed data block (uncomment it, replace UUIDs)

---

## Step 4: Add Environment Variables

Create `.env.local` in your project root:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Get these from: Supabase Dashboard → Settings → API

Add to Vercel: Dashboard → Settings → Environment Variables (same two keys)

---

## Step 5: Add Files to Your Project

Copy these files into your repo:

```
src/
├── lib/
│   └── supabase.ts          ← client + types + data functions
├── hooks/
│   └── useHousehold.ts      ← primary data hook
└── components/
    └── AuthScreen.tsx       ← login/signup UI
```

---

## Step 6: Wire Into App.tsx

Add to the top of `App.tsx`:

```tsx
import { useHousehold } from './hooks/useHousehold';
import { AuthScreen } from './components/AuthScreen';
import { supabase } from './lib/supabase';
```

Replace the top of your main `App` component:

```tsx
const App: React.FC = () => {
  const { data, loading, error, userId, refresh } = useHousehold();

  // Show auth screen if not logged in
  if (!userId && !loading) {
    return <AuthScreen />;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F10] flex items-center justify-center">
        <div className="text-[#C9A24D] text-sm tracking-widest animate-pulse">
          LOADING COMMAND…
        </div>
      </div>
    );
  }

  // data.household, data.insurancePolicies, data.priorityActions, etc.
  // are now live from Supabase instead of hardcoded
```

---

## Step 7: Replace Hardcoded Data

Swap static arrays with live data from the hook:

**Before:**
```tsx
const priorityActions = [
  { id: 1, title: 'Will needs update', severity: 'critical' },
  // ...
];
```

**After:**
```tsx
// data comes from useHousehold()
const priorityActions = data?.priorityActions ?? [];
```

Map the Supabase field names to your existing component props as needed.

---

## Data Mapping Reference

| Supabase Table | Hook Field | Previous Variable |
|---|---|---|
| `priority_actions` | `data.priorityActions` | hardcoded array |
| `insurance_policies` | `data.insurancePolicies` | hardcoded policies |
| `legal_documents` | `data.legalDocuments` | hardcoded docs |
| `timeline_events` | `data.timelineEvents` | hardcoded events |
| `section_scores` | `data.sectionScores` | hardcoded scores |
| `households.health_score` | `data.household.health_score` | hardcoded 72 |

---

## Sign Out Button

Add anywhere in your UI:

```tsx
<button
  onClick={() => supabase.auth.signOut()}
  className="text-[#808084] hover:text-white text-sm"
>
  Sign Out
</button>
```

---

## Realtime Updates (Optional, Phase 2)

To auto-refresh when data changes:

```tsx
useEffect(() => {
  const channel = supabase
    .channel('household-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'priority_actions',
    }, () => refresh())
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [refresh]);
```

---

## Security Notes

- RLS is enabled on all tables — users only see their own data
- The anon key is safe to use in the browser (it's public by design)
- Never put the `service_role` key in frontend code
- Passwords are handled entirely by Supabase Auth (never stored by you)

---

## File Checklist

- [ ] `npm install @supabase/supabase-js`
- [ ] `.env.local` with Supabase URL + anon key
- [ ] Vercel env vars set
- [ ] Schema SQL run in Supabase dashboard
- [ ] `src/lib/supabase.ts` added
- [ ] `src/hooks/useHousehold.ts` added
- [ ] `src/components/AuthScreen.tsx` added
- [ ] `App.tsx` wired to `useHousehold()`
- [ ] Seed data inserted for Adam Bailey demo
