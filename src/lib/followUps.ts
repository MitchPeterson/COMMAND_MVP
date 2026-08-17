// The questions a document raises about everything else.
//
// An auto policy names its drivers and the cars they drive. If the household has
// no people and no vehicles recorded, Command has just been told both and has
// nowhere to put either — so it holds a list of names it cannot reconcile
// against a family it does not know, and says nothing.
//
// That is the opportunity. Each document arrives carrying facts about sections
// other than its own, and the moment after reading one is the moment the user is
// most willing to fill those in, because the question is concrete: "your policy
// lists Sarah as a driver — is she in your household?" beats "add your family"
// by a distance.
//
// Everything here is comparison, not extraction. insurance_insured_parties and
// insurance_insured_assets have been populated since August and nothing has ever
// read them; matched_family_member_id and matched_asset_id exist and nothing
// populates them. This closes the first half — noticing the mismatch and asking.
// Recording the match is the follow-on.

import type { Asset, FamilyMember, InsurancePolicyExtraction } from './supabase';

export interface FollowUp {
  id: string;
  /**
   * The extracted row the question came from, so answering it can be recorded
   * against that row rather than inferred back from a name.
   */
  partyId?: string;
  /**
   * Carried to the section so the answer arrives already filled in. The type is
   * only meaningful where the destination has kinds to choose between; a person
   * is just a name.
   */
  prefill?: { name: string; type?: 'vehicle' | 'real_estate' };
  /** Where the answer gets recorded. */
  section: string;
  /** The question, in the user's terms. */
  question: string;
  /** What the document said, so the question is checkable. */
  evidence: string;
  actionLabel: string;
}

/** Names are compared loosely: documents shout, abbreviate and reverse them. */
function nameKey(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .sort()
    .join(' ');
}

/** True when two names plausibly refer to one person. */
function sameName(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = nameKey(a);
  const right = nameKey(b);
  if (!left || !right) return false;
  if (left === right) return true;
  // "Sarah Bailey" against "Sarah M Bailey": every word of the shorter appears.
  const lw = left.split(' ');
  const rw = right.split(' ');
  const [short, long] = lw.length <= rw.length ? [lw, rw] : [rw, lw];
  return short.length >= 2 && short.every((w) => long.includes(w));
}

/** Vehicles are matched on VIN where there is one, otherwise on year/make/model. */
function describesVehicle(assetName: string, year: number | null, make: string | null, model: string | null): boolean {
  const name = assetName.toLowerCase();
  const parts = [make, model].filter(Boolean).map((p) => String(p).toLowerCase());
  if (parts.length === 0) return false;
  const modelMatch = parts.every((p) => name.includes(p));
  return year ? modelMatch && name.includes(String(year)) : modelMatch;
}

// Roles that describe a person the household would recognise as one of its own.
// A lienholder is on the policy and is not a member of anybody's family.
const HOUSEHOLD_ROLES = ['named_insured', 'additional_insured', 'covered_person', 'insured', 'policy_owner'];

export function followUpsFromInsurance(
  extractions: InsurancePolicyExtraction[],
  members: FamilyMember[],
  assets: Asset[],
): FollowUp[] {
  const out: FollowUp[] = [];
  const seen = new Set<string>();

  for (const extraction of extractions) {
    const carrier = extraction.carrier ?? 'your policy';

    for (const party of extraction.insurance_insured_parties ?? []) {
      if (!party.name || !HOUSEHOLD_ROLES.includes(party.role)) continue;
      // Already settled, whether the answer was a new person or an existing one.
      if (party.matched_family_member_id
        && members.some((m) => m.id === party.matched_family_member_id)) continue;
      if (members.some((m) => sameName(m.name, party.name))) continue;
      const id = `party:${nameKey(party.name)}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        partyId: party.id,
        section: 'family',
        prefill: { name: party.name },
        question: `Is ${party.name} part of your household?`,
        evidence: `${carrier} lists them as ${party.relationship || party.role.replace(/_/g, ' ')}, `
          + 'and Command has nobody by that name on file.',
        actionLabel: 'Add to your household',
      });
    }

    for (const item of extraction.insurance_insured_assets ?? []) {
      if (item.asset_type !== 'vehicle') continue;
      const label = [item.year, item.make, item.model].filter(Boolean).join(' ')
        || item.description || 'a vehicle';
      if (assets.some((a) => describesVehicle(a.name, item.year, item.make, item.model))) continue;
      const id = `vehicle:${label.toLowerCase()}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        section: 'finances',
        prefill: { name: label, type: 'vehicle' },
        question: `Do you still own the ${label}?`,
        evidence: `${carrier} covers it, and it is not among the things Command has recorded that you own — `
          + 'so it is missing from your net worth.',
        actionLabel: 'Add this vehicle',
      });
    }

    for (const item of extraction.insurance_insured_assets ?? []) {
      if (item.asset_type !== 'property' || !item.address) continue;
      if (assets.some((a) => a.type === 'real_estate')) continue;
      const id = `property:${item.address.toLowerCase()}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        section: 'home',
        prefill: { name: item.address, type: 'real_estate' },
        question: 'Is this the home you live in?',
        evidence: `${carrier} covers ${item.address}, and Command has no property on file.`,
        actionLabel: 'Add your home',
      });
    }
  }

  return out;
}

/**
 * Everything a document raised that the household has not answered, most
 * answerable first — people before things, because a name is a question someone
 * can settle from memory and a VIN might mean finding paperwork.
 */
export function collectFollowUps(
  extractions: InsurancePolicyExtraction[],
  members: FamilyMember[],
  assets: Asset[],
  limit = 4,
): FollowUp[] {
  const order: Record<string, number> = { family: 0, home: 1, finances: 2 };
  return followUpsFromInsurance(extractions, members, assets)
    .sort((a, b) => (order[a.section] ?? 9) - (order[b.section] ?? 9))
    .slice(0, limit);
}
