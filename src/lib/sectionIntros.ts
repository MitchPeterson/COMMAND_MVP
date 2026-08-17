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

export interface SectionIntroCopy {
  section: string;
  title: string;
  body: string;
  ctaLabel: string;
}

export const SECTION_INTROS: Record<string, SectionIntroCopy> = {
  insurance: {
    section: 'insurance',
    title: 'Start with your declarations pages',
    body:
      'Upload the declarations page from each policy — home, auto, umbrella, life. Command reads the '
      + 'limits, deductibles and renewal dates, then weighs them against what your household actually '
      + 'owns. The question it answers is whether the cover fits the risk, not whether the filing is tidy.',
    ctaLabel: 'Upload a declarations page',
  },
  legal: {
    section: 'legal',
    title: 'Start with your will',
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
    body:
      'Upload one statement per card. Command reads the balance, limit, interest rates and rewards, '
      + 'then works out what your spending actually earns and whether it is going on the right card. '
      + 'If a balance is carrying, the interest outruns any rewards — so that gets said first.',
    ctaLabel: 'Upload a card statement',
  },
  home: {
    section: 'home',
    title: 'Start with your mortgage statement',
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
    body:
      'Add everyone, with birth dates. Command builds the timeline that follows — a custodial account '
      + 'turning over, a child ageing out of the tax credit, the education years ahead — and measures '
      + 'the cover already in place against what the family would need without your income.',
    ctaLabel: 'Add a family member',
  },
  documents: {
    section: 'documents',
    title: 'Everything Command reads lives here',
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
