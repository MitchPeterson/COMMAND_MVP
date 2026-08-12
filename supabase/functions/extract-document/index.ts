import Anthropic from 'npm:@anthropic-ai/sdk@0.115.0';
import { createClient } from 'npm:@supabase/supabase-js@2.111.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const storageBucket = Deno.env.get('SUPABASE_STORAGE_BUCKET') ?? 'raw-uploads';
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
const anthropicModel = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-opus-5';

// A model per role rather than one for everything.
//
// Classification is a routing decision over a document we are about to read
// properly anyway — Haiku does it at a fifth of Opus's price, and a wrong
// classification surfaces immediately as the wrong review screen rather than as
// a quiet error in someone's profile.
//
// The extraction passes stay on the main model together, deliberately. Prompt
// caches are scoped to a model, so splitting the passes across tiers would
// forfeit the document cache below — and caching the document beats downgrading
// the model, because the document is the bulk of the input and it is sent three
// times.
const CLASSIFY_MODEL = Deno.env.get('ANTHROPIC_CLASSIFY_MODEL') ?? 'claude-haiku-4-5';
const GENERIC_MODEL = Deno.env.get('ANTHROPIC_GENERIC_MODEL') ?? 'claude-sonnet-5';

// Form-shaped documents — a mortgage statement, a warranty card, a 1040 — are
// tabular, single-pass, and read against a strict schema. The hard judgement in
// this function lives in the insurance and legal paths, which stay on
// ANTHROPIC_MODEL. Splitting them means the expensive model is spent where it
// earns its price rather than on reading a printed table.
const FORM_MODEL = Deno.env.get('ANTHROPIC_FORM_MODEL') ?? 'claude-sonnet-5';
const CREDIT_MODEL = Deno.env.get('ANTHROPIC_CREDIT_MODEL') ?? anthropicModel;

// Effort drives thinking tokens, which are billed at the output rate. Dialing it
// down is the fastest lever on a bill that is mostly output, so it is a secret
// rather than a constant.
const EXTRACT_EFFORT = Deno.env.get('ANTHROPIC_EFFORT') ?? 'high';

// Replaying a previous answer instead of buying it again. On by default: the
// cache key covers everything that determines the result, so a hit is the same
// computation rather than a guess that it would have been. Set to 'off' to
// disable, or send fresh:true on a single request to bypass and overwrite.
const RESPONSE_CACHE_ON = (Deno.env.get('ANTHROPIC_RESPONSE_CACHE') ?? 'on') !== 'off';

if (!supabaseUrl || !supabaseServiceRole) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for this function.');
}

const admin = createClient(supabaseUrl, supabaseServiceRole);
const anthropic = anthropicApiKey ? new Anthropic({ apiKey: anthropicApiKey }) : null;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_FILE_BYTES = 18 * 1024 * 1024;

// ─────────────────────────────────────────────────────────────
// Schema note
//
// Structured outputs cap a schema at 16 union-typed parameters, so nothing here
// is nullable. Every value is a required string and "unknown" is expressed via
// value_type, not null. That also satisfies the requirement to distinguish
// "not found in the provided documents" from "not covered".
//
// Amounts come back as strings and are parsed server-side: the model should
// transcribe what the page says, not do arithmetic it cannot show its work for.
// ─────────────────────────────────────────────────────────────

const DOCUMENT_CLASSES = [
  'declarations_page', 'full_policy', 'renewal_notice', 'endorsement', 'rider',
  'billing_notice', 'id_card', 'certificate_of_insurance', 'coverage_summary',
  'quote', 'application', 'unknown',
];

const INSURANCE_TYPES = [
  'homeowners', 'auto', 'umbrella', 'renters', 'flood', 'life', 'disability',
  'boat', 'valuables', 'motorcycle', 'rv', 'earthquake', 'health', 'other', 'unknown',
];

// What a user may override the classifier with. Each maps onto a branch below;
// anything not here would silently do nothing, which is worse than refusing.
const FORCEABLE_TYPES = [
  'credit_card_statement', 'mortgage_statement', 'insurance_dec_page',
  'tax_return', 'legal_document', 'bank_statement', 'paystub',
];

const LEGACY_TYPES = [
  'mortgage_statement', 'insurance_dec_page', 'credit_card_statement',
  'bank_statement', 'tax_document', 'paystub', 'unknown',
];

const VALUE_TYPES = ['explicit', 'calculated', 'inferred', 'unknown'];

// Stamped on every extraction row. Bump it when a prompt or schema changes in a
// way that would make an old reading and a new one incomparable.
const EXTRACTOR_VERSION = 'extract-2026.08.10';

// Canonical coverage vocabulary. Deliberately NOT a schema enum — ~60 values
// blew the compiled-grammar budget. The model writes a loose code, we canonicalize
// here, and insurance_coverages.coverage_code is free text by design.
const COVERAGE_CODE_ALIASES: Record<string, string> = {
  'coverage_a': 'dwelling', 'coverage a': 'dwelling', 'dwelling': 'dwelling',
  'coverage_b': 'other_structures', 'other structures': 'other_structures',
  'coverage_c': 'personal_property', 'personal property': 'personal_property',
  'coverage_d': 'loss_of_use', 'loss of use': 'loss_of_use',
  'coverage_e': 'personal_liability', 'personal liability': 'personal_liability',
  'coverage_f': 'medical_payments', 'medical payments': 'medical_payments',
  'bodily injury': 'bodily_injury_liability', 'bi': 'bodily_injury_liability',
  'property damage': 'property_damage_liability', 'pd': 'property_damage_liability',
  'csl': 'combined_single_limit', 'um': 'uninsured_motorist', 'uim': 'underinsured_motorist',
  'umbrella': 'umbrella_liability', 'excess liability': 'umbrella_liability',
};

function canonicalCoverageCode(raw: string): string {
  const key = String(raw ?? '').trim().toLowerCase();
  if (!key) return 'other';
  if (COVERAGE_CODE_ALIASES[key]) return COVERAGE_CODE_ALIASES[key];
  return key.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'other';
}


const evidenceProps = {
  source_page: { type: 'integer', description: '1-based page number. 0 if unknown.' },
  evidence: { type: 'string', description: 'Short verbatim snippet from the document.' },
  confidence: { type: 'number', description: '0 to 1.' },
  value_type: { type: 'string', enum: VALUE_TYPES },
};
const evidenceKeys = Object.keys(evidenceProps);

function record(props: Record<string, unknown>, extra: string[] = []) {
  return {
    type: 'object',
    properties: { ...props, ...evidenceProps },
    required: [...Object.keys(props), ...evidenceKeys, ...extra],
    additionalProperties: false,
  };
}

// Policy field names are free text for the same grammar-budget reason.


// One monolithic schema exceeded Anthropic's compiled-grammar budget, so
// extraction runs as three focused passes. This also keeps each response well
// inside max_tokens, which matters for multi-page policy contracts.
//
//   A. identity   — who/what/when/cost   (required)
//   B. coverages  — limits and deductibles (required)
//   C. terms      — exclusions, endorsements, beneficiaries, underlying (degradable)

const IDENTITY_SCHEMA = {
  type: 'object',
  properties: {
    document_class: { type: 'string', enum: DOCUMENT_CLASSES },
    insurance_type: { type: 'string', enum: INSURANCE_TYPES },
    policy_fields: {
      type: 'array',
      items: record({
        field: { type: 'string', description: 'snake_case name, e.g. carrier, policy_number, effective_date, expiration_date, agent_name, state_of_issuance, billing_frequency, term_length.' },
        value: { type: 'string' },
      }),
    },
    insured_parties: {
      type: 'array',
      items: record({
        role: { type: 'string', enum: ['named_insured', 'additional_insured', 'covered_person', 'policy_owner', 'insured', 'successor_owner', 'other'] },
        name: { type: 'string' },
        relationship: { type: 'string' },
      }),
    },
    insured_assets: {
      type: 'array',
      items: record({
        asset_type: { type: 'string', enum: ['property', 'rental_property', 'vehicle', 'boat', 'rv', 'motorcycle', 'jewelry', 'valuable_item', 'business_asset', 'other'] },
        description: { type: 'string' },
        address: { type: 'string' },
        vin: { type: 'string' },
        serial_number: { type: 'string' },
        year: { type: 'string' },
        make: { type: 'string' },
        model: { type: 'string' },
      }),
    },
    premiums: {
      type: 'array',
      items: record({
        component: { type: 'string', enum: ['annual_premium', 'installment_premium', 'tax', 'fee', 'surcharge', 'discount', 'policy_fee', 'renewal_premium', 'prior_premium', 'endorsement_premium', 'other'] },
        label: { type: 'string' },
        amount: { type: 'string', description: 'Digits only, e.g. "3200.00". Empty if unknown.' },
        period: { type: 'string', enum: ['annual', 'semiannual', 'quarterly', 'monthly', 'one_time', 'not_stated'] },
      }),
    },
    valuation_terms: {
      type: 'array',
      items: record({
        category: { type: 'string', enum: ['dwelling', 'roof', 'personal_property', 'jewelry', 'vehicle', 'boat', 'scheduled_valuables', 'other_structures', 'other'] },
        method: { type: 'string', enum: ['replacement_cost', 'extended_replacement_cost', 'guaranteed_replacement_cost', 'actual_cash_value', 'agreed_value', 'stated_value', 'market_value', 'functional_replacement_cost', 'depreciated_value', 'not_stated'] },
        notes: { type: 'string' },
      }),
    },
    extraction_quality: {
      type: 'object',
      properties: {
        declarations_only: { type: 'boolean' },
        has_full_policy: { type: 'boolean' },
        endorsements_appear_missing: { type: 'boolean' },
        fields_expected: { type: 'integer' },
        fields_found: { type: 'integer' },
        limitations_summary: { type: 'string', description: 'What this document cannot support, e.g. exclusion analysis from a dec page alone.' },
      },
      required: ['declarations_only', 'has_full_policy', 'endorsements_appear_missing', 'fields_expected', 'fields_found', 'limitations_summary'],
      additionalProperties: false,
    },
    plain_language_summary: { type: 'string' },
  },
  required: ['document_class', 'insurance_type', 'policy_fields', 'insured_parties', 'insured_assets', 'premiums', 'valuation_terms', 'extraction_quality', 'plain_language_summary'],
  additionalProperties: false,
};

const COVERAGE_SCHEMA = {
  type: 'object',
  properties: {
    coverages: {
      type: 'array',
      items: record({
        coverage_code: { type: 'string', description: 'snake_case standard name. Home: dwelling, other_structures, personal_property, loss_of_use, personal_liability, medical_payments, ordinance_or_law, water_backup, sewer_backup, service_line, equipment_breakdown, identity_theft, scheduled_property, jewelry, firearms, electronics, business_property, mold, flood, earthquake, extended_replacement_cost, guaranteed_replacement_cost. Auto: bodily_injury_liability, property_damage_liability, combined_single_limit, uninsured_motorist, underinsured_motorist, pip, collision, comprehensive, glass, rental_reimbursement, roadside_assistance, gap, new_car_replacement, oem_parts, accident_forgiveness, custom_equipment, towing, rideshare_endorsement. Umbrella: umbrella_liability, retained_limit. Other liability: boat_liability, motorcycle_liability, rv_liability, rental_property_liability. Life: death_benefit, cash_value, accelerated_death_benefit, waiver_of_premium, conversion_rights. Disability: monthly_benefit, residual_disability, cola_rider, own_occupation. Use "other" only when nothing above fits.' },
        coverage_name_raw: { type: 'string', description: "The carrier's own wording, verbatim." },
        applies_to: { type: 'string' },
        limit_amount: { type: 'string' },
        limit_basis: { type: 'string', enum: ['per_occurrence', 'per_person', 'aggregate', 'combined_single', 'per_item', 'total', 'percentage_of_dwelling', 'not_stated'] },
        secondary_limit_amount: { type: 'string' },
        deductible_amount: { type: 'string' },
        included_status: { type: 'string', enum: ['included', 'excluded', 'optional_not_purchased', 'not_found'] },
        coverage_basis: { type: 'string', enum: ['replacement_cost', 'extended_replacement_cost', 'guaranteed_replacement_cost', 'actual_cash_value', 'agreed_value', 'stated_value', 'market_value', 'functional_replacement_cost', 'depreciated_value', 'not_stated'] },
        notes: { type: 'string' },
        raw_value: { type: 'string' },
        source_section: { type: 'string' },
      }),
    },
    deductibles: {
      type: 'array',
      items: record({
        deductible_type: { type: 'string', enum: ['standard', 'wind', 'hail', 'wind_hail', 'hurricane', 'named_storm', 'percentage', 'collision', 'comprehensive', 'flood', 'earthquake', 'water_backup', 'theft', 'special', 'other'] },
        amount: { type: 'string' },
        percent: { type: 'string' },
        calculation_basis: { type: 'string', description: 'What a percentage applies to, e.g. "dwelling limit".' },
        applies_to: { type: 'string' },
        raw_value: { type: 'string' },
      }),
    },
  },
  required: ['coverages', 'deductibles'],
  additionalProperties: false,
};

const TERMS_SCHEMA = {
  type: 'object',
  properties: {
    exclusions: {
      type: 'array',
      items: record({
        category: { type: 'string' },
        summary: { type: 'string' },
        policy_language: { type: 'string', description: 'Exact wording. Do not paraphrase.' },
        affected_coverage: { type: 'string' },
        sublimit_amount: { type: 'string' },
        waiting_period: { type: 'string' },
        severity: { type: 'string', enum: ['informational', 'meaningful', 'significant', 'critical'] },
      }),
    },
    endorsements: {
      type: 'array',
      items: record({
        endorsement_number: { type: 'string' },
        name: { type: 'string' },
        effective_date: { type: 'string' },
        modifies_coverage: { type: 'string' },
        coverage_added: { type: 'string' },
        coverage_removed: { type: 'string' },
        limit_amount: { type: 'string' },
        deductible_amount: { type: 'string' },
        premium_impact: { type: 'string' },
        restrictions: { type: 'string' },
      }),
    },
    beneficiaries: {
      type: 'array',
      items: record({
        designation: { type: 'string', enum: ['primary', 'contingent', 'irrevocable', 'successor_owner'] },
        name: { type: 'string', description: 'Exactly as written in the policy.' },
        relationship: { type: 'string' },
        percentage: { type: 'string' },
        is_trust: { type: 'boolean' },
        is_employer_owned: { type: 'boolean' },
      }),
    },
    underlying_requirements: {
      type: 'array',
      items: record({
        requirement_type: { type: 'string', enum: ['home_liability', 'auto_liability', 'boat_liability', 'rv_liability', 'motorcycle_liability', 'rental_property_liability', 'retained_limit', 'other'] },
        required_limit: { type: 'string' },
        required_limit_basis: { type: 'string' },
        notes: { type: 'string' },
      }),
    },
    conflicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          controlling_value: { type: 'string' },
          controlling_source: { type: 'string' },
          superseded_value: { type: 'string' },
          superseded_source: { type: 'string' },
          rationale: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['field', 'controlling_value', 'controlling_source', 'superseded_value', 'superseded_source', 'rationale', 'confidence'],
        additionalProperties: false,
      },
    },
    unresolved_items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string' },
          why_unresolved: { type: 'string' },
          needed_document: { type: 'string' },
        },
        required: ['item', 'why_unresolved', 'needed_document'],
        additionalProperties: false,
      },
    },
  },
  required: ['exclusions', 'endorsements', 'beneficiaries', 'underlying_requirements', 'conflicts', 'unresolved_items'],
  additionalProperties: false,
};

const LEGAL_RECOGNITION = ['legal', 'possibly_legal', 'not_legal'];

// Mirrors SYSTEM_CATEGORIES in src/lib/homeSystems.ts. Kept in the prompt rather
// than the grammar for the same reason the legal taxonomy is.
const HOME_CATEGORY_CODES =
  'furnace, air_conditioner, heat_pump, water_heater, water_softener, sump_pump, ' +
  'electrical_panel, roof_asphalt, roof_metal, windows, siding, gutters, garage_door, ' +
  'refrigerator, range, dishwasher, washer, dryer, microwave, garbage_disposal, ' +
  'deck, driveway, fence, other';

