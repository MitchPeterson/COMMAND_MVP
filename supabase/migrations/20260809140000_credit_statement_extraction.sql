-- Credit card statement extraction.
--
-- Follows the shape insurance and legal already use: a raw reading per uploaded
-- file, provenance on every material value, and a canonical account that only
-- changes when a person confirms it.
--
-- Four decisions worth reading before changing anything here.
--
-- 1. A statement is a historical record, not a current position. statement_balance
--    is what the statement said on its closing date; it is NOT the card's live
--    balance and the two are deliberately different columns. A statement only
--    populates current_balance when it explicitly labels one.
--
-- 2. Only the last four digits of a card number are ever stored. The extraction
--    prompt asks for four digits, and persistence scrubs anything longer — a
--    full PAN must not survive a model that ignores an instruction.
--
-- 3. APR is one-to-many. A statement routinely carries purchase, cash advance,
--    balance transfer, penalty and promotional rates against different balances,
--    and collapsing them to a single number loses the one that is costing money.
--
-- 4. Re-reading the same statement must not duplicate it. Idempotency is enforced
--    in the database — a unique key per account and closing date, and a unique
--    fingerprint per transaction — not left to the application getting it right.
--
-- Additive and idempotent.

-- ============================================================
-- Statement header — one row per reading of one uploaded file
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_statements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  -- Set on confirmation, once the user agrees which account this belongs to.
  credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,

  -- Identity
  institution TEXT,
  card_product TEXT,
  account_nickname TEXT,
  last_four TEXT CHECK (last_four IS NULL OR last_four ~ '^[0-9]{4}$'),
  primary_cardholder TEXT,

  statement_opening_date DATE,
  statement_closing_date DATE,
  payment_due_date DATE,

  -- Balances and payments, as the statement reported them
  previous_balance NUMERIC,
  payments_and_credits NUMERIC,
  purchases NUMERIC,
  cash_advances NUMERIC,
  balance_transfers NUMERIC,
  fees_charged NUMERIC,
  interest_charged NUMERIC,
  statement_balance NUMERIC,
  minimum_payment_due NUMERIC,
  past_due_amount NUMERIC,
  credit_limit NUMERIC,
  available_credit NUMERIC,
  -- Only when the document explicitly labels a live balance. Usually null.
  current_balance NUMERIC,

  annual_fee NUMERIC,

  -- Rewards
  rewards_program TEXT,
  rewards_beginning_balance NUMERIC,
  rewards_earned NUMERIC,
  rewards_redeemed NUMERIC,
  rewards_ending_balance NUMERIC,
  rewards_expiration_note TEXT,

  -- Lifecycle, matching the legal pipeline's vocabulary
  processing_state TEXT NOT NULL DEFAULT 'uploaded' CHECK (processing_state IN (
    'uploaded','queued','processing','needs_review','confirmed','partially_confirmed',
    'failed','unsupported','superseded','deleted'
  )),
  review_status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (review_status IN ('pending_review','confirmed','partially_confirmed','discarded')),
  failure_reason TEXT,

  -- Account matching is a suggestion until confirmed. An uncertain match must
  -- never silently merge two accounts.
  match_state TEXT NOT NULL DEFAULT 'unmatched'
    CHECK (match_state IN ('unmatched','suggested','confirmed','rejected','conflict')),
  match_confidence NUMERIC,
  match_note TEXT,

  unresolved_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  extraction_version INT NOT NULL DEFAULT 1,
  content_hash TEXT,
  extractor_version TEXT,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- One statement per account per closing date. This is what makes reprocessing
-- safe: a second reading of the same PDF updates the row instead of adding one.
CREATE UNIQUE INDEX IF NOT EXISTS credit_statements_period_idx
  ON credit_statements (household_id, credit_card_id, statement_closing_date)
  WHERE credit_card_id IS NOT NULL AND statement_closing_date IS NOT NULL;

-- Before an account is assigned, the file's own bytes are the identity.
CREATE UNIQUE INDEX IF NOT EXISTS credit_statements_hash_idx
  ON credit_statements (household_id, content_hash)
  WHERE content_hash IS NOT NULL;

