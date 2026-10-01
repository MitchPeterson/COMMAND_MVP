// What a call cost, recorded once, in one place.
//
// This lived inside extract-document, which is why only extract-document ever
// wrote to api_usage_log. research-card-offers and refine-feedback have been
// spending money invisibly since they were written -- the Profile usage report
// has been honest about every dollar it knew about and silent about the rest.
//
// Lifted here rather than copied a third time. The prices are duplicated in
// src/lib/supabase.ts for the client-side report; that pair still has to be
// kept in step by hand, and is the next thing to fix if this is touched again.

import { createClient } from 'npm:@supabase/supabase-js@2.111.0';

/** Dollars per million tokens. */
export const PRICES: Record<string, { input: number; output: number }> = {
  'claude-opus-5': { input: 5, output: 25 },
  'claude-fable-5': { input: 10, output: 50 },
  'claude-sonnet-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

export interface UsageLine {
  label: string;
  model: string;
  input: number;
  output: number;
  cache_write: number;
  cache_read: number;
  replayed?: boolean;
  saved_usd?: number;
}

/** Longest matching prefix, so a dated model id still prices correctly. */
export function priceOf(model: string): { input: number; output: number } {
  const match = Object.keys(PRICES)
    .filter((key) => model.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PRICES[match] : { input: 0, output: 0 };
}

export function lineCost(line: UsageLine): number {
  if (line.replayed) return 0;
  const price = priceOf(line.model);
  // A cache write costs 1.25x fresh input; a cache read costs 0.1x.
  return (
    line.input * price.input
    + line.cache_write * price.input * 1.25
    + line.cache_read * price.input * 0.1
    + line.output * price.output
  ) / 1_000_000;
}

export interface UsageContext {
  householdId: string | null;
  documentId?: string | null;
  documentName?: string | null;
}

/**
 * Write one line to the cost log.
 *
 * Never throws, by design. Losing a cost record is a reporting gap; failing
 * the work over one would cost the user the thing they actually asked for.
 */
export async function recordUsage(
  context: UsageContext,
  line: UsageLine,
  durationMs: number,
  succeeded: boolean,
): Promise<void> {
  if (!context.householdId) return;
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { error } = await admin.from('api_usage_log').insert({
      household_id: context.householdId,
      document_id: context.documentId ?? null,
      document_name: context.documentName ?? null,
      label: line.label,
      model: line.model,
      input_tokens: line.input,
      output_tokens: line.output,
      cache_write_tokens: line.cache_write,
      cache_read_tokens: line.cache_read,
      cost_usd: lineCost(line),
      replayed: line.replayed ?? false,
      saved_usd: line.saved_usd ?? 0,
      duration_ms: Math.round(durationMs),
      succeeded,
    });
    if (error) console.warn('Could not record usage:', error.message);
  } catch (err) {
    console.warn('Could not record usage:', err);
  }
}
