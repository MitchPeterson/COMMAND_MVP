-- A database-level refusal to store government or account identifiers.
--
-- The extractor scrubs them out of every excerpt before writing, and the
-- prompts ask the model not to produce them in the first place. Both are worth
-- having and neither is a guarantee: a prompt is guidance, and a scrub is one
-- function that a future path could forget to call. The column should refuse
-- regardless of what the code above it does.
--
-- Scoped to the columns that carry text quoted verbatim out of a document.
-- Promoted fields are either deliberately truncated (last four, with its own
-- CHECK) or are figures nobody minds; evidence and raw_value are excerpts chosen
-- by a model, which is exactly where an SSN would arrive.
--
-- Added NOT VALID on purpose. The constraint applies to every future write
-- immediately; existing rows are left unexamined rather than risking a migration
-- that fails on data already in the table. A scan of current rows found nothing
-- matching, so this is caution rather than cover-up — VALIDATE CONSTRAINT can be
-- run later to confirm it.
--
-- Additive and idempotent.

CREATE OR REPLACE FUNCTION carries_identifier(value TEXT) RETURNS BOOLEAN AS $$
  SELECT value IS NOT NULL AND (
    -- SSN or ITIN, dashed or spaced.
    value ~ '\y\d{3}[- ]\d{2}[- ]\d{4}\y'
    -- EIN.
    OR value ~ '\y\d{2}-\d{7}\y'
    -- Card and long account numbers.
    OR value ~ '\y\d{12,19}\y'
    -- Bare runs at SSN length and above.
    OR value ~ '\y\d{9,11}\y'
  );
$$ LANGUAGE sql IMMUTABLE;

COMMENT ON FUNCTION carries_identifier(TEXT) IS
  'True when a string looks like it contains a government or account identifier. '
  'Used to keep verbatim document excerpts free of them.';

DO $$
DECLARE
  target RECORD;
BEGIN
  FOR target IN
    SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_name = c.table_name AND t.table_schema = c.table_schema
     WHERE c.table_schema = 'public'
       AND t.table_type = 'BASE TABLE'
       AND c.column_name IN ('evidence', 'raw_value')
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (NOT carries_identifier(%I)) NOT VALID',
        target.table_name,
        target.table_name || '_' || target.column_name || '_no_identifier',
        target.column_name
      );
    EXCEPTION
      -- Already applied. The migration is meant to be re-runnable.
      WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;