const HOME_DOCUMENT_TYPES = [
  'mortgage_statement', 'appliance_warranty', 'appliance_manual', 'appliance_receipt',
  'service_contract', 'home_inspection', 'contractor_invoice', 'none',
];

const TAX_DOCUMENT_TYPES = [
  'tax_return', 'w2', '1099', '1098', 'k1', '1095', 'other_tax_form', 'none',
];

const LEGAL_DOCUMENT_STATUSES = [
  'draft', 'executed', 'amended', 'revoked', 'expired', 'recorded', 'certified_copy', 'unknown',
];

// legal_type is a plain string, not an enum: the taxonomy is fifty-odd codes and
// lives in the legal_document_types table, which is also what validates the
// answer. Enumerating it in the grammar would repeat the mistake that made the
// first insurance schema unshippable. The codes go in the prompt instead.
const CLASSIFY_SCHEMA = {
  type: 'object',
  properties: {
    is_insurance: { type: 'boolean' },
    document_class: { type: 'string', enum: DOCUMENT_CLASSES },
    insurance_type: { type: 'string', enum: INSURANCE_TYPES },
    legacy_type: { type: 'string', enum: LEGACY_TYPES },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },

    // Legal classification. recognition is a separate judgement from type: a
    // document can be plainly legal and of an uncertain type, and the review
    // screen has to be able to say exactly that.
    legal_recognition: { type: 'string', enum: LEGAL_RECOGNITION },
    legal_type: { type: 'string' },
    legal_subtype: { type: 'string' },
    legal_confidence: { type: 'number' },
    legal_reason: { type: 'string' },
    document_title: { type: 'string' },
    document_status: { type: 'string', enum: LEGAL_DOCUMENT_STATUSES },
    page_count: { type: 'number' },
    document_language: { type: 'string' },

    // Home paperwork. A mortgage statement was already recognized as a legacy
    // financial type and read as loose strings; a warranty had no home at all.
    home_document_type: { type: 'string', enum: HOME_DOCUMENT_TYPES },

    // Tax paperwork. A filed return is the highest-value document a household
    // can hand over: it is what makes planning during the year possible at all.
    tax_document_type: { type: 'string', enum: TAX_DOCUMENT_TYPES },
  },
  required: [
    'is_insurance', 'document_class', 'insurance_type', 'legacy_type', 'confidence',
    'legal_recognition', 'legal_type', 'legal_subtype', 'legal_confidence', 'legal_reason',
    'document_title', 'document_status', 'page_count', 'document_language',
    'home_document_type', 'tax_document_type',
  ],
  additionalProperties: false,
};

const LEGAL_CLASSIFY_RULES = `
Legal classification rules:

1. legal_recognition is "legal" only when the document is itself a legal instrument
   or record — a will, trust, deed, court order, power of attorney, agreement.
   A letter *about* a legal matter is "possibly_legal". A bank statement is "not_legal".
2. legal_type must be one of the codes listed above, copied exactly. If none of them
   fits, return "unknown_legal_document" — never invent a code and never force a
   near-miss. An honest unknown is more useful than a confident mistake.
3. legal_subtype is free text for a jurisdiction or form variant when the document
   states one ("Minnesota statutory short form"). Empty string when it does not.
4. legal_confidence is 0 to 1 for the *type*, independent of recognition.
5. legal_reason is one sentence naming what in the document decided it — a title,
   a recital, a signature block. This is shown to the user.
6. home_document_type identifies paperwork about the house itself. A mortgage
   statement, a warranty card or certificate, an appliance manual, a purchase
   receipt for equipment, a home service contract, an inspection report, or a
   contractor's invoice. Anything else is "none" — this is a narrow field, not a
   catch-all for documents that happen to mention a house.
7. document_status reports what the document says about itself: "draft" if it is
   marked draft, "recorded" if it carries recording detail, "executed" if it is
   signed and dated. Use "unknown" when the pages do not say. This is never a
   judgement about whether the document is valid or effective.
8. document_title is the document's own title, verbatim. Empty string if untitled.
9. page_count is the number of pages provided. 0 if you cannot tell.
10. legacy_type separates the financial documents, and the distinction that
   matters most is credit_card_statement versus bank_statement. They look alike
   — an institution, an account, a period, a list of transactions — and a card
   issued by a bank is branded like a bank document. Decide it on the figures,
   not the letterhead:

     credit_card_statement has a credit limit, available credit, a minimum
     payment due, a payment due date, and APR or interest-charge disclosures.
     It usually reports rewards. The balance is money owed.

     bank_statement has deposits and withdrawals against a running balance, and
     no credit limit, no minimum payment and no APR table. The balance is money
     held.

   A "minimum payment due" or a stated credit limit settles it: that is a credit
   card statement. Get this right — a whole extraction path depends on it.
11. tax_document_type is "tax_return" only for a filed or prepared return —
   a Form 1040 with its schedules, or a preparer's copy of one. An individual
   information form is "w2", "1099", "1098", "k1" or "1095". A tax organizer, a
   notice from a tax authority, or a worksheet is "other_tax_form". Anything not
   about taxes at all is "none".
`.trim();

// ─────────────────────────────────────────────────────────────
// Legal extraction
//
// Three passes, run concurrently against the same document: common fields,
// parties and their roles, and the type-specific provisions. Same reasoning as
// insurance — sequentially they exceed the ~150s edge wall clock on a long
// trust; concurrently the cost is the slowest pass rather than their sum.
//
// The field and provision vocabularies live in prompt text, never in the
// grammar. Forty field codes and thirty provision codes as enums would blow the
// compiled-grammar budget the way the first insurance schema did.
// ─────────────────────────────────────────────────────────────

const OBSERVATION_STATES = ['observed', 'not_observed', 'indeterminate'];
const PRESENCE_STATES = ['present', 'not_present', 'not_determinable'];
const PARTY_KINDS = ['person', 'trust', 'business', 'court', 'agency', 'unknown'];

const LEGAL_COMMON_FIELD_CODES = `
  document_title, document_type_stated, document_subtype, execution_date,
  effective_date, expiration_date, amendment_date, recording_date,
  governing_jurisdiction, county, filing_authority, court_name, case_number,
  instrument_number, recording_number, book_and_page, notary_name,
  notary_commission_expiration, notary_county, witness_names, attorney_name,
  law_firm, attorney_address, property_address, legal_description,
  parcel_identification_number, business_name, entity_type, state_of_formation,
  trust_name, trust_date, referenced_documents, referenced_attachments,
  future_review_date, revocation_reference, tax_identification_number,
  social_security_number, account_number, drivers_license_number
`.trim();

const LEGAL_COMMON_SCHEMA = {
  type: 'object',
  properties: {
    document_title: { type: 'string' },
    document_status: { type: 'string', enum: LEGAL_DOCUMENT_STATUSES },
    page_count: { type: 'number' },
    document_language: { type: 'string' },
    plain_language_summary: { type: 'string' },
    fields: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field_code: { type: 'string' },
          value: { type: 'string' },
          raw_value: { type: 'string' },
          value_type: { type: 'string', enum: VALUE_TYPES },
          is_sensitive: { type: 'boolean' },
          source_page: { type: 'number' },
          source_section: { type: 'string' },
          evidence: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['field_code', 'value', 'raw_value', 'value_type', 'is_sensitive',
          'source_page', 'source_section', 'evidence', 'confidence'],
        additionalProperties: false,
      },
    },
    execution_observations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          observation_code: { type: 'string' },
          state: { type: 'string', enum: OBSERVATION_STATES },
          detail: { type: 'string' },
          source_page: { type: 'number' },
          evidence: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['observation_code', 'state', 'detail', 'source_page', 'evidence', 'confidence'],
        additionalProperties: false,
      },
    },
    unresolved_items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { item: { type: 'string' }, why_unresolved: { type: 'string' } },
        required: ['item', 'why_unresolved'],
        additionalProperties: false,
      },
    },
  },
  required: ['document_title', 'document_status', 'page_count', 'document_language',
    'plain_language_summary', 'fields', 'execution_observations', 'unresolved_items'],
  additionalProperties: false,
};

// One row per party-role pair. Flattened deliberately: a nested roles array
// costs grammar budget, and the server splits the pairs back into
// legal_parties + legal_party_roles anyway.
const LEGAL_PARTIES_SCHEMA = {
  type: 'object',
  properties: {
    parties: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          name_raw: { type: 'string' },
          party_kind: { type: 'string', enum: PARTY_KINDS },
          role_code: { type: 'string' },
          role_detail: { type: 'string' },
          priority: { type: 'number' },
          acts_jointly: { type: 'string', enum: ['jointly', 'severally', 'successively', 'not_stated'] },
          relationship: { type: 'string' },
          address: { type: 'string' },
          source_page: { type: 'number' },
          evidence: { type: 'string' },
          confidence: { type: 'number' },
          value_type: { type: 'string', enum: VALUE_TYPES },
        },
        required: ['name', 'name_raw', 'party_kind', 'role_code', 'role_detail', 'priority',
          'acts_jointly', 'relationship', 'address', 'source_page', 'evidence', 'confidence', 'value_type'],
        additionalProperties: false,
      },
    },
  },
  required: ['parties'],
  additionalProperties: false,
};

const LEGAL_PROVISIONS_SCHEMA = {
  type: 'object',
  properties: {
    provisions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          provision_code: { type: 'string' },
          label: { type: 'string' },
          summary: { type: 'string' },
          document_language: { type: 'string' },
          applies_to: { type: 'string' },
          amount: { type: 'string' },
          percentage: { type: 'string' },
          effective_condition: { type: 'string' },
          presence: { type: 'string', enum: PRESENCE_STATES },
          source_page: { type: 'number' },
          source_section: { type: 'string' },
          evidence: { type: 'string' },
          confidence: { type: 'number' },
          value_type: { type: 'string', enum: VALUE_TYPES },
        },
        required: ['provision_code', 'label', 'summary', 'document_language', 'applies_to',
          'amount', 'percentage', 'effective_condition', 'presence', 'source_page',
          'source_section', 'evidence', 'confidence', 'value_type'],
        additionalProperties: false,
      },
    },
  },
  required: ['provisions'],
  additionalProperties: false,
};

// The modular part. One guide per extractor key from the taxonomy — adding a
// document type usually means pointing it at one of these, not writing code.
const PROVISION_GUIDES: Record<string, string> = {
  will: `provision codes to look for: marital_status_stated, executor_nomination,
    successor_executor, guardian_nomination, alternate_guardian, trustee_named,
    specific_bequest, residuary_distribution, distribution_condition,
    disinheritance_language, survivorship_requirement, simultaneous_death_provision,
    digital_asset_authority, pet_care_provision, funeral_instructions,
    bond_requirement, bond_waiver, self_proving_affidavit, revocation_of_prior_wills,
    related_trust_reference, codicil_reference.
    Report observable execution detail. Never call the will valid or invalid.`,

  trust: `provision codes to look for: trust_full_legal_name, trust_type, original_trust_date,
    amendment_date, restatement_date, initial_trustee, current_trustee, successor_trustee,
    beneficiary_designation, distribution_rule, age_or_milestone_distribution,
    incapacity_provision, trustee_removal_provision, trust_protector, power_of_appointment,
    revocability, governing_law, identified_trust_asset, schedule_reference, tax_id_reference.
    A trust document proves the trust exists. It does not prove any asset was ever
    transferred into it — never treat a schedule of assets as evidence of funding.`,

  power_of_attorney: `provision codes to look for: principal_named, agent_named, successor_agent,
    agents_act_jointly, scope_of_authority, power_granted, power_withheld, effective_trigger,
    durability_language, guardian_nomination, digital_asset_authority, gifting_authority,
    real_estate_authority, business_authority, healthcare_authority, expiration_condition,
    termination_condition, revocation_reference, physician_certification_requirement,
    agent_acceptance.
    State the observable terms and dates. Never say the power of attorney is currently
    enforceable — that depends on facts outside this document.`,

  healthcare_directive: `provision codes to look for: declarant_named, healthcare_agent,
    alternate_agent, agent_priority, effective_trigger, treatment_preference,
    life_support_preference, nutrition_hydration_preference, pain_management_preference,
    organ_donation_direction, disposition_wishes, pregnancy_provision, religious_instruction,
    hipaa_authorization, primary_physician, dnr_status, expiration_condition,
    revocation_reference, document_location_instruction.
    This is sensitive medical information. Extract only what the document states.`,

  deed_property: `provision codes to look for: deed_type_stated, grantor_named, grantee_named,
    property_address, legal_description, parcel_identification_number, consideration_amount,
    vesting_language, ownership_form, transfer_date, recording_date, recording_number,
    recorders_office, reserved_life_estate, transfer_on_death_beneficiary, joint_tenancy_language,
    survivorship_language, marital_property_language, trust_ownership, easement_or_restriction,
    exception_or_reservation.
    Report the parties as the document states them. An unrecorded or historical deed is
    not evidence of who owns the property now — never present it as current ownership.`,

  family: `provision codes to look for: parties_named, effective_date, court_name, case_number,
    children_involved, decision_making_authority, custody_term, parenting_time_term,
    support_obligation, property_provision, expiration_or_review_date, stated_restriction.
    Extract only what is expressly stated. This material is sensitive.`,

  business: `provision codes to look for: legal_business_name, entity_type, state_of_formation,
    formation_date, owner_named, ownership_percentage, manager_or_officer, voting_right,
    transfer_restriction, buy_sell_trigger, valuation_provision, succession_provision,
    death_provision, disability_provision, divorce_provision, retirement_provision,
    permitted_transferee, insurance_funding_reference, personal_guarantee, governing_law,
    amendment_requirement.`,

  generic: `provision codes: use short snake_case codes describing what each operative
    provision does. Extract the terms that would matter to a household — parties, dates,
    obligations, money, termination — and nothing more.`,
};

const LEGAL_EXTRACTION_RULES = `
Ground rules, in priority order:

1. Never infer that a signature, notarization, witness, attachment or clause exists.
   If it is not visible in these pages, its state is "not_observed" — which is a
   statement about this copy, not about the document in the world.
2. Quote evidence verbatim, and keep it to the operative sentence — roughly 300
   characters, never a whole section. Every entry carries its page.
3. "Not found in these pages" and "not present in the document" are different
   claims. value_type "unknown" is the first; a provision with presence
   "not_present" is the second. Do not conflate them.
4. Preserve the document's own wording in document_language. Legally meaningful
   phrasing must survive summarization; the plain-language summary sits alongside
   it, never instead of it.
5. No legal conclusions. Do not say a document is valid, invalid, enforceable,
   sufficient, controlling, revoked-in-fact or current. Report what it says and
   what you can see.
6. Do not predict outcomes, fill in missing clauses, or infer intent.
7. Dates are YYYY-MM-DD. Amounts are digits only: "250000.00". Percentages are
   numbers without the sign: "33.3".
8. Mark is_sensitive true for Social Security numbers, tax IDs, account numbers
   and driver's license numbers, and keep the evidence excerpt for those short.
9. A person named several ways in one document is one party. Merge them, keep the
   fullest form as name, and record each distinct role separately.
10. Where two provisions conflict, record both and describe the conflict. Do not
    resolve it — the dates and the user decide that, not you.
`.trim();

// ─────────────────────────────────────────────────────────────
// Credit card statements
//
// Two passes: the statement itself (identity, balances, terms, rewards) and its
// transaction list. Separate because a statement with 120 lines needs its own
// token budget, and because losing the transactions must not cost the balances.
// ─────────────────────────────────────────────────────────────

const APR_TYPES = ['purchase', 'cash_advance', 'balance_transfer', 'penalty', 'promotional', 'other'];

const CREDIT_FIELD_CODES = `
  institution, card_product, account_nickname, last_four, primary_cardholder,
  statement_opening_date, statement_closing_date, payment_due_date,
  previous_balance, payments_and_credits, purchases, cash_advances,
  balance_transfers, fees_charged, interest_charged, statement_balance,
  minimum_payment_due, past_due_amount, credit_limit, available_credit,
  current_balance, annual_fee, rewards_program, rewards_beginning_balance,
  rewards_earned, rewards_redeemed, rewards_ending_balance, rewards_expiration_note
`.trim();