-- ============================================================
-- Field-level provenance and review
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_statement_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_id UUID REFERENCES credit_statements(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,

  field_code TEXT NOT NULL,
  field_group TEXT,                      -- identity | balances | terms | rewards
  value_text TEXT,
  value_number NUMERIC,
  value_date DATE,

  raw_value TEXT,
  source_page INT,
  source_section TEXT,
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
-- APR and promotional terms — one row per rate category
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_apr_terms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_id UUID REFERENCES credit_statements(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  apr_type TEXT NOT NULL CHECK (apr_type IN (
    'purchase','cash_advance','balance_transfer','penalty','promotional','other'
  )),
  apr_percent NUMERIC,
  is_variable BOOLEAN,
  balance_subject_to_rate NUMERIC,
  interest_charged NUMERIC,
  promotional_balance NUMERIC,
  promotional_expiration_date DATE,
  description TEXT,
  source_page INT,
  evidence TEXT,
  confidence NUMERIC,
  value_type TEXT NOT NULL DEFAULT 'explicit'
    CHECK (value_type IN ('explicit','calculated','inferred','unknown')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (statement_id, apr_type, description)
);

-- ============================================================
-- Transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_id UUID REFERENCES credit_statements(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,

  transaction_date DATE,
  posting_date DATE,
  merchant_description TEXT NOT NULL,
  amount NUMERIC,
  direction TEXT NOT NULL DEFAULT 'charge' CHECK (direction IN ('charge','credit')),

  category TEXT,
  -- Where the category came from. An AI guess is not a fact the issuer stated,
  -- and spending analysis has to be able to tell the difference.
  category_source TEXT NOT NULL DEFAULT 'ai_classified'
    CHECK (category_source IN ('issuer_provided','ai_classified','user_set')),
  category_confidence NUMERIC,

  cardholder TEXT,
  source_page INT,
  evidence TEXT,
  confidence NUMERIC,
  -- Stable identity for one line on one statement, so a re-read updates rather
  -- than duplicates.
  fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (statement_id, fingerprint)
);

-- ============================================================
-- The canonical account — extend, do not replace
-- ============================================================
ALTER TABLE credit_cards
  ADD COLUMN IF NOT EXISTS institution TEXT,
  ADD COLUMN IF NOT EXISTS last_four TEXT,
  ADD COLUMN IF NOT EXISTS account_nickname TEXT,
  ADD COLUMN IF NOT EXISTS primary_cardholder TEXT,
  -- What the newest statement said, kept separate from any live balance.
  ADD COLUMN IF NOT EXISTS statement_balance NUMERIC,
  ADD COLUMN IF NOT EXISTS statement_closing_date DATE,
  ADD COLUMN IF NOT EXISTS minimum_payment_due NUMERIC,
  ADD COLUMN IF NOT EXISTS payment_due_date DATE,
  ADD COLUMN IF NOT EXISTS available_credit NUMERIC,
  ADD COLUMN IF NOT EXISTS purchase_apr NUMERIC,
  ADD COLUMN IF NOT EXISTS rewards_balance NUMERIC,
  ADD COLUMN IF NOT EXISTS latest_statement_id UUID REFERENCES credit_statements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_confirmed_at TIMESTAMPTZ;

ALTER TABLE credit_cards
  ADD CONSTRAINT credit_cards_last_four_check
  CHECK (last_four IS NULL OR last_four ~ '^[0-9]{4}$') NOT VALID;

-- The pair that identifies an account. Partial so cards entered by hand without
-- a last four are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS credit_cards_identity_idx
  ON credit_cards (household_id, lower(institution), last_four)
  WHERE institution IS NOT NULL AND last_four IS NOT NULL;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS cs_household_idx      ON credit_statements (household_id, statement_closing_date DESC);
CREATE INDEX IF NOT EXISTS cs_card_idx           ON credit_statements (credit_card_id, statement_closing_date DESC);
CREATE INDEX IF NOT EXISTS cs_document_idx       ON credit_statements (document_id);
CREATE INDEX IF NOT EXISTS cs_review_idx         ON credit_statements (household_id, review_status);
CREATE INDEX IF NOT EXISTS csf_statement_idx     ON credit_statement_fields (statement_id);
CREATE INDEX IF NOT EXISTS cat_statement_idx     ON credit_apr_terms (statement_id);
CREATE INDEX IF NOT EXISTS ct_statement_idx      ON credit_transactions (statement_id);
CREATE INDEX IF NOT EXISTS ct_card_idx           ON credit_transactions (credit_card_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS ct_category_idx       ON credit_transactions (household_id, category);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE credit_statements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_statement_fields  ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_apr_terms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members only" ON credit_statements;
CREATE POLICY "Household members only" ON credit_statements
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON credit_statement_fields;
CREATE POLICY "Household members only" ON credit_statement_fields
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON credit_apr_terms;
CREATE POLICY "Household members only" ON credit_apr_terms
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON credit_transactions;
CREATE POLICY "Household members only" ON credit_transactions
  FOR ALL USING (household_owner(household_id));

-- ============================================================
-- Audit
-- ============================================================
DROP TRIGGER IF EXISTS history_credit_statements ON credit_statements;
CREATE TRIGGER history_credit_statements
  AFTER INSERT OR UPDATE OR DELETE ON credit_statements
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();

DROP TRIGGER IF EXISTS history_credit_statement_fields ON credit_statement_fields;
CREATE TRIGGER history_credit_statement_fields
  AFTER UPDATE ON credit_statement_fields
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();
