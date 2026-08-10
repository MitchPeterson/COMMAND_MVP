// Home systems: what wears out, roughly when, and roughly what it costs.
//
// Two things in this file are estimates rather than facts about the household,
// and both are labeled as such everywhere they surface:
//
//   * Service life is a typical range for the category, not a prediction about
//     a specific unit. A furnace that has been serviced every autumn outlives
//     one that has not, and Command cannot see the difference.
//   * Replacement cost is a national typical range, not a quote. Local labor
//     moves it more than the equipment does.
//
// Both carry a `basis` the UI can show, and both are overridden by anything the
// household enters. The point of the timeline is not precision — it is that a
// household with a 14-year-old furnace and a 22-year-old roof should not be
// surprised by either.

export interface SystemCategory {
  code: string;
  label: string;
  group: 'mechanical' | 'envelope' | 'appliance' | 'outdoor';
  /** Typical service life in years, low and high. */
  lifeYears: [number, number];
  /** Typical replacement cost, low and high, installed. */
  costUsd: [number, number];
  note?: string;
}

/**
 * Ranges are the commonly cited figures for US homes — the kind a home
 * inspector or trade association publishes. They are round on purpose: a range
 * that looks precise invites more trust than it deserves.
 */
export const SYSTEM_CATEGORIES: SystemCategory[] = [
  { code: 'furnace', label: 'Furnace', group: 'mechanical', lifeYears: [15, 25], costUsd: [4500, 9000] },
  { code: 'air_conditioner', label: 'Air conditioner', group: 'mechanical', lifeYears: [12, 20], costUsd: [5000, 10000] },
  { code: 'heat_pump', label: 'Heat pump', group: 'mechanical', lifeYears: [12, 18], costUsd: [6000, 13000] },
  { code: 'water_heater', label: 'Water heater', group: 'mechanical', lifeYears: [8, 15], costUsd: [1500, 3500],
    note: 'Tankless units last longer and cost more to install.' },
  { code: 'water_softener', label: 'Water softener', group: 'mechanical', lifeYears: [10, 20], costUsd: [1200, 3000] },
  { code: 'sump_pump', label: 'Sump pump', group: 'mechanical', lifeYears: [7, 10], costUsd: [600, 1600] },
  { code: 'electrical_panel', label: 'Electrical panel', group: 'mechanical', lifeYears: [25, 40], costUsd: [1500, 4000] },

  { code: 'roof_asphalt', label: 'Roof — asphalt shingle', group: 'envelope', lifeYears: [18, 25], costUsd: [9000, 22000] },
  { code: 'roof_metal', label: 'Roof — metal', group: 'envelope', lifeYears: [40, 70], costUsd: [18000, 40000] },
  { code: 'windows', label: 'Windows', group: 'envelope', lifeYears: [20, 30], costUsd: [8000, 25000] },
  { code: 'siding', label: 'Siding', group: 'envelope', lifeYears: [20, 40], costUsd: [10000, 28000] },
  { code: 'gutters', label: 'Gutters', group: 'envelope', lifeYears: [20, 30], costUsd: [1200, 3500] },
  { code: 'garage_door', label: 'Garage door', group: 'envelope', lifeYears: [15, 30], costUsd: [1200, 4000] },

  { code: 'refrigerator', label: 'Refrigerator', group: 'appliance', lifeYears: [10, 15], costUsd: [1200, 3500] },
  { code: 'range', label: 'Range or oven', group: 'appliance', lifeYears: [13, 18], costUsd: [900, 3000] },
  { code: 'dishwasher', label: 'Dishwasher', group: 'appliance', lifeYears: [9, 12], costUsd: [700, 1800] },
  { code: 'washer', label: 'Washing machine', group: 'appliance', lifeYears: [10, 13], costUsd: [700, 1600] },
  { code: 'dryer', label: 'Dryer', group: 'appliance', lifeYears: [10, 14], costUsd: [700, 1500] },
  { code: 'microwave', label: 'Microwave', group: 'appliance', lifeYears: [8, 10], costUsd: [300, 900] },
  { code: 'garbage_disposal', label: 'Garbage disposal', group: 'appliance', lifeYears: [8, 12], costUsd: [250, 700] },

  { code: 'deck', label: 'Deck', group: 'outdoor', lifeYears: [15, 25], costUsd: [6000, 18000] },
  { code: 'driveway', label: 'Driveway', group: 'outdoor', lifeYears: [20, 30], costUsd: [5000, 15000] },
  { code: 'fence', label: 'Fence', group: 'outdoor', lifeYears: [12, 20], costUsd: [3000, 10000] },

  { code: 'other', label: 'Something else', group: 'appliance', lifeYears: [10, 15], costUsd: [500, 3000] },
];

const BY_CODE = new Map(SYSTEM_CATEGORIES.map((c) => [c.code, c]));

export function categoryOf(code: string | null | undefined): SystemCategory {
  return (code ? BY_CODE.get(code) : undefined) ?? BY_CODE.get('other')!;
}

export function categoryLabel(code: string | null | undefined): string {
  return categoryOf(code).label;
}

