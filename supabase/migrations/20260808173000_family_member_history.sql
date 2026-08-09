-- People are now editable from the profile screen, so their changes belong in
-- the household's activity log alongside policies and the profile itself.
--
-- Additive and idempotent. Depends on capture_record_history() from
-- 20260808154223_record_history.sql.

DROP TRIGGER IF EXISTS history_family_members ON family_members;
CREATE TRIGGER history_family_members
  AFTER INSERT OR UPDATE OR DELETE ON family_members
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();

DROP TRIGGER IF EXISTS history_family_milestones ON family_milestones;
CREATE TRIGGER history_family_milestones
  AFTER INSERT OR UPDATE OR DELETE ON family_milestones
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();

-- Baseline version for the people who already exist, so their history does not
-- open on an edit to someone who appears never to have been added. Backdated to
-- the row's own created_at.
INSERT INTO record_history (household_id, table_name, record_id, version, operation, snapshot, changed_at)
SELECT m.household_id, 'family_members', m.id, 1, 'created', to_jsonb(m), COALESCE(m.created_at, NOW())
FROM family_members m
WHERE NOT EXISTS (
  SELECT 1 FROM record_history h WHERE h.table_name = 'family_members' AND h.record_id = m.id
);
