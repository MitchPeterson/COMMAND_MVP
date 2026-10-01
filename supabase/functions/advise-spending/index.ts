// Recommendations, from aggregates only.
//
// The privacy contract is enforced structurally rather than promised, and it
// is worth being exact about how, because the obvious reading is wrong.
//
// The caller sends the aggregate -- every figure in it is already computed in
// the browser by the same modules that draw the page, and recomputing all of
// that in Deno would be a second implementation to keep in step. What this
// function does is **rebuild the payload field by field** before anything is
// sent on. Each field is read by name and coerced to its type; anything the
// caller added that is not in that list is dropped on the floor. So a future
// caller cannot smuggle a transaction through by attaching it to the request,
// even one written by someone who never read this comment.
//
// What that list allows out: totals by period, totals by category, totals by
// source, each source's loaded date range, the recurring list with its
// cadences, and the household's own keep/cut decisions. A recurring item
// carries a merchant name by necessity -- "cancel the $22.99 one" is not
// advice -- truncated to 60 characters, and that is the only merchant text in
// the payload. No account numbers, no balances, no individual charge dates, no
// names of people.
//
// What the model is not asked to do: arithmetic. Every figure it is given is
// already computed, and the total impact is summed in TypeScript afterwards.
// A model asked to add up eight numbers will sometimes get it wrong, and a
// wrong total in a list of savings is worse than no total.

import Anthropic from 'npm:@anthropic-ai/sdk@0.115.0';
import { createClient } from 'npm:@supabase/supabase-js@2.111.0';
import { recordUsage, type UsageLine } from '../_shared/usage.ts';

const MODEL = Deno.env.get('ANTHROPIC_ADVICE_MODEL') ?? 'claude-sonnet-5';
const EFFORT = Deno.env.get('ANTHROPIC_ADVICE_EFFORT') ?? 'medium';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TAGS = ['cut', 'save', 'review', 'data'] as const;

const SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tag: { type: 'string', enum: TAGS, description: 'cut to stop paying something, save to pay less for the same thing, review to look at something, data to load something missing' },
          title: { type: 'string', description: 'One short line naming the specific thing and its figure.' },
          body: { type: 'string', description: 'Two sentences at most. What was observed, and what to do.' },
          impact: { type: 'number', description: 'Dollars per month this would change, as a positive number. 0 when it cannot be estimated.' },
        },
        required: ['tag', 'title', 'body', 'impact'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

const INSTRUCTIONS = `You are reading one household's own spending figures and writing recommendations they can act on.

Write 8 to 10 items. Every one must name a real thing from the figures below and a real number from them. "Review your subscriptions" is useless; "Netflix went from $15.49 to $22.99 in August, $90 a year" is not.

Rules:
- Never invent a figure. Every number you write must appear in the data below.
- Never claim a subscription is unused. You cannot see usage, only charges.
- Never give legal, tax or investment advice. Report what the figures show.
- A fixed commitment — a mortgage, insurance, utilities, tax — cannot be cancelled. It can sometimes be renegotiated, and that is a 'review', not a 'cut'.
- If a source has gaps in its loaded range, say so as a 'data' item: a total built on a partial month is the most misleading thing on the page.
- Respect decisions already made. If the household marked something 'keep', do not tell them to cut it.
- impact is dollars per month, positive, and 0 when you genuinely cannot estimate it. Do not guess a number to fill the field.

US English. Plain sentences. No preamble.`;

interface Payload {
  periods: Array<{ period: string; income: number; expenses: number; savings: number; net: number; partial: boolean }>;
  categories: Array<{ category: string; perMonth: number; share: number; changeOnPrior: number | null }>;
  sources: Array<{ name: string; kind: string; loadedFrom: string | null; loadedTo: string | null; gaps: number }>;
  recurring: Array<{ merchant: string; cadence: string; perMonth: number; perYear: number; purpose: string; priceRose: string | null; decision: string | null }>;
  reviewQueue: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) return json({ error: 'Not signed in.' }, 401);

    // Read once: the request body is a stream, and a second read returns
    // nothing rather than failing loudly.
    const payload = (await req.json().catch(() => ({}))) as { household_id?: string; basis?: Payload };
    const householdId = payload.household_id;
    if (!householdId) return json({ error: 'Missing household_id' }, 400);

    // Ownership is proven with the caller's own token, under RLS, before
    // anything is read with the service role.
    const asCaller = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: household } = await asCaller
      .from('households').select('id').eq('id', householdId).maybeSingle();
    if (!household) return json({ error: 'That household is not yours.' }, 403);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // ── Rebuild the payload, field by field ──────────────────────────────────
    // Nothing from `given` reaches the model except by being named below.
    const given = payload.basis;
    if (!given) return json({ error: 'Nothing to advise on.' }, 400);

    const basis: Payload = {
      periods: (given.periods ?? []).slice(0, 18).map((p) => ({
        period: String(p.period ?? ''),
        income: Number(p.income) || 0,
        expenses: Number(p.expenses) || 0,
        savings: Number(p.savings) || 0,
        net: Number(p.net) || 0,
        partial: Boolean(p.partial),
      })),
      categories: (given.categories ?? []).slice(0, 25).map((c) => ({
        category: String(c.category ?? ''),
        perMonth: Number(c.perMonth) || 0,
        share: Number(c.share) || 0,
        changeOnPrior: c.changeOnPrior == null ? null : Number(c.changeOnPrior) || 0,
      })),
      sources: (given.sources ?? []).slice(0, 20).map((s) => ({
        name: String(s.name ?? ''),
        kind: String(s.kind ?? ''),
        loadedFrom: s.loadedFrom ? String(s.loadedFrom) : null,
        loadedTo: s.loadedTo ? String(s.loadedTo) : null,
        gaps: Number(s.gaps) || 0,
      })),
      recurring: (given.recurring ?? []).slice(0, 40).map((r) => ({
        merchant: String(r.merchant ?? '').slice(0, 60),
        cadence: String(r.cadence ?? ''),
        perMonth: Number(r.perMonth) || 0,
        perYear: Number(r.perYear) || 0,
        purpose: String(r.purpose ?? ''),
        priceRose: r.priceRose ? String(r.priceRose).slice(0, 60) : null,
        decision: r.decision ? String(r.decision) : null,
      })),
      reviewQueue: Number(given.reviewQueue) || 0,
    };

    if (basis.periods.length === 0 && basis.recurring.length === 0) {
      return json({ error: 'There is not enough on file yet to advise on.' }, 400);
    }

    // ── Ask ──────────────────────────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' });
    const started = Date.now();

    const request: Record<string, unknown> = {
      model: MODEL,
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `${INSTRUCTIONS}\n\nThe household's figures:\n\n${JSON.stringify(basis, null, 1)}`,
      }],
      output_config: { format: { type: 'json_schema', schema: SCHEMA }, effort: EFFORT },
    };

    const stream = anthropic.beta.messages.stream(request as never);
    const message = await stream.finalMessage();

    const line: UsageLine = {
      label: 'spending advice',
      model: MODEL,
      input: message.usage?.input_tokens ?? 0,
      output: message.usage?.output_tokens ?? 0,
      cache_write: message.usage?.cache_creation_input_tokens ?? 0,
      cache_read: message.usage?.cache_read_input_tokens ?? 0,
    };
    await recordUsage({ householdId }, line, Date.now() - started, message.stop_reason !== 'refusal');

    if (message.stop_reason === 'refusal') return json({ error: 'The model declined to answer.' }, 502);
    if (message.stop_reason === 'max_tokens') return json({ error: 'The answer was cut short. Try again.' }, 502);

    const text = message.content.find((block: { type: string }) => block.type === 'text');
    const parsed = JSON.parse((text as { text: string })?.text ?? '{}');

    // ── Validate before it lands ─────────────────────────────────────────────
    // A tag outside the four is dropped rather than shown. The total is summed
    // here rather than taken from the model: the figures are already in hand,
    // and a wrong total in a list of savings is worse than no total.
    const items = (Array.isArray(parsed.items) ? parsed.items : [])
      .filter((i: { tag?: string; title?: string; body?: string }) =>
        TAGS.includes(i?.tag as typeof TAGS[number]) && i?.title?.trim() && i?.body?.trim())
      .slice(0, 10)
      .map((i: { tag: string; title: string; body: string; impact?: unknown }) => ({
        tag: i.tag,
        title: String(i.title).trim().slice(0, 160),
        body: String(i.body).trim().slice(0, 600),
        impact: Math.max(0, Number(i.impact) || 0),
      }));

    if (items.length === 0) return json({ error: 'Nothing specific enough came back. Try again.' }, 502);

    const totalImpact = items.reduce((sum: number, i: { impact: number }) => sum + i.impact, 0);
    const period = basis.periods.find((p) => !p.partial)?.period ?? basis.periods[0]?.period ?? null;

    const { data: saved, error: saveError } = await admin
      .from('spending_advice')
      .insert({
        household_id: householdId,
        as_of: new Date().toISOString().slice(0, 10),
        period,
        items,
        total_impact: totalImpact,
        model: MODEL,
        basis,
      })
      .select('*')
      .single();

    if (saveError) return json({ error: `Could not save that: ${saveError.message}` }, 500);
    return json(saved);
  } catch (err) {
    console.error('advise-spending failed:', err);
    return json({ error: err instanceof Error ? err.message : 'Something went wrong.' }, 500);
  }
});