export interface HomeSystemRow {
  id: string;
  household_id: string;
  name: string;
  category: string;
  location: string | null;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  installed_on: string | null;
  approximate_age_years: number | null;
  purchase_price: number | null;
  purchased_from: string | null;
  expected_life_years: number | null;
  user_expected_life_years: number | null;
  replacement_cost_estimate: number | null;
  user_replacement_cost: number | null;
  warranty_provider: string | null;
  warranty_type: string | null;
  warranty_expires_on: string | null;
  warranty_notes: string | null;
  condition_note: string | null;
  last_serviced_on: string | null;
  notes: string | null;
  entry_source: string;
  source_document_id: string | null;
}

export interface SystemOutlook {
  system: HomeSystemRow;
  category: SystemCategory;
  /** Years since installation, or the household's stated approximate age. */
  ageYears: number | null;
  ageIsApproximate: boolean;
  /** Expected life in use — the household's figure if they gave one. */
  lifeYears: number;
  lifeIsUserSet: boolean;
  /** Calendar year the replacement is likely to land in. */
  replacementYear: number | null;
  yearsRemaining: number | null;
  /** Cost in use — the household's figure if they gave one. */
  cost: number;
  costIsUserSet: boolean;
  costRange: [number, number];
  state: 'past_life' | 'due_soon' | 'watch' | 'fine' | 'unknown_age';
  warrantyState: 'active' | 'expired' | 'unknown';
}

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

function yearsSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(`${iso}T00:00:00Z`).getTime();
  if (Number.isNaN(then)) return null;
  return (Date.now() - then) / YEAR_MS;
}

export function outlookFor(system: HomeSystemRow): SystemOutlook {
  const category = categoryOf(system.category);

  const fromDate = yearsSince(system.installed_on);
  const ageYears = fromDate ?? (system.approximate_age_years ?? null);
  const ageIsApproximate = fromDate === null && system.approximate_age_years != null;

  // Midpoint of the typical range unless the household knows better.
  const typicalLife = (category.lifeYears[0] + category.lifeYears[1]) / 2;
  const lifeIsUserSet = system.user_expected_life_years != null;
  const lifeYears = system.user_expected_life_years ?? system.expected_life_years ?? typicalLife;

  const typicalCost = Math.round((category.costUsd[0] + category.costUsd[1]) / 2);
  const costIsUserSet = system.user_replacement_cost != null;
  const cost = system.user_replacement_cost ?? system.replacement_cost_estimate ?? typicalCost;

  const yearsRemaining = ageYears == null ? null : lifeYears - ageYears;
  const replacementYear = yearsRemaining == null ? null : new Date().getFullYear() + Math.round(yearsRemaining);

  const state: SystemOutlook['state'] =
    ageYears == null ? 'unknown_age'
      : yearsRemaining! <= 0 ? 'past_life'
        : yearsRemaining! <= 2 ? 'due_soon'
          : yearsRemaining! <= 5 ? 'watch'
            : 'fine';

  const warrantyExpiry = system.warranty_expires_on ? new Date(`${system.warranty_expires_on}T00:00:00Z`) : null;
  const warrantyState: SystemOutlook['warrantyState'] =
    !warrantyExpiry || Number.isNaN(warrantyExpiry.getTime())
      ? 'unknown'
      : warrantyExpiry.getTime() >= Date.now()
        ? 'active'
        : 'expired';

  return {
    system, category, ageYears, ageIsApproximate,
    lifeYears, lifeIsUserSet,
    replacementYear, yearsRemaining,
    cost, costIsUserSet, costRange: category.costUsd,
    state, warrantyState,
  };
}

export interface ReplacementYear {
  year: number;
  items: SystemOutlook[];
  total: number;
}

/** Grouped by the year each replacement is likely to land in, soonest first. */
export function replacementTimeline(systems: HomeSystemRow[], horizonYears = 15): ReplacementYear[] {
  const thisYear = new Date().getFullYear();
  const byYear = new Map<number, SystemOutlook[]>();

  for (const system of systems) {
    const outlook = outlookFor(system);
    if (outlook.replacementYear == null) continue;
    // Anything already past its life shows in the current year rather than a
    // year in the past — it is a present problem, not a historical one.
    const year = Math.max(outlook.replacementYear, thisYear);
    if (year > thisYear + horizonYears) continue;
    const list = byYear.get(year) ?? [];
    list.push(outlook);
    byYear.set(year, list);
  }

  return [...byYear.entries()]
    .map(([year, items]) => ({ year, items, total: items.reduce((sum, i) => sum + i.cost, 0) }))
    .sort((a, b) => a.year - b.year);
}

export interface HomeEquity {
  homeValue: number | null;
  principal: number | null;
  equity: number | null;
  loanToValue: number | null;
}

export function computeEquity(homeValue: number | null, principal: number | null): HomeEquity {
  if (homeValue == null || principal == null) {
    return { homeValue, principal, equity: null, loanToValue: null };
  }
  return {
    homeValue,
    principal,
    equity: homeValue - principal,
    loanToValue: homeValue > 0 ? (principal / homeValue) * 100 : null,
  };
}
