-- Loans: everything owed that is not a credit card or the mortgage.
--
-- Auto, student, personal, HELOC, 401(k) loans. None of these had anywhere to
-- live, so a household could carry $40,000 of car debt and Command's net worth
-- picture would not know. The mortgage stays in Home with the house and the card
-- balances stay in Credit; Finances reads all three to assemble the balance
-- sheet rather than owning any of them twice.
--
-- Design notes
--
-- 1. secured_by_asset_id ties a loan to the thing it is against — the car, most
--    often. A vehicle stays an asset rather than becoming its own section, so
--    the link is how "this loan is on the Subaru" gets recorded. Nullable,
--    because a student or personal loan is secured by nothing.
--
-- 2. There is no separate raw/canonical pair. A loan is entered by hand today;
--    when statement extraction lands it will follow the mortgage pattern, which
--    is why entry_source and the provenance columns are here from the start.
--
-- 3. original_amount and current_balance are kept apart on purpose. So are
--    interest_rate and APR — a car loan quotes both and they are not the same
--    number, and guessing which one a user meant would quietly distort the
--    interest comparison that makes this table worth having.
--
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,

  -- What kind of debt. Free-form would make the interest comparison and the
  -- deductibility hints unreliable, so this one is constrained.
  loan_type TEXT NOT NULL CHECK (loan_type IN (
    'auto', 'student', 'personal', 'heloc', 'home_equity', 'retirement_plan',
    'medical', 'business', 'other'
  )),
  name TEXT NOT NULL,
  lender TEXT,
  account_number_last4 TEXT
    CHECK (account_number_last4 IS NULL OR account_number_last4 ~ '^[0-9]{4}$'),

  -- What it is against. A car loan points at the vehicle in `assets`; ON DELETE
  -- SET NULL so removing the car leaves the debt rather than hiding it.
  secured_by_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,

  original_amount NUMERIC,
  current_balance NUMERIC,
  -- Rate and APR are different numbers on the same loan. Keeping one column
  -- would mean guessing which the user meant.
  interest_rate NUMERIC,
  apr NUMERIC,
  rate_type TEXT CHECK (rate_type IS NULL OR rate_type IN ('fixed', 'variable', 'unknown')),

  monthly_payment NUMERIC,
  term_months INT,
  remaining_payments INT,
  origination_date DATE,
  maturity_date DATE,
  payment_due_day INT CHECK (payment_due_day IS NULL OR (payment_due_day BETWEEN 1 AND 31)),
  balance_as_of DATE,

  -- Student loans especially: whether it is federal changes every option the
  -- borrower has, and it is not inferable from the servicer's name.
  is_federal BOOLEAN,
  in_deferment BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paid_off', 'in_default', 'deferred', 'closed')),

  entry_source TEXT NOT NULL DEFAULT 'manual'
    CHECK (entry_source IN ('manual', 'extracted')),
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS loans_household_idx ON loans (household_id, status);
CREATE INDEX IF NOT EXISTS loans_asset_idx     ON loans (secured_by_asset_id);
CREATE INDEX IF NOT EXISTS loans_source_doc_idx ON loans (source_document_id);

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Household members only" ON loans;
CREATE POLICY "Household members only" ON loans
  FOR ALL USING (household_owner(household_id));

DROP TRIGGER IF EXISTS history_loans ON loans;
CREATE TRIGGER history_loans
  AFTER INSERT OR UPDATE OR DELETE ON loans
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();