const CREDIT_STATEMENT_SCHEMA = {
  type: 'object',
  properties: {
    fields: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field_code: { type: 'string' },
          value: { type: 'string' },
          raw_value: { type: 'string' },
          value_type: { type: 'string', enum: VALUE_TYPES },
          source_page: { type: 'number' },
          source_section: { type: 'string' },
          evidence: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['field_code', 'value', 'raw_value', 'value_type', 'source_page',
          'source_section', 'evidence', 'confidence'],
        additionalProperties: false,
      },
    },
    apr_terms: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          apr_type: { type: 'string', enum: APR_TYPES },
          apr_percent: { type: 'string' },
          is_variable: { type: 'boolean' },
          balance_subject_to_rate: { type: 'string' },
          interest_charged: { type: 'string' },
          promotional_balance: { type: 'string' },
          promotional_expiration_date: { type: 'string' },
          description: { type: 'string' },
          source_page: { type: 'number' },
          evidence: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['apr_type', 'apr_percent', 'is_variable', 'balance_subject_to_rate',
          'interest_charged', 'promotional_balance', 'promotional_expiration_date',
          'description', 'source_page', 'evidence', 'confidence'],
        additionalProperties: false,
      },
    },
    unresolved_items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { item: { type: 'string' }, why_unresolved: { type: 'string' } },
        required: ['item', 'why_unresolved'],
        additionalProperties: false,
      },
    },
  },
  required: ['fields', 'apr_terms', 'unresolved_items'],
  additionalProperties: false,
};

const CREDIT_TRANSACTIONS_SCHEMA = {
  type: 'object',
  properties: {
    transactions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          transaction_date: { type: 'string' },
          posting_date: { type: 'string' },
          merchant_description: { type: 'string' },
          amount: { type: 'string' },
          direction: { type: 'string', enum: ['charge', 'credit'] },
          category: { type: 'string' },
          category_from_issuer: { type: 'boolean' },
          cardholder: { type: 'string' },
          source_page: { type: 'number' },
          confidence: { type: 'number' },
        },
        required: ['transaction_date', 'posting_date', 'merchant_description', 'amount',
          'direction', 'category', 'category_from_issuer', 'cardholder', 'source_page', 'confidence'],
        additionalProperties: false,
      },
    },
    transaction_count_stated: { type: 'number' },
    truncated: { type: 'boolean' },
  },
  required: ['transactions', 'transaction_count_stated', 'truncated'],
  additionalProperties: false,
};

const CREDIT_RULES = `
Ground rules, in priority order:

1. Record only the last four digits of any card number, in last_four. Never output
   a full or partial account number anywhere else, including in evidence excerpts —
   truncate the excerpt instead.
2. A statement is a record of a closed period, not a live balance. statement_balance
   is the new balance the statement reports. Only fill current_balance if the
   document explicitly labels a current or present balance; otherwise omit it.
3. Keep statement_balance, minimum_payment_due, available_credit and credit_limit
   distinct. They are different numbers and are often confused.
4. Do not infer an APR, a fee, a promotional end date, a rewards rule, a benefit,
   autopay status or a renewal date. If it is not printed, omit the field.
5. Emit one apr_terms entry per rate the statement lists. A card commonly carries
   different rates for purchases, cash advances, balance transfers and promotions,
   with different balances subject to each. Do not merge them or pick one.
6. annual_fee only when the statement explicitly shows one charged or disclosed.
   A fee you did not see is not zero — it is absent.
7. Amounts are digits only: "1250.75". Payments and credits are positive numbers;
   direction carries the sign. Dates are YYYY-MM-DD. Percentages are plain: "24.99".
8. Quote evidence verbatim and keep it to the line the value came from.
`.trim();


// ─────────────────────────────────────────────────────────────
// Home documents
//
// One pass each. A mortgage statement is a page of figures and a warranty is a
// page of terms — neither carries the transaction list or the forty-field
// vocabulary that made the credit and legal paths multi-pass.
// ─────────────────────────────────────────────────────────────

const MORTGAGE_FIELD_CODES = `
  servicer, loan_number_last4, property_address, borrower, statement_date,
  payment_due_date, principal_balance, original_amount, interest_rate, rate_type,
  maturity_date, monthly_payment, principal_portion, interest_portion,
  escrow_portion, escrow_balance, pmi_amount, past_due_amount,
  interest_paid_ytd, principal_paid_ytd, taxes_paid_ytd, insurance_paid_ytd
`.trim();

const MORTGAGE_SCHEMA = {
  type: 'object',
  properties: {
    fields: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field_code: { type: 'string' },
          value: { type: 'string' },
          raw_value: { type: 'string' },
          value_type: { type: 'string', enum: VALUE_TYPES },
          source_page: { type: 'number' },
          evidence: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['field_code', 'value', 'raw_value', 'value_type', 'source_page', 'evidence', 'confidence'],
        additionalProperties: false,
      },
    },
    unresolved_items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { item: { type: 'string' }, why_unresolved: { type: 'string' } },
        required: ['item', 'why_unresolved'],
        additionalProperties: false,
      },
    },
  },
  required: ['fields', 'unresolved_items'],
  additionalProperties: false,
};

const MORTGAGE_RULES = `
Ground rules, in priority order:

1. Record only the last four digits of the loan number, in loan_number_last4.
   Never output a full loan or account number anywhere, including in evidence —
   truncate the excerpt instead.
2. principal_balance is what is still owed. It is not the original loan amount,
   not the payoff quote, and not the escrow balance. Keep all four apart.
3. The monthly payment usually breaks into principal, interest and escrow. Record
   the total and each part it prints; do not compute a part it does not show.
4. Do not infer an interest rate, a maturity date or PMI. If the statement does
   not print it, omit the field — a rate you worked out from the payment is not
   the rate on the note.
5. Amounts are digits only: "1842.19". Rates are plain numbers: "6.25". Dates are
   YYYY-MM-DD.
6. Quote evidence verbatim and keep it to the line the value came from.
`.trim();

// A filed return. One pass: it is a page of figures with well-known line
// numbers, and the schedules that matter break out into the same flat list.
const TAX_RETURN_FIELD_CODES = `
  tax_year, filing_status, adjusted_gross_income, taxable_income, total_tax,
  total_payments, refund_amount, amount_owed, took_standard_deduction,
  standard_deduction_amount, itemized_total, itemized_medical, itemized_salt,
  itemized_mortgage_interest, itemized_charitable, federal_withheld,
  estimated_payments, child_tax_credit, dependent_care_credit, education_credits,
  capital_loss_carryforward, charitable_carryforward, wages, interest_income,
  dividend_income, capital_gains, business_income, rental_income,
  retirement_income, state, state_tax, preparer
`.trim();

const TAX_RETURN_SCHEMA = {
  type: 'object',
  properties: {
    tax_year: { type: 'string' },
    fields: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field_code: { type: 'string' },
          value: { type: 'string' },
          raw_value: { type: 'string' },
          // The form and line it came from — "1040 line 11", "Schedule A line 17".
          // A figure that drives a planning recommendation should be traceable.
          form_line: { type: 'string' },
          value_type: { type: 'string', enum: VALUE_TYPES },
          source_page: { type: 'number' },
          evidence: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: [
          'field_code', 'value', 'raw_value', 'form_line', 'value_type',
          'source_page', 'evidence', 'confidence',
        ],
        additionalProperties: false,
      },
    },
    unresolved_items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { item: { type: 'string' }, why_unresolved: { type: 'string' } },
        required: ['item', 'why_unresolved'],
        additionalProperties: false,
      },
    },
  },
  required: ['tax_year', 'fields', 'unresolved_items'],
  additionalProperties: false,
};

const TAX_RETURN_RULES = `
Ground rules, in priority order:

1. Never output a Social Security number, a taxpayer identification number, or a
   bank account number — not as a value and not inside evidence. Truncate the
   excerpt rather than quoting a line that contains one.
2. tax_year is the year the return is *for*, printed at the top of the form. It
   is not the year it was filed and not the year on the preparer's stamp.
3. total_tax is the total tax for the year before payments — Form 1040 line 24.
   It is not the balance due, not the refund, and not the withholding. These are
   four different numbers and the planning depends on keeping them apart.
4. took_standard_deduction is "true" or "false". Decide it from which figure the
   return actually used, not from whether a Schedule A is present in the file.
5. Report Schedule A components only when Schedule A is present and used. Do not
   reconstruct them from a 1098 or from anything else in the bundle.
   itemized_charitable is total gifts to charity. Where Schedule A prints only
   the parts — gifts by cash or check, and gifts other than cash — add them and
   mark the result "calculated". This is the one figure you may add up.
6. Carryforwards are the figures carried *out* of this year into the next —
   from the Capital Loss Carryover Worksheet, or a charitable carryover
   statement. Omit them entirely if the return does not print them.
7. Do not compute anything the return does not show. A calculated figure that
   looks right is worse than a missing one, because it will be trusted.
8. Amounts are digits only: "18420". A negative is "-3000". Dates are YYYY-MM-DD.
9. form_line names where the value sits — "1040 line 11", "Schedule A line 7".
   Empty string only when the figure genuinely carries no line reference.
`.trim();

