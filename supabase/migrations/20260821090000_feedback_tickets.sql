-- Somewhere for an idea, a request or a bug to land.
--
-- Household-scoped like everything else, so a person sees their own tickets and
-- nobody else's. The administrator reads them with the service role, which
-- bypasses RLS — there is no admin flag here, because a column that grants
-- someone else's data is a column worth attacking.
--
-- Updates are allowed on the household's own rows so the AI refinement can
-- write back a clearer title and a category, and so someone can edit a ticket
-- before submitting it. Deletes are allowed too: a person who raised a ticket
-- can withdraw it.
--
-- Screenshots live in the existing raw-uploads bucket under the household's own
-- first path segment, so the storage policies already in place cover them and
-- no new bucket is needed.
--
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS feedback_tickets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id  UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'idea'
                  CHECK (kind IN ('idea', 'defect', 'question')),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  -- Set by the refinement pass, never by the person filling the form.
  category      TEXT,
  severity      TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  refined_title TEXT,
  refined_body  TEXT,
  refined_at    TIMESTAMPTZ,
  -- What the person actually typed, kept whatever refinement does to it.
  original_title TEXT,
  original_body  TEXT,
  screenshot_path TEXT,
  -- Where they were when they raised it, which is most of the triage.
  app_version   TEXT,
  app_view      TEXT,
  user_agent    TEXT,
  status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'triaged', 'in_progress', 'closed', 'declined')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_tickets_household_idx
  ON feedback_tickets (household_id, created_at DESC);

ALTER TABLE feedback_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members only" ON feedback_tickets;
CREATE POLICY "Household members only" ON feedback_tickets
  FOR ALL USING (household_owner(household_id))
  WITH CHECK (household_owner(household_id));

COMMENT ON TABLE feedback_tickets IS
  'Ideas, defects and questions raised from inside the app. Read by the '
  'administrator with the service role; households see only their own.';
