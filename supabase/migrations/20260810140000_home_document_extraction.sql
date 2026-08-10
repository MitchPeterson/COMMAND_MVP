-- Appliance and warranty documents.
--
-- The mortgage already has its raw/canonical pair from 20260810100000. This
-- adds the other half of the Home section's paperwork: the warranty card, the
-- manual, the installation invoice — anything that tells Command what a system
-- is, how old it is, and who covers it.
--
-- One table rather than a header plus a fields table. An appliance document
-- carries a dozen values, not the forty a legal document does, so provenance
-- rides in a JSONB array alongside the promoted columns — the same shape
-- insurance uses for policy_fields. Every material value still carries its page,
-- its evidence and its confidence; only the storage is lighter.
--
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS appliance_extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  -- Set on confirmation, when the user says which system this belongs to.
  home_system_id UUID REFERENCES home_systems(id) ON DELETE SET NULL,

  document_kind TEXT NOT NULL DEFAULT 'warranty' CHECK (document_kind IN (
    'warranty','manual','receipt','invoice','service_contract','inspection','other'
  )),

  -- What the document says the thing is.
  product_name TEXT,
  suggested_category TEXT,
  make TEXT,
  model TEXT,
  serial_number TEXT,
  purchased_on DATE,
  installed_on DATE,
  purchase_price NUMERIC,
  purchased_from TEXT,

  -- What it says about coverage.
  warranty_provider TEXT,
  warranty_type TEXT,
  warranty_starts_on DATE,
  warranty_expires_on DATE,
  warranty_length_months INT,
  coverage_summary TEXT,
  exclusions_summary TEXT,
  claim_contact TEXT,

  -- [{field, value, raw_value, source_page, evidence, confidence, value_type}]
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  unresolved_items JSONB NOT NULL DEFAULT '[]'::jsonb,

  processing_state TEXT NOT NULL DEFAULT 'uploaded' CHECK (processing_state IN (
    'uploaded','queued','processing','needs_review','confirmed','partially_confirmed',
    'failed','unsupported','superseded','deleted'
  )),
  review_status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (review_status IN ('pending_review','confirmed','partially_confirmed','discarded')),
  failure_reason TEXT,
  content_hash TEXT,
  extractor_version TEXT,
  -- Named for the AI model, distinct from the appliance's own `model` above.
  extraction_model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS appliance_extractions_hash_idx
  ON appliance_extractions (household_id, content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS ae_household_idx ON appliance_extractions (household_id, review_status);
CREATE INDEX IF NOT EXISTS ae_document_idx  ON appliance_extractions (document_id);

ALTER TABLE appliance_extractions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members only" ON appliance_extractions;
CREATE POLICY "Household members only" ON appliance_extractions
  FOR ALL USING (household_owner(household_id));
