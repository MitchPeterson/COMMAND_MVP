-- Document upload + extraction flow: bring the live database in line with
-- supabase_schema.sql, which was committed in 25afde2 but never applied.
--
-- Verified missing from the live project on 2026-08-03:
--   * documents.status column
--   * document_extractions table
--   * the raw-uploads storage bucket (never defined in supabase_schema.sql at all,
--     so applying that file alone would still leave uploads broken)
--
-- Additive only: no drops of tables, columns, or data. Safe to re-run.

-- ============================================================
-- 1. documents.status
--    Written by the extract-document Edge Function on both the success path
--    ('processed') and the failure path ('error').
-- ============================================================
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'uploaded'
  CHECK (status IN ('uploaded', 'processed', 'error'));

-- ============================================================
-- 2. document_extractions
--    Staging rows for model-extracted fields, held at 'pending_review' until a
--    user confirms or discards them in the review UI.
-- ============================================================
CREATE TABLE IF NOT EXISTS document_extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  detected_type TEXT NOT NULL CHECK (detected_type IN (
    'mortgage_statement',
    'insurance_dec_page',
    'credit_card_statement',
    'bank_statement',
    'tax_document',
    'paystub',
    'unknown'
  )),
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  extracted_fields JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'confirmed', 'discarded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_extractions_document_id_idx
  ON document_extractions (document_id);
CREATE INDEX IF NOT EXISTS document_extractions_household_status_idx
  ON document_extractions (household_id, status);

ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY has no IF NOT EXISTS, so drop first to keep this re-runnable.
DROP POLICY IF EXISTS "Household members only" ON document_extractions;
CREATE POLICY "Household members only" ON document_extractions
  FOR ALL USING (household_owner(household_id));

-- ============================================================
-- 3. raw-uploads storage bucket
--    Private. Upload paths are '<household_id>/<timestamp>-<filename>'
--    (see uploadDocumentAsset in src/lib/supabase.ts), so the first path
--    segment is the household id and is what the policies check.
--
--    The Edge Function reads through the service-role key and bypasses RLS;
--    these policies exist for the browser client.
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('raw-uploads', 'raw-uploads', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Household can upload own documents" ON storage.objects;
CREATE POLICY "Household can upload own documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'raw-uploads'
    AND household_owner(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "Household can read own documents" ON storage.objects;
CREATE POLICY "Household can read own documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'raw-uploads'
    AND household_owner(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "Household can delete own documents" ON storage.objects;
CREATE POLICY "Household can delete own documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'raw-uploads'
    AND household_owner(((storage.foldername(name))[1])::uuid)
  );