const APPLIANCE_SCHEMA = {
  type: 'object',
  properties: {
    document_kind: {
      type: 'string',
      enum: ['warranty', 'manual', 'receipt', 'invoice', 'service_contract', 'inspection', 'other'],
    },
    product_name: { type: 'string' },
    suggested_category: { type: 'string' },
    make: { type: 'string' },
    model: { type: 'string' },
    serial_number: { type: 'string' },
    purchased_on: { type: 'string' },
    installed_on: { type: 'string' },
    purchase_price: { type: 'string' },
    purchased_from: { type: 'string' },
    warranty_provider: { type: 'string' },
    warranty_type: { type: 'string' },
    warranty_starts_on: { type: 'string' },
    warranty_expires_on: { type: 'string' },
    warranty_length_months: { type: 'string' },
    coverage_summary: { type: 'string' },
    exclusions_summary: { type: 'string' },
    claim_contact: { type: 'string' },
    fields: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          value: { type: 'string' },
          source_page: { type: 'number' },
          evidence: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['field', 'value', 'source_page', 'evidence', 'confidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['document_kind', 'product_name', 'suggested_category', 'make', 'model', 'serial_number',
    'purchased_on', 'installed_on', 'purchase_price', 'purchased_from', 'warranty_provider',
    'warranty_type', 'warranty_starts_on', 'warranty_expires_on', 'warranty_length_months',
    'coverage_summary', 'exclusions_summary', 'claim_contact', 'fields'],
  additionalProperties: false,
};

const APPLIANCE_RULES = `
Ground rules, in priority order:

1. suggested_category is one of these codes, whichever fits: ${HOME_CATEGORY_CODES}.
   Use "other" rather than forcing a poor fit.
2. A warranty length and a warranty end date are different things. Record whichever
   the document prints; only fill both if both appear. Do not add a length to a
   purchase date to invent an end date — the clock often starts at installation.
3. Do not infer coverage. Summarize what the document says is covered and what it
   says is excluded, in a sentence each, and leave them empty if it does not say.
4. warranty_type is one of: manufacturer, extended, home_warranty, installer.
5. Amounts are digits only. Dates are YYYY-MM-DD. Months are whole numbers.
6. Every entry in fields carries its page and a short verbatim excerpt.
`.trim();


const GENERIC_FIELDS = [
  'lender', 'interest_rate', 'monthly_payment', 'escrow_balance', 'carrier',
  'policy_type', 'policy_number', 'coverage_amount', 'premium', 'renewal_date',
  'issuer', 'card_name_last4', 'credit_limit', 'minimum_payment', 'due_date', 'apr',
  'institution', 'account_type', 'balance', 'as_of_date', 'tax_year', 'amount',
  'employer', 'pay_period', 'gross_pay', 'net_pay', 'pay_frequency',
  'current_balance', 'notes',
];

const GENERIC_SCHEMA = {
  type: 'object',
  properties: {
    detected_type: { type: 'string', enum: LEGACY_TYPES },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    extracted_fields: {
      type: 'array',
      items: {
        type: 'object',
        properties: { key: { type: 'string', enum: GENERIC_FIELDS }, value: { type: 'string' } },
        required: ['key', 'value'],
        additionalProperties: false,
      },
    },
  },
  required: ['detected_type', 'confidence', 'extracted_fields'],
  additionalProperties: false,
};

const EXTRACTION_RULES = `
Ground rules, in priority order:

1. Never invent a policy term. If something is not in the provided pages, omit it
   or mark value_type "unknown". "Not found in these documents" and "not covered"
   are different claims — never conflate them.
2. Quote evidence verbatim. Every entry carries the snippet it came from, its page,
   and its section heading where one exists.
3. Preserve the carrier's own wording in coverage_name_raw and policy_language.
   Legally meaningful phrasing must survive normalization; the standardized code
   sits alongside it, never replaces it.
4. Do not infer exclusions from a declarations page. A dec page lists coverages,
   not the full exclusion set — say so in limitations_summary instead of guessing.
5. Do not calculate percentage deductibles into dollars. Record the percent and
   what it applies to; the application does that arithmetic and labels it derived.
6. Severity reflects demonstrable financial impact. If you cannot establish the
   impact from these pages, do not exceed "meaningful".
7. Endorsements override the base form. When they conflict, record both and
   explain which controls and why in conflicts[].
8. A quote or application is not an active policy. Classify it accurately.
9. Amounts are digits only: "3200.00", not "$3,200.00". Dates are YYYY-MM-DD.
10. No recommendations or advice. Extract facts; the recommendation layer runs later
    with household context this document does not have.
`.trim();

// deno-lint-ignore no-explicit-any
let legalTypeCache: any[] | null = null;

/**
 * The taxonomy, read from the database rather than duplicated here. The table is
 * seeded from src/lib/legalTaxonomy.ts, so the app, the prompt and the validator
 * cannot drift apart — and a new document type ships as a row without touching
 * this function.
 */
// deno-lint-ignore no-explicit-any
async function loadLegalTypes(): Promise<any[]> {
  if (legalTypeCache) return legalTypeCache;
  const { data, error } = await admin
    .from('legal_document_types')
    .select('code, label, category, extractor')
    .eq('is_active', true)
    .not('category', 'eq', 'unclassified')
    .order('sort_order');
  if (error) {
    // Not fatal. An absent table means the legal migration has not been applied;
    // the caller stands the legal branch down instead of erroring the upload.
    console.error('Could not load legal_document_types:', error.message);
    return [];
  }
  legalTypeCache = data ?? [];
  return legalTypeCache;
}

/**
 * Validates the model's type against the registry. Anything unrecognized becomes
 * unknown_legal_document: the document is kept, the user is told what Command
 * thought and why, and they can set the type themselves. Guessing a near-miss
 * would put a quitclaim deed in the wills pile and look authoritative doing it.
 */
// deno-lint-ignore no-explicit-any
function resolveLegalType(raw: unknown, types: any[]): { code: string; category: string } {
  const value = String(raw ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  const hit = types.find((t) => t.code === value);
  if (hit) return { code: hit.code, category: hit.category };
  return { code: 'unknown_legal_document', category: 'unclassified' };
}

/** Header columns that mirror a common field, so the inventory can be queried. */
const FIELD_TO_HEADER: Record<string, string> = {
  execution_date: 'execution_date',
  effective_date: 'effective_date',
  expiration_date: 'expiration_date',
  amendment_date: 'amendment_date',
  recording_date: 'recording_date',
  governing_jurisdiction: 'governing_jurisdiction',
  county: 'county',
  filing_authority: 'filing_authority',
  instrument_number: 'instrument_number',
};

const DATE_FIELDS = new Set([
  'execution_date', 'effective_date', 'expiration_date', 'amendment_date',
  'recording_date', 'trust_date', 'formation_date', 'future_review_date',
  'notary_commission_expiration',
]);

const SENSITIVE_FIELDS = new Set([
  'social_security_number', 'tax_identification_number', 'account_number',
  'drivers_license_number',
]);

/** Comparable form of a person's name: case, punctuation and ordering removed. */
function nameKey(raw: string): string {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/\b(jr|sr|iii|ii|iv|md|esq)\b/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

/**
 * Suggests, never asserts. A differing spelling or address is not grounds to
 * rewrite a household record — the match is recorded at a confidence for the
 * user to confirm, and a partial hit is flagged as a conflict rather than
 * silently accepted.
 */
// deno-lint-ignore no-explicit-any
function suggestMatch(name: string, members: any[]): { id: string | null; confidence: number | null; state: string } {
  const key = nameKey(name);
  if (!key) return { id: null, confidence: null, state: 'unmatched' };

  for (const member of members) {
    if (nameKey(member.name) === key) return { id: member.id, confidence: 0.95, state: 'suggested' };
  }
  // Same surname and first initial: a plausible person, not a confident one.
  const parts = key.split(' ');
  for (const member of members) {
    const memberParts = nameKey(member.name).split(' ');
    const sharedSurname = parts.some((p) => p.length > 2 && memberParts.includes(p));
    if (sharedSurname) return { id: member.id, confidence: 0.5, state: 'conflict' };
  }
  return { id: null, confidence: null, state: 'unmatched' };
}

/**
 * Turns what was observed into carefully worded flags. Every one of these is a
 * statement about the uploaded copy, never about the document's legal standing:
 * "Command did not detect a notarization page" is a fact about our reading;
 * "this document is not notarized" would be a claim we cannot support.
 */
// deno-lint-ignore no-explicit-any
function flagsFromObservations(observations: any[], header: any): any[] {
  // deno-lint-ignore no-explicit-any
  const flags: any[] = [];
  const seen = (code: string, state: string) =>
    observations.some((o) => String(o.observation_code ?? '').includes(code) && o.state === state);

  /**
   * Only flag an absence when nothing affirmed the same thing. A signed will
   * whose scan shows a conformed "/s/" signature produces two observations —
   * the signature is there, a wet-ink mark is not — and flagging on the second
   * while ignoring the first told the user their signed will looked unsigned.
   * An affirmative observation wins over a qualified one about the same subject.
   */
  const missing = (code: string) => seen(code, 'not_observed') && !seen(code, 'observed');

  const add = (
    flag_code: string,
    severity: string,
    explanation: string,
    suggested_action: string,
    attorney = false,
  ) => flags.push({ flag_code, severity, explanation, suggested_action, attorney_review_suggested: attorney });

  if (missing('signature')) {
    add('signature_not_detected', 'worth_reviewing',
      'Command did not detect a signature in this uploaded copy.',
      'Check whether the signature page was included in the scan.');
  }
  if (missing('notariz')) {
    add('notarization_not_detected', 'worth_reviewing',
      'Command did not detect a notarization page in this uploaded copy.',
      'Check whether the notary page was included. Whether one is required depends on the document and the state.',
      true);
  }
  if (missing('witness')) {
    add('witness_signatures_not_detected', 'worth_reviewing',
      'Command did not detect witness signatures in this uploaded copy.',
      'Check whether the witness page was included in the scan.',
      true);
  }
  if (seen('draft', 'observed') || header.document_status === 'draft') {
    add('marked_draft', 'significant',
      'This document is marked as a draft.',
      'If a signed version exists, uploading it will give Command the executed terms.');
  }
  if (missing('attachment') || missing('exhibit') || missing('schedule')) {
    add('referenced_attachment_missing', 'worth_reviewing',
      'The document refers to an exhibit, schedule or attachment that was not part of this upload.',
      'Upload the missing pages so Command can read them.');
  }
  if (missing('page')) {
    add('pages_may_be_missing', 'worth_reviewing',
      'The page numbering suggests pages may be missing from this upload.',
      'Re-scan the full document and upload it again.');
  }
  if (header.expiration_date && header.expiration_date < new Date().toISOString().slice(0, 10)) {
    add('past_stated_end_date', 'worth_reviewing',
      'The end date stated in this document has passed.',
      'Confirm whether a newer version replaced it.',
      true);
  }
  return flags;
}

/**
 * Writes one reading. Everything lands as raw extraction rows at
 * review_status 'pending_review' — nothing here touches legal_documents or any
 * other canonical record. Promotion happens only on user confirmation.
 */
async function persistLegalExtraction(
  extractionId: string,
  householdId: string,
  extractor: string,
  // deno-lint-ignore no-explicit-any
  common: any,
  // deno-lint-ignore no-explicit-any
  parties: any,
  // deno-lint-ignore no-explicit-any
  provisions: any,
): Promise<{ fields: number; parties: number; provisions: number; flags: number }> {
  // deno-lint-ignore no-explicit-any
  const headerPatch: Record<string, any> = {
    document_title: text(common.document_title),
    page_count: num(common.page_count),
    document_language: text(common.document_language),
    plain_language_summary: text(common.plain_language_summary),
    execution_observations: common.execution_observations ?? [],
    unresolved_items: common.unresolved_items ?? [],
  };
  if (LEGAL_DOCUMENT_STATUSES.includes(common.document_status)) {
    headerPatch.document_status = common.document_status;
  }

  // Common fields, one row each, provenance attached.
  // deno-lint-ignore no-explicit-any
  const fieldRows: any[] = [];
  for (const field of common.fields ?? []) {
    const code = text(field.field_code);
    const value = text(field.value);
    if (!code || !value) continue;

    const isDate = DATE_FIELDS.has(code);
    fieldRows.push({
      extraction_id: extractionId,
      household_id: householdId,
      field_code: code,
      field_group: 'common',
      value_text: value,
      value_date: isDate ? date(value) : null,
      value_number: !isDate ? num(field.value) : null,
      raw_value: text(field.raw_value),
      source_page: num(field.source_page),
      source_section: text(field.source_section),
      evidence: text(field.evidence),
      confidence: clamp01(field.confidence),
      value_type: VALUE_TYPES.includes(field.value_type) ? field.value_type : 'explicit',
      is_sensitive: field.is_sensitive === true || SENSITIVE_FIELDS.has(code),
    });

    // Promote the handful of fields the inventory queries by.
    const headerColumn = FIELD_TO_HEADER[code];
    if (headerColumn && headerPatch[headerColumn] == null) {
      headerPatch[headerColumn] = isDate ? date(value) : value;
    }
  }
  if (fieldRows.length > 0) {
    const { error } = await admin.from('legal_extracted_fields').insert(fieldRows);
    if (error) console.error('Failed to write legal fields:', error.message);
  }

  // Parties, merged by name, with their roles as separate rows.
  const { data: familyMembers } = await admin
    .from('family_members').select('id, name').eq('household_id', householdId);

  const partyIdByName = new Map<string, string>();
  let roleCount = 0;
  for (const entry of parties.parties ?? []) {
    const name = text(entry.name);
    if (!name) continue;
    const key = nameKey(name);

    let partyId = partyIdByName.get(key);
    if (!partyId) {
      const match = suggestMatch(name, familyMembers ?? []);
      const { data: inserted, error } = await admin
        .from('legal_parties')
        .insert([{
          extraction_id: extractionId,
          household_id: householdId,
          party_kind: PARTY_KINDS.includes(entry.party_kind) ? entry.party_kind : 'unknown',
          name,
          name_raw: text(entry.name_raw),
          relationship: text(entry.relationship),
          address: text(entry.address),
          matched_family_member_id: match.id,
          match_confidence: match.confidence,
          match_state: match.state,
          match_conflict: match.state === 'conflict'
            ? 'A household member has a similar name. Confirm whether this is the same person.'
            : null,
          source_page: num(entry.source_page),
          evidence: text(entry.evidence),
          confidence: clamp01(entry.confidence),
          value_type: VALUE_TYPES.includes(entry.value_type) ? entry.value_type : 'explicit',
        }])
        .select('id')
        .single();
      if (error || !inserted) {
        console.error('Failed to write legal party:', error?.message);
        continue;
      }
      partyId = inserted.id as string;
      partyIdByName.set(key, partyId);
    }

    const roleCode = text(entry.role_code);
    if (!roleCode) continue;
    const { error: roleError } = await admin.from('legal_party_roles').insert([{
      party_id: partyId,
      extraction_id: extractionId,
      household_id: householdId,
      role_code: roleCode.toLowerCase().replace(/\s+/g, '_'),
      role_detail: text(entry.role_detail),
      priority: num(entry.priority),
      acts_jointly: ['jointly', 'severally', 'successively', 'not_stated'].includes(entry.acts_jointly)
        ? entry.acts_jointly
        : 'not_stated',
      source_page: num(entry.source_page),
      evidence: text(entry.evidence),
      confidence: clamp01(entry.confidence),
    }]);
    if (roleError) console.error('Failed to write legal role:', roleError.message);
    else roleCount += 1;
  }

  // Type-specific provisions.
  // deno-lint-ignore no-explicit-any
  const provisionRows: any[] = [];
  for (const provision of provisions.provisions ?? []) {
    const code = text(provision.provision_code);
    if (!code) continue;
    provisionRows.push({
      extraction_id: extractionId,
      household_id: householdId,
      extractor,
      provision_code: code.toLowerCase().replace(/\s+/g, '_'),
      label: text(provision.label),
      summary: text(provision.summary),
      document_language: text(provision.document_language),
      applies_to: text(provision.applies_to),
      amount: num(provision.amount),
      percentage: num(provision.percentage),
      effective_condition: text(provision.effective_condition),
      // 'not_determinable' stays NULL: the document did not say, which is not
      // the same as the provision being absent.
      is_present: provision.presence === 'present' ? true : provision.presence === 'not_present' ? false : null,
      source_page: num(provision.source_page),
      source_section: text(provision.source_section),
      evidence: text(provision.evidence),
      confidence: clamp01(provision.confidence),
      value_type: VALUE_TYPES.includes(provision.value_type) ? provision.value_type : 'explicit',
    });
  }
  if (provisionRows.length > 0) {
    const { error } = await admin.from('legal_provisions').insert(provisionRows);
    if (error) console.error('Failed to write legal provisions:', error.message);
  }

  // Fiduciary gaps: named but with no successor or alternate named alongside.
  const roleCodes = new Set(
    (parties.parties ?? [])
      .map((p: { role_code?: string }) => String(p.role_code ?? '').toLowerCase())
      .filter(Boolean),
  );
  const derivedFlags = flagsFromObservations(common.execution_observations ?? [], headerPatch);
  const gap = (has: string, successor: string, label: string, word = 'successor') => {
    if (roleCodes.has(has) && !roleCodes.has(successor)) {
      derivedFlags.push({
        flag_code: `${has}_without_${word}`,
        severity: 'worth_reviewing',
        explanation: `A ${label} is named, but Command did not find ${word === 'alternate' ? 'an alternate' : 'a successor'} named in this document.`,
        suggested_action: `Check whether ${word === 'alternate' ? 'an alternate' : 'a successor'} ${label} appears elsewhere in the document or in a later amendment.`,
        attorney_review_suggested: true,
      });
    }
  };
  gap('executor', 'successor_executor', 'executor');
  gap('trustee', 'successor_trustee', 'trustee');
  gap('agent', 'successor_agent', 'agent');
  gap('guardian', 'alternate_guardian', 'guardian', 'alternate');

  if (derivedFlags.length > 0) {
    const { error } = await admin.from('legal_issue_flags').insert(
      derivedFlags.map((f) => ({ ...f, household_id: householdId, extraction_id: extractionId, confidence: 0.8 })),
    );
    if (error) console.error('Failed to write legal flags:', error.message);
  }

  headerPatch.processing_state = 'needs_review';
  const { error: headerError } = await admin
    .from('legal_document_extractions').update(headerPatch).eq('id', extractionId);
  if (headerError) throw new Error(`Could not save the document summary: ${headerError.message}`);

  return {
    fields: fieldRows.length,
    parties: partyIdByName.size,
    provisions: provisionRows.length,
    flags: derivedFlags.length,
  };
}

const CREDIT_NUMERIC_FIELDS = new Set([
  'previous_balance', 'payments_and_credits', 'purchases', 'cash_advances',
  'balance_transfers', 'fees_charged', 'interest_charged', 'statement_balance',
  'minimum_payment_due', 'past_due_amount', 'credit_limit', 'available_credit',
  'current_balance', 'annual_fee', 'rewards_beginning_balance', 'rewards_earned',
  'rewards_redeemed', 'rewards_ending_balance',
]);

const CREDIT_DATE_FIELDS = new Set([
  'statement_opening_date', 'statement_closing_date', 'payment_due_date',
]);

/**
 * Last four digits, whatever arrived. A model told to return four digits mostly
 * does; "mostly" is not a control. Anything longer is truncated here so a full
 * account number cannot reach the database through a prompt that was ignored.
 */
function lastFourOnly(value: unknown): string | null {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 0) return null;
  return digits.slice(-4);
}

/** Redacts any run of 12+ digits, so an evidence excerpt cannot carry a PAN. */
function scrubCardNumbers(text: string | null): string | null {
  if (!text) return text;
  return text.replace(/\b(?:\d[ -]?){12,19}\b/g, (match) => {
    const digits = match.replace(/\D/g, '');
    return `•••• ${digits.slice(-4)}`;
  });
}

/** Stable identity for one line on one statement. */
async function transactionFingerprint(
  date: string | null,
  description: string,
  amount: number | null,
  direction: string,
): Promise<string> {
  const basis = `${date ?? ''}|${description.trim().toLowerCase().replace(/\s+/g, ' ')}|${amount ?? ''}|${direction}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(basis));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function clamp01(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(Math.max(parsed, 0), 1);
}

/**
 * Writes one statement reading. Everything lands at 'pending_review' — no card
 * account is created or changed here. Promotion happens on confirmation, where
 * the user also settles which account this statement belongs to.
 */
async function persistCreditStatement(
  statementId: string,
  householdId: string,
  // deno-lint-ignore no-explicit-any
  statement: any,
  // deno-lint-ignore no-explicit-any
  transactions: any,
): Promise<{ fields: number; aprs: number; transactions: number; truncated: boolean }> {
  // deno-lint-ignore no-explicit-any
  const header: Record<string, any> = {};
  // deno-lint-ignore no-explicit-any
  const fieldRows: any[] = [];

  for (const field of statement.fields ?? []) {
    const code = text(field.field_code);
    const rawValue = text(field.value);
    if (!code || !rawValue) continue;

    const isLastFour = code === 'last_four';
    const value = isLastFour ? lastFourOnly(rawValue) : rawValue;
    if (!value) continue;

    const isNumeric = CREDIT_NUMERIC_FIELDS.has(code);
    const isDate = CREDIT_DATE_FIELDS.has(code);

    fieldRows.push({
      statement_id: statementId,
      household_id: householdId,
      field_code: code,
      field_group: code.startsWith('rewards')
        ? 'rewards'
        : isNumeric
          ? 'balances'
          : isDate
            ? 'identity'
            : 'identity',
      value_text: value,
      value_number: isNumeric ? num(value) : null,
      value_date: isDate ? date(value) : null,
      raw_value: isLastFour ? value : scrubCardNumbers(text(field.raw_value)),
      source_page: num(field.source_page),
      source_section: text(field.source_section),
      evidence: scrubCardNumbers(text(field.evidence)),
      confidence: clamp01(field.confidence),
      value_type: VALUE_TYPES.includes(field.value_type) ? field.value_type : 'explicit',
      is_sensitive: isLastFour,
    });

    // Promote to the header so statements are comparable without a join.
    header[code] = isNumeric ? num(value) : isDate ? date(value) : value;
  }

  if (fieldRows.length > 0) {
    const { error } = await admin
      .from('credit_statement_fields')
      .upsert(fieldRows, { onConflict: 'statement_id,field_code' });
    if (error) console.error('Failed to write statement fields:', error.message);
  }

  // APR terms, one row per rate category. Never collapsed.
  // deno-lint-ignore no-explicit-any
  const aprRows: any[] = [];
  for (const term of statement.apr_terms ?? []) {
    if (!APR_TYPES.includes(term.apr_type)) continue;
    aprRows.push({
      statement_id: statementId,
      household_id: householdId,
      apr_type: term.apr_type,
      apr_percent: num(term.apr_percent),
      is_variable: term.is_variable === true,
      balance_subject_to_rate: num(term.balance_subject_to_rate),
      interest_charged: num(term.interest_charged),
      promotional_balance: num(term.promotional_balance),
      promotional_expiration_date: date(term.promotional_expiration_date),
      description: text(term.description) ?? term.apr_type,
      source_page: num(term.source_page),
      evidence: scrubCardNumbers(text(term.evidence)),
      confidence: clamp01(term.confidence),
    });
  }
  if (aprRows.length > 0) {
    const { error } = await admin
      .from('credit_apr_terms')
      .upsert(aprRows, { onConflict: 'statement_id,apr_type,description' });
    if (error) console.error('Failed to write APR terms:', error.message);
  }
  // The purchase APR is the one the card page shows, so promote it.
  const purchase = aprRows.find((a) => a.apr_type === 'purchase');
  if (purchase?.apr_percent != null) header.purchase_apr_promoted = purchase.apr_percent;

  // Transactions. Fingerprinted so a re-read updates rather than duplicates.
  // deno-lint-ignore no-explicit-any
  const txRows: any[] = [];
  for (const tx of transactions.transactions ?? []) {
    const description = text(tx.merchant_description);
    if (!description) continue;
    const amount = num(tx.amount);
    const direction = tx.direction === 'credit' ? 'credit' : 'charge';
    const txDate = date(tx.transaction_date);
    txRows.push({
      statement_id: statementId,
      household_id: householdId,
      transaction_date: txDate,
      posting_date: date(tx.posting_date),
      merchant_description: scrubCardNumbers(description),
      amount,
      direction,
      category: text(tx.category),
      // An issuer-printed category is a fact; ours is a classification. Spending
      // analysis has to be able to tell them apart.
      category_source: tx.category_from_issuer === true ? 'issuer_provided' : 'ai_classified',
      category_confidence: clamp01(tx.confidence),
      cardholder: text(tx.cardholder),
      source_page: num(tx.source_page),
      confidence: clamp01(tx.confidence),
      fingerprint: await transactionFingerprint(txDate, description, amount, direction),
    });
  }
  if (txRows.length > 0) {
    // Chunked: a statement can carry a few hundred lines and one oversized
    // insert is a worse failure than several ordinary ones.
    for (let i = 0; i < txRows.length; i += 100) {
      const { error } = await admin
        .from('credit_transactions')
        .upsert(txRows.slice(i, i + 100), { onConflict: 'statement_id,fingerprint' });
      if (error) console.error('Failed to write transactions:', error.message);
    }
  }

  delete header.purchase_apr_promoted;

  const { error: headerError } = await admin
    .from('credit_statements')
    .update({
      ...header,
      unresolved_items: statement.unresolved_items ?? [],
      processing_state: 'needs_review',
    })
    .eq('id', statementId);
  // Raised rather than logged: a header that did not save leaves a statement
  // whose figures are all null, which reads to the user as "extraction found
  // nothing" rather than as a failure.
  if (headerError) throw new Error(`Could not save the statement summary: ${headerError.message}`);

  return {
    fields: fieldRows.length,
    aprs: aprRows.length,
    transactions: txRows.length,
    truncated: transactions.truncated === true,
  };
}

function json(body: unknown, status: number): Response {
  // Every response carries what it cost. Attaching it here rather than at each
  // return means a path added later cannot forget to report its own bill.
  const usage = ledgerSummary();
  if (usage) {
    console.log(
      `cost $${usage.estimated_cost_usd}` +
      (usage.replayed > 0 ? ` (replayed ${usage.replayed}, saved $${usage.saved_by_replay_usd})` : '') +
      ` · ${usage.calls} calls · ` +
      `cache hit ${(usage.cache_hit_ratio * 100).toFixed(0)}% · ` +
      `${usage.fresh_input_tokens} fresh in / ${usage.cache_read_tokens} cached / ${usage.output_tokens} out`,
    );
  }
  const payload = usage && body && typeof body === 'object' && !Array.isArray(body)
    ? { ...(body as Record<string, unknown>), usage }
    : body;
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[^0-9.\-]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function date(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function text(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  return raw ? raw : null;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function buildDocumentContent(bytes: Uint8Array, mimeType: string | null): unknown[] {
  const mime = (mimeType ?? '').toLowerCase();
  if (mime === 'application/pdf') {
    return [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: toBase64(bytes) } }];
  }
  if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mime)) {
    return [{ type: 'image', source: { type: 'base64', media_type: mime, data: toBase64(bytes) } }];
  }
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/\s+/g, ' ').trim();
  return decoded ? [{ type: 'text', text: decoded.slice(0, 200_000) }] : [];
}

/**
 * Marks the document as the cacheable prefix.
 *
 * Every pass sends the same document and then a different instruction, which is
 * the textbook shared-prefix shape: the breakpoint goes on the last document
 * block, so the instructions that follow can differ freely without invalidating
 * anything. On a ten-page statement the document is the overwhelming majority of
 * the input, and it was being paid for in full three times.
 */
function withDocumentCache(content: unknown[]): unknown[] {
  if (content.length === 0) return content;
  return content.map((block, index) =>
    index === content.length - 1
      ? { ...(block as Record<string, unknown>), cache_control: { type: 'ephemeral' } }
      : block,
  );
}

/**
 * Releases the later passes once the first one starts streaming, which is when
 * its cache entry becomes readable.
 *
 * Measured 2026-08-11, and it does not do what it was written to do. Two
 * concurrent passes over an identical document, both handed the same
 * cache_control'd content, each wrote its own cache entry and neither read the
 * other's: 0% hit ratio on a cold run. A second run of the same document then
 * read both entries back at exactly the token counts the first run wrote
 * (3128 -> 3128, 3606 -> 3606), which is the tell — each pass has its own entry,
 * keyed separately.
 *
 * The likely cause is that the cache key covers the structured-output schema,
 * not just the message prefix, so passes that share a document but differ in
 * schema can never share an entry however the timing is arranged. Unverified.
 *
 * Kept because it costs nothing and still helps across runs, and because the
 * concurrency itself is load-bearing for a different reason: three sequential
 * passes took 133s against a ~150s wall clock.
 *
 * The bill is mostly output anyway — 68% of a measured credit statement — so
 * ANTHROPIC_EFFORT and the model's output rate are the levers that matter here,
 * not input caching.
 */
function cacheGate(timeoutMs = 12000) {
  let release: () => void = () => {};
  const opened = new Promise<void>((resolve) => { release = resolve; });
  return {
    onFirstEvent: () => release(),
    wait: () => Promise.race([opened, new Promise<void>((r) => setTimeout(r, timeoutMs))]),
  };
}

// ─────────────────────────────────────────────────────────────
// Cost accounting
// ─────────────────────────────────────────────────────────────
// Three concurrent passes exist so they can share one cached copy of the
// document. Whether they actually did was invisible: usage came back on every
// response and was thrown away. A cache read costs a tenth of fresh input, so
// the gap between hitting and missing is roughly three times the bill for a
// document — the single biggest unknown in what this function costs to run.
//
// This is a cost log, not billing. Two invocations sharing one isolate would
// blend their totals. The numbers are for choosing a model, not for reconciling
// an invoice.

interface UsageLine {
  label: string;
  model: string;
  input: number;
  output: number;
  cache_write: number;
  cache_read: number;
  /** True when the answer came from the response cache and cost nothing. */
  replayed?: boolean;
  /** What the call would have cost, on a replay. */
  saved_usd?: number;
}

// Dollars per million tokens. Sonnet 5 carries introductory pricing of $2/$10
// through 2026-08-31; the standard rate is used here so an estimate is never
// cheerier than the invoice.
const PRICES: Record<string, { input: number; output: number }> = {
  'claude-opus-5': { input: 5, output: 25 },
  'claude-fable-5': { input: 10, output: 50 },
  'claude-sonnet-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

function priceOf(model: string): { input: number; output: number } {
  const key = Object.keys(PRICES).find((k) => model.startsWith(k));
  return key ? PRICES[key] : { input: 5, output: 25 };
}

let ledger: UsageLine[] = [];
// Request-scoped, set once per invocation alongside the ledger. callClaude is
// called from a dozen places and threading these through every one of them
// would be a lot of edits for no added safety.
let currentHouseholdId: string | null = null;
let bypassCache = false;

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function lineCost(line: UsageLine): number {
  if (line.replayed) return 0;
  const price = priceOf(line.model);
  // A cache write costs 1.25x fresh input; a cache read costs 0.1x.
  return (
    line.input * price.input +
    line.cache_write * price.input * 1.25 +
    line.cache_read * price.input * 0.1 +
    line.output * price.output
  ) / 1_000_000;
}

function ledgerSummary() {
  if (ledger.length === 0) return null;
  const sum = (pick: (l: UsageLine) => number) => ledger.reduce((t, l) => t + pick(l), 0);
  const cacheRead = sum((l) => l.cache_read);
  const freshInput = sum((l) => l.input + l.cache_write);
  const saved = ledger.reduce((t, l) => t + (l.saved_usd ?? 0), 0);
  return {
    calls: ledger.length,
    replayed: ledger.filter((l) => l.replayed).length,
    estimated_cost_usd: Number(ledger.reduce((t, l) => t + lineCost(l), 0).toFixed(4)),
    saved_by_replay_usd: Number(saved.toFixed(4)),
    cache_read_tokens: cacheRead,
    fresh_input_tokens: freshInput,
    // 0 means every pass re-sent the document and the concurrency buys nothing
    // but wall clock. Near 0.6 means two of three passes read the cache.
    cache_hit_ratio: cacheRead + freshInput > 0
      ? Number((cacheRead / (cacheRead + freshInput)).toFixed(3))
      : 0,
    output_tokens: sum((l) => l.output),
    passes: ledger.map((l) => ({ ...l, cost_usd: Number(lineCost(l).toFixed(4)) })),
  };
}

// deno-lint-ignore no-explicit-any
interface CallOptions {
  model?: string;
  /** Names the pass in the cost log. */
  label?: string;
  /** Fires when the response starts arriving — the moment its cache entry becomes readable. */
  onFirstEvent?: () => void;
}

// deno-lint-ignore no-explicit-any
async function callClaude(
  content: unknown[],
  instructions: string,
  schema: unknown,
  effort: string,
  maxTokens: number,
  options: CallOptions = {},
): Promise<any> {
  const model = options.model ?? anthropicModel;

  // Haiku rejects output_config.effort, and the server-side fallback list is
  // scoped to the requested model — both are per-model, so they are set here
  // rather than assumed.
  const isHaiku = model.includes('haiku');
  const outputConfig: Record<string, unknown> = { format: { type: 'json_schema', schema } };
  if (!isHaiku) outputConfig.effort = effort;

  const request: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    output_config: outputConfig,
    messages: [{ role: 'user', content: [...content, { type: 'text', text: instructions }] }],
  };
  if (model.startsWith('claude-opus-5') || model.startsWith('claude-fable-5')) {
    request.betas = ['server-side-fallback-2026-07-01'];
    request.fallbacks = 'default';
  }

  // ── Replay, if this exact computation has been paid for before ───────────
  // The key covers the document, the instructions, the schema, the model, the
  // effort and the extractor version, so a hit cannot return an answer produced
  // by different code. Changing a prompt invalidates it without anyone having to
  // remember to.
  const cacheKey = RESPONSE_CACHE_ON && currentHouseholdId && !bypassCache
    ? await sha256([
        JSON.stringify(content), instructions, JSON.stringify(schema),
        model, effort, String(maxTokens), EXTRACTOR_VERSION,
      ].join('\u0000'))
    : null;

  if (cacheKey && currentHouseholdId) {
    const { data: hit } = await admin
      .from('extraction_response_cache')
      .select('id, response, original_cost_usd, hit_count')
      .eq('household_id', currentHouseholdId)
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (hit) {
      ledger.push({
        label: `${options.label ?? 'pass'} (replayed)`,
        model, input: 0, output: 0, cache_write: 0, cache_read: 0,
        replayed: true, saved_usd: Number(hit.original_cost_usd ?? 0),
      });
      // Best effort: a failed bookkeeping update must not discard a good answer.
      await admin.from('extraction_response_cache')
        .update({ hit_count: (hit.hit_count ?? 0) + 1, last_used_at: new Date().toISOString() })
        .eq('id', hit.id);
      // The gate exists to stagger live calls; nothing is in flight to wait for.
      options.onFirstEvent?.();
      return hit.response;
    }
  }

  // Streamed: a long policy needs a high max_tokens, and non-streaming requests
  // at that size risk HTTP timeouts. finalMessage() still gives one whole reply.
  // deno-lint-ignore no-explicit-any
  const stream = anthropic!.beta.messages.stream(request as any);

  if (options.onFirstEvent) {
    let fired = false;
    const fire = () => { if (!fired) { fired = true; options.onFirstEvent!(); } };
    try {
      // deno-lint-ignore no-explicit-any
      (stream as any).on('streamEvent', fire);
    } catch {
      // If the SDK does not expose the event, the caller's timeout releases the
      // other passes instead. A missed cache read costs money, never correctness.
    }
  }

  const response = await stream.finalMessage();

  // Recorded before any error is thrown: a refusal or a truncation is billed.
  const usage = response.usage;
  ledger.push({
    label: options.label ?? `pass ${ledger.length + 1}`,
    model,
    input: usage?.input_tokens ?? 0,
    output: usage?.output_tokens ?? 0,
    cache_write: usage?.cache_creation_input_tokens ?? 0,
    cache_read: usage?.cache_read_input_tokens ?? 0,
  });

  if (response.stop_reason === 'refusal') {
    throw new Error(`Claude declined to process this document (${response.stop_details?.category ?? 'unspecified'})`);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error(`Extraction was truncated at ${maxTokens} output tokens. The document is long enough to need chunked extraction.`);
  }
  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text' || !block.text) throw new Error('Claude returned no extraction content');
  const parsed = JSON.parse(block.text);

  // Stored after parsing, so a response that could not be parsed is never
  // replayed. Upserted because two concurrent passes over an identical document
  // would otherwise race on the same key.
  if (cacheKey && currentHouseholdId) {
    const line = ledger[ledger.length - 1];
    const { error: cacheError } = await admin.from('extraction_response_cache').upsert({
      household_id: currentHouseholdId,
      cache_key: cacheKey,
      label: options.label ?? null,
      model,
      response: parsed,
      input_tokens: line?.input ?? 0,
      output_tokens: line?.output ?? 0,
      cache_write_tokens: line?.cache_write ?? 0,
      cache_read_tokens: line?.cache_read ?? 0,
      original_cost_usd: line ? lineCost(line) : 0,
      last_used_at: new Date().toISOString(),
    }, { onConflict: 'household_id,cache_key' });
    // Never fatal. Failing to cache costs money; failing the extraction costs
    // the user their document.
    if (cacheError) console.warn('Could not cache the response:', cacheError.message);
  }

  return parsed;
}

/** Common provenance columns lifted off any extracted record. */
// deno-lint-ignore no-explicit-any
function provenance(row: any) {
  return {
    source_page: Number.isFinite(row?.source_page) && row.source_page > 0 ? row.source_page : null,
    evidence: text(row?.evidence),
    confidence: typeof row?.confidence === 'number' ? row.confidence : null,
    value_type: VALUE_TYPES.includes(row?.value_type) ? row.value_type : 'explicit',
  };
}

// deno-lint-ignore no-explicit-any
async function persistInsurance(doc: any, extraction: any): Promise<string> {
  const householdId = doc.household_id;
  const fieldOf = (name: string) =>
    (extraction.policy_fields ?? []).find((f: { field: string }) => f.field === name);
  const valueOf = (name: string) => text(fieldOf(name)?.value);

  const annual = (extraction.premiums ?? []).find(
    (p: { component: string }) => p.component === 'annual_premium',
  );
  const quality = extraction.extraction_quality ?? {};

  const { data: header, error: headerError } = await admin
    .from('insurance_policy_extractions')
    .insert({
      household_id: householdId,
      document_id: doc.id,
      document_class: DOCUMENT_CLASSES.includes(extraction.document_class) ? extraction.document_class : 'unknown',
      insurance_type: INSURANCE_TYPES.includes(extraction.insurance_type) ? extraction.insurance_type : 'unknown',
      carrier: valueOf('carrier'),
      policy_number: valueOf('policy_number'),
      policy_status: valueOf('policy_status'),
      effective_date: date(valueOf('effective_date')),
      expiration_date: date(valueOf('expiration_date')),
      state_of_issuance: valueOf('state_of_issuance'),
      annual_premium: num(annual?.amount),
      policy_fields: extraction.policy_fields ?? [],
      premiums: extraction.premiums ?? [],
      valuation_terms: extraction.valuation_terms ?? [],
      conflicts: extraction.conflicts ?? [],
      unresolved_items: extraction.unresolved_items ?? [],
      extraction_quality: quality,
      declarations_only: quality.declarations_only === true,
      has_full_policy: quality.has_full_policy === true,
      endorsements_appear_missing: quality.endorsements_appear_missing === true,
      plain_language_summary: text(extraction.plain_language_summary),
      model: anthropicModel,
    })
    .select('id')
    .single();

  if (headerError || !header) throw new Error(`Could not save policy extraction: ${headerError?.message}`);
  const extractionId = header.id;
  const base = { extraction_id: extractionId, household_id: householdId };

  // deno-lint-ignore no-explicit-any
  const insertMany = async (table: string, rows: any[]) => {
    if (!rows.length) return;
    const { error } = await admin.from(table).insert(rows);
    // A malformed child row must not discard the whole extraction.
    if (error) console.warn(`Skipped ${rows.length} row(s) for ${table}:`, error.message);
  };

  // deno-lint-ignore no-explicit-any
  await insertMany('insurance_insured_parties', (extraction.insured_parties ?? []).map((r: any) => ({
    ...base, role: r.role, name: text(r.name), relationship: text(r.relationship), ...provenance(r),
  })));

  // deno-lint-ignore no-explicit-any
  await insertMany('insurance_insured_assets', (extraction.insured_assets ?? []).map((r: any) => ({
    ...base,
    asset_type: r.asset_type,
    description: text(r.description),
    address: text(r.address),
    vin: text(r.vin),
    serial_number: text(r.serial_number),
    year: num(r.year),
    make: text(r.make),
    model: text(r.model),
    source_page: provenance(r).source_page,
    evidence: provenance(r).evidence,
    confidence: provenance(r).confidence,
  })));

  // deno-lint-ignore no-explicit-any
  await insertMany('insurance_coverages', (extraction.coverages ?? []).map((r: any) => ({
    ...base,
    coverage_code: canonicalCoverageCode(r.coverage_code),
    coverage_name_raw: text(r.coverage_name_raw),
    applies_to: text(r.applies_to),
    limit_amount: num(r.limit_amount),
    limit_basis: text(r.limit_basis),
    secondary_limit_amount: num(r.secondary_limit_amount),
    secondary_limit_basis: text(r.secondary_limit_basis),
    deductible_amount: num(r.deductible_amount),
    deductible_percent: num(r.deductible_percent),
    coinsurance: text(r.coinsurance),
    included_status: r.included_status ?? 'not_found',
    coverage_basis: text(r.coverage_basis),
    notes: text(r.notes),
    raw_value: text(r.raw_value),
    source_section: text(r.source_section),
    ...provenance(r),
  })));

  // Percentage deductibles: compute the dollar exposure here and label it
  // calculated, keeping the stated percentage intact alongside it.
  const dwelling = (extraction.coverages ?? []).find(
    (c: { coverage_code: string }) => c.coverage_code === 'dwelling',
  );
  const dwellingLimit = num(dwelling?.limit_amount);

  // deno-lint-ignore no-explicit-any
  await insertMany('insurance_deductibles', (extraction.deductibles ?? []).map((r: any) => {
    const percent = num(r.percent);
    const basisIsDwelling = /dwelling|coverage a/i.test(String(r.calculation_basis ?? ''));
    const calculated = percent && dwellingLimit && basisIsDwelling
      ? Math.round((percent / 100) * dwellingLimit * 100) / 100
      : null;
    return {
      ...base,
      deductible_type: r.deductible_type ?? 'other',
      amount: num(r.amount),
      percent,
      calculation_basis: text(r.calculation_basis),
      calculated_amount: calculated,
      // Derived from a limit we also extracted, so never better than that value.
      calculation_confidence: calculated ? Math.min(0.9, provenance(r).confidence ?? 0.9) : null,
      applies_to: text(r.applies_to),
      raw_value: text(r.raw_value),
      ...provenance(r),
    };
  }));

  // deno-lint-ignore no-explicit-any
  await insertMany('insurance_exclusions', (extraction.exclusions ?? []).map((r: any) => ({
    ...base,
    category: r.category ?? 'other',
    summary: text(r.summary),
    policy_language: text(r.policy_language),
    affected_coverage: text(r.affected_coverage),
    sublimit_amount: num(r.sublimit_amount),
    waiting_period: text(r.waiting_period),
    severity: r.severity ?? 'informational',
    source_page: provenance(r).source_page,
    evidence: provenance(r).evidence,
    confidence: provenance(r).confidence,
  })));

  // deno-lint-ignore no-explicit-any
  await insertMany('insurance_endorsements', (extraction.endorsements ?? []).map((r: any) => ({
    ...base,
    endorsement_number: text(r.endorsement_number),
    name: text(r.name),
    effective_date: date(r.effective_date),
    modifies_coverage: text(r.modifies_coverage),
    coverage_added: text(r.coverage_added),
    coverage_removed: text(r.coverage_removed),
    limit_amount: num(r.limit_amount),
    deductible_amount: num(r.deductible_amount),
    premium_impact: num(r.premium_impact),
    restrictions: text(r.restrictions),
    source_page: provenance(r).source_page,
    evidence: provenance(r).evidence,
    confidence: provenance(r).confidence,
  })));

  // deno-lint-ignore no-explicit-any
  await insertMany('insurance_beneficiaries', (extraction.beneficiaries ?? []).map((r: any) => ({
    ...base,
    designation: r.designation ?? 'primary',
    name: text(r.name),
    relationship: text(r.relationship),
    percentage: num(r.percentage),
    is_trust: r.is_trust === true,
    is_employer_owned: r.is_employer_owned === true,
    source_page: provenance(r).source_page,
    evidence: provenance(r).evidence,
    confidence: provenance(r).confidence,
  })));

  // deno-lint-ignore no-explicit-any
  await insertMany('insurance_underlying_requirements', (extraction.underlying_requirements ?? []).map((r: any) => ({
    ...base,
    requirement_type: r.requirement_type ?? 'other',
    required_limit: num(r.required_limit),
    required_limit_basis: text(r.required_limit_basis),
    notes: text(r.notes),
    source_page: provenance(r).source_page,
    evidence: provenance(r).evidence,
    confidence: provenance(r).confidence,
  })));

  return extractionId;
}

Deno.serve(async (req: Request) => {
  ledger = [];
  currentHouseholdId = null;
  bypassCache = false;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!anthropic) {
    console.error('ANTHROPIC_API_KEY is not configured for this function.');
    return json({ error: 'Extraction is not configured: ANTHROPIC_API_KEY is missing.' }, 503);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);
  const caller = createClient(supabaseUrl, supabaseServiceRole, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData?.user) return json({ error: 'Invalid or expired session' }, 401);

  let body: { document_id?: unknown; force_type?: unknown; fresh?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const documentId = body?.document_id;
  if (typeof documentId !== 'string') return json({ error: 'Missing document_id' }, 400);

  // The user's answer about what a document is beats the classifier's. Any
  // classifier is wrong sometimes, and without this a misread document is stuck
  // — re-reading it just runs the same classification again, which is exactly
  // what happened to a credit card statement that kept landing on the generic
  // path. Restricted to the routing fields so it can redirect a reading and
  // nothing else.
  // Correcting a document's type means being dissatisfied with the last answer,
  // so it always buys a fresh one rather than replaying what was rejected.
  bypassCache = body?.fresh === true || typeof body?.force_type === 'string';
  const forcedType = typeof body?.force_type === 'string' ? body.force_type : null;
  if (forcedType && !FORCEABLE_TYPES.includes(forcedType)) {
    return json({ error: `Cannot read a document as '${forcedType}'` }, 400);
  }

  const { data: document, error: documentError } = await admin
    .from('documents').select('*').eq('id', documentId).single();
  if (documentError || !document) return json({ error: 'Document not found' }, 404);

  const { data: household } = await admin
    .from('households').select('id')
    .eq('id', document.household_id).eq('user_id', userData.user.id).maybeSingle();
  if (!household) return json({ error: 'Document not found' }, 404);
  // Set only after ownership is proven, so the cache can never be keyed to a
  // household the caller does not own.
  currentHouseholdId = household.id;
  if (!document.file_path) return json({ error: 'Document has no storage path' }, 400);

  const failDocument = async (message: string, status: number) => {
    await admin.from('documents').update({ status: 'error' }).eq('id', document.id);
    // A legal reading that got as far as a header row must not sit in
    // 'processing' forever. The row and the original upload both survive, so the
    // user can retry without re-uploading.
    await admin
      .from('legal_document_extractions')
      .update({ processing_state: 'failed', failure_reason: message })
      .eq('document_id', document.id)
      .in('processing_state', ['uploaded', 'queued', 'processing']);
    await admin
      .from('credit_statements')
      .update({ processing_state: 'failed', failure_reason: message })
      .eq('document_id', document.id)
      .in('processing_state', ['uploaded', 'queued', 'processing']);
    await admin
      .from('mortgage_statements')
      .update({ processing_state: 'failed', failure_reason: message })
      .eq('document_id', document.id)
      .in('processing_state', ['uploaded', 'queued', 'processing']);
    console.error(message);
    return json({ error: message, document_id: document.id }, status);
  };

  const { data: signed, error: urlError } = await admin.storage
    .from(storageBucket).createSignedUrl(document.file_path, 120);
  if (urlError || !signed?.signedUrl) {
    return await failDocument(`Unable to read document file: ${urlError?.message ?? 'no signed URL'}`, 500);
  }
  const fileResponse = await fetch(signed.signedUrl);
  if (!fileResponse.ok) return await failDocument(`Unable to download document file: ${fileResponse.status}`, 500);

  const bytes = new Uint8Array(await fileResponse.arrayBuffer());
  if (bytes.byteLength === 0) return await failDocument('Document file is empty', 400);
  if (bytes.byteLength > MAX_FILE_BYTES) {
    return await failDocument(
      `Document is ${(bytes.byteLength / 1024 / 1024).toFixed(1)}MB; limit is ${MAX_FILE_BYTES / 1024 / 1024}MB`, 413,
    );
  }

  const content = buildDocumentContent(bytes, document.mime_type);
  if (content.length === 0) return await failDocument('Document contained no readable content', 422);

  try {
    // Pass 1 — classify before extracting. A quote must not be filed as an active
    // policy, and an ID card must not be treated as a coverage source.
    const legalTypes = await loadLegalTypes();
    const classification = await callClaude(
      content,
      `Classify this document. File name: ${document.name}\n\n` +
      `is_insurance is true only for insurance documents. document_class distinguishes a ` +
      `declarations page from a full contract, a quote, a renewal notice, an ID card, and so on — ` +
      `be precise, later processing depends on it. If not insurance, set legacy_type to the closest ` +
      `financial-document category.\n\n` +
      `Legal document type codes (copy one exactly into legal_type):\n` +
      `${legalTypes.map((t) => `  ${t.code} — ${t.label}`).join('\n')}\n` +
      `  unknown_legal_document — a legal document none of the above describes\n\n` +
      `${LEGAL_CLASSIFY_RULES}`,
      CLASSIFY_SCHEMA,
      'low',
      2048,
      // Not cached: caches are per-model, so an entry written here would never
      // be read by the extraction passes below.
      { model: CLASSIFY_MODEL, label: 'classify' },
    );

    // Applied after classification rather than instead of it, so the reading
    // still records what Command thought on its own — a correction is evidence
    // that the classifier needs work, and overwriting it would hide that.
    if (forcedType) {
      console.log(`forced type: ${classification.legacy_type} -> ${forcedType}`);
      classification.classified_as = classification.legacy_type;
      classification.forced = true;
      if (forcedType === 'insurance_dec_page') {
        classification.is_insurance = true;
        classification.legacy_type = 'insurance_dec_page';
      } else if (forcedType === 'legal_document') {
        classification.is_insurance = false;
        classification.legal_recognition = 'legal';
        if (!classification.legal_type || classification.legal_type === 'not_legal') {
          classification.legal_type = 'unknown_legal_document';
        }
      } else if (forcedType === 'tax_return') {
        classification.is_insurance = false;
        classification.tax_document_type = 'tax_return';
      } else if (forcedType === 'mortgage_statement') {
        classification.is_insurance = false;
        classification.home_document_type = 'mortgage_statement';
        classification.legacy_type = 'mortgage_statement';
      } else {
        classification.is_insurance = false;
        classification.legal_recognition = 'not_legal';
        classification.legacy_type = forcedType;
      }
    }

    if (classification.is_insurance) {
      const context =
        `File name: ${document.name}\n` +
        `Classified as: ${classification.document_class}, ${classification.insurance_type}\n\n` +
        `${EXTRACTION_RULES}`;

      // The three passes read the same document and do not depend on each other,
      // so they run concurrently. Sequentially a 12-page policy took 133s, which
      // is inside Supabase's ~150s edge wall-clock only by luck; a real carrier
      // PDF exceeded it and the function was killed mid-extraction. Concurrently
      // the cost is the slowest single pass, not their sum.
      const cached = withDocumentCache(content);
      const gate = cacheGate();

      const identityPass = callClaude(
        cached,
        `${context}\n\nExtract policy identity and lifecycle, every insured party, every insured ` +
        `asset, every premium component (including taxes, fees, surcharges and discounts as ` +
        `separate entries), and the valuation methodology for each property category. Include ` +
        `enough identifying detail on people and assets — names, addresses, VINs, year/make/model, ` +
        `serial numbers — for later entity matching, without asserting any match yourself. ` +
        `Assess completeness honestly: say plainly if this is only a declarations page.\n\n` +
        `Two rules for insured_parties. First, list each person once. Policies name the same ` +
        `individual in several places — the named-insured block, the rated-driver schedule, the ` +
        `signature line — often reordered as "Last, First". Merge those into a single entry with ` +
        `the fullest relationship description rather than repeating the person. Second, ` +
        `lienholders, mortgagees, loss payees and other financial interests are not people ` +
        `covered by the policy: give them role "other" and state what they hold in relationship, ` +
        `so they are never mistaken for drivers or insureds.`,
        IDENTITY_SCHEMA, EXTRACT_EFFORT, 16000, { onFirstEvent: gate.onFirstEvent, label: 'insurance identity' },
      );

      // The other two wait for the first response to begin, which is when its
      // document cache becomes readable. They then read it instead of re-sending
      // the document.
      await gate.wait();

      const coveragePass = callClaude(
        cached,
        `${context}\n\nExtract every coverage and every deductible. For each coverage give the ` +
        `standardized code, the carrier's own wording verbatim, the limit and its basis, any ` +
        `deductible, the valuation basis, and whether it is included, excluded, or simply not ` +
        `found. List deductibles separately as well, including wind, hail, hurricane and named ` +
        `storm. Record percentages as percentages with what they apply to — do not convert them ` +
        `to dollars.\n\nWhen a policy schedules different deductibles per vehicle or per ` +
        `structure, emit one deductible entry per item and set applies_to to that item as the ` +
        `document identifies it — the VIN, or the year/make/model, or the property address. Only ` +
        `leave applies_to empty when the deductible genuinely applies policy-wide.\n\n` +
        `Keep the output bounded: emit included/excluded coverages exhaustively, ` +
        `but add a not_found row only for coverages a reader would reasonably expect on this kind ` +
        `of policy and which genuinely do not appear — at most 8 of them. Do not enumerate every ` +
        `coverage that could theoretically exist.`,
        COVERAGE_SCHEMA, EXTRACT_EFFORT, 16000, { label: 'insurance coverages' },
      );

      // Degradable: a declarations page legitimately has little here, and losing
      // this pass must not discard the other two. Caught inline so it cannot
      // reject the Promise.all below.
      const emptyTerms: Record<string, unknown[]> = {
        exclusions: [], endorsements: [], beneficiaries: [],
        underlying_requirements: [], conflicts: [], unresolved_items: [],
      };
      const termsPass = callClaude(
        cached,
        `${context}\n\nExtract exclusions, sublimits and restrictions, every endorsement or ` +
        `rider, beneficiary and ownership designations, and any underlying limits an umbrella ` +
        `requires. Quote policy language exactly. Do not infer exclusions that are not written ` +
        `here — if this is a declarations page, return few or none and record the gap in ` +
        `unresolved_items. Where two provisions conflict, record both and say which controls.\n\n` +
        `Keep policy_language to the operative sentence or clause — an excerpt of roughly 300 ` +
        `characters, not the whole section. Group repeated boilerplate into one entry rather than ` +
        `repeating it per page.`,
        TERMS_SCHEMA, EXTRACT_EFFORT, 24000, { label: 'insurance terms' },
      ).catch((err) => {
        console.warn('Terms pass failed; keeping identity and coverage results:', err);
        return {
          ...emptyTerms,
          unresolved_items: [{
            item: 'Exclusions, endorsements and beneficiaries',
            why_unresolved: `Extraction pass failed: ${err instanceof Error ? err.message : String(err)}`,
            needed_document: 'Retry extraction, or provide the full policy contract',
          }],
        };
      });

      const [identity, coverageData, terms] = await Promise.all([identityPass, coveragePass, termsPass]);

      const extraction = { ...identity, ...coverageData, ...terms };
      const extractionId = await persistInsurance(document, extraction);

      // Compatibility row so the existing review card keeps working.
      const summary: Record<string, string> = { source: document.name };
      const put = (k: string, v: unknown) => { const t = text(v); if (t) summary[k] = t; };
      const fieldOf = (n: string) => (extraction.policy_fields ?? []).find((f: { field: string }) => f.field === n)?.value;
      put('carrier', fieldOf('carrier'));
      put('policy_number', fieldOf('policy_number'));
      put('renewal_date', fieldOf('expiration_date'));
      put('policy_type', extraction.insurance_type);
      const dwelling = (extraction.coverages ?? []).find((c: { coverage_code: string }) => c.coverage_code === 'dwelling')
        ?? (extraction.coverages ?? []).find((c: { coverage_code: string }) => c.coverage_code === 'umbrella_liability');
      put('coverage_amount', dwelling?.limit_amount);
      const annual = (extraction.premiums ?? []).find((p: { component: string }) => p.component === 'annual_premium');
      put('premium', annual?.amount);

      await admin.from('document_extractions').insert([{
        household_id: document.household_id,
        document_id: document.id,
        detected_type: 'insurance_dec_page',
        confidence: classification.confidence ?? 'medium',
        extracted_fields: summary,
        status: 'pending_review',
      }]);

      await admin.from('documents').update({ status: 'processed' }).eq('id', document.id);

      const q = extraction.extraction_quality ?? {};
      return json({
        document_id: document.id,
        mode: 'insurance',
        extraction_id: extractionId,
        document_class: extraction.document_class,
        insurance_type: extraction.insurance_type,
        counts: {
          coverages: (extraction.coverages ?? []).length,
          deductibles: (extraction.deductibles ?? []).length,
          exclusions: (extraction.exclusions ?? []).length,
          endorsements: (extraction.endorsements ?? []).length,
          insured_assets: (extraction.insured_assets ?? []).length,
          conflicts: (extraction.conflicts ?? []).length,
          unresolved: (extraction.unresolved_items ?? []).length,
        },
        completeness: {
          declarations_only: q.declarations_only === true,
          has_full_policy: q.has_full_policy === true,
          limitations: q.limitations_summary ?? '',
        },
      }, 200);
    }

    // Legal documents. Insurance wins the tie — a title policy attached to a
    // homeowners binder is still handled by the insurance path — so this runs
    // only when the document is not insurance.
    //
    // An empty registry means the legal migration has not been applied to this
    // project yet. Migrations and function deploys are both manual here and can
    // land in either order, so the branch stands down rather than failing every
    // legal upload against tables that do not exist. The document still gets
    // read by the generic path and the file is untouched either way.
    if (
      legalTypes.length > 0 &&
      (classification.legal_recognition === 'legal' || classification.legal_recognition === 'possibly_legal')
    ) {
      const resolved = resolveLegalType(classification.legal_type, legalTypes);

      // Duplicate detection works off the bytes, not the file name: the same
      // will uploaded twice under two names is one document, and a renamed
      // scan is not a new version of anything.
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const contentHash = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const { data: priorVersions } = await admin
        .from('legal_document_extractions')
        .select('id, extraction_version')
        .eq('document_id', document.id)
        .order('extraction_version', { ascending: false })
        .limit(1);
      const previous = priorVersions?.[0] ?? null;

      // Reprocessing adds a version rather than overwriting one, so the earlier
      // reading — and anything the user already confirmed against it — survives.
      const { data: inserted, error: insertError } = await admin
        .from('legal_document_extractions')
        .insert([{
          household_id: document.household_id,
          document_id: document.id,
          recognition: classification.legal_recognition,
          document_type: resolved.code,
          document_subtype: text(classification.legal_subtype),
          category: resolved.category,
          classification_confidence: clamp01(classification.legal_confidence),
          classification_reason: text(classification.legal_reason),
          document_status: LEGAL_DOCUMENT_STATUSES.includes(classification.document_status)
            ? classification.document_status
            : 'unknown',
          document_title: text(classification.document_title),
          page_count: num(classification.page_count),
          document_language: text(classification.document_language),
          processing_state: 'needs_review',
          review_status: 'pending_review',
          extraction_version: (previous?.extraction_version ?? 0) + 1,
          supersedes_extraction_id: previous?.id ?? null,
          content_hash: contentHash,
          extractor_version: EXTRACTOR_VERSION,
          model: anthropicModel,
        }])
        .select('id')
        .single();

      if (insertError || !inserted) {
        return await failDocument(
          `Could not record the legal classification: ${insertError?.message ?? 'no row returned'}`, 500,
        );
      }

      // Duplicate of an earlier upload — proposed, never applied. Which copy
      // controls is the user's call, not an artefact of upload order.
      const { data: sameContent } = await admin
        .from('legal_document_extractions')
        .select('id')
        .eq('household_id', document.household_id)
        .eq('content_hash', contentHash)
        .neq('document_id', document.id)
        .limit(1);

      if (sameContent && sameContent.length > 0) {
        await admin.from('legal_document_relationships').insert([{
          household_id: document.household_id,
          from_extraction_id: inserted.id,
          to_extraction_id: sameContent[0].id,
          relationship: 'duplicate_of',
          rationale: 'The file contents are byte-for-byte identical to a document already uploaded.',
          confidence: 1,
          state: 'suggested',
        }]);
      }

      if (resolved.code === 'unknown_legal_document') {
        await admin.from('legal_issue_flags').insert([{
          household_id: document.household_id,
          extraction_id: inserted.id,
          flag_code: 'type_not_recognised',
          severity: 'worth_reviewing',
          confidence: clamp01(classification.legal_confidence),
          explanation:
            'Command could not match this document to a type it knows. It has been kept exactly as ' +
            'uploaded and nothing has been added to your profile.',
          suggested_action: 'Set the document type yourself and Command will read it properly.',
        }]);
      }

      // Group it in the vault, but never override a category the user chose.
      if (!document.category || document.category === 'general') {
        await admin.from('documents').update({ category: 'legal' }).eq('id', document.id);
      }

      // ── Extraction ───────────────────────────────────────────────────────
      // Three passes over the same pages, concurrent for the same reason the
      // insurance passes are: a sixty-page trust read three times in sequence
      // does not finish inside the edge wall clock.
      const extractor = legalTypes.find((t) => t.code === resolved.code)?.extractor ?? 'generic';
      const legalContext =
        `File name: ${document.name}\n` +
        `Classified as: ${resolved.code}${classification.legal_subtype ? ` (${classification.legal_subtype})` : ''}\n\n` +
        `${LEGAL_EXTRACTION_RULES}`;

      await admin.from('legal_document_extractions')
        .update({ processing_state: 'processing' }).eq('id', inserted.id);

      // Each pass is caught inline: losing one must not discard the other two.
      // A document with unreadable provisions still has usable parties and dates.
      // deno-lint-ignore no-explicit-any
      const degrade = (label: string, empty: any) => (err: unknown) => {
        console.warn(`Legal ${label} pass failed:`, err instanceof Error ? err.message : String(err));
        return empty;
      };

      const legalCached = withDocumentCache(content);
      const legalGate = cacheGate();

      const commonPass = callClaude(
        legalCached,
        `${legalContext}\n\nExtract the common attributes of this document. Emit one entry in ` +
        `fields per attribute genuinely present, using these codes:\n${LEGAL_COMMON_FIELD_CODES}\n\n` +
        `Omit a code entirely rather than guessing at it. Give every entry its page, the section ` +
        `or clause heading where one exists, and a short verbatim excerpt.\n\n` +
        `In execution_observations, report what you can and cannot see about how the document was ` +
        `executed: signatures, notarization, witness signatures, a draft marking, referenced ` +
        `exhibits or schedules that are not attached, and page numbering that suggests missing ` +
        `pages. Use "observed" only when it is visible on these pages, "not_observed" when you ` +
        `looked and it is not there, and "indeterminate" when the scan quality leaves it unclear. ` +
        `Use short snake_case observation codes such as signature_present, notarization_present, ` +
        `witness_signatures_present, marked_draft, referenced_attachment_present, pages_complete.\n\n` +
        `The plain-language summary is two or three sentences describing what the document does, ` +
        `in the words you would use to a friend. No advice, no assessment.`,
        LEGAL_COMMON_SCHEMA, EXTRACT_EFFORT, 12000, { onFirstEvent: legalGate.onFirstEvent, label: 'legal common' },
      ).catch(degrade('common', {
        document_title: '', document_status: 'unknown', page_count: 0, document_language: '',
        plain_language_summary: '', fields: [], execution_observations: [],
        unresolved_items: [{ item: 'Common document attributes', why_unresolved: 'The extraction pass failed. Retry from the document vault.' }],
      }));

      // Released once the first pass starts streaming, so these two read the
      // cached document rather than re-sending it.
      await legalGate.wait();

      const partiesPass = callClaude(
        legalCached,
        `${legalContext}\n\nList every person, trust, business, court and agency named in this ` +
        `document, with the role each one holds. Emit one entry per person-and-role pair: someone ` +
        `who is both trustee and beneficiary gets two entries with the same name.\n\n` +
        `Role codes are short snake_case terms taken from the document's own language — testator, ` +
        `grantor, trustee, successor_trustee, executor, successor_executor, beneficiary, ` +
        `contingent_beneficiary, guardian, alternate_guardian, principal, agent, successor_agent, ` +
        `healthcare_agent, declarant, witness, notary, attorney, grantee, business_owner, party.\n\n` +
        `Where an order of succession is stated, put it in priority (1 for first in line). Where ` +
        `the document says how multiple agents or trustees act together, set acts_jointly. Include ` +
        `addresses and stated relationships where given — they matter for matching people to the ` +
        `household later — but never assert a match yourself.`,
        LEGAL_PARTIES_SCHEMA, EXTRACT_EFFORT, 12000, { label: 'legal parties' },
      ).catch(degrade('parties', { parties: [] }));

      const provisionsPass = callClaude(
        legalCached,
        `${legalContext}\n\nExtract the operative provisions of this document.\n\n` +
        `${PROVISION_GUIDES[extractor] ?? PROVISION_GUIDES.generic}\n\n` +
        `Emit one entry per provision actually present. Set presence to "present" when the ` +
        `document contains it, "not_present" when the document affirmatively states its absence ` +
        `or waives it, and "not_determinable" when these pages simply do not settle it. Put the ` +
        `document's own operative wording in document_language and your plain-language reading in ` +
        `summary — never replace the first with the second.`,
        LEGAL_PROVISIONS_SCHEMA, EXTRACT_EFFORT, 16000, { label: 'legal provisions' },
      ).catch(degrade('provisions', { provisions: [] }));

      const [common, partyData, provisionData] = await Promise.all([commonPass, partiesPass, provisionsPass]);
      const counts = await persistLegalExtraction(
        inserted.id, document.household_id, extractor, common, partyData, provisionData,
      );

      await admin.from('documents').update({ status: 'processed' }).eq('id', document.id);

      // Counts and codes only. Document contents never reach the logs.
      return json({
        document_id: document.id,
        mode: 'legal',
        extraction_id: inserted.id,
        recognition: classification.legal_recognition,
        document_type: resolved.code,
        category: resolved.category,
        extractor,
        classification_confidence: clamp01(classification.legal_confidence),
        duplicate_of: sameContent?.[0]?.id ?? null,
        extraction_version: (previous?.extraction_version ?? 0) + 1,
        counts,
      }, 200);
    }

    // Credit card statements. The existing classifier already recognizes these
    // as 'credit_card_statement'; until now they fell through to the one-field
    // generic path, which read a statement as a handful of loose strings.
    if (classification.legacy_type === 'credit_card_statement') {
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const contentHash = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Same file already read? Reuse the row. Re-reading a statement must not
      // produce a second one — the database enforces it, and this avoids the
      // error path entirely for the common case.
      const { data: existingStatement } = await admin
        .from('credit_statements')
        .select('id, extraction_version')
        .eq('household_id', document.household_id)
        .eq('content_hash', contentHash)
        .maybeSingle();

      let statementId: string;
      if (existingStatement) {
        statementId = existingStatement.id;
        await admin
          .from('credit_statements')
          .update({
            processing_state: 'processing',
            extraction_version: (existingStatement.extraction_version ?? 1) + 1,
            document_id: document.id,
            extractor_version: EXTRACTOR_VERSION,
            model: anthropicModel,
          })
          .eq('id', statementId);
      } else {
        const { data: inserted, error: insertError } = await admin
          .from('credit_statements')
          .insert([{
            household_id: document.household_id,
            document_id: document.id,
            processing_state: 'processing',
            review_status: 'pending_review',
            content_hash: contentHash,
            extractor_version: EXTRACTOR_VERSION,
            model: anthropicModel,
          }])
          .select('id')
          .single();
        if (insertError || !inserted) {
          return await failDocument(
            `Could not record the statement: ${insertError?.message ?? 'no row returned'}`, 500,
          );
        }
        statementId = inserted.id;
      }

      const creditContext = `File name: ${document.name}\n\n${CREDIT_RULES}`;

      const creditCached = withDocumentCache(content);
      const creditGate = cacheGate();

      const statementPass = callClaude(
        creditCached,
        `${creditContext}\n\nExtract this credit card statement. Emit one entry in fields per value ` +
        `genuinely printed, using these codes:\n${CREDIT_FIELD_CODES}\n\n` +
        `Omit a code entirely rather than guessing. Give every entry its page and a short verbatim ` +
        `excerpt — truncated if the line contains an account number.\n\n` +
        `In apr_terms, emit one entry per interest rate the statement lists, with the balance ` +
        `subject to that rate and the interest charged at it where shown. Promotional rates carry ` +
        `their balance and expiration date when printed.`,
        CREDIT_STATEMENT_SCHEMA, EXTRACT_EFFORT, 12000, { onFirstEvent: creditGate.onFirstEvent, label: 'credit statement', model: CREDIT_MODEL },
      ).catch((err) => {
        console.warn('Credit statement pass failed:', err instanceof Error ? err.message : String(err));
        return {
          fields: [], apr_terms: [],
          unresolved_items: [{ item: 'Statement summary', why_unresolved: 'The extraction pass failed. Retry from the document vault.' }],
        };
      });

      await creditGate.wait();

      const transactionsPass = callClaude(
        creditCached,
        `${creditContext}\n\nList every transaction on this statement in order. Give the ` +
        `transaction date, the posting date where both are shown, the merchant description as ` +
        `printed, the amount as a positive number, and direction 'charge' or 'credit'.\n\n` +
        `If the issuer prints a category for a line, copy it and set category_from_issuer true. ` +
        `Otherwise classify it yourself with a short lowercase category — groceries, dining, fuel, ` +
        `travel, utilities, subscriptions, health, retail, entertainment, transfer, fee, interest, ` +
        `payment, other — and set category_from_issuer false. The distinction matters: one is what ` +
        `the issuer said, the other is your reading of it.\n\n` +
        `Set truncated true if you could not fit every line, and transaction_count_stated to the ` +
        `count the statement itself reports if it prints one.\n\n` +
        `If the statement runs to more than 200 transactions, transcribe the first 200 in order and ` +
        `set truncated true rather than working through all of them — a partial list that arrives is ` +
        `worth more than a complete one that times out.`,
        // Transcription, not judgment: medium effort reads a transaction table
        // as accurately as high and is markedly faster, which is what keeps a
        // real multi-page statement inside the edge wall clock.
        CREDIT_TRANSACTIONS_SCHEMA, 'medium', 24000,
      ).catch((err) => {
        console.warn('Credit transactions pass failed:', err instanceof Error ? err.message : String(err));
        return { transactions: [], transaction_count_stated: 0, truncated: false };
      });

      const [statementData, transactionData] = await Promise.all([statementPass, transactionsPass]);
      const counts = await persistCreditStatement(
        statementId, document.household_id, statementData, transactionData,
      );

      if (!document.category || document.category === 'general') {
        await admin.from('documents').update({ category: 'credit' }).eq('id', document.id);
      }
      await admin.from('documents').update({ status: 'processed' }).eq('id', document.id);

      return json({
        document_id: document.id,
        mode: 'credit',
        statement_id: statementId,
        reprocessed: Boolean(existingStatement),
        counts,
        transactions_truncated: transactionData.truncated === true,
      }, 200);
    }

    // A filed return. It is not one of the raw/canonical pairs the other paths
    // use: a filed return is already authoritative, so it lands as one row per
    // year that the household can correct, rather than as a reading awaiting
    // confirmation.
    if (classification.tax_document_type === 'tax_return') {
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const contentHash = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0')).join('');

      const parsed = await callClaude(
        content,
        `Read this filed tax return. File name: ${document.name}\n\n${TAX_RETURN_RULES}\n\n` +
        `Emit one entry in fields per value genuinely printed, using these codes:\n` +
        `${TAX_RETURN_FIELD_CODES}\n\nOmit a code entirely rather than guessing at it.`,
        TAX_RETURN_SCHEMA, EXTRACT_EFFORT, 8000, { model: FORM_MODEL, label: 'tax return' },
      );

      const taxYear = num(parsed.tax_year)
        ?? num((parsed.fields ?? []).find((f: { field_code?: string }) => f.field_code === 'tax_year')?.value);
      if (!taxYear || taxYear < 1990 || taxYear > new Date().getFullYear() + 1) {
        // Without a year there is nothing to file the figures under, and
        // guessing one would silently overwrite a different year's return.
        return await failDocument(
          'Could not find the tax year on this return. Enter the figures by hand instead.', 422,
        );
      }

      const TAX_TEXT = new Set(['filing_status', 'state', 'preparer']);
      // deno-lint-ignore no-explicit-any
      const header: Record<string, any> = {};
      // deno-lint-ignore no-explicit-any
      const fieldRows: any[] = [];

      for (const field of parsed.fields ?? []) {
        const code = text(field.field_code);
        const value = text(field.value);
        if (!code || !value || code === 'tax_year') continue;

        if (code === 'took_standard_deduction') {
          header[code] = /^(true|yes|standard)$/i.test(value);
        } else if (TAX_TEXT.has(code)) {
          header[code] = value;
        } else {
          const parsedNumber = num(value);
          if (parsedNumber === null) continue;
          header[code] = parsedNumber;
        }

        fieldRows.push({
          household_id: document.household_id,
          field_code: code,
          form_line: text(field.form_line),
          value_number: TAX_TEXT.has(code) ? null : num(value),
          value_text: value,
          source_page: num(field.source_page),
          evidence: scrubCardNumbers(text(field.evidence)),
          confidence: clamp01(field.confidence),
          value_type: VALUE_TYPES.includes(field.value_type) ? field.value_type : 'explicit',
        });
      }

      // One row per year. Re-reading the same return updates it in place.
      const { data: saved, error: saveError } = await admin
        .from('tax_returns')
        .upsert({
          household_id: document.household_id,
          document_id: document.id,
          tax_year: taxYear,
          ...header,
          entry_source: 'extracted',
          review_status: 'confirmed',
          content_hash: contentHash,
          extractor_version: EXTRACTOR_VERSION,
          extraction_model: anthropicModel,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'household_id,tax_year' })
        .select('id').single();

      // Checked, and loudly. A return whose header failed to save leaves the
      // planning section drawing empty boxes with no sign anything went wrong.
      if (saveError || !saved) {
        return await failDocument(
          `Read the return but could not save it: ${saveError?.message ?? 'no row returned'}`, 500,
        );
      }

      if (fieldRows.length > 0) {
        const { error: fieldError } = await admin
          .from('tax_return_fields')
          .upsert(fieldRows.map((row) => ({ ...row, return_id: saved.id })),
            { onConflict: 'return_id,field_code' });
        if (fieldError) console.error('Failed to write return fields:', fieldError.message);
      }

      if (!document.category || document.category === 'general') {
        await admin.from('documents').update({ category: 'tax' }).eq('id', document.id);
      }
      await admin.from('documents').update({ status: 'processed' }).eq('id', document.id);

      return json({
        document_id: document.id, mode: 'tax_return', return_id: saved.id,
        tax_year: taxYear, fields: fieldRows.length,
      }, 200);
    }

    // Home paperwork: the mortgage statement and anything about a system in the
    // house. Both are single-pass — a page of figures and a page of terms.
    const homeType = classification.home_document_type;
    if (homeType === 'mortgage_statement' || classification.legacy_type === 'mortgage_statement') {
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const contentHash = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0')).join('');

      const { data: prior } = await admin
        .from('mortgage_statements').select('id')
        .eq('household_id', document.household_id).eq('content_hash', contentHash).maybeSingle();

      let statementId: string;
      if (prior) {
        statementId = prior.id;
        await admin.from('mortgage_statements')
          .update({ processing_state: 'processing', document_id: document.id })
          .eq('id', statementId);
      } else {
        const { data: inserted, error: insertError } = await admin
          .from('mortgage_statements')
          .insert([{
            household_id: document.household_id, document_id: document.id,
            processing_state: 'processing', review_status: 'pending_review',
            content_hash: contentHash, extractor_version: EXTRACTOR_VERSION, model: anthropicModel,
          }])
          .select('id').single();
        if (insertError || !inserted) {
          return await failDocument(`Could not record the statement: ${insertError?.message ?? 'no row'}`, 500);
        }
        statementId = inserted.id;
      }

      const mortgage = await callClaude(
        content,
        `Read this mortgage statement. File name: ${document.name}\n\n${MORTGAGE_RULES}\n\n` +
        `Emit one entry in fields per value genuinely printed, using these codes:\n` +
        `${MORTGAGE_FIELD_CODES}\n\nOmit a code entirely rather than guessing at it.`,
        MORTGAGE_SCHEMA, EXTRACT_EFFORT, 8000, { model: FORM_MODEL, label: 'mortgage' },
      );

      // deno-lint-ignore no-explicit-any
      const header: Record<string, any> = {};
      // deno-lint-ignore no-explicit-any
      const fieldRows: any[] = [];
      const MORTGAGE_DATES = new Set(['statement_date', 'payment_due_date', 'maturity_date']);
      const MORTGAGE_TEXT = new Set(['servicer', 'property_address', 'borrower', 'rate_type', 'loan_number_last4']);

      for (const field of mortgage.fields ?? []) {
        const code = text(field.field_code);
        const rawValue = text(field.value);
        if (!code || !rawValue) continue;

        const isLastFour = code === 'loan_number_last4';
        const value = isLastFour ? lastFourOnly(rawValue) : rawValue;
        if (!value) continue;

        const isDate = MORTGAGE_DATES.has(code);
        const isText = MORTGAGE_TEXT.has(code);

        fieldRows.push({
          statement_id: statementId, household_id: document.household_id,
          field_code: code,
          value_text: value,
          value_number: !isDate && !isText ? num(value) : null,
          value_date: isDate ? date(value) : null,
          raw_value: isLastFour ? value : scrubCardNumbers(text(field.raw_value)),
          source_page: num(field.source_page),
          evidence: scrubCardNumbers(text(field.evidence)),
          confidence: clamp01(field.confidence),
          value_type: VALUE_TYPES.includes(field.value_type) ? field.value_type : 'explicit',
          is_sensitive: isLastFour,
        });
        header[code] = isDate ? date(value) : isText ? value : num(value);
      }

      if (fieldRows.length > 0) {
        const { error } = await admin.from('mortgage_statement_fields')
          .upsert(fieldRows, { onConflict: 'statement_id,field_code' });
        if (error) console.error('Failed to write mortgage fields:', error.message);
      }

      // The error is checked. An earlier version of this wrote a column the
      // table does not have, PostgREST rejected the whole update, and because
      // nothing looked at the error the record came back with every promoted
      // value null and no sign that anything had gone wrong. A persistence
      // failure here makes the statement useless, so it fails loudly.
      const { error: headerError } = await admin
        .from('mortgage_statements')
        .update({ ...header, processing_state: 'needs_review' })
        .eq('id', statementId);
      if (headerError) {
        return await failDocument(
          `Read the statement but could not save it: ${headerError.message}`, 500,
        );
      }

      if (!document.category || document.category === 'general') {
        await admin.from('documents').update({ category: 'home' }).eq('id', document.id);
      }
      await admin.from('documents').update({ status: 'processed' }).eq('id', document.id);

      return json({
        document_id: document.id, mode: 'mortgage', statement_id: statementId,
        reprocessed: Boolean(prior), fields: fieldRows.length,
      }, 200);
    }

    if (['appliance_warranty', 'appliance_manual', 'appliance_receipt', 'service_contract']
      .includes(homeType)) {
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const contentHash = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0')).join('');

      const appliance = await callClaude(
        content,
        `Read this document about a household system or appliance. File name: ${document.name}\n\n` +
        `${APPLIANCE_RULES}\n\nIdentify what the equipment is, who made it, and what any warranty ` +
        `covers and until when. Leave a field empty rather than guessing at it.`,
        APPLIANCE_SCHEMA, EXTRACT_EFFORT, 8000, { model: FORM_MODEL, label: 'appliance' },
      );

      const row = {
        household_id: document.household_id,
        document_id: document.id,
        content_hash: contentHash,
        document_kind: ['warranty', 'manual', 'receipt', 'invoice', 'service_contract', 'inspection', 'other']
          .includes(appliance.document_kind) ? appliance.document_kind : 'other',
        product_name: text(appliance.product_name),
        suggested_category: text(appliance.suggested_category),
        make: text(appliance.make),
        model: text(appliance.model),
        serial_number: text(appliance.serial_number),
        purchased_on: date(appliance.purchased_on),
        installed_on: date(appliance.installed_on),
        purchase_price: num(appliance.purchase_price),
        purchased_from: text(appliance.purchased_from),
        warranty_provider: text(appliance.warranty_provider),
        warranty_type: text(appliance.warranty_type),
        warranty_starts_on: date(appliance.warranty_starts_on),
        warranty_expires_on: date(appliance.warranty_expires_on),
        warranty_length_months: num(appliance.warranty_length_months),
        coverage_summary: text(appliance.coverage_summary),
        exclusions_summary: text(appliance.exclusions_summary),
        claim_contact: text(appliance.claim_contact),
        fields: appliance.fields ?? [],
        processing_state: 'needs_review',
        review_status: 'pending_review',
        extractor_version: EXTRACTOR_VERSION,
        extraction_model: anthropicModel,
      };

      const { data: saved, error: saveError } = await admin
        .from('appliance_extractions')
        .upsert(row, { onConflict: 'household_id,content_hash' })
        .select('id').single();
      if (saveError) {
        return await failDocument(`Read the document but could not save it: ${saveError.message}`, 500);
      }

      if (!document.category || document.category === 'general') {
        await admin.from('documents').update({ category: 'home' }).eq('id', document.id);
      }
      await admin.from('documents').update({ status: 'processed' }).eq('id', document.id);

      return json({
        document_id: document.id, mode: 'appliance', extraction_id: saved?.id,
        product: row.product_name, category: row.suggested_category,
      }, 200);
    }

    // An information form — a W-2, a 1099, a 1098. These do not get their own
    // extraction path: what the section needs from them is that they *arrived*,
    // so the year's checklist can stop asking. The figures still go through the
    // generic pass below, so the fall-through is deliberate.
    const TAX_FORM_EXPECTATIONS: Record<string, string> = {
      w2: 'w2', '1099': '1099_int', '1098': '1098', k1: 'k1', '1095': '1095',
    };
    const taxFormType = classification.tax_document_type;
    if (taxFormType && TAX_FORM_EXPECTATIONS[taxFormType]) {
      // Which tax year a form belongs to is printed on it, but the classifier
      // does not read figures. The filing year is the safe assumption: forms
      // arrive in January for the year that just closed.
      const now = new Date();
      const formYear = now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear();

      const { data: priorForm } = await admin
        .from('tax_documents').select('id')
        .eq('household_id', document.household_id)
        .eq('document_id', document.id).maybeSingle();

      if (!priorForm) {
        const { error: formError } = await admin.from('tax_documents').insert([{
          household_id: document.household_id,
          document_id: document.id,
          name: document.name,
          doc_type: taxFormType,
          form_type: taxFormType,
          tax_year: formYear,
          status: 'received',
          received_on: now.toISOString().slice(0, 10),
          satisfies_expectation: TAX_FORM_EXPECTATIONS[taxFormType],
        }]);
        // Not fatal: the figures are still worth having even if the checklist
        // entry did not land. It is logged rather than swallowed.
        if (formError) console.error('Failed to record the tax form:', formError.message);
      }

      if (!document.category || document.category === 'general') {
        await admin.from('documents').update({ category: 'tax' }).eq('id', document.id);
      }
    }

    // Non-insurance: the original lightweight path.
    const generic = await callClaude(
      content,
      `Classify this household document and extract its key fields.\n\nFile name: ${document.name}\n` +
      `Classified as: ${classification.legacy_type}\n\n` +
      `Return one entry per field genuinely present. Omit anything absent rather than guessing. ` +
      `Amounts are digits only; dates are YYYY-MM-DD.`,
      GENERIC_SCHEMA,
      'medium',
      4096,
      { model: GENERIC_MODEL, label: 'generic' },
    );

    const fields: Record<string, string> = {};
    for (const pair of generic.extracted_fields ?? []) {
      if (!pair?.key) continue;
      const value = String(pair.value ?? '').trim();
      if (value && !(pair.key in fields)) fields[pair.key] = value;
    }

    await admin.from('document_extractions').insert([{
      household_id: document.household_id,
      document_id: document.id,
      detected_type: LEGACY_TYPES.includes(generic.detected_type) ? generic.detected_type : 'unknown',
      confidence: ['high', 'medium', 'low'].includes(generic.confidence) ? generic.confidence : 'low',
      extracted_fields: { ...fields, source: document.name },
      status: 'pending_review',
    }]);
    await admin.from('documents').update({ status: 'processed' }).eq('id', document.id);

    return json({
      document_id: document.id,
      mode: 'generic',
      detected_type: generic.detected_type,
      confidence: generic.confidence,
      fields_found: Object.keys(fields).length,
    }, 200);
  } catch (error) {
    return await failDocument(
      `Claude extraction failed: ${error instanceof Error ? error.message : String(error)}`, 502,
    );
  }
});
