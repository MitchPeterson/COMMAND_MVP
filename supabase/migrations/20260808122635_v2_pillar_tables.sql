-- Finance / Tax / Family / Credit tables.
--
-- Defined in supabase_schema.sql but never applied to the live database.
-- Verified missing on 2026-08-08. OnboardingFlow inserts into all seven and
-- `throw`s on the first failure, so completing the questionnaire could not
-- persist; useHousehold.loadData also queries all seven on every page load.
--
-- Idempotent and additive: no drops, no data loss. Safe to re-run.

CREATE TABLE IF NOT EXISTS finance_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  institution TEXT,
  balance NUMERIC,
  as_of_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  monthly_income NUMERIC,
  monthly_expenses NUMERIC,
  savings_rate NUMERIC,
  emergency_fund_months NUMERIC,
  period_month DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  tax_year INT NOT NULL,
  doc_type TEXT NOT NULL,
  status TEXT NOT NULL,
  due_date DATE,
  amount NUMERIC,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  potential_savings NUMERIC,
  priority TEXT,
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  birth_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  event_date DATE,
  status TEXT,
  category TEXT,
  triggers_review TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  card_name TEXT NOT NULL,
  issuer TEXT,
  credit_limit NUMERIC,
  current_balance NUMERIC,
  utilization_pct NUMERIC,
  rewards_type TEXT,
  rewards_value_ytd NUMERIC,
  annual_fee NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE finance_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_summary       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_recommendations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_milestones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards         ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY has no IF NOT EXISTS, so drop first to keep this re-runnable.
DROP POLICY IF EXISTS "Household members only" ON finance_accounts;
CREATE POLICY "Household members only" ON finance_accounts
  FOR ALL USING (household_owner(household_id));

DROP POLICY IF EXISTS "Household members only" ON budget_summary;
CREATE POLICY "Household members only" ON budget_summary
  FOR ALL USING (household_owner(household_id));

DROP POLICY IF EXISTS "Household members only" ON tax_documents;
CREATE POLICY "Household members only" ON tax_documents
  FOR ALL USING (household_owner(household_id));

DROP POLICY IF EXISTS "Household members only" ON tax_recommendations;
CREATE POLICY "Household members only" ON tax_recommendations
  FOR ALL USING (household_owner(household_id));

DROP POLICY IF EXISTS "Household members only" ON family_members;
CREATE POLICY "Household members only" ON family_members
  FOR ALL USING (household_owner(household_id));

DROP POLICY IF EXISTS "Household members only" ON family_milestones;
CREATE POLICY "Household members only" ON family_milestones
  FOR ALL USING (household_owner(household_id));

DROP POLICY IF EXISTS "Household members only" ON credit_cards;
CREATE POLICY "Household members only" ON credit_cards
  FOR ALL USING (household_owner(household_id));

CREATE INDEX IF NOT EXISTS finance_accounts_household_idx    ON finance_accounts (household_id);
CREATE INDEX IF NOT EXISTS budget_summary_household_idx      ON budget_summary (household_id);
CREATE INDEX IF NOT EXISTS tax_documents_household_idx       ON tax_documents (household_id);
CREATE INDEX IF NOT EXISTS tax_recommendations_household_idx ON tax_recommendations (household_id);
CREATE INDEX IF NOT EXISTS family_members_household_idx      ON family_members (household_id);
CREATE INDEX IF NOT EXISTS family_milestones_household_idx   ON family_milestones (household_id);
CREATE INDEX IF NOT EXISTS credit_cards_household_idx        ON credit_cards (household_id);
