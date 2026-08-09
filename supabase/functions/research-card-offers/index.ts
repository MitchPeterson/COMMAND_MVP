import Anthropic from 'npm:@anthropic-ai/sdk@0.115.0';
import { createClient } from 'npm:@supabase/supabase-js@2.111.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
const anthropicModel = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-opus-5';

if (!supabaseUrl || !supabaseServiceRole) {
  console.error('Supabase environment is not configured for this function.');
}

const admin = createClient(supabaseUrl!, supabaseServiceRole!);
const anthropic = anthropicApiKey ? new Anthropic({ apiKey: anthropicApiKey }) : null;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─────────────────────────────────────────────────────────────
// Card offer research.
//
// The only path in Command where a material figure originates outside the
// household's own documents. Three rules hold it together:
//
//   1. What goes out is category totals and card product names. No balances, no
//      account numbers, no names, no last four. The search does not need them
//      and they are not ours to broadcast.
//
//   2. What comes back is a lead, not a fact. Every candidate carries the URL it
//      came from and the moment it was read, and lands as 'unverified'. Issuers
//      change offers without notice and aggregator pages go stale silently.
//
//   3. Money is our arithmetic, never the model's. The search supplies earn
//      rates; the dollar figure is those rates against the household's own
//      category spend, computed here, with the basis recorded so it can be
//      argued with.
// ─────────────────────────────────────────────────────────────

const CANDIDATE_SCHEMA = {
  type: 'object',
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          issuer: { type: 'string' },
          card_name: { type: 'string' },
          annual_fee: { type: 'string' },
          earn_rates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string' },
                rate: { type: 'string' },
                unit: { type: 'string' },
                note: { type: 'string' },
              },
              required: ['category', 'rate', 'unit', 'note'],
              additionalProperties: false,
            },
          },
          signup_bonus: { type: 'string' },
          signup_requirement: { type: 'string' },
          intro_apr: { type: 'string' },
          notable_benefits: { type: 'string' },
          credit_needed: { type: 'string' },
          source_url: { type: 'string' },
          source_title: { type: 'string' },
          is_issuer_source: { type: 'boolean' },
          confidence: { type: 'number' },
        },
        required: ['issuer', 'card_name', 'annual_fee', 'earn_rates', 'signup_bonus',
          'signup_requirement', 'intro_apr', 'notable_benefits', 'credit_needed',
          'source_url', 'source_title', 'is_issuer_source', 'confidence'],
        additionalProperties: false,
      },
    },
    summary: { type: 'string' },
  },
  required: ['candidates', 'summary'],
  additionalProperties: false,
};

const RESEARCH_RULES = `
Ground rules, in priority order:

1. Every card you report must carry the URL you read it on. A card without a
   source does not go in the list. Prefer the issuer's own page over an
   aggregator or review site, and set is_issuer_source accordingly.
2. Report only what the page states. Do not fill in an earn rate, a fee, or a
   bonus from memory, and do not average conflicting figures — take the issuer's
   page where sources disagree, and say so in the note.
3. Offers change without notice and pages go stale. Where a page does not show
   an offer clearly, leave the field empty rather than approximating it.
4. Do not compute what a card is worth to this household. You are given category
   spend for context so you can pick relevant cards; the arithmetic is done
   downstream from the household's own statements.
5. Rates are plain: "3" with unit "x" for points, "1.5" with unit "%" for cash
   back. Fees are digits only: "95". Empty string where a value is not shown.
6. confidence is 0 to 1 and reflects how clearly the page stated the terms, not
   how good the card is.
7. No advice about whether to apply, and no credit-approval predictions. Report
   what the cards offer.
`.trim();

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[^0-9.\-]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  return raw ? raw : null;
}

/**
 * What a card would have returned on this household's actual spend.
 *
 * A rate of "3x" is treated as 3 points per dollar at one cent a point — the
 * common floor for cash redemption, stated in the basis rather than hidden in
 * the arithmetic. Categories the card does not name fall to its "other" rate if
 * it has one, and are otherwise ignored rather than assumed to earn nothing.
 */
