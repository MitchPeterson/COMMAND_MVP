-- Transactions the household uploaded as a spreadsheet.
--
-- Until now every transaction Command knew about came off a card statement it
-- read with a model. That covers the cards and nothing else -- so cash, debit,
-- ACH, autopay out of checking and every dollar of income were invisible, and
-- the spending view had to say so in a paragraph at the top of the page.
--
-- Banks and issuers all export CSV or XLSX. Reading those directly is the
-- cheapest path to a complete picture: no model call, no per-document cost, and
-- the figures are the institution's own rather than a reading of a PDF.
--
-- Three decisions worth stating, because each has a wrong version that looks
-- fine until it is live:
--
--   1. Imported rows land in credit_transactions rather than a parallel table.
--      A household has one set of spending, not card spending and bank
--      spending. Everything already built on credit_transactions -- monthly
--      categories, recurring charges, the finances grade -- reads imports on
--      the day they land, and nothing has to be written twice.
--
--   2. statement_id becomes nullable and import_id arrives beside it. Exactly
--      one is set. A row belongs to a statement Command read or to a file the
--      household uploaded, never both and never neither.
--
--   3. flow arrives, because direction cannot carry this. On a card, every
--      'credit' is a refund or a payment. On a checking account a 'credit' is
--      usually a paycheck, and counting a paycheck as a refund would quietly
--      subtract $5,000 from the month's spending. Worse, importing checking
--      alongside the card statement it pays would count the same dollars twice
--      -- once as the purchase and once as the payment. flow separates
--      expense, income, transfer and refund so neither happens.
--
-- flow is nullable on purpose. Rows that predate this migration keep null, and
-- the existing card heuristic continues to govern them. Only imports set it.
--
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS transaction_imports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,

  -- The file itself, if it was kept in the vault. Null when the household
  -- chose not to store it, which is allowed: the rows are the point.
  document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
  file_name    TEXT NOT NULL,
  file_format  TEXT NOT NULL DEFAULT 'csv' CHECK (file_format IN ('csv', 'xlsx')),

  -- What kind of account these rows came off. It decides the default sign
  -- reading: on a bank export a negative amount is money leaving, on a card
  -- export a positive amount is usually a purchase.
  source_kind  TEXT NOT NULL DEFAULT 'bank' CHECK (source_kind IN ('bank', 'card')),
  -- What the household calls the account. Shown against the rows, and part of
  -- the fingerprint, so the same coffee on two cards is two transactions.
  account_label TEXT NOT NULL,
  institution   TEXT,

  credit_card_id    UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
  finance_account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL,

  period_start DATE,
  period_end   DATE,

  -- Counts from the import, kept so the file can explain itself later without
  -- re-reading it: how many rows the file held, how many became transactions,
  -- how many were already on file, and how many could not be read.
  row_count       INT NOT NULL DEFAULT 0,
  imported_count  INT NOT NULL DEFAULT 0,
  duplicate_count INT NOT NULL DEFAULT 0,
  skipped_count   INT NOT NULL DEFAULT 0,

  -- Which way the amounts were read, and how the columns were matched. Both
  -- are decisions Command made or the household corrected, and a figure that
  -- came out of a decision has to be able to show the decision.
  sign_convention TEXT NOT NULL DEFAULT 'negative_is_spending'
    CHECK (sign_convention IN ('negative_is_spending', 'positive_is_spending', 'debit_credit_columns')),
  column_map JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS transaction_imports_household_idx
  ON transaction_imports (household_id, created_at DESC);

ALTER TABLE transaction_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members only" ON transaction_imports;
CREATE POLICY "Household members only" ON transaction_imports
  FOR ALL USING (household_owner(household_id))
  WITH CHECK (household_owner(household_id));

COMMENT ON TABLE transaction_imports IS
  'One uploaded CSV or XLSX of transactions. Holds how it was read -- columns, sign convention, counts -- so a figure drawn from it can show its own provenance.';

-- ============================================================
-- credit_transactions: make room for a row with no statement
-- ============================================================

ALTER TABLE credit_transactions
  ALTER COLUMN statement_id DROP NOT NULL;

ALTER TABLE credit_transactions
  ADD COLUMN IF NOT EXISTS import_id UUID REFERENCES transaction_imports(id) ON DELETE CASCADE;

ALTER TABLE credit_transactions
  ADD COLUMN IF NOT EXISTS flow TEXT
    CHECK (flow IN ('expense', 'income', 'transfer', 'refund'));

COMMENT ON COLUMN credit_transactions.flow IS
  'What the money did. Null on rows read off a card statement, where direction plus the merchant name is enough. Set on every imported row, because a bank credit is a paycheck far more often than it is a refund, and a transfer is not spending at all.';

-- A finance_accounts row this transaction belongs to, for bank imports. The
-- card equivalent already exists as credit_card_id.
ALTER TABLE credit_transactions
  ADD COLUMN IF NOT EXISTS finance_account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL;

-- Exactly one parent. Written as a NOT VALID constraint so the migration
-- cannot fail on a row that predates it; every such row has a statement_id,
-- so in practice there is nothing to fail on.
ALTER TABLE credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_one_parent;
ALTER TABLE credit_transactions
  ADD CONSTRAINT credit_transactions_one_parent
  CHECK ((statement_id IS NULL) <> (import_id IS NULL)) NOT VALID;

-- A keyword rule is neither the issuer's word nor a model's judgement, and
-- spending analysis has to be able to tell all three apart.
ALTER TABLE credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_category_source_check;
ALTER TABLE credit_transactions
  ADD CONSTRAINT credit_transactions_category_source_check
  CHECK (category_source IN ('issuer_provided', 'ai_classified', 'user_set', 'rule_matched'));

-- Dedup for imported rows. The fingerprint already carries date, merchant,
-- amount, account and an occurrence number, so two genuine coffees on the same
-- day survive and re-importing an overlapping file does not double the month.
-- Household-wide rather than per-import, which is the point: the second file
-- is usually the same statement with a few more days on the end.
CREATE UNIQUE INDEX IF NOT EXISTS ct_import_fingerprint_idx
  ON credit_transactions (household_id, fingerprint)
  WHERE import_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ct_import_idx
  ON credit_transactions (import_id);

CREATE INDEX IF NOT EXISTS ct_flow_idx
  ON credit_transactions (household_id, flow, transaction_date DESC);
