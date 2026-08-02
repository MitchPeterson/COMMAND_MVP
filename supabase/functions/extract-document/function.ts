import { serve } from 'https://deno.land/std@0.201.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0?target=deno';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL');
const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const storageBucket = Deno.env.get('VITE_SUPABASE_STORAGE_BUCKET') ?? 'raw-uploads';
const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
const claudeModel = Deno.env.get('CLAUDE_MODEL') ?? 'claude-3.5-sonic';

if (!supabaseUrl || !supabaseServiceRole) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for this function.');
}

const supabase = createClient(supabaseUrl, supabaseServiceRole);

type DocumentType =
  | 'mortgage_statement'
  | 'insurance_dec_page'
  | 'credit_card_statement'
  | 'bank_statement'
  | 'tax_document'
  | 'paystub'
  | 'unknown';

type ExtractionConfidence = 'high' | 'medium' | 'low';

function normalizeText(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function classifyByFilename(fileName: string): DocumentType {
  const name = fileName.toLowerCase();

  if (name.includes('mortgage') || name.includes('loan')) return 'mortgage_statement';
  if (name.includes('insurance') || name.includes('dec page') || name.includes('declaration')) return 'insurance_dec_page';
  if (name.includes('credit') || name.includes('card') || name.includes('statement')) return 'credit_card_statement';
  if (name.includes('bank') || name.includes('checking') || name.includes('savings')) return 'bank_statement';
  if (name.includes('w2') || name.includes('1099') || name.includes('tax')) return 'tax_document';
  if (name.includes('paystub') || name.includes('pay stubs') || name.includes('pay slip')) return 'paystub';
  return 'unknown';
}

function defaultExtraction(fileName: string, docType: DocumentType): Record<string, unknown> {
  const base = { source: fileName };

  switch (docType) {
    case 'mortgage_statement':
      return { lender: fileName, current_balance: null, interest_rate: null, monthly_payment: null, escrow_balance: null, ...base };
    case 'insurance_dec_page':
      return { carrier: fileName, policy_type: null, policy_number: null, coverage_amount: null, premium: null, renewal_date: null, ...base };
    case 'credit_card_statement':
      return { issuer: fileName, card_name_last4: null, current_balance: null, credit_limit: null, minimum_payment: null, due_date: null, apr: null, ...base };
    case 'bank_statement':
      return { institution: fileName, account_type: null, balance: null, as_of_date: null, ...base };
    case 'tax_document':
      return { doc_type: 'tax_document', tax_year: null, source: fileName, amount: null, ...base };
    case 'paystub':
      return { employer: fileName, pay_period: null, gross_pay: null, net_pay: null, pay_frequency: null, ...base };
    case 'unknown':
    default:
      return { message: `Uploaded file ${fileName} could not be classified automatically.`, ...base };
  }
}

async function callClaude(text: string, fileName: string): Promise<{ detected_type: DocumentType; confidence: ExtractionConfidence; extracted_fields: Record<string, unknown> } | null> {
  if (!claudeApiKey) return null;

  const prompt = `You are a document extraction assistant. Classify the provided document and extract structured fields.

Document name: ${fileName}

Content:
${text}

Return only valid JSON with these keys:
- detected_type: one of mortgage_statement, insurance_dec_page, credit_card_statement, bank_statement, tax_document, paystub, unknown
- confidence: one of high, medium, low
- extracted_fields: a JSON object with the most relevant fields for the detected type.

Do not include any extra text outside of the JSON object.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${claudeApiKey}`,
      },
      body: JSON.stringify({
        model: claudeModel,
        prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
        max_tokens_to_sample: 800,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error('Claude response failed', response.status, await response.text());
      return null;
    }

    const result = await response.json();
    const textOutput = result?.completion ?? result?.completion?.[0]?.text ?? '';
    const jsonText = textOutput.trim().replace(/^\s*Assistant:\s*/, '');
    const parsed = JSON.parse(jsonText);

    return {
      detected_type: parsed.detected_type as DocumentType,
      confidence: parsed.confidence as ExtractionConfidence,
      extracted_fields: parsed.extracted_fields as Record<string, unknown>,
    };
  } catch (error) {
    console.error('Claude extraction failed', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const documentId = body?.document_id;
  if (typeof documentId !== 'string') {
    return new Response('Missing document_id', { status: 400 });
  }

  const { data: document, error: documentError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (documentError || !document) {
    console.error('Failed to load document', documentError);
    return new Response('Document not found', { status: 404 });
  }

  if (!document.file_path) {
    return new Response('Document has no storage path', { status: 400 });
  }

  const { data: signedUrlData, error: urlError } = await supabase.storage
    .from(storageBucket)
    .createSignedUrl(document.file_path, 60);

  if (urlError || !signedUrlData?.signedUrl) {
    console.error('Failed to create signed URL', urlError);
    return new Response('Unable to read document file', { status: 500 });
  }

  const fileResponse = await fetch(signedUrlData.signedUrl);
  if (!fileResponse.ok) {
    console.error('Failed to fetch document file', fileResponse.statusText);
    return new Response('Unable to download document file', { status: 500 });
  }

  const bytes = new Uint8Array(await fileResponse.arrayBuffer());
  const text = normalizeText(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
  const classification = classifyByFilename(document.name);
  let extracted = defaultExtraction(document.name, classification);
  let confidence: ExtractionConfidence = 'low';
  let detectedType: DocumentType = classification;

  if (claudeApiKey && text.length > 20) {
    const modelResult = await callClaude(text.slice(0, 20_000), document.name);
    if (modelResult) {
      extracted = modelResult.extracted_fields;
      confidence = modelResult.confidence;
      detectedType = modelResult.detected_type;
    } else {
      confidence = 'medium';
    }
  } else {
    if (classification !== 'unknown') {
      confidence = 'medium';
    }
  }

  const { error: insertError } = await supabase.from('document_extractions').insert([
    {
      household_id: document.household_id,
      document_id: document.id,
      detected_type: detectedType,
      confidence,
      extracted_fields: extracted,
      status: 'pending_review',
    },
  ]);

  if (insertError) {
    console.error('Failed to insert document extraction', insertError);
    return new Response('Unable to store extraction result', { status: 500 });
  }

  const { error: updateError } = await supabase
    .from('documents')
    .update({ status: 'processed' })
    .eq('id', document.id);

  if (updateError) {
    console.error('Failed to update document status', updateError);
  }

  return new Response(JSON.stringify({ document_id: document.id, detected_type: detectedType, confidence }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
