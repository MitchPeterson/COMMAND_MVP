import Anthropic from 'npm:@anthropic-ai/sdk@0.115.0';
import { createClient } from 'npm:@supabase/supabase-js@2.111.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const storageBucket = Deno.env.get('SUPABASE_STORAGE_BUCKET') ?? 'raw-uploads';
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
const anthropicModel = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-opus-5';

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

const LEGACY_TYPES = [
  'mortgage_statement', 'insurance_dec_page', 'credit_card_statement',
  'bank_statement', 'tax_document', 'paystub', 'unknown',
];

const VALUE_TYPES = ['explicit', 'calculated', 'inferred', 'unknown'];

// Stamped on every extraction row. Bump it when a prompt or schema changes in a
// way that would make an old reading and a new one incomparable.
const EXTRACTOR_VERSION = 'legal-2026.08.08-classify';

// Canonical coverage vocabulary. Deliberately NOT a schema enum — ~60 values
// blew the compiled-grammar budget. The model writes a loose code, we canonicalise
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
  },
  required: [
    'is_insurance', 'document_class', 'insurance_type', 'legacy_type', 'confidence',
    'legal_recognition', 'legal_type', 'legal_subtype', 'legal_confidence', 'legal_reason',
    'document_title', 'document_status', 'page_count', 'document_language',
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
6. document_status reports what the document says about itself: "draft" if it is
   marked draft, "recorded" if it carries recording detail, "executed" if it is
   signed and dated. Use "unknown" when the pages do not say. This is never a
   judgement about whether the document is valid or effective.
7. document_title is the document's own title, verbatim. Empty string if untitled.
8. page_count is the number of pages provided. 0 if you cannot tell.
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
    console.error('Could not load legal_document_types:', error.message);
    return [];
  }
  legalTypeCache = data ?? [];
  return legalTypeCache;
}

/**
 * Validates the model's type against the registry. Anything unrecognised becomes
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

function clamp01(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(Math.max(parsed, 0), 1);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
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

// deno-lint-ignore no-explicit-any
async function callClaude(content: unknown[], instructions: string, schema: unknown, effort: string, maxTokens: number): Promise<any> {
  // Streamed: a long policy needs a high max_tokens, and non-streaming requests
  // at that size risk HTTP timeouts. finalMessage() still gives one whole reply.
  const stream = anthropic!.beta.messages.stream({
    model: anthropicModel,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort, format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: [...content, { type: 'text', text: instructions }] }],
    // deno-lint-ignore no-explicit-any
  } as any);
  const response = await stream.finalMessage();

  if (response.stop_reason === 'refusal') {
    throw new Error(`Claude declined to process this document (${response.stop_details?.category ?? 'unspecified'})`);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error(`Extraction was truncated at ${maxTokens} output tokens. The document is long enough to need chunked extraction.`);
  }
  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text' || !block.text) throw new Error('Claude returned no extraction content');
  return JSON.parse(block.text);
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

  let body: { document_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const documentId = body?.document_id;
  if (typeof documentId !== 'string') return json({ error: 'Missing document_id' }, 400);

  const { data: document, error: documentError } = await admin
    .from('documents').select('*').eq('id', documentId).single();
  if (documentError || !document) return json({ error: 'Document not found' }, 404);

  const { data: household } = await admin
    .from('households').select('id')
    .eq('id', document.household_id).eq('user_id', userData.user.id).maybeSingle();
  if (!household) return json({ error: 'Document not found' }, 404);
  if (!document.file_path) return json({ error: 'Document has no storage path' }, 400);

  const failDocument = async (message: string, status: number) => {
    await admin.from('documents').update({ status: 'error' }).eq('id', document.id);
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
    );

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
      const identityPass = callClaude(
        content,
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
        IDENTITY_SCHEMA, 'high', 16000,
      );

      const coveragePass = callClaude(
        content,
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
        COVERAGE_SCHEMA, 'high', 16000,
      );

      // Degradable: a declarations page legitimately has little here, and losing
      // this pass must not discard the other two. Caught inline so it cannot
      // reject the Promise.all below.
      const emptyTerms: Record<string, unknown[]> = {
        exclusions: [], endorsements: [], beneficiaries: [],
        underlying_requirements: [], conflicts: [], unresolved_items: [],
      };
      const termsPass = callClaude(
        content,
        `${context}\n\nExtract exclusions, sublimits and restrictions, every endorsement or ` +
        `rider, beneficiary and ownership designations, and any underlying limits an umbrella ` +
        `requires. Quote policy language exactly. Do not infer exclusions that are not written ` +
        `here — if this is a declarations page, return few or none and record the gap in ` +
        `unresolved_items. Where two provisions conflict, record both and say which controls.\n\n` +
        `Keep policy_language to the operative sentence or clause — an excerpt of roughly 300 ` +
        `characters, not the whole section. Group repeated boilerplate into one entry rather than ` +
        `repeating it per page.`,
        TERMS_SCHEMA, 'high', 24000,
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
    if (classification.legal_recognition === 'legal' || classification.legal_recognition === 'possibly_legal') {
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
      await admin.from('documents').update({ status: 'processed' }).eq('id', document.id);

      return json({
        document_id: document.id,
        mode: 'legal',
        extraction_id: inserted.id,
        recognition: classification.legal_recognition,
        document_type: resolved.code,
        category: resolved.category,
        classification_confidence: clamp01(classification.legal_confidence),
        duplicate_of: sameContent?.[0]?.id ?? null,
        extraction_version: (previous?.extraction_version ?? 0) + 1,
      }, 200);
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
