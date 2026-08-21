// Turn what someone typed into something an administrator can act on.
//
// A person reporting a bug describes what they saw; a person with an idea
// describes the outcome they want. Neither writes a title that sorts well in a
// backlog, and neither should have to. This rewrites the ticket for clarity and
// categorizes it — and keeps the original, because the refined version is
// Command's words and the original is the user's, and losing theirs would mean
// losing the only account of what actually happened.
//
// It never invents detail. If the report is too thin to categorize, it says so
// rather than guessing a severity, because a wrongly-severe ticket is worse
// than an uncategorized one.

import Anthropic from 'npm:@anthropic-ai/sdk@0.115.0';

const MODEL = Deno.env.get('ANTHROPIC_FEEDBACK_MODEL') ?? 'claude-haiku-4-5-20251001';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SCHEMA = {
  type: 'object',
  properties: {
    kind: {
      type: 'string',
      enum: ['idea', 'defect', 'question'],
      description: 'defect if something behaved wrongly, idea for a request or enhancement, question otherwise.',
    },
    title: {
      type: 'string',
      description:
        'One line, under 80 characters, stating the problem or the request. '
        + 'Written so it reads well in a backlog list. No trailing period.',
    },
    body: {
      type: 'string',
      description:
        'A short rewrite of the report. For a defect use the headings What happened, '
        + 'What was expected, and Where. For an idea use What is being asked for and Why it '
        + 'matters. Use only what the reporter said or what the supplied context states — '
        + 'never invent steps, versions or screens.',
    },
    category: {
      type: 'string',
      description:
        'The area of the product, chosen from: Insurance, Legal, Credit, Home, Finances, '
        + 'Taxes, Family, Documents, Reports, Dashboard, Onboarding, Account, Performance, '
        + 'Other. One value.',
    },
    severity: {
      type: 'string',
      enum: ['low', 'medium', 'high', 'critical'],
      description:
        'critical only for data loss, a security concern, or the app being unusable. '
        + 'high for a broken workflow with no workaround. medium for a wrong or confusing '
        + 'result. low for cosmetic issues and most ideas.',
    },
    clarifying_question: {
      type: 'string',
      description:
        'If the report is too thin to act on, the single most useful question to ask back. '
        + 'Empty string when the report is already actionable.',
    },
  },
  required: ['kind', 'title', 'body', 'category', 'severity', 'clarifying_question'],
  additionalProperties: false,
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { title, body, kind, view, appVersion, hasScreenshot } = await req.json();
    if (!title && !body) {
      return new Response(JSON.stringify({ error: 'Nothing to refine.' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set.');
    const anthropic = new Anthropic({ apiKey });

    const context = [
      view ? `Screen they were on: ${view}` : null,
      appVersion ? `App version: ${appVersion}` : null,
      hasScreenshot ? 'A screenshot is attached to the ticket.' : null,
      kind ? `They filed it as: ${kind}` : null,
    ].filter(Boolean).join('\n');

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      // `schema`, not `json_schema` — the shape extract-document already uses.
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      system:
        'You clean up product feedback for a household finance app called Command so a small '
        + 'team can triage it. Rewrite for clarity and categorize. Use only what the reporter '
        + 'wrote and the context supplied — never invent reproduction steps, screens, versions '
        + 'or causes. If the report is too thin to act on, say so in clarifying_question and '
        + 'keep the severity low rather than guessing. US English.',
      messages: [{
        role: 'user',
        content: `Report title: ${title || '(none given)'}\n\n`
          + `Report body:\n${body || '(none given)'}\n\n`
          + (context ? `Context:\n${context}` : ''),
      }],
    });

    // A thinking block carries no text, so the narrowing has to happen in the
    // filter rather than be asserted in the map.
    const text = message.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('');

    return new Response(text, {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('refine-feedback failed:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Refinement failed.' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
