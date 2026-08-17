-- execution_observations is a list, and it was declared with an object default.
--
--   execution_observations JSONB NOT NULL DEFAULT '{}'::jsonb   -- object
--   referenced_documents   JSONB NOT NULL DEFAULT '[]'::jsonb
--   referenced_attachments JSONB NOT NULL DEFAULT '[]'::jsonb
--   unresolved_items       JSONB NOT NULL DEFAULT '[]'::jsonb
--
-- It is the only list-shaped column in the schema with an object default, and it
-- sits directly above three that got it right. Every other '{}' default in the
-- codebase — extraction_quality, identifiers, changed_fields, snapshot,
-- spend_profile, value_basis — genuinely holds an object.
--
-- The default was harmless from 8 August, when the column was added, until 14
-- August, when the first code read it. Any row whose legal-common pass did not
-- write observations — a degraded pass, or one created before that write existed
-- — takes the default, and `{}.some(...)` throws, which took the whole Legal
-- view down to a blank screen rather than degrading one card.
--
-- Two changes: the default, so no new row inherits it, and a backfill, so no
-- existing row keeps it. The backfill tests the stored type rather than
-- comparing against '{}' — a row holding any non-array JSON is equally unusable
-- and equally worth correcting.
--
-- Additive and idempotent.

ALTER TABLE legal_document_extractions
  ALTER COLUMN execution_observations SET DEFAULT '[]'::jsonb;

UPDATE legal_document_extractions
   SET execution_observations = '[]'::jsonb
 WHERE jsonb_typeof(execution_observations) IS DISTINCT FROM 'array';

-- The same audit across the other list-shaped columns on this table, so a row
-- written before any of them was populated cannot take a view down either.
UPDATE legal_document_extractions
   SET referenced_documents = '[]'::jsonb
 WHERE jsonb_typeof(referenced_documents) IS DISTINCT FROM 'array';

UPDATE legal_document_extractions
   SET referenced_attachments = '[]'::jsonb
 WHERE jsonb_typeof(referenced_attachments) IS DISTINCT FROM 'array';

UPDATE legal_document_extractions
   SET unresolved_items = '[]'::jsonb
 WHERE jsonb_typeof(unresolved_items) IS DISTINCT FROM 'array';
