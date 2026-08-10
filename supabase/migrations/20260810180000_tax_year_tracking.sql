-- Tax year tracking.
--
-- The existing tax_documents table held a name, a year and a status. What the
-- section actually needs is the ability to say, for a given tax year, which
-- forms are expected, which have arrived, and which document in the vault each
-- one is — so "have I got everything yet" has an answer.
--
-- Expectations are not stored. They are derived each time from what Command
-- already knows: a mortgage implies a 1098, a business implies a K-1, a child
-- under 13 implies dependent-care records. Storing them would mean a stale list
-- the moment the household changes. Only *arrivals* are recorded here.
--
-- Additive and idempotent.

ALTER TABLE tax_documents
  -- The IRS form, where there is one: w2, 1099_int, 1098, k1, and so on. Free
  -- text rather than an enum — the list of forms a household might receive is
  -- long, changes, and is not worth a migration each time.
  ADD COLUMN IF NOT EXISTS form_type TEXT,
  ADD COLUMN IF NOT EXISTS issuer TEXT,
  ADD COLUMN IF NOT EXISTS received_on DATE,
  ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  -- Which derived expectation this satisfies, so the checklist can tick it off.
  ADD COLUMN IF NOT EXISTS satisfies_expectation TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- status was NOT NULL with no default, which made an insert from the UI awkward.
ALTER TABLE tax_documents ALTER COLUMN status SET DEFAULT 'received';

CREATE INDEX IF NOT EXISTS tax_documents_year_idx
  ON tax_documents (household_id, tax_year);
CREATE INDEX IF NOT EXISTS tax_documents_expectation_idx
  ON tax_documents (household_id, tax_year, satisfies_expectation);

DROP TRIGGER IF EXISTS history_tax_documents ON tax_documents;
CREATE TRIGGER history_tax_documents
  AFTER INSERT OR UPDATE OR DELETE ON tax_documents
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();
