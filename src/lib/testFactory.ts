// Row builders for the unit tests.
//
// Nothing in the app imports this, so it is tree-shaken out of the bundle; it
// is still type-checked by `npm run build`, which is the point. A factory
// beats a literal in each test because CreditTransaction has eighteen fields
// and a test that spells out all of them hides the two it is actually about.

import type { CreditStatement, CreditTransaction } from './supabase';

let sequence = 0;

/**
 * A transaction with sensible defaults, overridable field by field.
 *
 * Defaults describe an imported bank expense, because that is the row shape
 * this codebase now sees most. A statement-read row is `{ statement_id: 's1',
 * import_id: null, flow: null }` -- the combination `flowOf()` exists to cope
 * with.
 */
export function txn(over: Partial<CreditTransaction> = {}): CreditTransaction {
  sequence += 1;
  return {
    id: `t${sequence}`,
    statement_id: null,
    import_id: 'imp1',
    household_id: 'h1',
    credit_card_id: null,
    finance_account_id: null,
    flow: 'expense',
    transaction_date: '2026-09-14',
    posting_date: null,
    merchant_description: 'CUB FOODS #1234',
    amount: 100,
    direction: 'charge',
    category: 'Groceries',
    category_source: 'rule_matched',
    category_confidence: null,
    cardholder: null,
    source_page: null,
    confidence: null,
    ...over,
  };
}

/** A confirmed statement, so `isAcceptedTransaction` lets its rows through. */
export function statement(over: Partial<CreditStatement> = {}): CreditStatement {
  return {
    id: 's1',
    household_id: 'h1',
    document_id: 'd1',
    credit_card_id: null,
    institution: 'Chase',
    card_product: null,
    account_nickname: null,
    last_four: '8841',
    primary_cardholder: null,
    statement_opening_date: null,
    statement_closing_date: null,
    payment_due_date: null,
    previous_balance: null,
    payments_and_credits: null,
    purchases: null,
    cash_advances: null,
    balance_transfers: null,
    fees_charged: null,
    interest_charged: null,
    statement_balance: null,
    minimum_payment_due: null,
    past_due_amount: null,
    credit_limit: null,
    available_credit: null,
    current_balance: null,
    annual_fee: null,
    rewards_program: null,
    rewards_beginning_balance: null,
    rewards_earned: null,
    rewards_redeemed: null,
    rewards_ending_balance: null,
    rewards_expiration_note: null,
    processing_state: 'complete',
    review_status: 'confirmed',
    failure_reason: null,
    match_state: 'confirmed',
    match_confidence: null,
    match_note: null,
    extraction_version: 1,
    created_at: '2026-09-01T00:00:00Z',
    ...over,
  };
}

/** Reset ids so a failing test reports a stable name. */
export function resetIds(): void {
  sequence = 0;
}
