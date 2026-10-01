-- What a model made of the household's own figures.
--
-- Stored rather than computed on demand, for three reasons:
--
--   It costs money. A page that re-asks on every render is a page that bills
--   someone for scrolling.
--
--   It has an as-of date, and that date is load-bearing. Advice drawn from
--   August reads as current in November unless the page says when it was
--   drawn, and the household has no way to tell by looking.
--
--   It has to be auditable. `basis` keeps the exact aggregate that produced
--   it, so a recommendation naming $675 of subscriptions can be checked
--   against the figure that was actually sent -- the same reason
--   card_offer_candidates keeps value_basis.
--
-- What is deliberately not here: anything resembling a transaction. The
-- function that writes this assembles its payload server-side from totals and
-- never reads a merchant description, so there is no raw record to store even
-- if this table had somewhere to put one.
--
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS spending_advice (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,

  -- When it was drawn, which is what the page shows. Not the same as
  -- created_at: a re-run that changes nothing should still move this.
  as_of DATE NOT NULL DEFAULT CURRENT_DATE,
  -- The most recent whole period it had to work with.
  period TEXT,

  -- [{ tag, title, body, impact }]. Validated server-side before it lands:
  -- a tag outside the four is dropped rather than shown.
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- The sum of the impacts, computed in TypeScript rather than taken from the
  -- model. Arithmetic is not something to ask a model for when the figures are
  -- already in hand.
  total_impact NUMERIC NOT NULL DEFAULT 0,

  model TEXT,
  -- The aggregate that produced it, so any figure quoted can be checked.
  basis JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS spending_advice_household_idx
  ON spending_advice (household_id, created_at DESC);

ALTER TABLE spending_advice ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members only" ON spending_advice;
CREATE POLICY "Household members only" ON spending_advice
  FOR ALL USING (household_owner(household_id))
  WITH CHECK (household_owner(household_id));

COMMENT ON TABLE spending_advice IS
  'Recommendations drawn from the household''s own totals. Carries its as-of date because advice drawn in August reads as current in November, and the basis it was drawn from so any figure it quotes can be checked.';

COMMENT ON COLUMN spending_advice.basis IS
  'The aggregate payload sent to the model: totals by period, category and source, each source''s loaded range, the recurring list and the keep/cut decisions. No transaction, merchant or amount from a single record ever appears here.';