// deno-lint-ignore no-explicit-any
function estimateAnnualValue(candidate: any, spend: Record<string, number>, months: number) {
  const rates: Array<{ category: string; rate: number; unit: string }> = [];
  for (const entry of candidate.earn_rates ?? []) {
    const rate = num(entry.rate);
    if (rate === null) continue;
    rates.push({
      category: String(entry.category ?? '').toLowerCase().trim(),
      rate,
      unit: String(entry.unit ?? 'x').toLowerCase().includes('%') ? '%' : 'x',
    });
  }
  if (rates.length === 0) return { value: null, basis: { reason: 'No usable earn rates were found.' } };

  const baseline = rates.find((r) => ['other', 'everything else', 'all other', 'base'].includes(r.category));
  const perCategory: Record<string, number> = {};
  let total = 0;

  for (const [category, amount] of Object.entries(spend)) {
    const match =
      rates.find((r) => r.category === category) ??
      rates.find((r) => r.category.includes(category) || category.includes(r.category)) ??
      baseline;
    if (!match) continue;
    // 3x at one cent a point and 3% cash back come to the same return.
    const returnRate = match.unit === '%' ? match.rate / 100 : match.rate * 0.01;
    const earned = amount * returnRate;
    perCategory[category] = Math.round(earned * 100) / 100;
    total += earned;
  }

  const annualized = months > 0 ? total * (12 / months) : total;
  const fee = num(candidate.annual_fee) ?? 0;

  return {
    value: Math.round(annualized - fee),
    basis: {
      method: 'Household category spend from confirmed statements, at the rates found, less the annual fee.',
      point_value_usd: 0.01,
      months_of_spend: months,
      annual_fee: fee,
      gross_annual_rewards: Math.round(annualized),
      per_category: perCategory,
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!anthropic) return json({ error: 'Research is not configured: ANTHROPIC_API_KEY is missing.' }, 503);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  const caller = createClient(supabaseUrl!, supabaseServiceRole!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData?.user) return json({ error: 'Invalid or expired session' }, 401);

  let body: { household_id?: unknown; research_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  // ── Stage two: normalize an existing search into candidates ────────────────
  //
  // The two passes are separate invocations rather than one call, because a
  // search pass plus a structuring pass plus five web fetches exceeds the edge
  // wall clock — measured at 150.5s before this split. Each stage now finishes
  // in well under a minute, and the research row carries the state between them.
  if (typeof body?.research_id === 'string') {
    return await structureStage(body.research_id, userData.user.id);
  }

  const householdId = body?.household_id;
  if (typeof householdId !== 'string') return json({ error: 'Missing household_id or research_id' }, 400);

  const { data: household } = await admin
    .from('households').select('id').eq('id', householdId).eq('user_id', userData.user.id).maybeSingle();
  if (!household) return json({ error: 'Household not found' }, 404);

  // ── Build the profile, server-side ─────────────────────────────────────────
  // Only what the search needs. Categories and totals; card product names so it
  // does not suggest a card already held. Nothing identifying leaves here.
  const { data: statements } = await admin
    .from('credit_statements')
    .select('id, review_status')
    .eq('household_id', householdId)
    .in('review_status', ['confirmed', 'partially_confirmed']);

  const statementIds = (statements ?? []).map((s) => s.id);
  if (statementIds.length === 0) {
    return json({ error: 'Confirm at least one statement before researching offers.' }, 400);
  }

  const { data: transactions } = await admin
    .from('credit_transactions')
    .select('category, amount, direction')
    .in('statement_id', statementIds);

  const spend: Record<string, number> = {};
  for (const tx of transactions ?? []) {
    if (tx.direction !== 'charge' || tx.amount == null) continue;
    const key = String(tx.category ?? 'uncategorized').toLowerCase();
    spend[key] = (spend[key] ?? 0) + Number(tx.amount);
  }
  for (const key of Object.keys(spend)) spend[key] = Math.round(spend[key]);

  const { data: cards } = await admin
    .from('credit_cards').select('card_name, issuer, annual_fee').eq('household_id', householdId);
  const cardsHeld = (cards ?? []).map((c) => ({
    card: c.card_name, issuer: c.issuer, annual_fee: c.annual_fee,
  }));

  const months = statementIds.length;

  const { data: research, error: researchError } = await admin
    .from('card_offer_research')
    .insert([{
      household_id: householdId,
      status: 'running',
      spend_profile: spend,
      cards_held: cardsHeld,
      model: anthropicModel,
    }])
    .select('id')
    .single();
  if (researchError || !research) {
    return json({ error: `Could not start the research: ${researchError?.message ?? 'no row'}` }, 500);
  }

  const fail = async (message: string, status: number) => {
    await admin.from('card_offer_research')
      .update({ status: 'failed', failure_reason: message, completed_at: new Date().toISOString() })
      .eq('id', research.id);
    console.error(message);
    return json({ error: message, research_id: research.id }, status);
  };

  const spendLines = Object.entries(spend)
    .sort((a, b) => b[1] - a[1])
    .map(([category, total]) => `  ${category}: $${total.toLocaleString()} over ${months} statement period(s)`)
    .join('\n');
  const heldLines = cardsHeld.map((c) => `  ${c.issuer ?? 'unknown issuer'} — ${c.card}`).join('\n') || '  none recorded';

  try {
    // ── Pass 1: search ───────────────────────────────────────────────────────
    // Tools and a JSON schema are not combined here. The search runs freeform so
    // the model can follow pages and quote them, and a second pass normalizes
    // what it found — a structured answer written while browsing is where
    // half-read pages turn into confident fields.
    const searchStream = anthropic.beta.messages.stream({
      model: anthropicModel,
      max_tokens: 12000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      tools: [
        { type: 'web_search_20260209', name: 'web_search', max_uses: 6 },
        // Search locates the issuer's page; fetch is what reads the terms off
        // it. Without this the model burned its search budget re-searching for
        // detail it could not open, and reported the shortfall itself.
        { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 6 },
      ],
      messages: [{
        role: 'user',
        content:
          `Research credit cards that would suit this household's spending. Search the web for current ` +
          `terms and read the issuer's own page wherever you can.\n\n` +
          `Annual spending by category:\n${spendLines}\n\n` +
          `Cards already held (do not propose these again):\n${heldLines}\n\n` +
          `${RESEARCH_RULES}\n\n` +
          `Search to find candidates, then open each card's own page to read its terms — a search ` +
          `snippet is rarely enough to state an earn rate accurately. Budget your searches: you have a ` +
          `limited number, so search broadly first and spend the rest opening pages.\n\n` +
          `Find three or four cards that fit this spending pattern. For each, report the issuer, ` +
          `the card name, the annual fee, the earn rate for every category it advertises, any current ` +
          `sign-up bonus and what it requires, any introductory APR, notable benefits, and the credit ` +
          `standing it asks for — with the URL you read each one on and the date the page showed. ` +
          `Quote the page rather than summarizing from memory.`,
      }],
    });
    const searchMessage = await searchStream.finalMessage();

    const searchText = searchMessage.content
      // deno-lint-ignore no-explicit-any
      .filter((block: any) => block.type === 'text')
      // deno-lint-ignore no-explicit-any
      .map((block: any) => block.text)
      .join('\n');
    // deno-lint-ignore no-explicit-any
    const searchesRun = searchMessage.content.filter(
      (b: any) => b.type === 'server_tool_use' && b.name === 'web_search',
    ).length;

    if (!searchText.trim()) return await fail('The search returned nothing to work from.', 502);

    // Park the raw findings on the research row and hand back. The caller
    // invokes again with research_id to run the structuring pass.
    await admin.from('card_offer_research')
      .update({ search_summary: searchText, searches_run: searchesRun })
      .eq('id', research.id);

    return json({
      research_id: research.id,
      stage: 'searched',
      searches_run: searchesRun,
    }, 200);
  } catch (error) {
    return await fail(
      `Research failed: ${error instanceof Error ? error.message : String(error)}`, 502,
    );
  }
});

/**
 * Stage two. Reads the parked findings, normalizes them against the schema, and
 * writes the candidates. No tools and no browsing — this pass only reorganizes
 * text that stage one already gathered, which is why it is fast and why a
 * half-read page cannot turn into a confident field here.
 */
async function structureStage(researchId: string, userId: string): Promise<Response> {
  const { data: research } = await admin
    .from('card_offer_research').select('*').eq('id', researchId).maybeSingle();
  if (!research) return json({ error: 'Research not found' }, 404);

  const { data: household } = await admin
    .from('households').select('id').eq('id', research.household_id).eq('user_id', userId).maybeSingle();
  if (!household) return json({ error: 'Research not found' }, 404);

  if (!anthropic) return json({ error: 'Research is not configured: ANTHROPIC_API_KEY is missing.' }, 503);

  const searchText: string = research.search_summary ?? '';
  if (!searchText.trim()) return json({ error: 'That research run has no findings to normalize.' }, 400);

  const spend: Record<string, number> = research.spend_profile ?? {};
  const { data: periods } = await admin
    .from('credit_statements')
    .select('id')
    .eq('household_id', research.household_id)
    .in('review_status', ['confirmed', 'partially_confirmed']);
  const months = Math.max((periods ?? []).length, 1);

  const failStage = async (message: string, status: number) => {
    await admin.from('card_offer_research')
      .update({ status: 'failed', failure_reason: message, completed_at: new Date().toISOString() })
      .eq('id', researchId);
    console.error(message);
    return json({ error: message, research_id: researchId }, status);
  };

  try {
    // ── Pass 2: structure ────────────────────────────────────────────────────
    const structureStream = anthropic.beta.messages.stream({
      model: anthropicModel,
      max_tokens: 12000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: CANDIDATE_SCHEMA } },
      messages: [{
        role: 'user',
        content:
          `Normalize these research findings into the schema. Carry every source URL across exactly as ` +
          `written — a card whose source you cannot state is dropped, not guessed at.\n\n` +
          `${RESEARCH_RULES}\n\nFindings:\n\n${searchText}`,
      }],
    });
    const structured = await structureStream.finalMessage();
    // deno-lint-ignore no-explicit-any
    const payloadBlock = structured.content.find((b: any) => b.type === 'text');
    // deno-lint-ignore no-explicit-any
    const parsed = JSON.parse((payloadBlock as any)?.text ?? '{}');

    // ── Persist ──────────────────────────────────────────────────────────────
    // deno-lint-ignore no-explicit-any
    const rows: any[] = [];
    for (const candidate of parsed.candidates ?? []) {
      const sourceUrl = text(candidate.source_url);
      // The schema cannot enforce a real URL, so the check lives here: a
      // candidate without a source is dropped rather than shown unattributed.
      if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) continue;
      const issuer = text(candidate.issuer);
      const cardName = text(candidate.card_name);
      if (!issuer || !cardName) continue;

      const estimate = estimateAnnualValue(candidate, spend, months);
      rows.push({
        research_id: researchId,
        household_id: research.household_id,
        issuer,
        card_name: cardName,
        annual_fee: num(candidate.annual_fee),
        earn_rates: candidate.earn_rates ?? [],
        signup_bonus: text(candidate.signup_bonus),
        signup_requirement: text(candidate.signup_requirement),
        intro_apr: text(candidate.intro_apr),
        notable_benefits: text(candidate.notable_benefits),
        credit_needed: text(candidate.credit_needed),
        estimated_annual_value: estimate.value,
        value_basis: estimate.basis,
        source_url: sourceUrl,
        source_title: text(candidate.source_title),
        is_issuer_source: candidate.is_issuer_source === true,
        retrieved_at: new Date().toISOString(),
        confidence: typeof candidate.confidence === 'number'
          ? Math.min(Math.max(candidate.confidence, 0), 1)
          : null,
        verification_state: 'unverified',
      });
    }

    if (rows.length > 0) {
      const { error: insertError } = await admin.from('card_offer_candidates').insert(rows);
      if (insertError) return await failStage(`Could not save the findings: ${insertError.message}`, 500);
    }

    await admin.from('card_offer_research').update({
      status: 'complete',
      search_summary: text(parsed.summary),
      completed_at: new Date().toISOString(),
    }).eq('id', researchId);

    return json({
      research_id: researchId,
      stage: 'complete',
      candidates: rows.length,
      dropped_without_source: (parsed.candidates?.length ?? 0) - rows.length,
    }, 200);
  } catch (error) {
    return await failStage(
      `Could not normalize the findings: ${error instanceof Error ? error.message : String(error)}`, 502,
    );
  }
}
