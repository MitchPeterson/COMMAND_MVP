-- Legal document intelligence: classification, extraction, provenance, review.
--
-- Design notes
--
-- 1. Same raw/canonical split insurance uses. legal_document_extractions is what
--    a model read from one uploaded file; legal_documents stays the canonical
--    record and is only written after a user confirms. Nothing here updates the
--    canonical profile on its own.
--
-- 2. Types are data, not a CHECK constraint. legal_document_types mirrors
--    src/lib/legalTaxonomy.ts, so a new type — or a state-specific variant — is
--    an INSERT, not a migration plus a redeploy. Only the small, genuinely fixed
--    vocabularies (value_type, severity, processing_state) are CHECKed.
--
-- 3. Every extracted value carries provenance: source page, section, a short
--    excerpt, confidence, extractor version, and whether it was stated or
--    inferred. legal_extracted_fields is a row-per-field table precisely so the
--    forty-odd common fields do not have to exist as forty columns — or, more
--    importantly, as a forty-property model grammar, which would exceed the
--    compiled-grammar budget the insurance schema already ran into.
--
-- 4. Roles are rows. One person is trustee on one document and beneficiary on
--    another; legal_party_roles carries the pair, so neither overwrites the
--    other and neither touches family_members without confirmation.
--
-- 5. Nothing in this schema records a legal conclusion. Statuses describe what a
--    document says about itself ('marked draft', 'recorded'); flags describe what
--    was or was not observed in the file. There is no column for valid.
--
-- Additive and idempotent.

