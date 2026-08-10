-- Home systems, warranties, and the mortgage.
--
-- The Home section answers three questions: what is going to need replacing and
-- roughly when, where the warranty paperwork is, and what the house is actually
-- worth against what is owed on it.
--
-- Design notes
--
-- 1. A "system" is anything with a service life — furnace, roof, water heater,
--    dishwasher, driveway. One table rather than one per kind: they differ in
--    expected life and cost, not in shape.
--
-- 2. Expected life and replacement cost are *estimates*, and the schema says so.
--    expected_life_years and replacement_cost_estimate hold Command's typical
--    figures; the user_ columns hold what the household knows. The user's value
--    always wins and the UI shows which is being used — a national average is
--    not a quote for a specific house.
--
-- 3. Documents attach many-to-one. A furnace can have a warranty, a manual, an
--    installation invoice and a service contract, and "where is the warranty"
--    is the question this section exists to answer.
--
-- 4. The mortgage follows the raw/canonical split used everywhere else:
--    mortgage_statements is what a document said, mortgage_accounts is what the
--    household has confirmed.
--
-- Additive and idempotent.

-- ============================================================
-- Systems and appliances
-- ============================================================
CREATE TABLE IF NOT EXISTS home_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT,

  make TEXT,
  model TEXT,
  serial_number TEXT,

  installed_on DATE,
  -- When the exact date is unknown but the age is roughly known, which is the
  -- common case for anything inherited with the house.
  approximate_age_years NUMERIC,
  purchase_price NUMERIC,
  purchased_from TEXT,

  -- Command's typical figure for the category, and the household's own. The
  -- user's value wins wherever both exist.
  expected_life_years NUMERIC,
  user_expected_life_years NUMERIC,
  replacement_cost_estimate NUMERIC,
  user_replacement_cost NUMERIC,

  warranty_provider TEXT,
  warranty_type TEXT CHECK (warranty_type IS NULL OR warranty_type IN (
    'manufacturer','extended','home_warranty','installer','none_known'
  )),
  warranty_expires_on DATE,
  warranty_notes TEXT,

  condition_note TEXT,
  last_serviced_on DATE,
  notes TEXT,

  entry_source TEXT NOT NULL DEFAULT 'manual'
    CHECK (entry_source IN ('manual','extracted','onboarding')),
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- A system's paperwork. Many documents per system, each with a role, because
-- "where is the warranty" is the question this section exists to answer.
CREATE TABLE IF NOT EXISTS home_system_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  system_id UUID REFERENCES home_systems(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  doc_role TEXT NOT NULL DEFAULT 'other' CHECK (doc_role IN (
    'warranty','manual','receipt','invoice','service_contract','inspection','other'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (system_id, document_id, doc_role)
);

-- ============================================================
-- Mortgage — raw readings
-- ============================================================
CREATE TABLE IF NOT EXISTS mortgage_statements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  mortgage_account_id UUID,

  servicer TEXT,
  loan_number_last4 TEXT CHECK (loan_number_last4 IS NULL OR loan_number_last4 ~ '^[0-9]{4}$'),
  property_address TEXT,
  borrower TEXT,

  statement_date DATE,
  payment_due_date DATE,
  principal_balance NUMERIC,
  original_amount NUMERIC,
  interest_rate NUMERIC,
  rate_type TEXT,
  maturity_date DATE,

  monthly_payment NUMERIC,
  principal_portion NUMERIC,
  interest_portion NUMERIC,
  escrow_portion NUMERIC,
  escrow_balance NUMERIC,
  pmi_amount NUMERIC,
  past_due_amount NUMERIC,

  interest_paid_ytd NUMERIC,
  principal_paid_ytd NUMERIC,
  taxes_paid_ytd NUMERIC,
  insurance_paid_ytd NUMERIC,

  processing_state TEXT NOT NULL DEFAULT 'uploaded' CHECK (processing_state IN (
    'uploaded','queued','processing','needs_review','confirmed','partially_confirmed',
    'failed','unsupported','superseded','deleted'
  )),
  review_status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (review_status IN ('pending_review','confirmed','partially_confirmed','discarded')),
  failure_reason TEXT,
  content_hash TEXT,
  extractor_version TEXT,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS mortgage_statements_hash_idx
  ON mortgage_statements (household_id, content_hash) WHERE content_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS mortgage_statement_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_id UUID REFERENCES mortgage_statements(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  field_code TEXT NOT NULL,
  value_text TEXT,
  value_number NUMERIC,
  value_date DATE,
  raw_value TEXT,
  source_page INT,
  evidence TEXT,
  confidence NUMERIC,
  value_type TEXT NOT NULL DEFAULT 'explicit'
    CHECK (value_type IN ('explicit','calculated','inferred','unknown')),
  is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  review_state TEXT NOT NULL DEFAULT 'unreviewed'
    CHECK (review_state IN ('unreviewed','confirmed','edited','rejected','unresolved')),
  user_value TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (statement_id, field_code)
);

-- ============================================================
-- Mortgage — the canonical account
-- ============================================================
CREATE TABLE IF NOT EXISTS mortgage_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  servicer TEXT,
  loan_number_last4 TEXT CHECK (loan_number_last4 IS NULL OR loan_number_last4 ~ '^[0-9]{4}$'),
  property_address TEXT,
  original_amount NUMERIC,
  principal_balance NUMERIC,
  interest_rate NUMERIC,
  rate_type TEXT,
  term_months INT,
  origination_date DATE,
  maturity_date DATE,
  monthly_payment NUMERIC,
  escrow_payment NUMERIC,
  escrow_balance NUMERIC,
  pmi_amount NUMERIC,
  payment_due_date DATE,
  balance_as_of DATE,
  entry_source TEXT NOT NULL DEFAULT 'manual'
    CHECK (entry_source IN ('manual','extracted','onboarding')),
  latest_statement_id UUID REFERENCES mortgage_statements(id) ON DELETE SET NULL,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  last_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mortgage_statements
  ADD CONSTRAINT mortgage_statements_account_fk
  FOREIGN KEY (mortgage_account_id) REFERENCES mortgage_accounts(id) ON DELETE SET NULL NOT VALID;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS hs_household_idx   ON home_systems (household_id, category);
CREATE INDEX IF NOT EXISTS hsd_system_idx     ON home_system_documents (system_id);
CREATE INDEX IF NOT EXISTS hsd_household_idx  ON home_system_documents (household_id);
CREATE INDEX IF NOT EXISTS ms_household_idx   ON mortgage_statements (household_id, statement_date DESC);
CREATE INDEX IF NOT EXISTS ms_document_idx    ON mortgage_statements (document_id);
CREATE INDEX IF NOT EXISTS msf_statement_idx  ON mortgage_statement_fields (statement_id);
CREATE INDEX IF NOT EXISTS ma_household_idx   ON mortgage_accounts (household_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE home_systems              ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_system_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortgage_statements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortgage_statement_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortgage_accounts         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members only" ON home_systems;
CREATE POLICY "Household members only" ON home_systems
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON home_system_documents;
CREATE POLICY "Household members only" ON home_system_documents
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON mortgage_statements;
CREATE POLICY "Household members only" ON mortgage_statements
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON mortgage_statement_fields;
CREATE POLICY "Household members only" ON mortgage_statement_fields
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON mortgage_accounts;
CREATE POLICY "Household members only" ON mortgage_accounts
  FOR ALL USING (household_owner(household_id));

-- ============================================================
-- Audit
-- ============================================================
DROP TRIGGER IF EXISTS history_home_systems ON home_systems;
CREATE TRIGGER history_home_systems
  AFTER INSERT OR UPDATE OR DELETE ON home_systems
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();

DROP TRIGGER IF EXISTS history_mortgage_accounts ON mortgage_accounts;
CREATE TRIGGER history_mortgage_accounts
  AFTER INSERT OR UPDATE OR DELETE ON mortgage_accounts
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();
