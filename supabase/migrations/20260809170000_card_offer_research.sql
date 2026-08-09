-- Card offer research: candidate cards found by searching the web.
--
-- This is the only place in Command where a material figure comes from outside
-- the household's own documents, and the schema is built around that fact.
--
-- 1. Every candidate carries source_url, source_title and retrieved_at. A row
--    without a source is not a candidate — the NOT NULL is the enforcement.
--
-- 2. verification_state starts at 'unverified' and only a person moves it. The
--    UI says so on every figure. An offer read off a page is a lead, not a term
--    sheet, and issuers change them without notice.
--
-- 3. estimated_annual_value is computed by Command from the household's own
--    category spend and the earn rates found — arithmetic on their statements,
--    not a number a search result claimed. value_basis records what it was
--    computed from so it can be audited.
--
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS card_offer_research (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','complete','failed')),
  -- The category totals sent to the search, kept so a recommendation can be
  -- explained later. Never contains account numbers, balances, or names.
  spend_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  cards_held JSONB NOT NULL DEFAULT '[]'::jsonb,
  search_summary TEXT,
  failure_reason TEXT,
  searches_run INT,
  model TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS card_offer_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  research_id UUID REFERENCES card_offer_research(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,

  issuer TEXT NOT NULL,
  card_name TEXT NOT NULL,
  annual_fee NUMERIC,
  -- [{category, rate, unit, note}] — the rates as found, each with its own note.
  earn_rates JSONB NOT NULL DEFAULT '[]'::jsonb,
  signup_bonus TEXT,
  signup_requirement TEXT,
  intro_apr TEXT,
  notable_benefits TEXT,
  credit_needed TEXT,

  -- Command's arithmetic on the household's own spend, not a claim from a page.
  estimated_annual_value NUMERIC,
  value_basis JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Provenance. A candidate without a source is not a candidate.
  source_url TEXT NOT NULL,
  source_title TEXT,
  is_issuer_source BOOLEAN NOT NULL DEFAULT FALSE,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confidence NUMERIC,

  verification_state TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_state IN ('unverified','user_confirmed','user_rejected')),
  user_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cor_household_idx  ON card_offer_research (household_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS coc_research_idx   ON card_offer_candidates (research_id);
CREATE INDEX IF NOT EXISTS coc_household_idx  ON card_offer_candidates (household_id, verification_state);

ALTER TABLE card_offer_research   ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_offer_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members only" ON card_offer_research;
CREATE POLICY "Household members only" ON card_offer_research
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON card_offer_candidates;
CREATE POLICY "Household members only" ON card_offer_candidates
  FOR ALL USING (household_owner(household_id));
