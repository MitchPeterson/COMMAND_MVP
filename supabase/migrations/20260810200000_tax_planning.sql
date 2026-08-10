-- Tax planning: last year's return as a baseline, and this year's deductions
-- logged as they happen.
--
-- The loop this supports is the one that actually saves money: a return tells
-- you what happened, planning happens during the year against that baseline,
-- and deductions get recorded when they occur rather than reconstructed in
-- March from a shoebox.
--
-- Design notes
--
-- 1. tax_returns is the household's own filed figures — the highest-value
--    document they can give Command. It follows the raw/canonical pattern only
--    loosely: a filed return is already authoritative, so there is one row per
--    year with a review flag rather than a separate canonical table.
--
-- 2. Every material figure keeps provenance in tax_return_fields. An AGI that
--    drives a planning recommendation should be traceable to a line on a form.
--
-- 3. deduction_log is a running record, not a calculation. Command stores what
--    was spent, when, on what, and whether there is a receipt. Whether any of
--    it is deductible is the preparer's call and the schema does not pretend
--    otherwise — the column is `category`, never `deduction_amount`.
--
-- Additive and idempotent.

-- ============================================================
-- The prior-year return
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  tax_year INT NOT NULL,

  filing_status TEXT,
  -- Headline figures
  adjusted_gross_income NUMERIC,
  taxable_income NUMERIC,
  total_tax NUMERIC,
  total_payments NUMERIC,
  refund_amount NUMERIC,
  amount_owed NUMERIC,

  -- Which path they took, which decides most planning advice
  took_standard_deduction BOOLEAN,
  standard_deduction_amount NUMERIC,
  itemized_total NUMERIC,
  -- Schedule A components, where the return breaks them out
  itemized_medical NUMERIC,
  itemized_salt NUMERIC,
  itemized_mortgage_interest NUMERIC,
  itemized_charitable NUMERIC,

  -- Withholding and estimated payments, which drive the safe harbor
  federal_withheld NUMERIC,
  estimated_payments NUMERIC,

  -- Credits claimed
  child_tax_credit NUMERIC,
  dependent_care_credit NUMERIC,
  education_credits NUMERIC,

  -- Carryforwards, the thing most often forgotten between years
  capital_loss_carryforward NUMERIC,
  charitable_carryforward NUMERIC,

  -- Income composition, for spotting what will repeat
  wages NUMERIC,
  interest_income NUMERIC,
  dividend_income NUMERIC,
  capital_gains NUMERIC,
  business_income NUMERIC,
  rental_income NUMERIC,
  retirement_income NUMERIC,

  state TEXT,
  state_tax NUMERIC,
  preparer TEXT,

  entry_source TEXT NOT NULL DEFAULT 'manual'
    CHECK (entry_source IN ('manual','extracted')),
  review_status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (review_status IN ('pending_review','confirmed','discarded')),
  content_hash TEXT,
  extractor_version TEXT,
  extraction_model TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (household_id, tax_year)
);

CREATE TABLE IF NOT EXISTS tax_return_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID REFERENCES tax_returns(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  field_code TEXT NOT NULL,
  /** The form and line it came from, e.g. "1040 line 11". */
  form_line TEXT,
  value_number NUMERIC,
  value_text TEXT,
  source_page INT,
  evidence TEXT,
  confidence NUMERIC,
  value_type TEXT NOT NULL DEFAULT 'explicit'
    CHECK (value_type IN ('explicit','calculated','inferred','unknown')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (return_id, field_code)
);

-- ============================================================
-- Deductions logged during the year
-- ============================================================
CREATE TABLE IF NOT EXISTS deduction_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  tax_year INT NOT NULL,

  spent_on DATE NOT NULL,
  -- What kind of expense it is. Not whether it is deductible — that depends on
  -- the return, and Command does not decide it.
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  payee TEXT,
  payment_method TEXT,

  -- Substantiation. A charitable gift over $250 needs a written acknowledgment;
  -- knowing in October that it is missing is worth more than knowing in April.
  receipt_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  has_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  needs_receipt BOOLEAN NOT NULL DEFAULT FALSE,

  -- Where it came from, so a card transaction is not double-counted by hand.
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','card_transaction','extracted')),
  source_transaction_id UUID REFERENCES credit_transactions(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tr_household_idx  ON tax_returns (household_id, tax_year DESC);
CREATE INDEX IF NOT EXISTS trf_return_idx    ON tax_return_fields (return_id);
CREATE INDEX IF NOT EXISTS dl_household_idx  ON deduction_log (household_id, tax_year, spent_on DESC);
CREATE INDEX IF NOT EXISTS dl_category_idx   ON deduction_log (household_id, tax_year, category);
-- One log entry per card transaction, so importing twice cannot double-count.
CREATE UNIQUE INDEX IF NOT EXISTS dl_transaction_idx
  ON deduction_log (source_transaction_id) WHERE source_transaction_id IS NOT NULL;

ALTER TABLE tax_returns       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_return_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE deduction_log     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members only" ON tax_returns;
CREATE POLICY "Household members only" ON tax_returns
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON tax_return_fields;
CREATE POLICY "Household members only" ON tax_return_fields
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON deduction_log;
CREATE POLICY "Household members only" ON deduction_log
  FOR ALL USING (household_owner(household_id));

DROP TRIGGER IF EXISTS history_tax_returns ON tax_returns;
CREATE TRIGGER history_tax_returns
  AFTER INSERT OR UPDATE OR DELETE ON tax_returns
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();
