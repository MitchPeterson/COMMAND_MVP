// The legal document taxonomy.
//
// Three things are deliberately separate here:
//
//   category    — the shelf a document sits on in the UI
//   type        — what the document is ('last_will_and_testament')
//   subtype     — a jurisdiction or form variant, free text, never enumerated
//   extractor   — which type-specific extraction pass reads it
//
// Types are *data*, not a Postgres CHECK constraint. They are mirrored into the
// legal_document_types lookup table, so adding "Minnesota transfer-on-death
// deed" is a row and a line here, never a migration and a redeploy.
//
// The extractor key is what keeps the pipeline modular: forty-odd types collapse
// onto eight extraction passes, and a new type only needs a new pass if it reads
// nothing like anything already supported.
//
// Nothing in this file decides whether a document is legally valid, current, or
// controlling. It decides what to call it and which questions to ask of it.

export type LegalCategory =
  | 'estate_planning'
  | 'authority_healthcare'
  | 'property_ownership'
  | 'family'
  | 'business'
  | 'unclassified';

/** Which type-specific extraction pass reads a document of this type. */
export type LegalExtractor =
  | 'will'
  | 'trust'
  | 'power_of_attorney'
  | 'healthcare_directive'
  | 'deed_property'
  | 'family'
  | 'business'
  | 'generic';

/**
 * How confident the classifier is that this is a legal document at all. Separate
 * from which type it is — a document can be unmistakably legal and still be of
 * an uncertain type.
 */
export type LegalRecognition = 'legal' | 'possibly_legal' | 'not_legal';

export interface LegalDocumentType {
  code: string;
  label: string;
  category: LegalCategory;
  extractor: LegalExtractor;
  /** Wordings a classifier or a filename plausibly uses for this type. */
  aliases?: string[];
  /** Shown in the review screen to explain what Command looks for. */
  hint?: string;
}

export const LEGAL_CATEGORIES: Array<{ code: LegalCategory; label: string; blurb: string }> = [
  {
    code: 'estate_planning',
    label: 'Estate planning',
    blurb: 'Wills, trusts, amendments and the documents that direct what happens to what you own.',
  },
  {
    code: 'authority_healthcare',
    label: 'Authority and healthcare',
    blurb: 'Who can act for you, and what care you want, if you cannot speak for yourself.',
  },
  {
    code: 'property_ownership',
    label: 'Property and ownership',
    blurb: 'Deeds, titles and the instruments that record who owns what.',
  },
  {
    code: 'family',
    label: 'Family',
    blurb: 'Marriage, separation, custody, adoption and name changes.',
  },
  {
    code: 'business',
    label: 'Business interests',
    blurb: 'Entity formation, ownership, succession and the agreements between owners.',
  },
  {
    code: 'unclassified',
    label: 'Unclassified',
    blurb: 'Kept as uploaded, waiting for you to tell Command what it is.',
  },
];

