-- ============================================================
-- COMMAND MVP — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- HOUSEHOLDS
-- One household per account (can expand to multi-member later)
-- ============================================================
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Household',
  health_score INTEGER DEFAULT 72,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HOUSEHOLD PROFILE
-- The "Adam Bailey" data model
-- ============================================================
CREATE TABLE household_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL UNIQUE,
  primary_name TEXT,
  partner_name TEXT,
  num_children INTEGER DEFAULT 0,
  home_value NUMERIC(12,2),
  household_income NUMERIC(12,2),
  net_worth NUMERIC(12,2),
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INSURANCE POLICIES
-- ============================================================
CREATE TABLE insurance_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('home', 'auto', 'umbrella', 'life', 'health', 'disability', 'other')),
  carrier TEXT,
  policy_number TEXT,
  coverage_amount NUMERIC(12,2),
  annual_premium NUMERIC(10,2),
  deductible NUMERIC(10,2),
  renewal_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'renewal_soon', 'action_needed', 'expired', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEGAL DOCUMENTS
-- ============================================================
CREATE TABLE legal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('will', 'trust', 'poa', 'healthcare_directive', 'beneficiary', 'prenup', 'other')),
  status TEXT DEFAULT 'not_established' CHECK (status IN ('current', 'needs_review', 'outdated', 'not_established')),
  last_reviewed DATE,
  attorney TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ASSETS (Home, Vehicles, Other)
-- ============================================================
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('real_estate', 'vehicle', 'investment', 'retirement', 'business', 'other')),
  current_value NUMERIC(12,2),
  purchase_price NUMERIC(12,2),
  purchase_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MAINTENANCE RECORDS (Home & Asset)
-- ============================================================
CREATE TABLE maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT, -- HVAC, Plumbing, Electrical, Landscaping, etc.
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'overdue', 'completed', 'in_progress')),
  due_date DATE,
  completed_date DATE,
  cost NUMERIC(10,2),
  vendor TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRIORITY ACTIONS
-- AI-generated or user-created action items
-- ============================================================
CREATE TABLE priority_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- insurance, legal, tax, finances, etc.
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'dismissed', 'completed')),
  due_date DATE,
  estimated_value NUMERIC(10,2), -- dollar impact if acted upon
  source TEXT DEFAULT 'manual' CHECK (source IN ('ai_generated', 'manual', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TIMELINE EVENTS
-- Upcoming & recent activity
-- ============================================================
CREATE TABLE timeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT, -- insurance, legal, tax, etc.
  event_type TEXT DEFAULT 'info' CHECK (event_type IN ('deadline', 'renewal', 'review', 'info', 'completed', 'action')),
  event_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOCUMENTS (File vault)
-- ============================================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT, -- insurance, legal, tax, etc.
  file_path TEXT, -- Supabase Storage path
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTION SCORES
-- Per-pillar health scores (1-9 pillars)
-- ============================================================
CREATE TABLE section_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('advisory', 'insurance', 'legal', 'family', 'home', 'tax', 'healthcare', 'finances', 'credit')),
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  status TEXT DEFAULT 'review' CHECK (status IN ('good', 'review', 'action_needed')),
  summary TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, section)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Users can only see their own household data
-- ============================================================
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_scores ENABLE ROW LEVEL SECURITY;

-- Households: users own their household
CREATE POLICY "Users can manage their household"
  ON households FOR ALL
  USING (auth.uid() = user_id);

