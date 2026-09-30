// What a transaction was, and how sure Command is.
//
// Two questions, answered in that order, because they are different kinds of
// question. What the money *did* -- left, arrived, moved between the
// household's own accounts, went into savings -- is structural: it is about
// the shape of the transaction and the account it sat in, and the merchant's
// name barely matters. What the money was *for* is about the merchant, and it
// is the question a household can disagree with.
//
// So flow is settled first and category second, and a category can only
// override the flow when a person set it deliberately.
//
// The precedence for category is: a rule the household taught, then the
// issuer's own column, then Command's patterns, then nothing. A taught rule
// sits above the issuer's category on purpose -- the bank's guess is a guess
// too, and the household corrected this merchant by hand once already.
//
// Nothing here writes a confident answer it does not have. A row Command could
// not place is flagged with a reason in the household's words, because the
// alternative -- filing it under "Everything else" and moving on -- is how a
// category breakdown quietly becomes fiction.

import { categoryFromDescription, categoryFromLabel, categoryByCode, kindOf } from './taxonomy';

export type Flow = 'expense' | 'income' | 'savings' | 'transfer';

/** Money the household earned or was owed, rather than money coming back. */
const INCOME_MARKERS = /\b(payroll|direct dep|dir dep|dirdep|salary|wages|paycheck|pay check|employer|dividend|interest paid|interest earned|int paid|pension|annuity|social security|ssa treas|irs treas|tax ref|state of \w+ tax|unemployment|rental income|invoice|remittance|commission|bonus)\b/i;

/**
 * Money moving between the household's own accounts.
 *
 * Counting one of these as spending is the worst error available: import a
 * checking account alongside the card it pays and the same dollars land twice.
 */
const SELF_TRANSFER = /\b(transfer|xfer|trnsfr|acct to acct|account to account|to savings|from savings|to checking|from checking|overdraft protection|online banking transfer|funds moved)\b/i;

/**
 * A payment aimed at a credit card.
 *
 * The card word has to be near the payment word. "AUTOPAY" alone does not
 * qualify: on a checking account it means a bill is paid automatically, and a
 * looser pattern once removed every autopaid bill from the household's
 * spending.
 */
const CARD_PAYMENT = /\b(payment|pmt|autopay|auto ?pay|epay)\b.{0,24}\b(card|crd|visa|mastercard|amex|american express|discover|chase|citi|capital one|barclay|synchrony)\b|\b(card|crd|credit card)\b.{0,24}\b(payment|pmt|autopay)\b/i;

/** On a card, money arriving with one of these on it is the bill being paid. */
const CARD_INFLOW_PAYMENT = /\b(payment thank you|thank you payment|payment - thank|online payment|payment received|mobile payment|electronic payment|autopay)\b/i;

/** Money deliberately set aside rather than moved for bookkeeping. */
const SAVINGS_MARKERS = /\b(savings|save|emergency fund|rainy day|sinking fund|vault|nest egg|brokerage|vanguard|fidelity|schwab|betterment|wealthfront|acorns|robinhood|401k|403b|ira\b|roth|529\b|hsa\b)\b/i;

/** Money coming back from something that was bought. */
const REFUND_MARKERS = /\b(refund|return|reversal|reversed|credit adjustment|chargeback|dispute|price adjustment|cashback bonus|reward|statement credit)\b/i;

/** Paid to a person, not a business. Command cannot categorize these. */
const PERSON_TO_PERSON = /\b(zelle|venmo|cash ?app|paypal|apple cash|google pay send|popmoney|square cash)\b/i;

/** A paper check. The payee is not in the description, so nothing can be. */
const CHECK = /\b(check|chk|cheque)\s*#?\s*\d+|\bcheck\b(?!\s*card)/i;

/**
 * What the money did, from the shape of the transaction.
 *
 * `refund` is deliberately absent. A refund is an expense that came back: it
 * already carries direction 'credit', so the sign is right and a fourth flow
 * value only ever meant "expense, backwards". The refunded figure stays
 * derivable as the expense rows whose direction is a credit.
 */
export function classifyFlow(description: string, amount: number, sourceKind: 'bank' | 'card'): Flow {
  const text = description.toLowerCase();

  // A transfer points both ways, so this is tested on either sign.
  if (SELF_TRANSFER.test(text) || CARD_PAYMENT.test(text)) {
    // Money leaving a spending account toward somewhere it is kept is saving,
    // not bookkeeping. The inbound half, arriving in the savings account, is
    // still a transfer -- that is what stops the same $800 counting twice.
    return amount < 0 && sourceKind === 'bank' && SAVINGS_MARKERS.test(text) ? 'savings' : 'transfer';
  }
  if (sourceKind === 'card' && amount > 0 && CARD_INFLOW_PAYMENT.test(text)) return 'transfer';

  if (amount > 0) {
    // A refund is an expense with a credit direction, so it falls through to
    // the expense branch rather than having a flow of its own.
    if (REFUND_MARKERS.test(text)) return 'expense';
    if (INCOME_MARKERS.test(text)) return 'income';
    // On a card an unexplained credit is far more likely a refund than a
    // salary; on a bank account the reverse is true.
    return sourceKind === 'card' ? 'expense' : 'income';
  }
  return 'expense';
}

