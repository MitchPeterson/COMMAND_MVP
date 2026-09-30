-- Keep it, or cut it.
--
-- One column, on the table that already exists for exactly this shape of
-- fact. counterparty_rules is keyed (household_id, counterparty_key), which is
-- precisely the grain of a recurring item: the household decides about
-- Netflix, not about the November charge from Netflix.
--
-- A table of its own would have had the same key, the same RLS and the same
-- lifecycle, and would have meant two rows to write when someone both
-- recategorizes a merchant and decides to drop it.
--
-- The existing CHECK has to widen with it. It said a rule must carry a
-- category or a name, which was right when those were the only two things a
-- rule could say; a row that only records "cut this" says something too.
--
-- Additive and idempotent.

ALTER TABLE counterparty_rules
  ADD COLUMN IF NOT EXISTS recurring_decision TEXT;

DO $$ BEGIN
  ALTER TABLE counterparty_rules
    ADD CONSTRAINT counterparty_rules_decision_check
    CHECK (recurring_decision IS NULL OR recurring_decision IN ('keep', 'cut'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE counterparty_rules DROP CONSTRAINT IF EXISTS counterparty_rules_says_something;
ALTER TABLE counterparty_rules
  ADD CONSTRAINT counterparty_rules_says_something
  CHECK (category_code IS NOT NULL OR display_name IS NOT NULL OR recurring_decision IS NOT NULL);

COMMENT ON COLUMN counterparty_rules.recurring_decision IS
  'What the household decided about a recurring charge. Null means undecided, which is different from keep -- one is an answer and the other is a question still open, and the count of outstanding decisions depends on telling them apart.';
