// What a section says before it has anything to say.
//
// An empty pillar used to open with a grade card reporting a dash, a confidence
// of "limited" and a list of everything that limited an assessment which never
// ran. That is an accurate description of nothing and a poor first impression of
// a section, and it told a user what Command could not do before it had told
// them what the section was for.
//
// On familiarity_state
//
// There is no familiarity_state column, and this deliberately does not add one.
// A stored flag describing whether a section has been started is a fact already
// implied by whether the section holds anything, and a second copy of a fact is
// a copy that drifts — which is exactly what section_scores did, seeding rows
// that nothing recalculated until the dashboard disagreed with every section
// page. Derived from the records themselves it cannot be wrong.

export type FamiliarityState = 'unstarted' | 'started';

export interface SuggestedDocument {
  label: string;
  /** Why this one, in the user's terms. */
  why: string;
}

export interface SectionIntroCopy {
  section: string;
  title: string;
  /** What the section is for, in one sentence a stranger would understand. */
  purpose: string;
  body: string;
  /** Other sections this one strengthens. Named, because the value is the joins. */
  feeds: string[];
  /** The one document worth having above all others here. */
  primary: SuggestedDocument;
  /** Everything else the section can use, in plain names rather than form numbers. */
  also: string[];
  ctaLabel: string;
  /** Ordered setup position: lower goes first for someone starting out. */
  order: number;
  /** True when it can be started by typing rather than finding paperwork. */
  noDocumentNeeded?: boolean;
}