export const LEGAL_DOCUMENT_TYPES: LegalDocumentType[] = [
  // ── Estate planning ────────────────────────────────────────────────────────
  {
    code: 'last_will_and_testament',
    label: 'Last will and testament',
    category: 'estate_planning',
    extractor: 'will',
    aliases: ['will', 'last will', 'testament', 'will and testament'],
    hint: 'Testator, executor, guardians, beneficiaries and specific gifts.',
  },
  {
    code: 'codicil',
    label: 'Codicil',
    category: 'estate_planning',
    extractor: 'will',
    aliases: ['codicil to will', 'will amendment'],
    hint: 'Amends a will. Command looks for the will it refers to.',
  },
  {
    code: 'pour_over_will',
    label: 'Pour-over will',
    category: 'estate_planning',
    extractor: 'will',
    aliases: ['pourover will', 'pour over will'],
    hint: 'A will that directs the estate into a trust.',
  },
  {
    code: 'revocable_living_trust',
    label: 'Revocable living trust',
    category: 'estate_planning',
    extractor: 'trust',
    aliases: ['living trust', 'revocable trust', 'inter vivos trust', 'family trust'],
    hint: 'Grantor, trustees, successor trustees, beneficiaries and distribution terms.',
  },
  {
    code: 'irrevocable_trust',
    label: 'Irrevocable trust',
    category: 'estate_planning',
    extractor: 'trust',
    aliases: ['ilit', 'irrevocable life insurance trust', 'grantor retained trust'],
  },
  {
    code: 'testamentary_trust',
    label: 'Testamentary trust',
    category: 'estate_planning',
    extractor: 'trust',
    aliases: ['trust under will'],
  },
  {
    code: 'trust_amendment_or_restatement',
    label: 'Trust amendment or restatement',
    category: 'estate_planning',
    extractor: 'trust',
    aliases: ['amendment to trust', 'restatement of trust', 'first amendment', 'trust restatement'],
    hint: 'Amends a trust. Command looks for the trust it refers to.',
  },
  {
    code: 'certification_of_trust',
    label: 'Certification or abstract of trust',
    category: 'estate_planning',
    extractor: 'trust',
    aliases: ['certificate of trust', 'abstract of trust', 'trust certification'],
    hint: 'A summary a bank accepts in place of the full trust.',
  },
  {
    code: 'estate_planning_summary',
    label: 'Estate planning summary or binder',
    category: 'estate_planning',
    extractor: 'generic',
    aliases: ['estate plan summary', 'estate planning binder', 'flowchart'],
  },

  // ── Authority and healthcare ───────────────────────────────────────────────
  {
    code: 'durable_financial_poa',
    label: 'Durable financial power of attorney',
    category: 'authority_healthcare',
    extractor: 'power_of_attorney',
    aliases: ['durable power of attorney', 'financial poa', 'dpoa', 'statutory short form power of attorney'],
    hint: 'Principal, agent, successor agents, powers granted and withheld.',
  },
  {
    code: 'limited_or_general_poa',
    label: 'Limited or general power of attorney',
    category: 'authority_healthcare',
    extractor: 'power_of_attorney',
    aliases: ['general power of attorney', 'limited power of attorney', 'special power of attorney'],
  },
  {
    code: 'healthcare_poa',
    label: 'Healthcare power of attorney',
    category: 'authority_healthcare',
    extractor: 'healthcare_directive',
    aliases: ['medical power of attorney', 'healthcare proxy', 'appointment of healthcare agent'],
  },
  {
    code: 'advance_healthcare_directive',
    label: 'Advance healthcare directive',
    category: 'authority_healthcare',
    extractor: 'healthcare_directive',
    aliases: ['advance directive', 'healthcare directive', 'health care directive'],
  },
  {
    code: 'living_will',
    label: 'Living will',
    category: 'authority_healthcare',
    extractor: 'healthcare_directive',
    aliases: ['declaration to physicians', 'directive to physicians'],
  },
  {
    code: 'hipaa_authorization',
    label: 'HIPAA authorization',
    category: 'authority_healthcare',
    extractor: 'healthcare_directive',
    aliases: ['hipaa release', 'authorization for release of health information'],
  },
  {
    code: 'dnr_or_polst',
    label: 'DNR order or POLST/MOLST form',
    category: 'authority_healthcare',
    extractor: 'healthcare_directive',
    aliases: ['do not resuscitate', 'dnr', 'polst', 'molst', 'post form'],
  },
  {
    code: 'guardian_or_conservator_appointment',
    label: 'Appointment of guardian or conservator',
    category: 'authority_healthcare',
    extractor: 'family',
    aliases: ['appointment of guardian', 'appointment of conservator', 'letters of guardianship'],
  },
  {
    code: 'standby_guardianship_authorization',
    label: 'Standby or temporary guardianship authorization',
    category: 'authority_healthcare',
    extractor: 'family',
    aliases: ['standby guardianship', 'temporary guardianship', 'delegation of parental authority'],
  },

  // ── Property and ownership ─────────────────────────────────────────────────
  {
    code: 'warranty_deed',
    label: 'Warranty deed',
    category: 'property_ownership',
    extractor: 'deed_property',
    aliases: ['general warranty deed', 'special warranty deed', 'grant deed'],
    hint: 'Grantor, grantee, legal description, recording details and vesting language.',
  },
  {
    code: 'quitclaim_deed',
    label: 'Quitclaim deed',
    category: 'property_ownership',
    extractor: 'deed_property',
    aliases: ['quit claim deed', 'quitclaim'],
  },
  {
    code: 'transfer_on_death_deed',
    label: 'Transfer-on-death deed',
    category: 'property_ownership',
    extractor: 'deed_property',
    aliases: ['tod deed', 'beneficiary deed', 'transfer on death deed'],
  },
  {
    code: 'life_estate_deed',
    label: 'Life estate deed',
    category: 'property_ownership',
    extractor: 'deed_property',
    aliases: ['life estate', 'lady bird deed', 'enhanced life estate deed'],
  },
  {
    code: 'mortgage_or_security_instrument',
    label: 'Mortgage or security instrument',
    category: 'property_ownership',
    extractor: 'deed_property',
    aliases: ['mortgage', 'deed of trust', 'security deed', 'security instrument'],
  },
  {
    code: 'property_title',
    label: 'Property title document',
    category: 'property_ownership',
    extractor: 'deed_property',
    aliases: ['title policy', 'title commitment', 'certificate of title', 'abstract of title'],
  },
  {
    code: 'vehicle_title',
    label: 'Vehicle title',
    category: 'property_ownership',
    extractor: 'deed_property',
    aliases: ['certificate of title vehicle', 'car title'],
  },
  {
    code: 'boat_or_rv_title',
    label: 'Boat or recreational vehicle title',
    category: 'property_ownership',
    extractor: 'deed_property',
    aliases: ['boat title', 'rv title', 'watercraft title', 'trailer title'],
  },
  {
    code: 'bill_of_sale',
    label: 'Bill of sale',
    category: 'property_ownership',
    extractor: 'deed_property',
    aliases: ['bill of sale agreement'],
  },
  {
    code: 'homestead_filing',
    label: 'Homestead-related legal filing',
    category: 'property_ownership',
    extractor: 'deed_property',
    aliases: ['homestead declaration', 'homestead exemption', 'declaration of homestead'],
  },

  // ── Family ─────────────────────────────────────────────────────────────────
  {
    code: 'prenuptial_agreement',
    label: 'Prenuptial agreement',
    category: 'family',
    extractor: 'family',
    aliases: ['prenup', 'premarital agreement', 'antenuptial agreement'],
  },
  {
    code: 'postnuptial_agreement',
    label: 'Postnuptial agreement',
    category: 'family',
    extractor: 'family',
    aliases: ['postnup', 'post-marital agreement'],
  },
  {
    code: 'marriage_certificate',
    label: 'Marriage certificate',
    category: 'family',
    extractor: 'family',
    aliases: ['certificate of marriage', 'marriage license'],
  },
  {
    code: 'divorce_decree',
    label: 'Divorce decree',
    category: 'family',
    extractor: 'family',
    aliases: ['dissolution of marriage', 'judgment of divorce', 'final decree of divorce'],
  },
  {
    code: 'legal_separation_agreement',
    label: 'Legal separation agreement',
    category: 'family',
    extractor: 'family',
    aliases: ['separation agreement', 'marital settlement agreement'],
  },
  {
    code: 'custody_or_parenting_agreement',
    label: 'Child custody or parenting agreement',
    category: 'family',
    extractor: 'family',
    aliases: ['parenting plan', 'custody order', 'custody agreement', 'parenting time schedule'],
  },
  {
    code: 'adoption_decree',
    label: 'Adoption decree',
    category: 'family',
    extractor: 'family',
    aliases: ['decree of adoption', 'final adoption order'],
  },
  {
    code: 'name_change_order',
    label: 'Name-change order',
    category: 'family',
    extractor: 'family',
    aliases: ['order for name change', 'legal name change'],
  },
  {
    code: 'guardianship_or_conservatorship_order',
    label: 'Guardianship or conservatorship order',
    category: 'family',
    extractor: 'family',
    aliases: ['order appointing guardian', 'order appointing conservator', 'letters of conservatorship'],
  },

  // ── Business ───────────────────────────────────────────────────────────────
  {
    code: 'articles_of_incorporation_or_organization',
    label: 'Articles of incorporation or organization',
    category: 'business',
    extractor: 'business',
    aliases: ['articles of incorporation', 'articles of organization', 'certificate of formation'],
  },
  {
    code: 'operating_agreement',
    label: 'Operating agreement',
    category: 'business',
    extractor: 'business',
    aliases: ['llc operating agreement', 'member agreement'],
  },
  {
    code: 'partnership_agreement',
    label: 'Partnership agreement',
    category: 'business',
    extractor: 'business',
    aliases: ['general partnership agreement', 'limited partnership agreement'],
  },
  {
    code: 'shareholder_agreement',
    label: 'Shareholder agreement',
    category: 'business',
    extractor: 'business',
    aliases: ['stockholder agreement', 'shareholders agreement'],
  },
  {
    code: 'buy_sell_agreement',
    label: 'Buy-sell agreement',
    category: 'business',
    extractor: 'business',
    aliases: ['cross purchase agreement', 'redemption agreement', 'buy/sell'],
  },
  {
    code: 'business_succession_document',
    label: 'Business succession document',
    category: 'business',
    extractor: 'business',
    aliases: ['succession plan', 'business continuity agreement'],
  },
  {
    code: 'beneficial_ownership_record',
    label: 'Beneficial ownership or ownership record',
    category: 'business',
    extractor: 'business',
    aliases: ['boi report', 'beneficial ownership information', 'cap table', 'membership ledger'],
  },
  {
    code: 'personal_guarantee',
    label: 'Personal guarantee',
    category: 'business',
    extractor: 'business',
    aliases: ['guaranty', 'personal guaranty', 'continuing guaranty'],
  },
  {
    code: 'promissory_note',
    label: 'Promissory note',
    category: 'business',
    extractor: 'business',
    aliases: ['note', 'loan note', 'intrafamily note'],
  },
  {
    code: 'settlement_agreement',
    label: 'Settlement agreement',
    category: 'business',
    extractor: 'generic',
    aliases: ['release and settlement', 'settlement and release'],
  },
  {
    code: 'court_order_or_judgment',
    label: 'Court order or judgment',
    category: 'business',
    extractor: 'generic',
    aliases: ['judgment', 'court order', 'order of the court'],
  },
  {
    code: 'unclassified_legal_contract',
    label: 'Legal contract, not otherwise classified',
    category: 'business',
    extractor: 'generic',
    aliases: ['contract', 'agreement'],
  },

  // ── Unclassified ───────────────────────────────────────────────────────────
  {
    code: 'unknown_legal_document',
    label: 'Unrecognized legal document',
    category: 'unclassified',
    extractor: 'generic',
    hint: 'Kept exactly as uploaded. Tell Command what it is and it will read it properly.',
  },
  {
    code: 'possibly_legal',
    label: 'Possibly a legal document',
    category: 'unclassified',
    extractor: 'generic',
    hint: 'Command is not confident this is a legal document.',
  },
  {
    code: 'not_legal',
    label: 'Not a legal document',
    category: 'unclassified',
    extractor: 'generic',
  },
];

