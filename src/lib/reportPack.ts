// The snapshot a household takes into a meeting.
//
// Someone sitting down with a planner, a preparer or an agent spends the first
// twenty minutes reciting facts they already own — balances, rates, limits,
// ages, last year's AGI. Command has read all of it. This assembles the subset
// that a particular professional actually needs, in the order they will ask.
//
// Three rules, because this leaves the household:
//
//   1. **Say what is on file.** Every figure is labeled with where it came
//      from — read from a document, or entered by the household. A planner
//      needs to know which numbers are evidence and which are memory.
//   2. **No conclusions.** Command reports what the documents say and what it
//      could not see. Whether coverage is adequate or a position is sound is
//      the professional's call, and they are the one being handed this.
//   3. **Every report ends with its own gaps.** A snapshot that hides what is
//      missing is worse than no snapshot, because it will be relied on.

import type { HouseholdData } from '../useHousehold';
import type { FamilyMember, InsurancePolicyExtraction, TaxReturn } from './supabase';
import { safeHarborTarget } from './taxPlanning';
import { carrierGroup } from './carriers';
import { listOf } from './text';

export type Audience = 'planner' | 'tax' | 'insurance';

export interface AudienceOption {
  id: Audience;
  label: string;
  who: string;
  /** What the report is built to answer, in the user's terms. */
  covers: string[];
}

export const AUDIENCES: AudienceOption[] = [
  {
    id: 'planner',
    label: 'Financial planner',
    who: 'For a planning or advisory meeting',
    covers: [
      'What you own and what you owe, with the rate on every debt',
      'Insurance limits in force, and your stated net worth beside them',
      'Estate documents on file, with execution dates',
      'Who is in the household, and their ages',
    ],
  },
  {
    id: 'tax',
    label: 'Tax preparer',
    who: 'For a return, an extension or a planning check-in',
    covers: [
      'Last year’s return as the baseline — AGI, total tax, effective rate',
      'The safe-harbor payment target that follows from it',
      'Standard against itemized, with the itemized components',
      'Carryforwards, dependents and their ages at year end',
    ],
  },
  {
    id: 'insurance',
    label: 'Insurance agent',
    who: 'For shopping a policy or a coverage review',
    covers: [
      'Every limit and deductible currently in force',
      'The people, vehicles and property named on your policies',
      'Property characteristics an underwriter will ask for',
      'What an umbrella requires underneath it, against what you carry',
    ],
  },
];

export interface ReportField {
  label: string;
  value: string;
  /** Where the figure came from. Shown so a professional can weigh it. */
  source?: string;
}

export interface ReportSection {
  title: string;
  intro?: string;
  fields?: ReportField[];
  columns?: string[];
  rows?: string[][];
  /** Shown in place of the table when there is nothing on file. */
  empty?: string;
}

export interface ReportModel {
  audience: Audience;
  title: string;
  household: string;
  location: string | null;
  generatedOn: string;
  sections: ReportSection[];
  /** What Command has not seen. Always rendered, never omitted when empty. */
  gaps: string[];
  /** The documents these figures were read from. */
  provenance: string[];
}

const money = (value: number | null | undefined): string =>
  value == null
    ? '—'
    : new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', maximumFractionDigits: 0,
    }).format(value);

const pct = (value: number | null | undefined, digits = 2): string =>
  value == null ? '—' : `${value.toFixed(digits)}%`;

const date = (value: string | null | undefined): string => {
  if (!value) return '—';
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(parsed);
};

const titleCase = (value: string | null | undefined): string =>
  (value ?? '').replace(/_/g, ' ').replace(/\b[a-z]/g, (c) => c.toUpperCase()).trim() || '—';

