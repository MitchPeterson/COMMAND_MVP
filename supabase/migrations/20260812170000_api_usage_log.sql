-- Where the API spend actually went.
--
-- Every call already computes its own tokens and price for the cost line in the
-- response, and then discards it when the request ends. So "my balance ran down
-- fast" has no answer beyond a guess — which document, which pass, which model,
-- how many times.
--
-- One row per call rather than per extraction, because the interesting questions
-- are per pass: a three-pass insurance read costs three times a one-pass
-- mortgage read, and knowing that is the difference between blaming the model
-- and blaming the pipeline.
--
-- Design notes
--
-- 1. document_name is a snapshot, not a join. Documents get deleted — test
--    fixtures especially — and the spend still happened. A cost record that
--    disappears when its document does is worse than no record.
--
-- 2. Rows are written by the extractor as each call completes, not at the end of
--    the request. A failed extraction still cost money, and those are exactly
--    the calls a user most wants to find.
--
-- 3. cost_usd is fixed at write time from the prices then in force. Recomputing
--    later against new prices would quietly rewrite history.
--
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS api_usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  document_name TEXT,

  -- Which pass: classify, insurance identity, legal provisions, tax return…
  label TEXT NOT NULL,
  model TEXT NOT NULL,

  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  cache_write_tokens INT NOT NULL DEFAULT 0,
  cache_read_tokens INT NOT NULL DEFAULT 0,

  cost_usd NUMERIC NOT NULL DEFAULT 0,
  -- A replayed call cost nothing and saved what the original would have cost.
  replayed BOOLEAN NOT NULL DEFAULT FALSE,
  saved_usd NUMERIC NOT NULL DEFAULT 0,

  duration_ms INT,
  succeeded BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS aul_household_idx ON api_usage_log (household_id, created_at DESC);
CREATE INDEX IF NOT EXISTS aul_document_idx  ON api_usage_log (document_id);
CREATE INDEX IF NOT EXISTS aul_model_idx     ON api_usage_log (model, created_at DESC);

ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;

-- household_owner() scopes by the authenticated user, so someone who owns
-- several households sees all of their own spend in one report — which is the
-- question being asked — and never anybody else's.
DROP POLICY IF EXISTS "Household members only" ON api_usage_log;
CREATE POLICY "Household members only" ON api_usage_log
  FOR ALL USING (household_owner(household_id));

-- Deliberately not in record_history: an append-only cost log versioned by
-- another append-only log is noise.