export const SECTION_INTROS: Record<string, SectionIntroCopy> = {
  insurance: {
    section: 'insurance',
    title: 'Start with your insurance policies',
    purpose: "Whether the cover you pay for actually fits what you own.",
    feeds: ["Finances", "Family", "Home"],
    primary: { label: "Any insurance policy", why: 'The summary page at the front is the most useful part — it carries the limits, the deductible and the renewal date. The whole policy works just as well.' },
    also: ["Home, auto and umbrella policies", "Life insurance policies", "A renewal notice", "A certificate of insurance"],
    order: 2,
    body:
      'Upload whatever you have for each policy — home, auto, umbrella, life. Command reads the '
      + 'limits, deductibles and renewal dates, then weighs them against what your household actually '
      + 'owns. The question it answers is whether the cover fits the risk, not whether the filing is tidy.',
    ctaLabel: 'Upload an insurance policy',
  },
  legal: {
    section: 'legal',
    title: 'Start with your will',
    purpose: "What your documents actually say, and what is missing from them.",
    feeds: ["Family", "Home"],
    primary: { label: "Your will", why: "It names who decides and who receives. Command reads it and tells you what it says and what it could not see." },
    also: ["A trust", "Power of attorney", "A healthcare directive", "A property deed", "A prenuptial agreement"],
    order: 3,
    body:
      'Upload a will, trust, power of attorney or healthcare directive. Command records what each '
      + 'document says, who is named in it and which dates matter, with the page every answer came '
      + 'from. It reports what is on file and what it could not see — whether a document is valid is '
      + 'your attorney’s call, not Command’s.',
    ctaLabel: 'Upload a legal document',
  },
  credit: {
    section: 'credit',
    title: 'Start with a recent card statement',
    purpose: "Whether you are carrying the right cards, and what the wrong ones cost.",
    feeds: ["Finances"],
    primary: { label: "A recent card statement", why: "One per card. It carries the balance, the limit, the interest rates and what you earned." },
    also: ["A statement from every other card you hold"],
    order: 6,
    body:
      'Upload one statement per card. Command reads the balance, limit, interest rates and rewards, '
      + 'then works out what your spending actually earns and whether it is going on the right card. '
      + 'If a balance is carrying, the interest outruns any rewards — so that gets said first.',
    ctaLabel: 'Upload a card statement',
  },
  home: {
    section: 'home',
    title: 'Start with your mortgage statement',
    purpose: "What the house is worth, what is owed on it, and what will need replacing.",
    feeds: ["Finances", "Insurance", "Taxes"],
    primary: { label: "Your mortgage statement", why: "It carries the balance, the rate and the escrow \u2014 the figures your equity is worked out from." },
    also: ["Appliance warranties", "A home inspection report", "A contractor invoice", "A service contract"],
    order: 4,
    body:
      'Upload a mortgage statement, then add the major systems in the house — furnace, roof, water '
      + 'heater. Command tracks your equity and rate alongside when each system is likely to need '
      + 'replacing, so a $9,000 furnace becomes something you see coming rather than something that '
      + 'happens to you.',
    ctaLabel: 'Upload a mortgage statement',
  },
  finances: {
    section: 'finances',
    title: 'Start with what you own and what you owe',
    purpose: "What you own and what you owe, in one place, reconciled.",
    feeds: ["Insurance", "Family", "Taxes"],
    primary: { label: "Your account balances", why: "No document needed \u2014 type them in. Checking, savings, retirement and investments." },
    also: ["A brokerage statement", "A retirement account statement", "Car, student or personal loans"],
    order: 5,
    noDocumentNeeded: true,
    body:
      'Add your accounts and any loans. Command builds the balance sheet from them, pulling in the '
      + 'mortgage from Home and card balances from Credit, and reconciles the total against the net '
      + 'worth on your profile. That figure is what your insurance findings are measured against, so '
      + 'it is worth having right.',
    ctaLabel: 'Add an account',
  },
  taxes: {
    section: 'taxes',
    title: 'Start with last year’s return',
    purpose: "Planning this year against what last year actually cost you.",
    feeds: ["Finances", "Home", "Family"],
    primary: { label: "Last year's tax return", why: "The single most useful document you own. It sets your payment target and carries forward what preparers usually lose." },
    also: ["W-2s and 1099s", "Form 1098 from your mortgage", "Childcare and tuition records", "Charitable receipts"],
    order: 7,
    body:
      'Upload the return you filed last year. It fixes your safe-harbor payment target, shows whether '
      + 'itemizing is in play, and carries forward the losses and giving that usually get lost between '
      + 'preparers — so this year can be planned rather than reconstructed each April. As you use '
      + 'Command more, it can prepare a summary for your tax preparer too.',
    ctaLabel: 'Upload last year’s return',
  },
  family: {
    section: 'family',
    title: 'Start with who is in the household',
    purpose: "Who is in the household, and what is coming for each of them.",
    feeds: ["Legal", "Insurance", "Taxes"],
    primary: { label: "Everyone in the household", why: "No document needed \u2014 just names and birth dates. It is the fastest way to start and it feeds three other sections." },
    also: ["Birth certificates", "A marriage certificate", "Guardianship or custody papers"],
    order: 1,
    noDocumentNeeded: true,
    body:
      'Add everyone, with birth dates. Command builds the timeline that follows — a custodial account '
      + 'turning over, a child ageing out of the tax credit, the education years ahead — and measures '
      + 'the cover already in place against what the family would need without your income.',
    ctaLabel: 'Add a family member',
  },
  documents: {
    section: 'documents',
    title: 'Everything Command reads lives here',
    purpose: "Everything Command has read, and what each document became.",
    feeds: ["every section"],
    primary: { label: "Anything at all", why: "Command works out what it is. You do not have to decide before uploading." },
    also: ["Policies", "Statements", "Legal documents", "Tax forms", "Warranties"],
    order: 8,
    body:
      'Upload anything — a policy, a will, a statement, a return. Command works out what it is, files '
      + 'it to the right section, and shows you what it found with the page each answer came from. '
      + 'Nothing reaches your profile until you confirm it.',
    ctaLabel: 'Add a document',
  },
};

/**
 * A section is unstarted when it holds nothing — no records of its own, and no
 * readings waiting to become records. Both count: a document uploaded and not
 * yet confirmed means the user has started, and telling them otherwise would be
 * a section forgetting what they just did.
 */
export function familiarityState(...counts: Array<number | undefined | null>): FamiliarityState {
  return counts.some((n) => (n ?? 0) > 0) ? 'started' : 'unstarted';
}

export function introFor(section: string): SectionIntroCopy | null {
  return SECTION_INTROS[section] ?? null;
}