/** Whole years as of a given date. Ages drive credits, milestones and rating. */
function ageOn(birthDate: string | null | undefined, when: Date): number | null {
  if (!birthDate) return null;
  const born = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(born.getTime())) return null;
  let age = when.getUTCFullYear() - born.getUTCFullYear();
  const beforeBirthday = when.getUTCMonth() < born.getUTCMonth()
    || (when.getUTCMonth() === born.getUTCMonth() && when.getUTCDate() < born.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

const describePerson = (m: FamilyMember, when: Date): string => {
  const age = ageOn(m.birth_date, when);
  if (age == null) return 'Birth date not on file';
  // An infant reported as "0" reads like a missing figure to someone
  // skim-reading a column of numbers.
  return age === 0 ? 'Under 1' : String(age);
};

/** The order a household is read in, rather than the order the rows arrived. */
function householdOrder(m: FamilyMember): number {
  const r = (m.relationship ?? '').toLowerCase();
  if (r.includes('self')) return 0;
  if (r.includes('spouse') || r.includes('partner')) return 1;
  return 2;
}

const inHouseholdOrder = (members: FamilyMember[]): FamilyMember[] =>
  [...members].sort(
    (a, b) => householdOrder(a) - householdOrder(b)
      || (a.birth_date ?? '').localeCompare(b.birth_date ?? ''),
  );

/** Extractions the household has accepted. Pending readings are not facts yet. */
const confirmedExtractions = (data: HouseholdData): InsurancePolicyExtraction[] =>
  (data.insuranceExtractions ?? []).filter((e) => e.review_status === 'confirmed');

const latestReturn = (data: HouseholdData): TaxReturn | null =>
  [...(data.taxReturns ?? [])].sort((a, b) => b.tax_year - a.tax_year)[0] ?? null;

function householdName(data: HouseholdData): string {
  const profile = data.profile;
  const names = [profile?.primary_name, profile?.partner_name].filter(Boolean) as string[];
  if (names.length > 0) return listOf(names);
  return data.household?.name ?? 'Your household';
}

/** Every document these figures were read from, newest first. */
function provenanceOf(data: HouseholdData): string[] {
  return [...(data.documents ?? [])]
    .sort((a, b) => (b.uploaded_at ?? '').localeCompare(a.uploaded_at ?? ''))
    .map((d) => `${d.name} — read ${date((d.uploaded_at ?? '').slice(0, 10))}`);
}

// ── What Command could not see ────────────────────────────────────────────────
//
// Assembled per audience, because a missing will matters to a planner and not
// to an agent quoting auto.

function plannerGaps(data: HouseholdData): string[] {
  const gaps: string[] = [];
  const stated = data.profile?.net_worth ?? null;
  if (stated == null) gaps.push('No net worth has been stated by the household to compare against.');
  if ((data.financeAccounts ?? []).length === 0) {
    gaps.push('No bank, brokerage or retirement accounts are on file.');
  }
  if ((data.legalDocuments ?? []).length === 0) {
    gaps.push('No estate documents have been read — a will or trust may exist outside Command.');
  }
  if (!data.profile?.household_income) gaps.push('No household income is recorded.');
  const undated = (data.financeAccounts ?? []).filter((a) => !a.as_of_date).length;
  if (undated > 0) {
    gaps.push(`${undated} account balance${undated === 1 ? '' : 's'} carry no "as of" date, so their age is unknown.`);
  }
  if ((data.insurancePolicies ?? []).length === 0) gaps.push('No insurance policies are on file.');
  return gaps;
}

function taxGaps(data: HouseholdData): string[] {
  const gaps: string[] = [];
  const prior = latestReturn(data);
  if (!prior) {
    gaps.push('No prior-year return has been read, so there is no baseline and no safe-harbor figure.');
  } else {
    if (prior.adjusted_gross_income == null) gaps.push(`The ${prior.tax_year} return is on file but no AGI was read from it.`);
    if (prior.total_tax == null) gaps.push(`No total tax was read from the ${prior.tax_year} return.`);
  }
  const undated = (data.familyMembers ?? []).filter((m) => !m.birth_date).length;
  if (undated > 0) {
    gaps.push(`${undated} household member${undated === 1 ? '' : 's'} have no birth date, so ages at year end cannot be given.`);
  }
  if ((data.taxDocuments ?? []).length === 0) {
    gaps.push('No W-2s, 1099s or other forms have been filed in Command for this year.');
  }
  if ((data.deductionLog ?? []).length === 0) gaps.push('Nothing has been logged as a deductible expense this year.');
  gaps.push('Command records what documents say. It does not confirm that every income source or deduction has been captured.');
  return gaps;
}

function insuranceGaps(data: HouseholdData): string[] {
  const gaps: string[] = [];
  const extractions = confirmedExtractions(data);
  const decsOnly = extractions.filter((e) => e.declarations_only);
  if (decsOnly.length > 0) {
    gaps.push(
      `${decsOnly.length} polic${decsOnly.length === 1 ? 'y is' : 'ies are'} represented by a declarations `
      + 'page only, so exclusions and endorsements in the full policy have not been read.',
    );
  }
  const missingEndorsements = extractions.filter((e) => e.endorsements_appear_missing);
  if (missingEndorsements.length > 0) {
    gaps.push(`${missingEndorsements.length} policy appears to reference endorsements that were not in the file provided.`);
  }
  for (const extraction of extractions) {
    for (const item of extraction.unresolved_items ?? []) {
      if (item?.item) gaps.push(`${extraction.carrier ?? 'A policy'}: ${item.item}${item.why_unresolved ? ` — ${item.why_unresolved}` : ''}`);
    }
  }
  if ((data.profile?.year_built ?? null) == null) {
    gaps.push('The year the home was built is not recorded, and an underwriter will ask.');
  }
  gaps.push('Claims history is not held by Command and will need to come from you or the current carrier.');
  return gaps;
}

// ── The reports ───────────────────────────────────────────────────────────────

/** Highest rate first. A debt table is read for the spread between the rows. */
function sortByRateDesc(rows: string[][]): string[][] {
  const rate = (row: string[]) => {
    const parsed = Number.parseFloat((row[3] ?? '').replace('%', ''));
    return Number.isFinite(parsed) ? parsed : -1;
  };
  return [...rows].sort((a, b) => rate(b) - rate(a));
}

function plannerSections(data: HouseholdData, now: Date): ReportSection[] {
  const profile = data.profile;
  const accounts = data.financeAccounts ?? [];
  const assets = data.assets ?? [];
  const loans = (data.loans ?? []).filter((l) => l.status === 'active');
  const cards = data.creditCards ?? [];
  const mortgage = data.mortgage;

  const assetTotal = accounts.reduce((s, a) => s + (a.balance ?? 0), 0)
    + assets.reduce((s, a) => s + (a.current_value ?? 0), 0);
  const debtTotal = (mortgage?.principal_balance ?? 0)
    + loans.reduce((s, l) => s + (l.current_balance ?? 0), 0)
    + cards.reduce((s, c) => s + (c.current_balance ?? 0), 0);

  const sections: ReportSection[] = [
    {
      title: 'Household',
      columns: ['Name', 'Relationship', 'Age'],
      rows: inHouseholdOrder(data.familyMembers ?? []).map(
        (m) => [m.name, titleCase(m.relationship), describePerson(m, now)],
      ),
      empty: 'No household members are on file.',
    },
    {
      title: 'Position',
      fields: [
        { label: 'Household income', value: money(profile?.household_income), source: 'Stated by the household' },
        { label: 'Net worth, as stated', value: money(profile?.net_worth), source: 'Stated by the household' },
        { label: 'Assets on file', value: money(assetTotal), source: 'Sum of the accounts and assets below' },
        { label: 'Debts on file', value: money(debtTotal), source: 'Sum of the balances below' },
        { label: 'Net, from what is on file', value: money(assetTotal - debtTotal), source: 'Assets less debts, above' },
      ],
    },
    {
      title: 'Accounts',
      columns: ['Account', 'Type', 'Institution', 'Balance', 'As of'],
      rows: accounts.map((a) => [
        a.account_name, titleCase(a.account_type), a.institution ?? '—', money(a.balance), date(a.as_of_date),
      ]),
      empty: 'No accounts are on file.',
    },
    {
      title: 'Other assets',
      columns: ['Asset', 'Type', 'Value'],
      rows: assets.map((a) => [a.name, titleCase(a.type), money(a.current_value)]),
      empty: 'No other assets are on file.',
    },
    {
      title: 'Debts',
      intro: 'Rates are shown because the spread between them is usually the first thing asked about.',
      columns: ['Debt', 'Lender', 'Balance', 'Rate', 'Monthly', 'Matures'],
      rows: sortByRateDesc([
        ...(mortgage ? [[
          'Mortgage', mortgage.servicer ?? '—', money(mortgage.principal_balance),
          pct(mortgage.interest_rate, 3), money(mortgage.monthly_payment), date(mortgage.maturity_date),
        ]] : []),
        ...loans.map((l) => [
          l.name || titleCase(l.loan_type), l.lender ?? '—', money(l.current_balance),
          pct(l.apr ?? l.interest_rate, 3), money(l.monthly_payment), date(l.maturity_date),
        ]),
        ...cards.map((c) => [
          c.card_name, c.issuer ?? c.institution ?? '—', money(c.current_balance),
          pct(c.purchase_apr, 2), '—', '—',
        ]),
      ]),
      empty: 'No debts are on file.',
    },
    {
      title: 'Insurance in force',
      columns: ['Type', 'Carrier', 'Limit', 'Annual premium', 'Renews'],
      rows: (data.insurancePolicies ?? []).map((p) => [
        titleCase(p.type),
        p.carrier ? `${p.carrier}${carrierGroup(p.carrier).known && carrierGroup(p.carrier).label !== p.carrier.trim() ? ` (${carrierGroup(p.carrier).label})` : ''}` : '—',
        money(p.coverage_amount), money(p.annual_premium), date(p.renewal_date),
      ]),
      empty: 'No insurance policies are on file.',
    },
    {
      title: 'Estate documents on file',
      intro: 'Command records what a document says. Whether it is valid or current is an attorney’s call.',
      columns: ['Document', 'Type', 'Executed', 'Jurisdiction'],
      rows: (data.legalDocuments ?? []).map((d) => [
        d.name, titleCase(d.document_type ?? d.type), date(d.execution_date), d.governing_jurisdiction ?? '—',
      ]),
      empty: 'No estate documents have been read into Command.',
    },
  ];
  return sections;
}

function taxSections(data: HouseholdData, now: Date): ReportSection[] {
  const prior = latestReturn(data);
  const year = prior?.tax_year ?? null;
  const planningYear = year != null ? year + 1 : now.getUTCFullYear();
  const yearEnd = new Date(Date.UTC(planningYear, 11, 31));
  const safeHarbor = prior ? safeHarborTarget(prior) : null;
  const effective = prior && prior.total_tax != null && prior.adjusted_gross_income
    ? (prior.total_tax / prior.adjusted_gross_income) * 100
    : null;
  const logged = (data.deductionLog ?? []).filter((e) => e.tax_year === planningYear);
  const loggedTotal = logged.reduce((s, e) => s + (e.amount ?? 0), 0);

  const sections: ReportSection[] = [
    {
      title: prior ? `${prior.tax_year} return, as filed` : 'Prior-year return',
      intro: prior
        ? 'Read from the return on file. These are the figures the coming year is planned against.'
        : undefined,
      fields: prior ? [
        { label: 'Filing status', value: titleCase(prior.filing_status) },
        { label: 'Adjusted gross income', value: money(prior.adjusted_gross_income) },
        { label: 'Taxable income', value: money(prior.taxable_income) },
        { label: 'Total tax', value: money(prior.total_tax) },
        { label: 'Effective rate on AGI', value: pct(effective) },
        { label: 'Federal withheld', value: money(prior.federal_withheld) },
        { label: 'Estimated payments', value: money(prior.estimated_payments) },
        { label: prior.refund_amount ? 'Refund' : 'Amount owed', value: money(prior.refund_amount ?? prior.amount_owed) },
      ] : undefined,
      empty: prior ? undefined : 'No prior-year return has been read into Command.',
    },
    {
      title: `Safe harbor for ${planningYear}`,
      intro: 'The prior-year figure only. What is actually owed depends on this year, which is the conversation.',
      fields: [
        { label: 'Prior-year total tax', value: money(prior?.total_tax) },
        {
          label: 'Safe-harbor target',
          value: money(safeHarbor),
          source: prior && (prior.adjusted_gross_income ?? 0) > 150000
            ? '110% of prior-year tax, the higher-AGI threshold'
            : '100% of prior-year tax',
        },
      ],
    },
    {
      title: 'Deduction position',
      fields: prior ? [
        { label: 'Took', value: prior.took_standard_deduction ? 'Standard deduction' : 'Itemized' },
        { label: 'Standard deduction', value: money(prior.standard_deduction_amount) },
        { label: 'Itemized total', value: money(prior.itemized_total) },
        { label: 'State and local tax', value: money(prior.itemized_salt) },
        { label: 'Mortgage interest', value: money(prior.itemized_mortgage_interest) },
        { label: 'Charitable', value: money(prior.itemized_charitable) },
        { label: 'Medical', value: money(prior.itemized_medical) },
      ] : undefined,
      empty: prior ? undefined : 'Not available without a prior-year return.',
    },
    {
      title: 'Carryforwards',
      fields: [
        { label: 'Capital loss carryforward', value: money(prior?.capital_loss_carryforward) },
        { label: 'Charitable carryforward', value: money(prior?.charitable_carryforward) },
      ],
    },
    {
      title: `Dependents and ages at December 31, ${planningYear}`,
      intro: 'Ages at year end, because that is what the credits turn on.',
      columns: ['Name', 'Relationship', `Age on Dec 31, ${planningYear}`],
      rows: inHouseholdOrder(data.familyMembers ?? []).map((m) => [
        m.name, titleCase(m.relationship), describePerson(m, yearEnd),
      ]),
      empty: 'No household members are on file.',
    },
    {
      title: `Forms on file for ${planningYear}`,
      columns: ['Form', 'Issuer', 'Amount', 'Received'],
      rows: (data.taxDocuments ?? [])
        .filter((d) => d.tax_year === planningYear)
        .map((d) => [d.form_type ?? d.doc_type ?? d.name, d.issuer ?? '—', money(d.amount), date(d.received_on)]),
      empty: `No forms have been filed in Command for ${planningYear}.`,
    },
    {
      title: `Logged deductible spending, ${planningYear}`,
      intro: loggedTotal > 0 ? `${money(loggedTotal)} logged across ${logged.length} entr${logged.length === 1 ? 'y' : 'ies'}.` : undefined,
      columns: ['Date', 'Category', 'Payee', 'Amount', 'Receipt'],
      rows: logged.map((e) => [
        date(e.spent_on), titleCase(e.category), e.payee ?? '—', money(e.amount),
        e.has_receipt ? 'On file' : 'Not on file',
      ]),
      empty: 'Nothing has been logged this year.',
    },
  ];

  if (data.mortgage) {
    sections.push({
      title: 'Mortgage, for interest and property tax',
      fields: [
        { label: 'Servicer', value: data.mortgage.servicer ?? '—' },
        { label: 'Property', value: data.mortgage.property_address ?? '—' },
        { label: 'Principal balance', value: money(data.mortgage.principal_balance) },
        { label: 'Rate', value: pct(data.mortgage.interest_rate, 3) },
        { label: 'Escrow payment', value: money(data.mortgage.escrow_payment) },
      ],
    });
  }
  return sections;
}

function insuranceSections(data: HouseholdData, now: Date): ReportSection[] {
  const profile = data.profile;
  const extractions = confirmedExtractions(data);

  const sections: ReportSection[] = [
    {
      title: 'The risk to be covered',
      fields: [
        { label: 'Location', value: [profile?.city, profile?.state].filter(Boolean).join(', ') || '—' },
        { label: 'Home value', value: money(profile?.home_value), source: 'Stated by the household' },
        { label: 'Year built', value: profile?.year_built ? String(profile.year_built) : '—' },
        { label: 'Roof age', value: profile?.roof_age ?? '—' },
        { label: 'HVAC age', value: profile?.hvac_age ?? '—' },
        { label: 'Net worth, as stated', value: money(profile?.net_worth), source: 'Relevant to sizing liability limits' },
      ],
    },
    {
      title: 'People in the household',
      columns: ['Name', 'Relationship', 'Age'],
      rows: inHouseholdOrder(data.familyMembers ?? []).map(
        (m) => [m.name, titleCase(m.relationship), describePerson(m, now)],
      ),
      empty: 'No household members are on file.',
    },
    {
      // Built from the policy inventory rather than from readings. A household
      // that typed its policies in, or was set up before extraction existed,
      // has no confirmed extraction at all — and an insurance report with no
      // policies in it is the one thing this report cannot be.
      title: 'Policies in force',
      columns: ['Type', 'Carrier', 'Policy number', 'Coverage', 'Deductible', 'Annual premium', 'Renews'],
      rows: (data.insurancePolicies ?? []).map((p) => [
        titleCase(p.type), p.carrier ?? '—', p.policy_number ?? '—',
        money(p.coverage_amount), money(p.deductible), money(p.annual_premium), date(p.renewal_date),
      ]),
      empty: 'No insurance policies are on file.',
    },
  ];

  // Readings that never became a policy row are still worth carrying, since
  // they hold effective and expiration dates the inventory does not.
  const unlisted = extractions.filter(
    (e) => !(data.insurancePolicies ?? []).some(
      (p) => (p.policy_number ?? '').trim() !== '' && p.policy_number === e.policy_number,
    ),
  );
  if (unlisted.length > 0) {
    sections.push({
      title: 'Policy terms, as read from the documents',
      columns: ['Type', 'Carrier', 'Policy number', 'Effective', 'Expires', 'Annual premium'],
      rows: unlisted.map((e) => [
        titleCase(e.insurance_type), e.carrier ?? '—', e.policy_number ?? '—',
        date(e.effective_date), date(e.expiration_date), money(e.annual_premium),
      ]),
    });
  }

  // Limits, per policy. This is the substance of a shopping conversation.
  for (const extraction of extractions) {
    const covered = (extraction.insurance_coverages ?? [])
      .filter((c) => c.included_status !== 'not_found');
    sections.push({
      title: `${extraction.carrier ?? 'Policy'} — ${titleCase(extraction.insurance_type)} limits`,
      intro: extraction.declarations_only
        ? 'Read from a declarations page. Exclusions and endorsements in the full policy have not been seen.'
        : undefined,
      columns: ['Coverage', 'Limit', 'Deductible', 'Status'],
      rows: covered.map((c) => [
        c.coverage_name_raw || titleCase(c.coverage_code),
        c.limit_amount != null ? money(c.limit_amount) : (c.raw_value ?? '—'),
        c.deductible_amount != null ? money(c.deductible_amount)
          : c.deductible_percent != null ? `${c.deductible_percent}%` : '—',
        titleCase(c.included_status),
      ]),
      empty: 'No coverage lines were read from this policy.',
    });

    const insuredAssets = extraction.insurance_insured_assets ?? [];
    if (insuredAssets.length > 0) {
      sections.push({
        title: `${extraction.carrier ?? 'Policy'} — what is insured`,
        columns: ['Kind', 'Description', 'Identifier'],
        rows: insuredAssets.map((a) => [
          titleCase(a.asset_type),
          [a.year, a.make, a.model].filter(Boolean).join(' ') || a.address || a.description || '—',
          a.vin ? `VIN ${a.vin}` : '—',
        ]),
      });
    }

    const parties = extraction.insurance_insured_parties ?? [];
    if (parties.length > 0) {
      sections.push({
        title: `${extraction.carrier ?? 'Policy'} — who is named`,
        columns: ['Name', 'Role'],
        rows: parties.map((p) => [p.name ?? '—', titleCase(p.role)]),
      });
    }

    const requirements = extraction.insurance_underlying_requirements ?? [];
    if (requirements.length > 0) {
      sections.push({
        title: `${extraction.carrier ?? 'Policy'} — required underneath`,
        intro: 'What this policy requires the primary policies to carry. Worth checking against the limits above.',
        columns: ['Requirement', 'Required limit', 'Note'],
        rows: requirements.map((r) => [titleCase(r.requirement_type), money(r.required_limit), r.notes ?? '—']),
      });
    }
  }

  return sections;
}

export function buildReport(audience: Audience, data: HouseholdData, now: Date = new Date()): ReportModel {
  const titles: Record<Audience, string> = {
    planner: 'Household snapshot for a financial planner',
    tax: 'Household snapshot for a tax preparer',
    insurance: 'Household snapshot for an insurance review',
  };
  const sections = audience === 'planner' ? plannerSections(data, now)
    : audience === 'tax' ? taxSections(data, now)
      : insuranceSections(data, now);
  const gaps = [
    ...(audience === 'planner' ? plannerGaps(data)
      : audience === 'tax' ? taxGaps(data)
        : insuranceGaps(data)),
    // Always last, and always present. An empty list would read as "nothing is
    // missing", which is a claim this report is in no position to make.
    'Command reports what has been uploaded to it. Accounts, policies, documents or '
    + 'obligations held elsewhere are not reflected here.',
  ];

  return {
    audience,
    title: titles[audience],
    household: householdName(data),
    location: [data.profile?.city, data.profile?.state].filter(Boolean).join(', ') || null,
    generatedOn: new Intl.DateTimeFormat('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    }).format(now),
    sections,
    gaps,
    provenance: provenanceOf(data),
  };
}
