-- Findings a household has put down.
--
-- Findings have no rows of their own. They are recomputed from the household's
-- data every time a page renders, so what is stored here is a fingerprint of
-- the sentence a finding makes, taken from its section, title and detail.
--
-- That is deliberate. Dismissing "State Farm home renews in 40 days, renewal
-- 2026-10-01" hides exactly that sentence. Next year's renewal reads
-- 2027-10-01, which fingerprints differently, so it returns on its own and
-- nobody has to remember to un-dismiss anything. A finding that gets worse
-- usually rewords itself, so it comes back rather than staying silently
-- hidden.
--
-- snoozed_until null means dismissed outright. A date means hidden until it
-- passes. Nothing is destroyed either way: the app counts what is hidden and
-- can bring it back.
--
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS dismissed_findings (
  household_id  UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  fingerprint   TEXT NOT NULL,
  section       TEXT NOT NULL,
  -- Kept so a hidden finding can be named when offering it back.
  title         TEXT NOT NULL,
  snoozed_until DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (household_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS dismissed_findings_section_idx
  ON dismissed_findings (household_id, section);

ALTER TABLE dismissed_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members only" ON dismissed_findings;
CREATE POLICY "Household members only" ON dismissed_findings
  FOR ALL USING (household_owner(household_id))
  WITH CHECK (household_owner(household_id));

COMMENT ON TABLE dismissed_findings IS
  'Fingerprints of findings a household dismissed or snoozed. Keyed on wording, so a finding returns when the facts behind it change.';
