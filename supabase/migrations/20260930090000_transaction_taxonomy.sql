-- A category model, a rule the household can teach, and coverage it can assert.
--
-- Command has had transactions since August and has never had a category. What
-- it has instead is `credit_transactions.category`, a free TEXT column with no
-- constraint, normalized at read time by `categoryGroup()` into one of nineteen
-- hardcoded groups by substring match. The importer writes labels chosen so
-- that substring list happens to catch them. It works, and it is held together
-- by coincidence: rename a label and every figure on the page moves silently.
--
-- Worse, there are four such lists -- GROUPS in spending.ts, CATEGORY_RULES in
-- transactionImport.ts, BILL_CATEGORIES in recurring.ts, COMMITTED in
-- spendingInsights.ts -- each matched against the same strings for a different
-- purpose. Adding a fifth here would be the worst available outcome, so this
-- migration deliberately does NOT hold the category list. The default list
-- stays in TypeScript, in src/lib/transactions/taxonomy.ts, and the next phase
-- deletes the other four.
--
-- That is the pattern legalTaxonomy.ts already established, and its header
-- states the rule: "Types are data, not a Postgres CHECK. Adding one is a row
-- and a line here, never a migration and a redeploy." So:
--
--   * `transaction_categories` holds only what a household made or changed --
--     its own categories, and its renames or archivings of Command's defaults.
--     An untouched household has zero rows here and works perfectly.
--   * `credit_transactions.category_code` is TEXT, not a UUID foreign key, for
--     the same reason `legal_documents.document_type` is. A code that means
--     something when you read it survives a reseed; a UUID pointing at a row
--     that may not exist does not.
--
-- Four more things arrive with it:
--
--   1. `kind` on a category -- income, expense, savings, transfer. Transfers
--      stay out of totals, which Command already does per-record via `flow`;
--      `savings` is new, and `refund` retires. A refund is a negative expense:
--      it already carries `direction = 'credit'`, so the sign is right and the
--      "$240 refunded" figure stays derivable. Nothing is lost, and the kinds
--      stop having a fourth member that only ever meant "expense, backwards".
--
--   2. `counterparty_rules` -- what the household taught Command about a
--      merchant, keyed on the cleaned name rather than the raw description so
--      STARBUCKS #04821 SEATTLE and STARBUCKS #11902 MINNEAPOLIS are one rule.
--
--   3. `source_period_marks` -- only the household's own assertions about
--      coverage: this period is complete, or this period had no activity.
--      Everything else about coverage is derived from transaction_imports at
--      read time. Storing what can be derived is how a status goes stale
--      while looking authoritative.
--
--   4. `touch_updated_at()` -- the first BEFORE UPDATE trigger in this schema.
--      Seven tables already carry an `updated_at` column and not one of them
--      has ever been maintained; every row holds its insert time. Two people
--      editing the same transaction cannot be detected without it.
--
-- Additive and idempotent.

-- ============================================================
-- updated_at, at last
-- ============================================================

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION touch_updated_at() IS
  'Sets updated_at on every UPDATE. The schema had updated_at columns on seven tables and no trigger anywhere, so each held only its insert time.';

-- ============================================================
-- Categories the household made or changed
-- ============================================================

CREATE TABLE IF NOT EXISTS transaction_categories (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,

  -- Stable identity, and what credit_transactions.category_code holds. Lower
  -- snake_case by convention; the label is what anyone actually reads.
  code  TEXT NOT NULL,
  label TEXT NOT NULL,

  -- What this category does to the totals.
  --   income   counted in
  --   expense  counted out (a refund is one of these, negative)
  --   savings  counted as kept, not as spent
  --   transfer counted in neither direction -- the household's own money moving
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense', 'savings', 'transfer')),

  -- True when this row customizes one of Command's built-in categories rather
  -- than adding a new one, so a household can rename "Dining and takeout" or
  -- archive "Cash advances" without that choice leaking to anyone else.
  overrides_default BOOLEAN NOT NULL DEFAULT FALSE,

  -- Archived, not deleted. Transactions already filed under a category keep
  -- pointing at a code that still resolves; it simply stops being offered.
  archived_at TIMESTAMPTZ,

  sort_order INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (household_id, code)
);

CREATE INDEX IF NOT EXISTS tc_household_idx ON transaction_categories (household_id, kind);

DROP TRIGGER IF EXISTS transaction_categories_touch ON transaction_categories;
CREATE TRIGGER transaction_categories_touch
  BEFORE UPDATE ON transaction_categories
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