-- ============================================================
-- Type registry — mirrors src/lib/legalTaxonomy.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS legal_document_types (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  extractor TEXT NOT NULL,
  -- Jurisdiction-specific variants hang off a parent type rather than becoming
  -- new top-level types: 'mn_transfer_on_death_deed' parents to the generic one.
  parent_code TEXT REFERENCES legal_document_types(code) ON DELETE SET NULL,
  jurisdiction TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO legal_document_types (code, label, category, extractor, sort_order) VALUES
  ('last_will_and_testament','Last will and testament','estate_planning','will',10),
  ('codicil','Codicil','estate_planning','will',20),
  ('pour_over_will','Pour-over will','estate_planning','will',30),
  ('revocable_living_trust','Revocable living trust','estate_planning','trust',40),
  ('irrevocable_trust','Irrevocable trust','estate_planning','trust',50),
  ('testamentary_trust','Testamentary trust','estate_planning','trust',60),
  ('trust_amendment_or_restatement','Trust amendment or restatement','estate_planning','trust',70),
  ('certification_of_trust','Certification or abstract of trust','estate_planning','trust',80),
  ('estate_planning_summary','Estate planning summary or binder','estate_planning','generic',90),
  ('durable_financial_poa','Durable financial power of attorney','authority_healthcare','power_of_attorney',100),
  ('limited_or_general_poa','Limited or general power of attorney','authority_healthcare','power_of_attorney',110),
  ('healthcare_poa','Healthcare power of attorney','authority_healthcare','healthcare_directive',120),
  ('advance_healthcare_directive','Advance healthcare directive','authority_healthcare','healthcare_directive',130),
  ('living_will','Living will','authority_healthcare','healthcare_directive',140),
  ('hipaa_authorization','HIPAA authorization','authority_healthcare','healthcare_directive',150),
  ('dnr_or_polst','DNR order or POLST/MOLST form','authority_healthcare','healthcare_directive',160),
  ('guardian_or_conservator_appointment','Appointment of guardian or conservator','authority_healthcare','family',170),
  ('standby_guardianship_authorization','Standby or temporary guardianship authorization','authority_healthcare','family',180),
  ('warranty_deed','Warranty deed','property_ownership','deed_property',190),
  ('quitclaim_deed','Quitclaim deed','property_ownership','deed_property',200),
  ('transfer_on_death_deed','Transfer-on-death deed','property_ownership','deed_property',210),
  ('life_estate_deed','Life estate deed','property_ownership','deed_property',220),
  ('mortgage_or_security_instrument','Mortgage or security instrument','property_ownership','deed_property',230),
  ('property_title','Property title document','property_ownership','deed_property',240),
  ('vehicle_title','Vehicle title','property_ownership','deed_property',250),
  ('boat_or_rv_title','Boat or recreational vehicle title','property_ownership','deed_property',260),
  ('bill_of_sale','Bill of sale','property_ownership','deed_property',270),
  ('homestead_filing','Homestead-related legal filing','property_ownership','deed_property',280),
  ('prenuptial_agreement','Prenuptial agreement','family','family',290),
  ('postnuptial_agreement','Postnuptial agreement','family','family',300),
  ('marriage_certificate','Marriage certificate','family','family',310),
  ('divorce_decree','Divorce decree','family','family',320),
  ('legal_separation_agreement','Legal separation agreement','family','family',330),
  ('custody_or_parenting_agreement','Child custody or parenting agreement','family','family',340),
  ('adoption_decree','Adoption decree','family','family',350),
  ('name_change_order','Name-change order','family','family',360),
  ('guardianship_or_conservatorship_order','Guardianship or conservatorship order','family','family',370),
  ('articles_of_incorporation_or_organization','Articles of incorporation or organization','business','business',380),
  ('operating_agreement','Operating agreement','business','business',390),
  ('partnership_agreement','Partnership agreement','business','business',400),
  ('shareholder_agreement','Shareholder agreement','business','business',410),
  ('buy_sell_agreement','Buy-sell agreement','business','business',420),
  ('business_succession_document','Business succession document','business','business',430),
  ('beneficial_ownership_record','Beneficial ownership or ownership record','business','business',440),
  ('personal_guarantee','Personal guarantee','business','business',450),
  ('promissory_note','Promissory note','business','business',460),
  ('settlement_agreement','Settlement agreement','business','generic',470),
  ('court_order_or_judgment','Court order or judgment','business','generic',480),
  ('unclassified_legal_contract','Legal contract, not otherwise classified','business','generic',490),
  ('unknown_legal_document','Unrecognised legal document','unclassified','generic',900),
  ('possibly_legal','Possibly a legal document','unclassified','generic',910),
  ('not_legal','Not a legal document','unclassified','generic',920)
ON CONFLICT (code) DO UPDATE
  SET label = EXCLUDED.label, category = EXCLUDED.category, extractor = EXCLUDED.extractor;

-- ============================================================
-- Extraction header — one row per pass over one uploaded file
-- ============================================================
CREATE TABLE IF NOT EXISTS legal_document_extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,

  -- Classification. recognition answers "is this legal at all", which is a
  -- separate question from which type it is: a document can be plainly legal and
  -- of an uncertain type, and the UI must be able to say so.
  recognition TEXT NOT NULL DEFAULT 'possibly_legal'
    CHECK (recognition IN ('legal','possibly_legal','not_legal')),
  document_type TEXT REFERENCES legal_document_types(code) ON DELETE SET NULL,
  document_subtype TEXT,
  category TEXT,
  classification_confidence NUMERIC,
  classification_reason TEXT,
  -- Set when the user corrects the type. The model's answer is never overwritten.
  user_document_type TEXT REFERENCES legal_document_types(code) ON DELETE SET NULL,
  user_corrected_at TIMESTAMPTZ,

  -- What the document says about itself. Never a validity judgement.
  document_status TEXT NOT NULL DEFAULT 'unknown' CHECK (document_status IN (
    'draft','executed','amended','revoked','expired','recorded','certified_copy','unknown'
  )),
  document_title TEXT,
  execution_date DATE,
  effective_date DATE,
  expiration_date DATE,
  amendment_date DATE,
  recording_date DATE,
  governing_jurisdiction TEXT,
  county TEXT,
  filing_authority TEXT,
  instrument_number TEXT,
  page_count INT,
  document_language TEXT,
  plain_language_summary TEXT,

  -- Sections read as a whole rather than queried field by field.
  execution_observations JSONB NOT NULL DEFAULT '{}'::jsonb,
  referenced_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  referenced_attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  unresolved_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  extraction_quality JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Lifecycle. processing_state is how far Command has got; review_status is
  -- what the user has decided. They are independent: a document can be fully
  -- read and entirely unconfirmed.
  processing_state TEXT NOT NULL DEFAULT 'uploaded' CHECK (processing_state IN (
    'uploaded','queued','processing','needs_review','confirmed','partially_confirmed',
    'failed','unsupported','superseded','deleted'
  )),
  review_status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (review_status IN ('pending_review','confirmed','partially_confirmed','discarded')),
  failure_reason TEXT,

  -- Idempotency and versioning: re-running extraction adds a version, it does
  -- not overwrite the last one. content_hash lets a duplicate upload be spotted.
  extraction_version INT NOT NULL DEFAULT 1,
  supersedes_extraction_id UUID REFERENCES legal_document_extractions(id) ON DELETE SET NULL,
  content_hash TEXT,
  extractor_version TEXT,
  model TEXT,
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Extracted fields — row per field, so the common-field set can grow without
-- schema churn and without a wide model grammar
-- ============================================================
CREATE TABLE IF NOT EXISTS legal_extracted_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extraction_id UUID REFERENCES legal_document_extractions(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,

  field_code TEXT NOT NULL,
  field_group TEXT,                      -- 'common' | the extractor key
  value_text TEXT,
  value_number NUMERIC,
  value_date DATE,
  value_boolean BOOLEAN,

  -- Provenance. No field may exist without it.
  raw_value TEXT,
  source_page INT,
  source_section TEXT,
  evidence TEXT,
  confidence NUMERIC,
  value_type TEXT NOT NULL DEFAULT 'explicit'
    CHECK (value_type IN ('explicit','calculated','inferred','unknown')),

  -- Sensitive values are stored but masked in the UI and never logged.
  is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,

  -- User review, per field. Confirmation is what promotes a value to canonical.
  review_state TEXT NOT NULL DEFAULT 'unreviewed'
    CHECK (review_state IN ('unreviewed','confirmed','edited','rejected','unresolved')),
  user_value TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Parties and their per-document roles
-- ============================================================
CREATE TABLE IF NOT EXISTS legal_parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extraction_id UUID REFERENCES legal_document_extractions(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,

  party_kind TEXT NOT NULL DEFAULT 'person'
    CHECK (party_kind IN ('person','trust','business','court','agency','unknown')),
  name TEXT NOT NULL,
  name_raw TEXT,
  relationship TEXT,
  address TEXT,
  identifiers JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- A suggestion, never an assumption. A differing spelling or address does not
  -- overwrite a household record; it produces a match to review.
  matched_family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  match_confidence NUMERIC,
  match_state TEXT NOT NULL DEFAULT 'unmatched'
    CHECK (match_state IN ('unmatched','suggested','confirmed','rejected','conflict')),
  match_conflict TEXT,

  source_page INT,
  evidence TEXT,
  confidence NUMERIC,
  value_type TEXT NOT NULL DEFAULT 'explicit'
    CHECK (value_type IN ('explicit','calculated','inferred','unknown')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legal_party_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_id UUID REFERENCES legal_parties(id) ON DELETE CASCADE NOT NULL,
  extraction_id UUID REFERENCES legal_document_extractions(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  role_code TEXT NOT NULL,
  role_detail TEXT,                      -- 'successor trustee, second in order'
  priority INT,                          -- order of succession where stated
  acts_jointly TEXT CHECK (acts_jointly IN ('jointly','severally','successively','not_stated')),
  source_page INT,
  evidence TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Type-specific provisions — one table, keyed by code, rather than six tables
-- ============================================================
CREATE TABLE IF NOT EXISTS legal_provisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extraction_id UUID REFERENCES legal_document_extractions(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  extractor TEXT NOT NULL,               -- will | trust | power_of_attorney | ...
  provision_code TEXT NOT NULL,          -- 'guardian_nomination', 'distribution_terms', ...
  label TEXT,
  summary TEXT,
  document_language TEXT,                -- exact wording; simplification changes meaning
  applies_to TEXT,
  amount NUMERIC,
  percentage NUMERIC,
  effective_condition TEXT,
  is_present BOOLEAN,                    -- NULL = not determinable from this copy
  source_page INT,
  source_section TEXT,
  evidence TEXT,
  confidence NUMERIC,
  value_type TEXT NOT NULL DEFAULT 'explicit'
    CHECK (value_type IN ('explicit','calculated','inferred','unknown')),
  review_state TEXT NOT NULL DEFAULT 'unreviewed'
    CHECK (review_state IN ('unreviewed','confirmed','edited','rejected','unresolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Relationships between documents — proposed, never applied automatically
-- ============================================================
CREATE TABLE IF NOT EXISTS legal_document_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  from_extraction_id UUID REFERENCES legal_document_extractions(id) ON DELETE CASCADE NOT NULL,
  to_extraction_id UUID REFERENCES legal_document_extractions(id) ON DELETE CASCADE,
  -- Set when the referenced document is named but not in Command.
  to_description TEXT,
  relationship TEXT NOT NULL CHECK (relationship IN (
    'amends','restates','revokes','codicil_to','duplicate_of','draft_of',
    'recorded_copy_of','conflicts_with','references','superseded_by'
  )),
  rationale TEXT,
  confidence NUMERIC,
  -- The newest upload is not automatically the controlling document. A user
  -- confirms the relationship; dates inform the suggestion, they do not decide.
  state TEXT NOT NULL DEFAULT 'suggested'
    CHECK (state IN ('suggested','confirmed','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Issue flags — observations, never conclusions
-- ============================================================
CREATE TABLE IF NOT EXISTS legal_issue_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  extraction_id UUID REFERENCES legal_document_extractions(id) ON DELETE CASCADE,
  flag_code TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'informational'
    CHECK (severity IN ('informational','worth_reviewing','significant')),
  confidence NUMERIC,
  explanation TEXT NOT NULL,
  suggested_action TEXT,
  attorney_review_suggested BOOLEAN NOT NULL DEFAULT FALSE,
  source_page INT,
  evidence TEXT,
  state TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open','acknowledged','resolved','dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Profile facts — the estate-planning overview, provenance-tagged
-- ============================================================
CREATE TABLE IF NOT EXISTS legal_profile_facts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  fact_code TEXT NOT NULL,               -- 'has_will', 'named_guardian', ...
  subject_family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  subject_label TEXT,
  value_text TEXT,
  value_date DATE,
  -- 'document_found' / 'not_found_in_command' / 'not_yet_confirmed'. Never a
  -- claim that the household does not have the document.
  state TEXT NOT NULL DEFAULT 'not_found_in_command' CHECK (state IN (
    'document_found','not_found_in_command','not_yet_confirmed'
  )),
  origin TEXT NOT NULL DEFAULT 'document_extracted'
    CHECK (origin IN ('user_entered','document_extracted','user_confirmed')),
  source_extraction_id UUID REFERENCES legal_document_extractions(id) ON DELETE SET NULL,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  confidence NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (household_id, fact_code, subject_label)
);

-- ============================================================
-- Canonical record — extend, do not replace
-- ============================================================
ALTER TABLE legal_documents
  ADD COLUMN IF NOT EXISTS document_type TEXT REFERENCES legal_document_types(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_subtype TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS execution_date DATE,
  ADD COLUMN IF NOT EXISTS effective_date DATE,
  ADD COLUMN IF NOT EXISTS expiration_date DATE,
  ADD COLUMN IF NOT EXISTS governing_jurisdiction TEXT,
  ADD COLUMN IF NOT EXISTS document_status TEXT,
  ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_extraction_id UUID REFERENCES legal_document_extractions(id) ON DELETE SET NULL;

-- The legacy CHECK allowed seven values. The taxonomy has fifty-odd, and the
-- canonical row now carries the specific type in document_type; `type` stays as
-- the coarse bucket the existing Legal view renders.
ALTER TABLE legal_documents DROP CONSTRAINT IF EXISTS legal_documents_type_check;
ALTER TABLE legal_documents ADD CONSTRAINT legal_documents_type_check CHECK (type IN (
  'will','trust','poa','healthcare_directive','beneficiary','prenup',
  'deed','title','family','business','court','other'
));

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS lde_household_idx     ON legal_document_extractions (household_id);
CREATE INDEX IF NOT EXISTS lde_document_idx      ON legal_document_extractions (document_id);
CREATE INDEX IF NOT EXISTS lde_review_idx        ON legal_document_extractions (household_id, review_status);
CREATE INDEX IF NOT EXISTS lde_type_idx          ON legal_document_extractions (household_id, document_type);
CREATE INDEX IF NOT EXISTS lde_hash_idx          ON legal_document_extractions (household_id, content_hash);
CREATE INDEX IF NOT EXISTS lef_extraction_idx    ON legal_extracted_fields (extraction_id);
CREATE INDEX IF NOT EXISTS lef_code_idx          ON legal_extracted_fields (household_id, field_code);
CREATE INDEX IF NOT EXISTS lp_extraction_idx     ON legal_parties (extraction_id);
CREATE INDEX IF NOT EXISTS lp_match_idx          ON legal_parties (household_id, match_state);
CREATE INDEX IF NOT EXISTS lpr_party_idx         ON legal_party_roles (party_id);
CREATE INDEX IF NOT EXISTS lpr_role_idx          ON legal_party_roles (household_id, role_code);
CREATE INDEX IF NOT EXISTS lprov_extraction_idx  ON legal_provisions (extraction_id);
CREATE INDEX IF NOT EXISTS lprov_code_idx        ON legal_provisions (household_id, provision_code);
CREATE INDEX IF NOT EXISTS ldr_from_idx          ON legal_document_relationships (from_extraction_id);
CREATE INDEX IF NOT EXISTS ldr_household_idx     ON legal_document_relationships (household_id, state);
CREATE INDEX IF NOT EXISTS lif_household_idx     ON legal_issue_flags (household_id, state);
CREATE INDEX IF NOT EXISTS lif_extraction_idx    ON legal_issue_flags (extraction_id);
CREATE INDEX IF NOT EXISTS lpf_household_idx     ON legal_profile_facts (household_id, fact_code);

-- ============================================================
-- RLS — household isolation, enforced in the database rather than the client
-- ============================================================
ALTER TABLE legal_document_extractions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_extracted_fields        ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_parties                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_party_roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_provisions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_document_relationships  ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_issue_flags             ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_profile_facts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_document_types          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members only" ON legal_document_extractions;
CREATE POLICY "Household members only" ON legal_document_extractions
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON legal_extracted_fields;
CREATE POLICY "Household members only" ON legal_extracted_fields
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON legal_parties;
CREATE POLICY "Household members only" ON legal_parties
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON legal_party_roles;
CREATE POLICY "Household members only" ON legal_party_roles
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON legal_provisions;
CREATE POLICY "Household members only" ON legal_provisions
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON legal_document_relationships;
CREATE POLICY "Household members only" ON legal_document_relationships
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON legal_issue_flags;
CREATE POLICY "Household members only" ON legal_issue_flags
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON legal_profile_facts;
CREATE POLICY "Household members only" ON legal_profile_facts
  FOR ALL USING (household_owner(household_id));

-- The type registry is shared reference data: readable by any signed-in user,
-- writable by no one through the client.
DROP POLICY IF EXISTS "Readable by authenticated users" ON legal_document_types;
CREATE POLICY "Readable by authenticated users" ON legal_document_types
  FOR SELECT TO authenticated USING (TRUE);

-- ============================================================
-- Audit — reuse the existing trigger rather than a second log
-- ============================================================
DROP TRIGGER IF EXISTS history_legal_document_extractions ON legal_document_extractions;
CREATE TRIGGER history_legal_document_extractions
  AFTER INSERT OR UPDATE OR DELETE ON legal_document_extractions
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();

DROP TRIGGER IF EXISTS history_legal_profile_facts ON legal_profile_facts;
CREATE TRIGGER history_legal_profile_facts
  AFTER INSERT OR UPDATE OR DELETE ON legal_profile_facts
  FOR EACH ROW EXECUTE FUNCTION capture_record_history();
