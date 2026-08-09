-- Audit trail for the legal review workflow.
--
-- Confirmations, edits, rejections and person-matches are decisions about what
-- is true, so they belong in the same history every other tracked change lands
-- in. Reusing capture_record_history() rather than inventing a second log means
-- the field-level diff, the snapshot and the read-only guarantee all come free.
--
-- Additive and idempotent. Depends on capture_record_history() from
-- 20260808154223_record_history.sql.

DROP TRIGGER IF EXISTS history_legal_extracted_fields ON legal_extracted_fields;
CREATE TRIGGER history_legal_extracted_fields
  AFTER UPDATE ON legal_extracted_fields
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();

DROP TRIGGER IF EXISTS history_legal_provisions ON legal_provisions;
CREATE TRIGGER history_legal_provisions
  AFTER UPDATE ON legal_provisions
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();

DROP TRIGGER IF EXISTS history_legal_parties ON legal_parties;
CREATE TRIGGER history_legal_parties
  AFTER UPDATE ON legal_parties
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();

-- INSERT is deliberately not tracked on these three. A single extraction writes
-- dozens of rows in one pass; recording each as a version would bury the user's
-- own decisions in machine output. What the model produced is already preserved
-- in the extraction row itself.

-- Promotion to the canonical record needs to say which reading it came from.
ALTER TABLE legal_profile_facts
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES legal_profile_facts(id) ON DELETE SET NULL;

-- A household can hold two wills, an original and a restatement, a recorded and
-- an unrecorded deed. Which one controls is the user's call, so the canonical
-- table keeps both and records the question rather than resolving it.
ALTER TABLE legal_documents
  ADD COLUMN IF NOT EXISTS supersedes_document_id UUID REFERENCES legal_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_controlling BOOLEAN;

CREATE INDEX IF NOT EXISTS legal_documents_type_idx ON legal_documents (household_id, document_type);
CREATE INDEX IF NOT EXISTS lef_review_idx ON legal_extracted_fields (extraction_id, review_state);
CREATE INDEX IF NOT EXISTS lprov_review_idx ON legal_provisions (extraction_id, review_state);
