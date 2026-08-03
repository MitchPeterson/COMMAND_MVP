import Anthropic from 'npm:@anthropic-ai/sdk@0.115.0';
import { createClient } from 'npm:@supabase/supabase-js@2.111.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const storageBucket = Deno.env.get('SUPABASE_STORAGE_BUCKET') ?? 'raw-uploads';
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
const anthropicModel = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-opus-5';
const anthropicEffort = Deno.env.get('ANTHROPIC_EFFORT') ?? 'medium';

if (!supabaseUrl || !supabaseServiceRole) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for this function.');
}

const admin = createClient(supabaseUrl, supabaseServiceRole);
const anthropic = anthropicApiKey ? new Anthropic({ apiKey: anthropicApiKey }) : null;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Anthropic caps requests at 32MB; stay well under once base64 inflates by ~4/3.
const MAX_FILE_BYTES = 18 * 1024 * 1024;

type DocumentType =
  | 'mortgage_statement'
  | 'insurance_dec_page'
  | 'credit_card_statement'
  | 'bank_statement'
  | 'tax_document'
  | 'paystub'
  | 'unknown';

const DOCUMENT_TYPES: DocumentType[] = [
  'mortgage_statement',
  'insurance_dec_page',
  'credit_card_statement',
  'bank_statement',
  'tax_document',
  'paystub',
  'unknown',
];

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/** Filename guess passed to the model as a hint — never used as a substitute for extraction. */
function filenameHint(fileName: string): DocumentType {
  const name = fileName.toLowerCase();
  if (name.includes('mortgage') || name.includes('loan')) return 'mortgage_statement';
  if (name.includes('insurance') || name.includes('dec page') || name.includes('declaration')) return 'insurance_dec_page';
  if (name.includes('credit') || name.includes('card')) return 'credit_card_statement';
  if (name.includes('bank') || name.includes('checking') || name.includes('savings')) return 'bank_statement';
  if (name.includes('w2') || name.includes('1099') || name.includes('tax')) return 'tax_document';
  if (name.includes('paystub') || name.includes('pay stub') || name.includes('pay slip')) return 'paystub';
  return 'unknown';
}

const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] };
const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] };

// Structured outputs requires every object to declare additionalProperties:false and list
// every property in `required`, so extracted_fields is a nullable superset across all doc
// types rather than a free-form object. Fields irrelevant to the detected type come back null.
const EXTRACTED_FIELDS = {
  lender: nullableString,
  interest_rate: nullableNumber,
  monthly_payment: nullableNumber,
  escrow_balance: nullableNumber,
  carrier: nullableString,
  policy_type: nullableString,
  policy_number: nullableString,
  coverage_amount: nullableNumber,
  premium: nullableNumber,
  renewal_date: nullableString,
  issuer: nullableString,
  card_name_last4: nullableString,
  credit_limit: nullableNumber,
  minimum_payment: nullableNumber,
  due_date: nullableString,
  apr: nullableNumber,
  institution: nullableString,
  account_type: nullableString,
  balance: nullableNumber,
  as_of_date: nullableString,
  tax_year: nullableString,
  amount: nullableNumber,
  employer: nullableString,
  pay_period: nullableString,
  gross_pay: nullableNumber,
  net_pay: nullableNumber,
  pay_frequency: nullableString,
  current_balance: nullableNumber,
  notes: nullableString,
} as const;

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    detected_type: { type: 'string', enum: DOCUMENT_TYPES },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    extracted_fields: {
      type: 'object',
      properties: EXTRACTED_FIELDS,
      required: Object.keys(EXTRACTED_FIELDS),
      additionalProperties: false,
    },
  },
  required: ['detected_type', 'confidence', 'extracted_fields'],
  additionalProperties: false,
};

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Build the user content for the document. PDFs and images go to Claude as native
 * document/image blocks — the previous implementation UTF-8 decoded raw bytes, which
 * produces garbage for the PDFs that make up most real uploads.
 */