-- Helper function for child table policies
CREATE OR REPLACE FUNCTION household_owner(hid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM households WHERE id = hid AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Apply policy to all child tables
CREATE POLICY "Household members only" ON household_profile FOR ALL USING (household_owner(household_id));
CREATE POLICY "Household members only" ON insurance_policies FOR ALL USING (household_owner(household_id));
CREATE POLICY "Household members only" ON legal_documents FOR ALL USING (household_owner(household_id));
CREATE POLICY "Household members only" ON assets FOR ALL USING (household_owner(household_id));
CREATE POLICY "Household members only" ON maintenance_records FOR ALL USING (household_owner(household_id));
CREATE POLICY "Household members only" ON priority_actions FOR ALL USING (household_owner(household_id));
CREATE POLICY "Household members only" ON timeline_events FOR ALL USING (household_owner(household_id));
CREATE POLICY "Household members only" ON documents FOR ALL USING (household_owner(household_id));
CREATE POLICY "Household members only" ON section_scores FOR ALL USING (household_owner(household_id));

-- ============================================================
-- SEED DATA — Adam Bailey demo household
-- Run AFTER creating a user in Supabase Auth
-- Replace 'YOUR_USER_ID' with the actual auth.users UUID
-- ============================================================

-- Uncomment and run after setup:
/*
INSERT INTO households (user_id, name, health_score) VALUES
  ('YOUR_USER_ID', 'Bailey Household', 72)
RETURNING id; -- copy this household_id for the inserts below

-- Replace 'YOUR_HOUSEHOLD_ID' with the returned UUID

INSERT INTO household_profile (household_id, primary_name, partner_name, num_children, home_value, household_income, net_worth, city, state) VALUES
  ('YOUR_HOUSEHOLD_ID', 'Adam Bailey', 'Sarah Bailey', 2, 750000, 325000, 2800000, 'Minneapolis', 'MN');

INSERT INTO section_scores (household_id, section, score, status, summary) VALUES
  ('YOUR_HOUSEHOLD_ID', 'insurance', 68, 'review', 'Umbrella gap detected. Auto premium 23% above market.'),
  ('YOUR_HOUSEHOLD_ID', 'legal', 41, 'action_needed', 'Will predates children. No revocable trust established.'),
  ('YOUR_HOUSEHOLD_ID', 'home', 75, 'review', 'HVAC approaching end of life. Deferred maintenance flagged.'),
  ('YOUR_HOUSEHOLD_ID', 'finances', 85, 'good', 'Cash flow healthy. 401k contribution optimized.'),
  ('YOUR_HOUSEHOLD_ID', 'tax', 70, 'review', 'Q1 estimated payment due. HSA opportunity identified.'),
  ('YOUR_HOUSEHOLD_ID', 'healthcare', 80, 'good', 'Coverage adequate. Annual physicals current.'),
  ('YOUR_HOUSEHOLD_ID', 'credit', 88, 'good', 'Score 812. Travel rewards underutilized.'),
  ('YOUR_HOUSEHOLD_ID', 'legal', 41, 'action_needed', 'Will predates children.');

INSERT INTO insurance_policies (household_id, type, carrier, coverage_amount, annual_premium, renewal_date, status) VALUES
  ('YOUR_HOUSEHOLD_ID', 'home', 'State Farm', 750000, 3200, '2026-06-15', 'renewal_soon'),
  ('YOUR_HOUSEHOLD_ID', 'auto', 'State Farm', 300000, 2800, '2026-04-01', 'action_needed'),
  ('YOUR_HOUSEHOLD_ID', 'umbrella', 'State Farm', 1000000, 450, '2026-06-15', 'action_needed'),
  ('YOUR_HOUSEHOLD_ID', 'life', 'Northwestern Mutual', 2000000, 4800, '2026-12-01', 'active');

INSERT INTO priority_actions (household_id, title, category, severity, estimated_value) VALUES
  ('YOUR_HOUSEHOLD_ID', 'Will needs update — predates both children', 'legal', 'critical', NULL),
  ('YOUR_HOUSEHOLD_ID', 'Umbrella policy gap vs. net worth', 'insurance', 'high', 2000),
  ('YOUR_HOUSEHOLD_ID', 'Auto premium 23% above market rate', 'insurance', 'high', 640),
  ('YOUR_HOUSEHOLD_ID', 'HVAC system approaching end of life', 'home', 'medium', 8000),
  ('YOUR_HOUSEHOLD_ID', 'Q1 estimated tax payment due April 15', 'tax', 'high', NULL);
*/
