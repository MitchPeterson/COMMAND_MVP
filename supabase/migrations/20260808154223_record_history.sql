-- Version history for household records.
--
-- Implemented as a database trigger rather than application logging: every write
-- is captured regardless of which code path made it — the app, a manual edit in
-- the SQL editor, an Edge Function, or a future integration. Application-level
-- logging only records the calls someone remembered to instrument.
--
-- Each record keeps an incrementing version number, the operation, a field-level
-- diff, and a full snapshot. The snapshot means history stays readable even
-- after a record is deleted.
--
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS record_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  version INT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('created', 'updated', 'deleted')),
  -- {field: {from: <old>, to: <new>}} — empty on create and delete.
  changed_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- The row as it stood after the change; the pre-delete state on a delete.
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS record_history_household_idx ON record_history (household_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS record_history_record_idx    ON record_history (table_name, record_id, version DESC);

ALTER TABLE record_history ENABLE ROW LEVEL SECURITY;

-- Read-only to the household. History is written by the trigger under SECURITY
-- DEFINER, so no insert/update/delete policy is granted: an audit trail the user
-- can edit is not an audit trail.
DROP POLICY IF EXISTS "Household members can read history" ON record_history;
CREATE POLICY "Household members can read history" ON record_history
  FOR SELECT USING (household_owner(household_id));

CREATE OR REPLACE FUNCTION capture_record_history() RETURNS TRIGGER AS $$
DECLARE
  v_household UUID;
  v_record_id UUID;
  v_operation TEXT;
  v_old JSONB := '{}'::jsonb;
  v_new JSONB := '{}'::jsonb;
  v_changes JSONB := '{}'::jsonb;
  v_snapshot JSONB;
  v_version INT;
  v_key TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_household := OLD.household_id;
    v_record_id := OLD.id;
    v_operation := 'deleted';
    v_snapshot := v_old;
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_household := NEW.household_id;
    v_record_id := NEW.id;
    v_operation := 'created';
    v_snapshot := v_new;
  ELSE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_household := NEW.household_id;
    v_record_id := NEW.id;
    v_operation := 'updated';
    v_snapshot := v_new;

    -- Field-level diff, ignoring bookkeeping columns that change on every write.
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_key NOT IN ('updated_at', 'created_at')
         AND (v_old -> v_key) IS DISTINCT FROM (v_new -> v_key) THEN
        v_changes := v_changes || jsonb_build_object(
          v_key, jsonb_build_object('from', v_old -> v_key, 'to', v_new -> v_key)
        );
      END IF;
    END LOOP;

    -- A write that changed nothing is not a version.
    IF v_changes = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1
    INTO v_version
    FROM record_history
   WHERE table_name = TG_TABLE_NAME AND record_id = v_record_id;

  INSERT INTO record_history (
    household_id, table_name, record_id, version, operation, changed_fields, snapshot, changed_by
  ) VALUES (
    v_household, TG_TABLE_NAME, v_record_id, v_version, v_operation, v_changes, v_snapshot, auth.uid()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tracked tables. Each needs household_id and id columns.
DROP TRIGGER IF EXISTS history_insurance_policies ON insurance_policies;
CREATE TRIGGER history_insurance_policies
  AFTER INSERT OR UPDATE OR DELETE ON insurance_policies
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();

DROP TRIGGER IF EXISTS history_legal_documents ON legal_documents;
CREATE TRIGGER history_legal_documents
  AFTER INSERT OR UPDATE OR DELETE ON legal_documents
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();

DROP TRIGGER IF EXISTS history_assets ON assets;
CREATE TRIGGER history_assets
  AFTER INSERT OR UPDATE OR DELETE ON assets
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();

DROP TRIGGER IF EXISTS history_household_profile ON household_profile;
CREATE TRIGGER history_household_profile
  AFTER INSERT OR UPDATE OR DELETE ON household_profile
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();

DROP TRIGGER IF EXISTS history_finance_accounts ON finance_accounts;
CREATE TRIGGER history_finance_accounts
  AFTER INSERT OR UPDATE OR DELETE ON finance_accounts
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();

DROP TRIGGER IF EXISTS history_credit_cards ON credit_cards;
CREATE TRIGGER history_credit_cards
  AFTER INSERT OR UPDATE OR DELETE ON credit_cards
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();

-- Seed a baseline version for records that already exist, so history does not
-- begin mid-story with an edit to something that appears never to have been
-- created. Backdated to the row's own created_at where one exists.
INSERT INTO record_history (household_id, table_name, record_id, version, operation, snapshot, changed_at)
SELECT p.household_id, 'insurance_policies', p.id, 1, 'created', to_jsonb(p), COALESCE(p.created_at, NOW())
FROM insurance_policies p
WHERE NOT EXISTS (
  SELECT 1 FROM record_history h WHERE h.table_name = 'insurance_policies' AND h.record_id = p.id
);