function buildDocumentContent(bytes: Uint8Array, mimeType: string | null): unknown[] {
  const mime = (mimeType ?? '').toLowerCase();

  if (mime === 'application/pdf') {
    return [{
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: toBase64(bytes) },
    }];
  }

  if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mime)) {
    return [{
      type: 'image',
      source: { type: 'base64', media_type: mime, data: toBase64(bytes) },
    }];
  }

  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/\s+/g, ' ').trim();
  if (!text) return [];
  return [{ type: 'text', text: text.slice(0, 200_000) }];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }
  if (!anthropic) {
    console.error('ANTHROPIC_API_KEY is not configured for this function.');
    return json({ error: 'Extraction is not configured: ANTHROPIC_API_KEY is missing.' }, 503);
  }

  // Confirm the caller owns the document. This function holds the service-role key, so
  // without this check any authenticated user could extract any household's documents.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401);
  }
  const caller = createClient(supabaseUrl, supabaseServiceRole, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: 'Invalid or expired session' }, 401);
  }

  let body: { document_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const documentId = body?.document_id;
  if (typeof documentId !== 'string') {
    return json({ error: 'Missing document_id' }, 400);
  }

  const { data: document, error: documentError } = await admin
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (documentError || !document) {
    console.error('Failed to load document', documentError);
    return json({ error: 'Document not found' }, 404);
  }

  const { data: household } = await admin
    .from('households')
    .select('id')
    .eq('id', document.household_id)
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (!household) {
    // Same response as a missing document — don't confirm the id exists.
    return json({ error: 'Document not found' }, 404);
  }

  if (!document.file_path) {
    return json({ error: 'Document has no storage path' }, 400);
  }

  const failDocument = async (message: string, status: number) => {
    await admin.from('documents').update({ status: 'error' }).eq('id', document.id);
    console.error(message);
    return json({ error: message, document_id: document.id }, status);
  };

  const { data: signedUrlData, error: urlError } = await admin.storage
    .from(storageBucket)
    .createSignedUrl(document.file_path, 60);

  if (urlError || !signedUrlData?.signedUrl) {
    return await failDocument(`Unable to read document file: ${urlError?.message ?? 'no signed URL'}`, 500);
  }

  const fileResponse = await fetch(signedUrlData.signedUrl);
  if (!fileResponse.ok) {
    return await failDocument(`Unable to download document file: ${fileResponse.status}`, 500);
  }

  const bytes = new Uint8Array(await fileResponse.arrayBuffer());
  if (bytes.byteLength === 0) {
    return await failDocument('Document file is empty', 400);
  }
  if (bytes.byteLength > MAX_FILE_BYTES) {
    return await failDocument(
      `Document is ${(bytes.byteLength / 1024 / 1024).toFixed(1)}MB; limit is ${MAX_FILE_BYTES / 1024 / 1024}MB`,
      413,
    );
  }

  const documentContent = buildDocumentContent(bytes, document.mime_type);
  if (documentContent.length === 0) {
    return await failDocument('Document contained no readable content', 422);
  }

  const instructions = `Classify this household document and extract its key fields.

File name: ${document.name}
Filename-based guess (may be wrong — trust the document contents over this): ${filenameHint(document.name)}

Populate only the fields that genuinely appear in the document. Leave every other field null —
do not guess, infer, or carry a value over from a similar field. Return monetary amounts and
rates as plain numbers with no currency symbols, commas, or percent signs (an APR of 24.99% is
24.99). Dates should be ISO format (YYYY-MM-DD) where a full date is present.

Set confidence to "high" only when the document is clearly legible and the key fields are
unambiguous, "medium" when some fields required interpretation, and "low" when the document is
partly illegible or its type is uncertain.`;

  let extraction: { detected_type: DocumentType; confidence: string; extracted_fields: Record<string, unknown> };

  try {
    // Server-side fallback: if Claude's safety classifiers decline the request, the API
    // retries on the recommended fallback model in the same call instead of returning a refusal.
    const response = await anthropic.beta.messages.create({
      model: anthropicModel,
      max_tokens: 4096,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: anthropicEffort,
        format: { type: 'json_schema', schema: EXTRACTION_SCHEMA },
      },
      messages: [{ role: 'user', content: [...documentContent, { type: 'text', text: instructions }] }],
      // deno-lint-ignore no-explicit-any
    } as any);

    if (response.stop_reason === 'refusal') {
      return await failDocument(
        `Claude declined to process this document (${response.stop_details?.category ?? 'unspecified'})`,
        422,
      );
    }
    if (response.stop_reason === 'max_tokens') {
      return await failDocument('Extraction was truncated before completing', 502);
    }

    // Thinking is on by default on Opus 5, so content holds thinking blocks before the text block.
    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text' || !textBlock.text) {
      return await failDocument('Claude returned no extraction content', 502);
    }
    extraction = JSON.parse(textBlock.text);
  } catch (error) {
    // Never swallow this. A failed model call must surface, not silently downgrade to a guess.
    return await failDocument(`Claude extraction failed: ${error instanceof Error ? error.message : String(error)}`, 502);
  }

  const detectedType: DocumentType = DOCUMENT_TYPES.includes(extraction.detected_type)
    ? extraction.detected_type
    : 'unknown';
  const confidence = ['high', 'medium', 'low'].includes(extraction.confidence) ? extraction.confidence : 'low';

  // Drop the nulls so extracted_fields holds only what was actually found.
  const extractedFields = Object.fromEntries(
    Object.entries(extraction.extracted_fields ?? {}).filter(([, value]) => value !== null && value !== ''),
  );

  const { error: insertError } = await admin.from('document_extractions').insert([
    {
      household_id: document.household_id,
      document_id: document.id,
      detected_type: detectedType,
      confidence,
      extracted_fields: { ...extractedFields, source: document.name },
      status: 'pending_review',
    },
  ]);

  if (insertError) {
    return await failDocument(`Unable to store extraction result: ${insertError.message}`, 500);
  }

  const { error: updateError } = await admin
    .from('documents')
    .update({ status: 'processed' })
    .eq('id', document.id);

  if (updateError) {
    console.error('Failed to update document status', updateError);
  }

  return json(
    { document_id: document.id, detected_type: detectedType, confidence, fields_found: Object.keys(extractedFields).length },
    200,
  );
});