const BY_CODE = new Map(LEGAL_DOCUMENT_TYPES.map((t) => [t.code, t]));

const BY_ALIAS = (() => {
  const map = new Map<string, LegalDocumentType>();
  for (const type of LEGAL_DOCUMENT_TYPES) {
    map.set(type.code.replace(/_/g, ' '), type);
    map.set(type.label.toLowerCase(), type);
    for (const alias of type.aliases ?? []) map.set(alias.toLowerCase(), type);
  }
  return map;
})();

export function legalType(code: string | null | undefined): LegalDocumentType | null {
  return code ? BY_CODE.get(code) ?? null : null;
}

export function legalTypeLabel(code: string | null | undefined): string {
  return legalType(code)?.label ?? 'Unrecognized legal document';
}

export function legalCategoryLabel(category: string | null | undefined): string {
  return LEGAL_CATEGORIES.find((c) => c.code === category)?.label ?? 'Unclassified';
}

/**
 * Maps whatever the classifier said onto a canonical code. The model is given
 * the code list in its prompt, but wording drifts — "living trust", "Revocable
 * Trust", "trust (revocable)" all arrive — and the schema deliberately does not
 * enumerate forty types, because large enums blow the compiled grammar budget.
 * Normalizing here rather than in the grammar is what keeps that budget.
 *
 * Returns null when nothing matches, which the caller records as
 * unknown_legal_document rather than guessing a type.
 */
