-- Replay an extraction instead of paying for it again.
--
-- Reading the same document twice costs the same money twice, and during
-- development the same document gets read many times over — chasing a
-- classification bug, checking a schema change, running a fixture. That is where
-- the API spend actually goes, and none of it buys a different answer.
--
-- The cache key is a hash of everything that determines the answer: the document
-- bytes, the instructions, the schema, the model, the effort setting and the
-- extractor version. A hit is therefore not "probably the same result" — it is
-- provably the same computation, and any change to a prompt or a schema misses
-- automatically rather than needing anyone to remember to clear it.
--
-- Scoped by household even though the key alone would be enough. Two households
-- uploading identical bytes would derive identical output, so sharing would be
-- safe in fact, but a table that can serve one household's stored result to
-- another is not worth the argument.
--
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS extraction_response_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,

  -- sha256 over content + instructions + schema + model + effort + version.
  cache_key TEXT NOT NULL,
  label TEXT,
  model TEXT,

  -- The parsed extraction exactly as callClaude returned it.
  response JSONB NOT NULL,

  -- What the original call cost, so a replay can report what it saved rather
  -- than just reporting nothing.
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  cache_write_tokens INT NOT NULL DEFAULT 0,
  cache_read_tokens INT NOT NULL DEFAULT 0,
  original_cost_usd NUMERIC NOT NULL DEFAULT 0,

  hit_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (household_id, cache_key)
);

CREATE INDEX IF NOT EXISTS erc_lookup_idx ON extraction_response_cache (household_id, cache_key);
CREATE INDEX IF NOT EXISTS erc_age_idx    ON extraction_response_cache (last_used_at);

ALTER TABLE extraction_response_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Household members only" ON extraction_response_cache;
CREATE POLICY "Household members only" ON extraction_response_cache
  FOR ALL USING (household_owner(household_id));

-- Deliberately not in record_history. This is a derived artifact that can be
-- deleted at any time with no loss; versioning it would be noise.
