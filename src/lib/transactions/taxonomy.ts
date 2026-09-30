// One category list.
//
// There were four, and they were coupled only by substring coincidence:
//
//   GROUPS            spending.ts        code + label, matched against the
//                                        category string a row already carries
//   CATEGORY_RULES    transactionImport  label + regex, matched against the
//                                        merchant description at import
//   BILL_CATEGORIES   recurring.ts       which categories are bills, so a
//                                        varying amount is still recurring
//   COMMITTED         spendingInsights   which categories cannot be cancelled
//
// The importer wrote a label chosen so that spending.ts's substring list would
// happen to catch it -- the contract was a comment, not a type. Rename a label
// and every figure moves, silently, and nothing fails.
//
// So: one list. A category knows its own kind, how to recognise itself from a
// merchant name, which incoming category strings mean it, whether its amount
// moves by nature, and whether the household could stop paying it. Everything
// that used to be a separate list is now a property.
//
// Command's defaults live here as data, not as a Postgres CHECK, exactly as
// legalTaxonomy.ts does: adding one is a line here, never a migration and a
// redeploy. A household's own categories are rows in transaction_categories
// and are merged over the top of this at read time.

export type CategoryKind = 'income' | 'expense' | 'savings' | 'transfer';

export interface TransactionCategory {
  code: string;
  label: string;
  kind: CategoryKind;
  /**
   * Substrings of a category string that already exists -- from an issuer's
   * own column, from the AI statement reader, or typed by hand -- that mean
   * this category. Matched as substrings, not words, because 'utilit' has to
   * catch both "utility" and "utilities".
   */
  aliases: string[];
  /** Merchant-description patterns. Absent on categories nothing names. */
  matcher?: RegExp;
  /**
   * The amount moves month to month by nature. A varying repeat in one of
   * these is a bill; in any other category it is just a place the household
   * shops twice.
   */
  variable?: boolean;
  /**
   * The household could not stop paying this next month. Separates a mortgage
   * from a streaming subscription when both are equally recurring.
   */
  committed?: boolean;
}

/**
 * Ordered by **merchant-matcher precedence**, which is the order the importer
 * has always used. It is load-bearing: "PLANET FITNESS MEMBERSHIP" matches
 * both entertainment and subscriptions, and entertainment first is what makes
 * a gym a gym rather than a software subscription.
 */