export function normalizeLegalType(raw: string | null | undefined): LegalDocumentType | null {
  const value = (raw ?? '').trim().toLowerCase();
  if (!value) return null;

  const exact = BY_CODE.get(value.replace(/\s+/g, '_')) ?? BY_ALIAS.get(value);
  if (exact) return exact;

  // Longest alias contained in the string wins, so "amendment to the smith
  // family revocable living trust" resolves to the amendment, not the trust.
  let best: LegalDocumentType | null = null;
  let bestLength = 0;
  for (const [alias, type] of BY_ALIAS) {
    if (alias.length > bestLength && value.includes(alias)) {
      best = type;
      bestLength = alias.length;
    }
  }
  return best;
}

export function typesInCategory(category: LegalCategory): LegalDocumentType[] {
  return LEGAL_DOCUMENT_TYPES.filter((t) => t.category === category);
}

/** Every code the classifier may return, for the prompt's description text. */
export function classifiableTypeCodes(): string[] {
  return LEGAL_DOCUMENT_TYPES.filter((t) => t.category !== 'unclassified').map((t) => t.code);
}

// ── Document status ──────────────────────────────────────────────────────────
// What the document itself says about its own standing. Distinct from
// processing state (how far Command has got) and review state (what the user
// has confirmed). None of these assert legal validity.

