-- Provenance from imported records back to the document that produced them.
--
-- Without this, deleting a document removes the file and its staged extraction
-- but silently strands anything already confirmed into the pillar tables — the
-- user asks to remove a policy from their profile and it stays. The FK also
-- makes "where did this number come from?" answerable in the UI.
--
-- ON DELETE SET NULL, not CASCADE: a confirmed policy is the user's own record.
-- Deleting the source document must not delete data they explicitly accepted;
-- the application decides whether to remove it and asks first.

ALTER TABLE insurance_policies
  ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE insurance_policies
  ADD COLUMN IF NOT EXISTS source_extraction_id UUID;

ALTER TABLE finance_accounts
  ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE credit_cards
  ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE tax_documents
  ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS insurance_policies_source_doc_idx ON insurance_policies (source_document_id);
CREATE INDEX IF NOT EXISTS finance_accounts_source_doc_idx   ON finance_accounts (source_document_id);
CREATE INDEX IF NOT EXISTS credit_cards_source_doc_idx       ON credit_cards (source_document_id);
CREATE INDEX IF NOT EXISTS tax_documents_source_doc_idx      ON tax_documents (source_document_id);