export const CATEGORIES: TransactionCategory[] = [
  {
    code: 'groceries', label: 'Groceries', kind: 'expense',
    aliases: ['grocer', 'supermarket', 'food & drink'],
    matcher: /\b(grocer|supermarket|safeway|kroger|publix|aldi|lidl|trader joe|whole foods|wegmans|heb\b|meijer|hy-vee|hyvee|food lion|giant eagle|sprouts|costco|sam'?s club|bj'?s wholesale|cub foods|albertsons|winco|fresh market|market basket)(?:'?s)?\b/i,
  },
  {
    code: 'dining', label: 'Dining and takeout', kind: 'expense',
    aliases: ['dining', 'restaurant', 'bar', 'coffee'],
    matcher: /\b(restaurant|cafe|café|coffee|starbucks|dunkin|peet'?s|mcdonald|burger|pizza|taco|chipotle|subway|panera|chick-?fil-?a|wendy|kfc|popeyes|doordash|ubereats|uber eats|grubhub|postmates|seamless|deli|bistro|grill|diner|brewery|tavern|pub\b|bar &|sushi|thai|ramen|bakery|ice cream|smoothie|juice)(?:'?s)?\b/i,
  },
  {
    code: 'travel', label: 'Travel', kind: 'expense',
    aliases: ['travel', 'airline', 'hotel', 'lodging', 'air '],
    matcher: /\b(airlines?|delta air|united air|american air|southwest|jetblue|alaska air|spirit air|frontier air|hotel|marriott|hilton|hyatt|ihg|airbnb|vrbo|booking\.com|expedia|priceline|kayak|travelocity|cruise|amtrak|rental car|hertz|avis|enterprise rent|budget rent|national car|tsa pre|global entry|resort|lodge|inn\b)(?:'?s)?\b/i,
  },
  {
    code: 'gas', label: 'Fuel', kind: 'expense',
    aliases: ['gas', 'fuel', 'service station'],
    matcher: /\b(shell|exxon|mobil|chevron|bp\b|texaco|sunoco|citgo|marathon|speedway|circle k|wawa|sheetz|quiktrip|racetrac|pilot travel|loves travel|holiday stationstore|kwik trip|fuel|gas station|gasoline)(?:'?s)?\b/i,
  },
  {
    code: 'transport', label: 'Transport', kind: 'expense',
    aliases: ['transit', 'parking', 'rideshare', 'toll', 'auto'],
    matcher: /\b(uber|lyft|taxi|cab\b|transit|metro card|metrocard|subway fare|parking|park ?mobile|spothero|toll|ez ?pass|fastrak|bike share|scooter|dmv|registration fee|car wash|jiffy lube|valvoline|midas|firestone|discount tire|auto ?zone|advance auto|o'?reilly auto|napa auto|mechanic|body shop)(?:'?s)?\b/i,
  },
  {
    code: 'utilities', label: 'Utilities', kind: 'expense', variable: true, committed: true,
    aliases: ['utilit', 'electric', 'internet', 'phone', 'cable'],
    matcher: /\b(electric|energy|power co|gas company|water|sewer|utility|utilities|xcel|comed|duke energy|pg&e|pge\b|con ?ed|national grid|centerpoint|dominion|waste management|republic services|trash|recycling|comcast|xfinity|spectrum|cox communications|at&?t|verizon|t-?mobile|sprint|centurylink|frontier comm|internet|broadband|wireless)(?:'?s)?\b/i,
  },
  {
    code: 'health', label: 'Health and medical', kind: 'expense', committed: true,
    aliases: ['health', 'medical', 'pharmac', 'dental', 'vision'],
    matcher: /\b(pharmacy|cvs|walgreens|rite aid|medical|clinic|hospital|health|dental|dentist|orthodont|optometr|vision center|lenscrafters|warby|physician|doctor|urgent care|labcorp|quest diagnostic|therapy|therapist|chiroprac|dermatolog|pediatric|radiology|surgery|copay|prescription)(?:'?s)?\b/i,
  },
  {
    code: 'insurance', label: 'Insurance', kind: 'expense', variable: true, committed: true,
    aliases: ['insur'],
    matcher: /\b(insurance|insur|geico|state farm|progressive|allstate|usaa|farmers ins|nationwide|liberty mutual|travelers|aflac|metlife|prudential|policy premium|premium payment)(?:'?s)?\b/i,
  },
  {
    code: 'education', label: 'Education and childcare', kind: 'expense', variable: true, committed: true,
    aliases: ['education', 'school', 'tuition', 'childcare', 'camp'],
    matcher: /\b(school|tuition|university|college|campus|bookstore|childcare|child care|daycare|day care|preschool|montessori|kindercare|bright horizons|tutor|kumon|summer camp|student loan|scholarship|pta\b|529\b)(?:'?s)?\b/i,
  },
  {
    code: 'entertainment', label: 'Entertainment', kind: 'expense',
    aliases: ['entertain', 'streaming', 'recreation'],
    matcher: /\b(netflix|hulu|disney\+?|disneyplus|hbo|max\.com|paramount\+|peacock|apple tv|spotify|pandora|youtube|twitch|steam ?games|playstation|xbox|nintendo|epic games|cinema|movie|theat(er|re)|amc \d|regal cinemas|concert|ticketmaster|stubhub|live nation|museum|zoo\b|golf|gym|fitness|planet fitness|24 hour fitness|lifetime fitness|peloton|yoga|club membership|recreation)(?:'?s)?\b/i,
  },
  {
    code: 'shopping', label: 'Shopping', kind: 'expense',
    aliases: ['shop', 'retail', 'merchandise', 'department', 'amazon'],
    matcher: /\b(amazon|amzn|walmart|target|best buy|home ?goods|tj ?maxx|marshalls|ross stores|kohl'?s|macy'?s|nordstrom|old navy|gap\b|h&m|zara|uniqlo|lululemon|nike|adidas|rei\b|dick'?s sporting|bass pro|etsy|ebay|wayfair|overstock|shein|temu|apple\.com|apple store|microsoft store|google store|department store|boutique|retail)(?:'?s)?\b/i,
  },
  {
    code: 'home', label: 'Home and improvement', kind: 'expense',
    aliases: ['home', 'hardware', 'furnish', 'garden', 'improvement'],
    matcher: /\b(home depot|lowe'?s|menards|ace hardware|true value|hardware|ikea|furniture|mattress|wayfair|sherwin|benjamin moore|paint|garden|nursery|landscap|lawn|tree service|pest control|terminix|orkin|plumb|electrician|hvac|roofing|contractor|handyman|cleaning service|maid|hoa\b|homeowners assoc|storage unit|public storage)(?:'?s)?\b/i,
  },
  {
    code: 'home_services', label: 'Home services', kind: 'expense',
    aliases: ['home_services', 'contractor', 'repair', 'lawn'],
  },
  {
    code: 'charitable', label: 'Charitable giving', kind: 'expense',
    aliases: ['charit', 'donation', 'nonprofit'],
    matcher: /\b(donation|donate|charity|charitable|foundation|red cross|united way|goodwill|salvation army|church|synagogue|mosque|temple|ministry|nonprofit|npo\b|gofundme|tithe)(?:'?s)?\b/i,
  },
  {
    code: 'fees', label: 'Fees and interest', kind: 'expense', committed: true,
    aliases: ['fee', 'interest', 'finance charge'],
    matcher: /\b(interest charge|finance charge|annual fee|late fee|overdraft fee|nsf fee|service charge|maintenance fee|atm fee|foreign transaction|wire fee|monthly fee|account fee|returned item|penalty)(?:'?s)?\b/i,
  },
  {
    code: 'cash', label: 'Cash advances', kind: 'expense',
    aliases: ['cash advance', 'atm'],
    matcher: /\b(atm|cash advance|cash withdrawal|withdrawal atm)(?:'?s)?\b/i,
  },
  {
    code: 'taxes', label: 'Taxes', kind: 'expense', committed: true,
    aliases: ['tax'],
    matcher: /\b(irs\b|internal revenue|dept of revenue|department of revenue|tax payment|estimated tax|property tax|franchise tax)(?:'?s)?\b/i,
  },
  {
    code: 'housing', label: 'Housing and loans', kind: 'expense', variable: true, committed: true,
    aliases: ['mortgage', 'loan', 'rent', 'heloc', 'lease'],
    matcher: /\b(mortgage|loan payment|auto loan|car payment|student loan|lending|heloc|line of credit|principal and interest)(?:'?s)?\b/i,
  },
  {
    // Its own category rather than a corner of Entertainment.
    //
    // Under the old pair of lists a row labelled "Subscriptions" grouped into
    // entertainment for the chart but counted as a bill for recurrence, because
    // the two lists were consulted with different strings. One code cannot hold
    // two answers, and of the two this is the useful one: a household wants to
    // see what renews separately from what it went out and enjoyed.
    code: 'subscriptions', label: 'Subscriptions', kind: 'expense', variable: true,
    aliases: ['subscription', 'membership'],
    matcher: /\b(subscription|renewal|monthly plan|annual plan|prime membership|icloud|dropbox|adobe|microsoft 365|office 365|notion|slack|zoom\.us|chatgpt|openai|anthropic|claude)(?:'?s)?\b/i,
  },

  // ── Not spending ──────────────────────────────────────────────────────────
  { code: 'income', label: 'Income', kind: 'income', aliases: ['income', 'payroll', 'salary', 'deposit'] },
  { code: 'savings', label: 'Savings', kind: 'savings', aliases: ['savings'] },
  { code: 'transfer', label: 'Transfers', kind: 'transfer', aliases: ['transfer'] },

  // ── The two honest fallbacks ──────────────────────────────────────────────
  // Read but unrecognised, and never read at all, are different states, and
  // the distinction is load-bearing in the UI.
  { code: 'other', label: 'Everything else', kind: 'expense', aliases: [] },
  { code: 'uncategorized', label: 'Not categorized', kind: 'expense', aliases: [] },
];

/**
 * Ordered by **alias precedence**, which is not the same as matcher precedence
 * and cannot be.
 *
 * Two collisions make it load-bearing:
 *   housing before home  -- "Home loan" contains both; it is a loan.
 *   home_services before home -- "home_services" contains "home", which is why
 *     the home_services group was unreachable for the whole of its existence.
 *
 * A test asserts this covers exactly the same codes as CATEGORIES, so the two
 * orders can disagree about precedence but never about what exists.
 */
const ALIAS_ORDER: string[] = [
  'groceries', 'dining', 'travel', 'gas', 'transport', 'utilities', 'health',
  'shopping', 'housing', 'taxes', 'home_services', 'home', 'education',
  'subscriptions', 'entertainment', 'charitable', 'insurance', 'fees', 'cash',
  'income', 'savings', 'transfer', 'other', 'uncategorized',
];

const BY_CODE = new Map(CATEGORIES.map((c) => [c.code, c]));

export const UNCATEGORIZED = BY_CODE.get('uncategorized')!;
export const OTHER = BY_CODE.get('other')!;

export function categoryByCode(code: string | null | undefined): TransactionCategory | null {
  return code ? BY_CODE.get(code) ?? null : null;
}

/** Every category, in the order they should be offered in a picker. */
export function allCategories(): TransactionCategory[] {
  return ALIAS_ORDER.map((code) => BY_CODE.get(code)!).filter(Boolean);
}

/**
 * The category a merchant description names, or null.
 *
 * Replaces `categorize()`. Null rather than a guess: "Everything else" is a
 * decision the caller makes, and a rule that always answered would make the
 * confidence flag meaningless.
 */
export function categoryFromDescription(description: string): TransactionCategory | null {
  for (const category of CATEGORIES) {
    if (category.matcher?.test(description)) return category;
  }
  return null;
}

/**
 * The category an existing category *string* means.
 *
 * Replaces `categoryGroup()`. Takes an issuer's own wording, the AI reader's
 * wording, or a code, and resolves all three: "Merchandise & Supplies-Groceries"
 * and "groceries" both land in the same place.
 */
export function categoryFromLabel(raw: string | null | undefined): TransactionCategory {
  const value = (raw ?? '').toLowerCase().trim();
  if (!value) return UNCATEGORIZED;

  // An exact code wins outright, so a stored category_code never has to be
  // guessed at by substring.
  const exact = BY_CODE.get(value);
  if (exact) return exact;

  for (const code of ALIAS_ORDER) {
    const category = BY_CODE.get(code)!;
    if (category.aliases.some((a) => value.includes(a))) return category;
  }
  return OTHER;
}

/** Whether a varying repeat in this category is a bill rather than a coincidence. */
export function isVariableCategory(code: string | null | undefined): boolean {
  return categoryByCode(code)?.variable === true;
}

/** Whether the household could stop paying this next month. */
export function isCommittedCategory(code: string | null | undefined): boolean {
  return categoryByCode(code)?.committed === true;
}

/** What a category does to the totals. */
export function kindOf(code: string | null | undefined): CategoryKind {
  return categoryByCode(code)?.kind ?? 'expense';
}

/** A household's own category, or its change to one of Command's. */
export interface CategoryOverride {
  code: string;
  label: string;
  kind: CategoryKind;
  archived_at?: string | null;
}

/**
 * Command's defaults with the household's own laid over the top.
 *
 * Three things happen here, and all three are the reason the household's rows
 * hold only departures rather than a copy of the whole list:
 *
 *   a household category is added,
 *   a household row with a default's code renames or re-kinds that default,
 *   an archived category drops out of the list but still resolves, because
 *   transactions already filed under it have to keep reading as something.
 *
 * Archiving rather than deleting is the whole point of that last one. A
 * category deleted out from under a year of transactions would turn them all
 * into "Everything else" retroactively.
 */
export function availableCategories(overrides: CategoryOverride[] = []): TransactionCategory[] {
  const byCode = new Map(allCategories().map((c) => [c.code, c]));

  for (const row of overrides) {
    const existing = byCode.get(row.code);
    if (row.archived_at) { byCode.delete(row.code); continue; }
    byCode.set(row.code, existing
      ? { ...existing, label: row.label, kind: row.kind }
      : { code: row.code, label: row.label, kind: row.kind, aliases: [] });
  }

  // Spending first, since that is what almost every correction is about, then
  // the three that are not spending, then the fallbacks.
  const rank = (c: TransactionCategory) =>
    (c.code === 'uncategorized' || c.code === 'other' ? 2 : c.kind === 'expense' ? 0 : 1);
  return [...byCode.values()].sort((a, b) => rank(a) - rank(b));
}

/**
 * Resolve a code against the household's list as well as Command's.
 *
 * Falls back to the code itself rather than to "Everything else": a category
 * that was archived still has to name itself for the rows filed under it.
 */
export function labelFor(code: string | null | undefined, overrides: CategoryOverride[] = []): string {
  if (!code) return UNCATEGORIZED.label;
  return overrides.find((o) => o.code === code)?.label
    ?? categoryByCode(code)?.label
    ?? code;
}