export type LegalDocumentStatus =
  | 'draft'
  | 'executed'
  | 'amended'
  | 'revoked'
  | 'expired'
  | 'recorded'
  | 'certified_copy'
  | 'unknown';

export const LEGAL_DOCUMENT_STATUSES: Array<{ code: LegalDocumentStatus; label: string }> = [
  { code: 'draft', label: 'Marked draft' },
  { code: 'executed', label: 'Signed' },
  { code: 'amended', label: 'Amended' },
  { code: 'revoked', label: 'Revoked' },
  { code: 'expired', label: 'Past its stated end date' },
  { code: 'recorded', label: 'Recorded' },
  { code: 'certified_copy', label: 'Certified copy' },
  { code: 'unknown', label: 'Not stated in the document' },
];

/** How far Command has got with the upload. */
export type LegalProcessingState =
  | 'uploaded'
  | 'queued'
  | 'processing'
  | 'needs_review'
  | 'confirmed'
  | 'partially_confirmed'
  | 'failed'
  | 'unsupported'
  | 'superseded'
  | 'deleted';

export const PROCESSING_STATE_LABELS: Record<LegalProcessingState, string> = {
  uploaded: 'Uploaded',
  queued: 'Queued',
  processing: 'Reading',
  needs_review: 'Needs review',
  confirmed: 'Confirmed',
  partially_confirmed: 'Partly confirmed',
  failed: 'Could not be read',
  unsupported: 'Not supported',
  superseded: 'Superseded by a newer version',
  deleted: 'Deleted',
};

// ── Roles ────────────────────────────────────────────────────────────────────
// A person holds roles per document, never globally: the same person is trustee
// on one document and beneficiary on another. Stored as rows, not an enum, so a
// new role is a row rather than a migration.

export const LEGAL_ROLES: Array<{ code: string; label: string }> = [
  { code: 'testator', label: 'Testator' },
  { code: 'grantor', label: 'Grantor / settlor' },
  { code: 'trustee', label: 'Trustee' },
  { code: 'successor_trustee', label: 'Successor trustee' },
  { code: 'executor', label: 'Executor / personal representative' },
  { code: 'successor_executor', label: 'Successor executor' },
  { code: 'beneficiary', label: 'Beneficiary' },
  { code: 'contingent_beneficiary', label: 'Contingent beneficiary' },
  { code: 'guardian', label: 'Guardian' },
  { code: 'alternate_guardian', label: 'Alternate guardian' },
  { code: 'conservator', label: 'Conservator' },
  { code: 'principal', label: 'Principal' },
  { code: 'agent', label: 'Agent / attorney-in-fact' },
  { code: 'successor_agent', label: 'Successor agent' },
  { code: 'healthcare_agent', label: 'Healthcare agent' },
  { code: 'declarant', label: 'Declarant / patient' },
  { code: 'witness', label: 'Witness' },
  { code: 'notary', label: 'Notary' },
  { code: 'attorney', label: 'Attorney' },
  { code: 'law_firm', label: 'Law firm' },
  { code: 'grantor_of_deed', label: 'Grantor (deed)' },
  { code: 'grantee', label: 'Grantee' },
  { code: 'business_owner', label: 'Owner / member / shareholder' },
  { code: 'business_successor', label: 'Business successor' },
  { code: 'trust_protector', label: 'Trust protector' },
  { code: 'petitioner', label: 'Petitioner' },
  { code: 'respondent', label: 'Respondent' },
  { code: 'party', label: 'Party' },
  { code: 'other', label: 'Other' },
];

export function legalRoleLabel(code: string | null | undefined): string {
  return LEGAL_ROLES.find((r) => r.code === code)?.label ?? code ?? 'Party';
}