COMMENT ON TABLE transaction_categories IS
  'Categories a household added or customized. Command''s defaults live in src/lib/transactions/taxonomy.ts and are not stored here -- an untouched household has no rows in this table.';

-- ============================================================
-- What the household taught Command about a merchant
-- ============================================================

CREATE TABLE IF NOT EXISTS counterparty_rules (
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,

  -- The cleaned merchant key, not the raw description. STARBUCKS #04821
  -- SEATTLE WA and STARBUCKS #11902 MINNEAPOLIS MN are one counterparty and
  -- therefore one rule; keying on the raw text would need a rule per store.
  counterparty_key TEXT NOT NULL,

  -- Either may be null. A household can correct a name without recategorizing,
  -- or recategorize without renaming, and the check below stops a row that
  -- does neither.
  category_code TEXT,
  display_name  TEXT,

  -- How many rows the rule last touched, so the confirmation can say "moved 14
  -- other Starbucks records" without counting them again.
  applied_count INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (household_id, counterparty_key),
  CONSTRAINT counterparty_rules_says_something
    CHECK (category_code IS NOT NULL OR display_name IS NOT NULL)
);

DROP TRIGGER IF EXISTS counterparty_rules_touch ON counterparty_rules;
CREATE TRIGGER counterparty_rules_touch
  BEFORE UPDATE ON counterparty_rules
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

COMMENT ON TABLE counterparty_rules IS
  'A correction the household made once, applied to every matching record and to future imports. Keyed on the cleaned merchant key so one rule covers every store of the same chain.';

-- ============================================================
-- Coverage the household asserted
-- ============================================================

CREATE TABLE IF NOT EXISTS source_period_marks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,

  -- Exactly one, the same shape as credit_transactions_one_parent. Two
  -- nullable foreign keys rather than a polymorphic id, so the database can
  -- still enforce that the source exists and clean up when it goes.
  finance_account_id UUID REFERENCES finance_accounts(id) ON DELETE CASCADE,
  credit_card_id     UUID REFERENCES credit_cards(id)     ON DELETE CASCADE,

  -- The first of the month the mark applies to.
  period DATE NOT NULL,

  --   complete    the household says this period is fully loaded
  --   not_needed  the household says there was genuinely no activity
  -- Both are assertions, which is why they are stored. Everything else about
  -- coverage is computed from transaction_imports and never written down.
  mark TEXT NOT NULL CHECK (mark IN ('complete', 'not_needed')),
  note TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT source_period_marks_one_source
    CHECK ((finance_account_id IS NULL) <> (credit_card_id IS NULL))
);

-- Partial unique indexes rather than a composite primary key, because a
-- nullable column cannot carry one and NULLs do not collide in a UNIQUE.
CREATE UNIQUE INDEX IF NOT EXISTS spm_account_period_idx
  ON source_period_marks (household_id, finance_account_id, period)
  WHERE finance_account_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS spm_card_period_idx
  ON source_period_marks (household_id, credit_card_id, period)
  WHERE credit_card_id IS NOT NULL;

COMMENT ON TABLE source_period_marks IS
  'Only what the household asserted about coverage: this period is complete, or it had no activity. Derived coverage is computed from transaction_imports at read time, never stored, so a status cannot go stale while looking authoritative.';

-- ============================================================
-- credit_transactions grows up
-- ============================================================

ALTER TABLE credit_transactions
  ADD COLUMN IF NOT EXISTS category_code TEXT,
  -- The cleaned merchant key and the name to show for it. Persisted rather
  -- than recomputed on every read, because a rule keys on the stored value and
  -- a rule that moved when the cleaning changed would be a rule nobody could
  -- rely on.
  ADD COLUMN IF NOT EXISTS counterparty_key  TEXT,
  ADD COLUMN IF NOT EXISTS counterparty_name TEXT,
  ADD COLUMN IF NOT EXISTS review_reason     TEXT,
  -- The source system's own identifier, when the export carried one. Preferred
  -- over a hash: it is the only identity that survives the bank restating a
  -- description.
  ADD COLUMN IF NOT EXISTS source_record_id  TEXT,
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE credit_transactions
  ADD COLUMN IF NOT EXISTS review_state TEXT NOT NULL DEFAULT 'none';

