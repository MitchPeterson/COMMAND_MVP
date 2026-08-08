-- Insurance policy extraction: normalized, auditable policy data.
--
-- Design notes
--
-- 1. Every materially relevant value carries its own provenance. Child rows
--    store raw_value / source_page / source_section / evidence / confidence /
--    value_type alongside the normalized value, so nothing in this schema is a
--    bare number you cannot trace back to a line in a PDF.
--
-- 2. value_type separates fact from arithmetic from guesswork:
--      explicit   - stated in the document
--      calculated - derived by us (e.g. 2% of Coverage A)
--      inferred   - concluded from context, not stated
--      unknown    - not found in the documents provided
--    "unknown" is deliberately distinct from "not covered".
--
-- 3. Conflicts are preserved rather than resolved away. When an endorsement
--    overrides the dec page, both rows survive; is_controlling marks the winner
--    and superseded_by points at it.
--
-- 4. Standardized codes (coverage_code, deductible_type, ...) make policies
--    comparable across carriers; *_raw columns keep the carrier's own wording,
--    which is often legally load-bearing.
--
-- Additive and idempotent.

-- ============================================================
-- Header: one row per extracted insurance document
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_policy_extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,

  -- What kind of document this is. A quote is not a policy; an ID card is not
  -- a coverage source. Downstream logic must be able to tell.
  document_class TEXT NOT NULL DEFAULT 'unknown' CHECK (document_class IN (
    'declarations_page','full_policy','renewal_notice','endorsement','rider',
    'billing_notice','id_card','certificate_of_insurance','coverage_summary',
    'quote','application','unknown'
  )),
  insurance_type TEXT NOT NULL DEFAULT 'unknown' CHECK (insurance_type IN (
    'homeowners','auto','umbrella','renters','flood','life','disability','boat',
    'valuables','motorcycle','rv','earthquake','health','other','unknown'
  )),

  -- Promoted for cross-policy queries. Full provenance for each lives in
  -- policy_fields; these are the normalized values only.
  carrier TEXT,
  policy_number TEXT,
  policy_status TEXT,
  effective_date DATE,
  expiration_date DATE,
  state_of_issuance TEXT,
  annual_premium NUMERIC,

  -- Sections that are read as a whole rather than queried field by field.
  policy_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  premiums JSONB NOT NULL DEFAULT '[]'::jsonb,
  valuation_terms JSONB NOT NULL DEFAULT '[]'::jsonb,
  conflicts JSONB NOT NULL DEFAULT '[]'::jsonb,
  unresolved_items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- §15 completeness: can the recommendation layer trust this yet?
  extraction_quality JSONB NOT NULL DEFAULT '{}'::jsonb,
  declarations_only BOOLEAN NOT NULL DEFAULT FALSE,
  has_full_policy BOOLEAN NOT NULL DEFAULT FALSE,
  endorsements_appear_missing BOOLEAN NOT NULL DEFAULT FALSE,

  plain_language_summary TEXT,

  -- Plain-language summaries accompany the structured data, never replace it.
  review_status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (review_status IN ('pending_review','confirmed','discarded')),
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Insured parties (§1, §10)
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_insured_parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extraction_id UUID REFERENCES insurance_policy_extractions(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'named_insured','additional_insured','covered_person','policy_owner',
    'insured','successor_owner','other'
  )),
  name TEXT,
  relationship TEXT,
  identifiers JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Entity matching is a suggestion, never an assumption (§9).
  matched_family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  match_confidence NUMERIC,
  source_page INT,
  evidence TEXT,
  confidence NUMERIC,
  value_type TEXT NOT NULL DEFAULT 'explicit'
    CHECK (value_type IN ('explicit','calculated','inferred','unknown')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Insured assets (§9)
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_insured_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extraction_id UUID REFERENCES insurance_policy_extractions(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN (
    'property','rental_property','vehicle','boat','rv','motorcycle','jewelry',
    'valuable_item','business_asset','other'
  )),
  description TEXT,
  address TEXT,
  vin TEXT,
  serial_number TEXT,
  year INT,
  make TEXT,
  model TEXT,
  matched_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  match_confidence NUMERIC,
  source_page INT,
  evidence TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Coverages (§3)
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_coverages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extraction_id UUID REFERENCES insurance_policy_extractions(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,

  coverage_code TEXT NOT NULL,          -- standardized; comparable across carriers
  coverage_name_raw TEXT,               -- carrier's own wording, preserved verbatim
  applies_to TEXT,                      -- which insured asset/person

  limit_amount NUMERIC,
  limit_basis TEXT CHECK (limit_basis IN (
    'per_occurrence','per_person','aggregate','combined_single','per_item',
    'total','percentage_of_dwelling','not_stated'
  )),
  secondary_limit_amount NUMERIC,
  secondary_limit_basis TEXT,
  deductible_amount NUMERIC,
  deductible_percent NUMERIC,
  coinsurance TEXT,

  included_status TEXT NOT NULL DEFAULT 'not_found' CHECK (included_status IN (
    'included','excluded','optional_not_purchased','not_found'
  )),
  coverage_basis TEXT CHECK (coverage_basis IN (
    'replacement_cost','extended_replacement_cost','guaranteed_replacement_cost',
    'actual_cash_value','agreed_value','stated_value','market_value',
    'functional_replacement_cost','depreciated_value','not_stated'
  )),

  notes TEXT,
  raw_value TEXT,
  source_page INT,
  source_section TEXT,
  evidence TEXT,
  confidence NUMERIC,
  value_type TEXT NOT NULL DEFAULT 'explicit'
    CHECK (value_type IN ('explicit','calculated','inferred','unknown')),

  -- Conflict handling (§13): an endorsement can supersede a dec-page limit.
  is_controlling BOOLEAN NOT NULL DEFAULT TRUE,
  superseded_by UUID REFERENCES insurance_coverages(id) ON DELETE SET NULL,
  supersede_rationale TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Deductibles (§4) — separate from coverages: percentage deductibles carry a
-- calculated dollar exposure alongside, never instead of, the stated language.
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_deductibles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extraction_id UUID REFERENCES insurance_policy_extractions(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  deductible_type TEXT NOT NULL CHECK (deductible_type IN (
    'standard','wind','hail','wind_hail','hurricane','named_storm','percentage',
    'collision','comprehensive','flood','earthquake','water_backup','theft','special','other'
  )),
  amount NUMERIC,
  percent NUMERIC,
  calculation_basis TEXT,               -- e.g. 'dwelling limit'
  calculated_amount NUMERIC,            -- derived exposure, marked as such
  calculation_confidence NUMERIC,
  applies_to TEXT,
  raw_value TEXT,
  source_page INT,
  evidence TEXT,
  confidence NUMERIC,
  value_type TEXT NOT NULL DEFAULT 'explicit'
    CHECK (value_type IN ('explicit','calculated','inferred','unknown')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Exclusions, sublimits, restrictions (§6)
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_exclusions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extraction_id UUID REFERENCES insurance_policy_extractions(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  summary TEXT,
  policy_language TEXT,                 -- exact wording; simplification can change meaning
  affected_coverage TEXT,
  sublimit_amount NUMERIC,
  waiting_period TEXT,
  -- Severity is capped at 'meaningful' when financial impact is indeterminate.
  severity TEXT NOT NULL DEFAULT 'informational'
    CHECK (severity IN ('informational','meaningful','significant','critical')),
  source_page INT,
  evidence TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Endorsements and riders (§7) — authoritative modifications to the base form
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_endorsements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extraction_id UUID REFERENCES insurance_policy_extractions(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  endorsement_number TEXT,
  name TEXT,
  effective_date DATE,
  modifies_coverage TEXT,
  coverage_added TEXT,
  coverage_removed TEXT,
  limit_amount NUMERIC,
  deductible_amount NUMERIC,
  premium_impact NUMERIC,
  restrictions TEXT,
  source_page INT,
  evidence TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Beneficiaries and ownership (§10) — names preserved exactly as written
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_beneficiaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extraction_id UUID REFERENCES insurance_policy_extractions(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  designation TEXT NOT NULL CHECK (designation IN ('primary','contingent','irrevocable','successor_owner')),
  name TEXT,
  relationship TEXT,
  percentage NUMERIC,
  is_trust BOOLEAN NOT NULL DEFAULT FALSE,
  is_employer_owned BOOLEAN NOT NULL DEFAULT FALSE,
  source_page INT,
  evidence TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Underlying requirements (§8) — machine-comparable umbrella prerequisites
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_underlying_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extraction_id UUID REFERENCES insurance_policy_extractions(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  requirement_type TEXT NOT NULL CHECK (requirement_type IN (
    'home_liability','auto_liability','boat_liability','rv_liability',
    'motorcycle_liability','rental_property_liability','retained_limit','other'
  )),
  required_limit NUMERIC,
  required_limit_basis TEXT,
  notes TEXT,
  source_page INT,
  evidence TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS ipe_household_idx        ON insurance_policy_extractions (household_id);
CREATE INDEX IF NOT EXISTS ipe_document_idx         ON insurance_policy_extractions (document_id);
CREATE INDEX IF NOT EXISTS ipe_type_idx             ON insurance_policy_extractions (household_id, insurance_type);
CREATE INDEX IF NOT EXISTS ipe_review_idx           ON insurance_policy_extractions (household_id, review_status);
CREATE INDEX IF NOT EXISTS ins_parties_extraction_idx  ON insurance_insured_parties (extraction_id);
CREATE INDEX IF NOT EXISTS ins_assets_extraction_idx   ON insurance_insured_assets (extraction_id);
CREATE INDEX IF NOT EXISTS ins_cov_extraction_idx      ON insurance_coverages (extraction_id);
CREATE INDEX IF NOT EXISTS ins_cov_code_idx            ON insurance_coverages (household_id, coverage_code);
CREATE INDEX IF NOT EXISTS ins_ded_extraction_idx      ON insurance_deductibles (extraction_id);
CREATE INDEX IF NOT EXISTS ins_exc_extraction_idx      ON insurance_exclusions (extraction_id);
CREATE INDEX IF NOT EXISTS ins_end_extraction_idx      ON insurance_endorsements (extraction_id);
CREATE INDEX IF NOT EXISTS ins_ben_extraction_idx      ON insurance_beneficiaries (extraction_id);
CREATE INDEX IF NOT EXISTS ins_und_extraction_idx      ON insurance_underlying_requirements (extraction_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE insurance_policy_extractions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_insured_parties         ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_insured_assets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_coverages               ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_deductibles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_exclusions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_endorsements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_beneficiaries           ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_underlying_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members only" ON insurance_policy_extractions;
CREATE POLICY "Household members only" ON insurance_policy_extractions
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON insurance_insured_parties;
CREATE POLICY "Household members only" ON insurance_insured_parties
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON insurance_insured_assets;
CREATE POLICY "Household members only" ON insurance_insured_assets
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON insurance_coverages;
CREATE POLICY "Household members only" ON insurance_coverages
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON insurance_deductibles;
CREATE POLICY "Household members only" ON insurance_deductibles
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON insurance_exclusions;
CREATE POLICY "Household members only" ON insurance_exclusions
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON insurance_endorsements;
CREATE POLICY "Household members only" ON insurance_endorsements
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON insurance_beneficiaries;
CREATE POLICY "Household members only" ON insurance_beneficiaries
  FOR ALL USING (household_owner(household_id));
DROP POLICY IF EXISTS "Household members only" ON insurance_underlying_requirements;
CREATE POLICY "Household members only" ON insurance_underlying_requirements
  FOR ALL USING (household_owner(household_id));

-- ============================================================
-- Liability stack (§8) — one comparable row per liability exposure across every
-- confirmed policy, so umbrella-vs-underlying checks are a single query rather
-- than a join across six tables.
-- ============================================================
CREATE OR REPLACE VIEW insurance_liability_stack AS
SELECT
  e.household_id,
  e.id                AS extraction_id,
  e.insurance_type,
  e.carrier,
  e.policy_number,
  e.expiration_date,
  c.coverage_code,
  c.limit_amount,
  c.limit_basis,
  c.is_controlling,
  e.review_status
FROM insurance_policy_extractions e
JOIN insurance_coverages c ON c.extraction_id = e.id
WHERE c.coverage_code IN (
  'personal_liability','bodily_injury_liability','property_damage_liability',
  'combined_single_limit','umbrella_liability','boat_liability',
  'motorcycle_liability','rv_liability','rental_property_liability'
)
AND c.is_controlling;
