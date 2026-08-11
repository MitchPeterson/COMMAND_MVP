// What a vault file became, and whether a record has a file behind it.
//
// The vault and a section's inventory are not the same list, and forcing them to
// be identical would destroy information in both directions. A will exists
// whether or not it has been scanned — "Health Care Directive, executed 2021" is
// a true and useful fact with no PDF attached. A file nobody has read yet is
// still a file the household owns.
//
// What was misleading is that neither screen admitted the relationship. The
// Legal page could print "No legal documents read yet" directly above a list of
// five legal documents, and the vault could show a will with no hint of what it
// produced. Nothing was out of sync in the database — every `source_document_id`
// is `ON DELETE SET NULL`, so removing a file correctly leaves the record and
// drops the link. The screens simply never said so.
//
// So "in sync" here means: every row on both sides states its relationship to
// the other, and that statement stays true as things change. Not: the two lists
// are identical.

import type {
  CreditCard, CreditStatement, Document, FinanceAccount, InsurancePolicy,
  InsurancePolicyExtraction, LegalDocument, LegalDocumentExtraction,
  MortgageStatement, TaxDocument, TaxReturn,
} from './supabase';

export type LinkState =
  /** The record came from a file that is still in the vault. */
  | 'linked'
  /** A real record with nothing uploaded behind it. Not an error. */
  | 'no_document'
  /** It had a file and the file was deleted. Worth saying out loud. */
  | 'document_removed';

export interface RecordLink {
  state: LinkState;
  document: Document | null;
  label: string;
}

/**
 * `sourceDocumentId` null means one of two different things, and the difference
 * matters: a record entered by hand never had a file, while a record that came
 * from an extraction had one until someone deleted it. `everHadDocument`
 * separates them where the caller knows.
 */
export function linkFor(
  sourceDocumentId: string | null | undefined,
  documents: Document[],
  everHadDocument = false,
): RecordLink {
  if (sourceDocumentId) {
    const document = documents.find((d) => d.id === sourceDocumentId) ?? null;
    if (document) return { state: 'linked', document, label: 'Document on file' };
    return { state: 'document_removed', document: null, label: 'Document removed' };
  }
  return everHadDocument
    ? { state: 'document_removed', document: null, label: 'Document removed' }
    : { state: 'no_document', document: null, label: 'No document on file' };
}

// ─────────────────────────────────────────────────────────────
// The other direction: what did this file produce?
// ─────────────────────────────────────────────────────────────

export interface DocumentUse {
  /** The view key to navigate to. */
  section: string;
  label: string;
  detail: string;
  /** True while the reading is still waiting on the user to confirm it. */
  pending: boolean;
}

export interface LinkableData {
  legalDocuments?: LegalDocument[];
  legalExtractions?: LegalDocumentExtraction[];
  insurancePolicies?: InsurancePolicy[];
  insuranceExtractions?: InsurancePolicyExtraction[];
  financeAccounts?: FinanceAccount[];
  creditCards?: CreditCard[];
  creditStatements?: CreditStatement[];
  mortgageStatements?: MortgageStatement[];
  taxDocuments?: TaxDocument[];
  taxReturns?: TaxReturn[];
}

/**
 * Everything a given vault file is responsible for. An empty result is itself
 * information — the file is in the vault and nothing in the app depends on it
 * yet, which is the state a user most wants to know about.
 */
export function usesOf(documentId: string, data: LinkableData): DocumentUse[] {
  const uses: DocumentUse[] = [];
  const pendingReview = (status?: string | null) =>
    status === 'pending_review' || status === 'partially_confirmed';

  for (const record of data.legalDocuments ?? []) {
    if (record.source_document_id === documentId) {
      uses.push({ section: 'legal', label: 'Legal', detail: record.name, pending: false });
    }
  }
  for (const extraction of data.legalExtractions ?? []) {
    if (extraction.document_id === documentId && pendingReview(extraction.review_status)) {
      uses.push({
        section: 'legal', label: 'Legal',
        detail: extraction.document_title || 'Reading waiting on you', pending: true,
      });
    }
  }

  for (const policy of data.insurancePolicies ?? []) {
    if (policy.source_document_id === documentId) {
      uses.push({
        section: 'insurance', label: 'Insurance',
        detail: `${policy.carrier ?? 'Policy'} · ${policy.type}`, pending: false,
      });
    }
  }
  for (const extraction of data.insuranceExtractions ?? []) {
    if (extraction.document_id === documentId && pendingReview(extraction.review_status)) {
      uses.push({
        section: 'insurance', label: 'Insurance',
        detail: `${extraction.carrier ?? 'Policy'} · reading waiting on you`, pending: true,
      });
    }
  }

  for (const statement of data.mortgageStatements ?? []) {
    if (statement.document_id === documentId) {
      uses.push({
        section: 'home', label: 'Home',
        detail: `${statement.servicer ?? 'Mortgage'} statement`,
        pending: pendingReview(statement.review_status),
      });
    }
  }

  for (const statement of data.creditStatements ?? []) {
    if (statement.document_id === documentId) {
      uses.push({
        section: 'credit', label: 'Credit',
        detail: `${statement.card_product ?? statement.institution ?? 'Card'} statement`,
        pending: pendingReview(statement.review_status),
      });
    }
  }
  for (const card of data.creditCards ?? []) {
    if (card.source_document_id === documentId) {
      uses.push({ section: 'credit', label: 'Credit', detail: card.card_name, pending: false });
    }
  }

  for (const taxReturn of data.taxReturns ?? []) {
    if (taxReturn.document_id === documentId) {
      uses.push({
        section: 'taxes', label: 'Taxes',
        detail: `${taxReturn.tax_year} return`, pending: false,
      });
    }
  }
  for (const form of data.taxDocuments ?? []) {
    if (form.document_id === documentId) {
      uses.push({ section: 'taxes', label: 'Taxes', detail: form.name, pending: false });
    }
  }

  for (const account of data.financeAccounts ?? []) {
    if (account.source_document_id === documentId) {
      uses.push({
        section: 'finances', label: 'Finances', detail: account.account_name, pending: false,
      });
    }
  }

  return uses;
}

/**
 * Vault files filed to a section that have produced nothing there yet. These are
 * the documents a user believes are "in Command" while no part of the app has
 * acted on them, so a section lists them rather than leaving them invisible.
 */
export function unfiledFor(section: string, documents: Document[], data: LinkableData): Document[] {
  const categories: Record<string, string[]> = {
    legal: ['legal'],
    insurance: ['insurance'],
    home: ['home'],
    credit: ['credit'],
    taxes: ['tax'],
    finances: ['finance', 'financial'],
  };
  const wanted = categories[section] ?? [section];
  return documents.filter(
    (d) => wanted.includes((d.category ?? '').toLowerCase()) && usesOf(d.id, data).length === 0,
  );
}