/**
 * Whether a description looks like money the household earned.
 *
 * Exported because sign inference needs it: the strongest evidence for which
 * way a file's amounts run is whether its payroll rows are positive.
 */
export const looksLikeIncome = (description: string) => INCOME_MARKERS.test(description);

export type CategorySource = 'user_set' | 'issuer_provided' | 'rule_matched' | 'ai_classified';

/**
 * What `classify` itself can produce.
 *
 * Never 'ai_classified': nothing here asks a model anything. That value
 * belongs to the statement extractor, and keeping the two apart is what lets
 * the UI say whether a category was read, ruled, or judged.
 */
export type ClassifiedSource = Exclude<CategorySource, 'ai_classified'>;
export type ReviewState = 'none' | 'needs_review';

export interface ClassifyInput {
  description: string;
  /** Signed: negative is money leaving. */
  amount: number;
  sourceKind: 'bank' | 'card';
  /** The stable merchant key a taught rule is stored against. */
  counterpartyKey: string;
  /** The issuer's own category column, when the export carried one. */
  issuerCategory?: string | null;
  /** counterparty_key -> category_code, as the household taught it. */
  rules?: Map<string, string> | Record<string, string>;
}

export interface Classification {
  categoryCode: string;
  categorySource: ClassifiedSource;
  flow: Flow;
  reviewState: ReviewState;
  /** Why Command is unsure, in the household's words. Null when it is not. */
  reviewReason: string | null;
}

const lookup = (rules: ClassifyInput['rules'], key: string): string | undefined =>
  rules instanceof Map ? rules.get(key) : rules?.[key];

export function classify(input: ClassifyInput): Classification {
  const { description, amount, sourceKind, counterpartyKey } = input;
  const structural = classifyFlow(description, amount, sourceKind);

  // ── 1. What the household taught ────────────────────────────────────────
  // Above the issuer's own column deliberately: the bank's category is a guess
  // too, and this household already corrected this merchant by hand.
  const taught = lookup(input.rules, counterpartyKey);
  if (taught && categoryByCode(taught)) {
    return {
      categoryCode: taught,
      categorySource: 'user_set',
      // A deliberate assignment settles the flow too, which is how a household
      // tells Command that a particular transfer is really savings.
      flow: kindOf(taught) as Flow,
      reviewState: 'none',
      reviewReason: null,
    };
  }

  // ── 2. Structural flows name their own category ─────────────────────────
  // A paycheck is not a merchant and neither is a card payment. Putting them
  // through the merchant patterns would file a payroll deposit under whatever
  // the employer's name happens to resemble.
  if (structural === 'income' || structural === 'transfer' || structural === 'savings') {
    const unknownTransfer = structural === 'transfer'
      && !CARD_PAYMENT.test(description) && !SELF_TRANSFER.test(description);
    return {
      categoryCode: structural,
      categorySource: 'rule_matched',
      flow: structural,
      reviewState: unknownTransfer ? 'needs_review' : 'none',
      reviewReason: unknownTransfer ? 'A transfer Command could not trace to an account' : null,
    };
  }

  // ── 3. The issuer's own column ──────────────────────────────────────────
  const issuer = input.issuerCategory?.trim()
    ? categoryFromLabel(input.issuerCategory)
    : null;
  if (issuer && issuer.code !== 'other' && issuer.code !== 'uncategorized') {
    return {
      categoryCode: issuer.code,
      categorySource: 'issuer_provided',
      flow: 'expense',
      reviewState: 'none',
      reviewReason: null,
    };
  }

  // ── 4. Command's own patterns ───────────────────────────────────────────
  const matched = categoryFromDescription(description);
  if (matched) {
    return {
      categoryCode: matched.code,
      categorySource: 'rule_matched',
      flow: 'expense',
      reviewState: 'none',
      reviewReason: null,
    };
  }

  // ── 5. Nothing placed it ────────────────────────────────────────────────
  // Flagged with a reason rather than filed under "Everything else" and
  // forgotten, because a breakdown that quietly absorbs what it cannot read
  // stops being a breakdown.
  const reason = CHECK.test(description)
    ? 'A check — the payee is not in the description'
    : PERSON_TO_PERSON.test(description)
      ? 'Paid to a person, so Command cannot tell what it was for'
      : 'Command could not tell what this was for';

  return {
    categoryCode: 'other',
    categorySource: 'rule_matched',
    flow: 'expense',
    reviewState: 'needs_review',
    reviewReason: reason,
  };
}