DO $$ BEGIN
  ALTER TABLE credit_transactions
    ADD CONSTRAINT credit_transactions_review_state
    CHECK (review_state IN ('none', 'needs_review', 'cleared'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- The other leg of an internal transfer.
--
-- When both sides of a move are loaded -- $800 leaving checking and the same
-- $800 arriving in savings -- the two rows are linked and the inbound one is
-- left out of the totals, so "Saved" counts the money once. SET NULL rather
-- than CASCADE: deleting one leg should unlink the other, never delete it.
ALTER TABLE credit_transactions
  ADD COLUMN IF NOT EXISTS paired_with_id UUID REFERENCES credit_transactions(id) ON DELETE SET NULL;

COMMENT ON COLUMN credit_transactions.paired_with_id IS
  'The matching leg of a transfer between the household''s own sources. Set only when exactly one candidate matched; an ambiguous pair is left unlinked and flagged for review, because a wrong pair silently changes the Saved figure while an unlinked one only leaves a row in a queue.';

COMMENT ON COLUMN credit_transactions.category_code IS
  'Resolves against src/lib/transactions/taxonomy.ts first, then transaction_categories for household additions. TEXT rather than a foreign key so a readable code survives a reseed.';

COMMENT ON COLUMN credit_transactions.review_state IS
  'needs_review means Command is not confident and said why in review_reason. Cleared is a person saying it is fine; none is the ordinary case.';

DROP TRIGGER IF EXISTS credit_transactions_touch ON credit_transactions;
CREATE TRIGGER credit_transactions_touch
  BEFORE UPDATE ON credit_transactions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── refund retires ──────────────────────────────────────────────────────────
--
-- A refund is a negative expense. Every such row already carries
-- direction = 'credit', so the sign is already right and the arithmetic does
-- not move: monthlySpending signs by direction and only filters by flow. The
-- "refunded" figure stays derivable as the expense rows whose direction is a
-- credit. This runs before the constraint is replaced, or the rows would fail it.

UPDATE credit_transactions SET flow = 'expense' WHERE flow = 'refund';

ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_flow_check;
ALTER TABLE credit_transactions
  ADD CONSTRAINT credit_transactions_flow_check
  CHECK (flow IN ('expense', 'income', 'savings', 'transfer'));

COMMENT ON COLUMN credit_transactions.flow IS
  'What the money did: expense, income, savings or transfer. Null on rows read off a card statement, where direction plus the merchant name is enough. A refund is an expense with direction = credit.';

CREATE INDEX IF NOT EXISTS ct_category_code_idx
  ON credit_transactions (household_id, category_code, transaction_date DESC);

CREATE INDEX IF NOT EXISTS ct_counterparty_idx
  ON credit_transactions (household_id, counterparty_key);

-- Partial: the review queue asks only for rows that are in it.
CREATE INDEX IF NOT EXISTS ct_review_idx
  ON credit_transactions (household_id)
  WHERE review_state = 'needs_review';

-- ============================================================
-- Sources and imports
-- ============================================================

-- Which adapter read the file, and the date range its name claimed. The
-- filename range is kept separately from period_start/period_end because they
-- answer different questions: what the export was supposed to cover, versus
-- what was actually in it. A file named Aug1-Aug31 holding nothing after the
-- 6th is exactly the gap the uploads view has to report.
ALTER TABLE transaction_imports
  ADD COLUMN IF NOT EXISTS adapter_id            TEXT,
  ADD COLUMN IF NOT EXISTS filename_period_start DATE,
  ADD COLUMN IF NOT EXISTS filename_period_end   DATE;

-- Stop tracking a source without deleting it or its history.
ALTER TABLE finance_accounts
  ADD COLUMN IF NOT EXISTS transactions_tracked BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE credit_cards
  ADD COLUMN IF NOT EXISTS transactions_tracked BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN finance_accounts.transactions_tracked IS
  'False means the household stopped tracking exports for this account: it drops out of coverage reporting without losing the transactions already loaded.';

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE counterparty_rules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_period_marks    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members only" ON transaction_categories;
CREATE POLICY "Household members only" ON transaction_categories
  FOR ALL USING (household_owner(household_id))
  WITH CHECK (household_owner(household_id));

DROP POLICY IF EXISTS "Household members only" ON counterparty_rules;
CREATE POLICY "Household members only" ON counterparty_rules
  FOR ALL USING (household_owner(household_id))
  WITH CHECK (household_owner(household_id));

DROP POLICY IF EXISTS "Household members only" ON source_period_marks;
CREATE POLICY "Household members only" ON source_period_marks
  FOR ALL USING (household_owner(household_id))
  WITH CHECK (household_owner(household_id));
