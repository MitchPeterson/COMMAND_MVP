import React, { useState } from 'react';
import {
  researchCardOffers,
  verifyCardOffer,
  type CardOfferCandidate,
  type CreditCard as CreditCardRow,
  type CreditStatement,
  type CreditTransaction,
  type HouseholdProfile,
} from '../lib/supabase';
import {
  computeRewardsStrategy,
  rewardsValueOf,
  POINT_VALUE_USD,
  type StrategySeverity,
} from '../lib/rewardsStrategy';
import {
  AlertTriangle, Check, ExternalLink, Info, Loader2, Search, ShieldAlert, Sparkles, X,
} from 'lucide-react';

interface Props {
  cards: CreditCardRow[];
  statements: CreditStatement[];
  transactions: CreditTransaction[];
  offers: CardOfferCandidate[];
  profile?: HouseholdProfile | null;
  householdId: string;
  onChanged: () => Promise<void> | void;
}

const money = (value: number | null | undefined) =>
  value == null
    ? '--'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const icons: Record<StrategySeverity, React.ReactNode> = {
  critical: <ShieldAlert className="h-4 w-4 shrink-0 text-red-300" />,
  attention: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />,
  info: <Info className="h-4 w-4 shrink-0 text-cmd-muted" />,
};
const borders: Record<StrategySeverity, string> = {
  critical: 'border-red-500/25 bg-red-500/5',
  attention: 'border-amber-500/25 bg-amber-500/5',
  info: 'border-cmd-border bg-cmd-black/30',
};

function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(then);
}

/**
 * Two kinds of number live on this screen and they must never look alike.
 *
 * Everything above the divider is arithmetic on statements the household
 * uploaded — checkable against a document they hold. Everything below it was
 * read off a web page by a model minutes ago, and is framed that way: sourced,
 * dated, captioned as unverified, and never shown without the link that would
 * disprove it.
 */
export function CardStrategy({
  cards, statements, transactions, offers, householdId, onChanged,
}: Props) {
  const [researching, setResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const strategy = computeRewardsStrategy(cards, statements, transactions);
  const topCategories = strategy.categories.slice(0, 6);

  const research = async () => {
    setResearching(true);
    setError(null);
    setResult(null);
    try {
      const outcome = await researchCardOffers(householdId);
      await onChanged();
      setResult(
        outcome.candidates === 0
          ? 'The search did not find any card whose terms it could state with a source. Nothing was added.'
          : `Found ${outcome.candidates} card${outcome.candidates === 1 ? '' : 's'} with sourced terms.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not research offers.');
    } finally {
      setResearching(false);
    }
  };

  const verify = async (id: string, state: 'user_confirmed' | 'user_rejected') => {
    setError(null);
    try {
      await verifyCardOffer(id, state);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    }
  };

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3 text-cmd-gold">
          <Sparkles className="h-5 w-5" />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Rewards strategy</p>
            <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Getting more from what you spend</h2>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-cmd-muted">Earned across {strategy.periodsCovered} statement
            {strategy.periodsCovered === 1 ? '' : 's'}</p>
          <p className="text-2xl font-semibold text-cmd-offwhite">{money(strategy.totalRewardsValue)}</p>
          <p className="mt-0.5 text-xs text-cmd-muted" title={strategy.confidenceReason}>
            on {money(strategy.totalPurchases)} of purchases
          </p>
        </div>
      </div>

      {strategy.periodsCovered === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-cmd-border bg-cmd-black/40 p-5 text-sm text-cmd-muted">
          Confirm a statement and Command can show what each card actually earns you, where your spending
          goes, and what putting it on a different card would be worth.
        </p>
      ) : (
        <>
          {/* ── Grounded: their own statements ───────────────────────────── */}
          <div className="mt-6 space-y-3">
            {strategy.findings.length === 0 ? (
              <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-cmd-muted">
                Nothing is obviously leaking value across the statements on file.
              </p>
            ) : (
              strategy.findings.map((finding, i) => (
                <div key={i} className={`flex gap-3 rounded-2xl border px-4 py-3 ${borders[finding.severity]}`}>
                  {icons[finding.severity]}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-cmd-offwhite">{finding.title}</p>
                      {finding.annualImpact != null && (
                        <p className={`text-sm font-semibold ${finding.annualImpact < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                          {finding.annualImpact < 0 ? '' : '+'}{money(finding.annualImpact)}/yr
                        </p>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-cmd-muted">{finding.detail}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Where your spending goes</p>
              <div className="mt-3 space-y-2">
                {topCategories.map((category) => (
                  <div key={category.category}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="capitalize text-cmd-offwhite">{category.category.replace(/_/g, ' ')}</span>
                      <span className="text-cmd-muted">
                        {money(category.total)} · {Math.round(category.share * 100)}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-cmd-black/60">
                      <div className="h-full rounded-full bg-cmd-gold/60" style={{ width: `${category.share * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-cmd-border bg-cmd-black/40 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">What each card returns</p>
              <div className="mt-3 space-y-2">
                {strategy.cards.filter((c) => c.statementCount > 0).map((card) => (
                  <div key={card.card.id} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-cmd-offwhite">{card.card.card_name}</span>
                    <span className="shrink-0 text-cmd-muted">
                      {card.effectiveRate == null
                        ? 'no rewards recorded'
                        : `${(card.effectiveRate * 100).toFixed(1)}% on ${money(card.purchases)}`}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-cmd-muted/70">
                Measured from your statements: rewards earned divided by purchases, valuing points at
                {' '}{(POINT_VALUE_USD * 100).toFixed(0)}¢ each.
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── The divider is the point ──────────────────────────────────────── */}
      <div className="mt-8 border-t border-cmd-border pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Cards you don't hold</p>
            <p className="mt-1 max-w-xl text-sm text-cmd-muted">
              Everything below is read off the web, not from your documents. Command searches, records the
              page it read and when, and works out what each card would have returned on
              {' '}<span className="text-cmd-offwhite">your</span> spending. Offers change without notice —
              check the issuer before acting on any of it.
            </p>
          </div>
          <button
            type="button"
            disabled={researching || strategy.periodsCovered === 0}
            onClick={research}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-cmd-gold bg-cmd-gold/15 px-4 py-2 text-sm font-semibold text-cmd-gold transition hover:bg-cmd-gold/25 disabled:opacity-40"
          >
            {researching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {researching ? 'Searching…' : offers.length > 0 ? 'Search again' : 'Research current offers'}
          </button>
        </div>

        {researching && (
          <p className="mt-4 text-sm text-cmd-muted">
            Running several web searches and reading the pages. This takes a minute or two.
          </p>
        )}
        {result && (
          <p className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200">{result}</p>
        )}
        {error && (
          <p className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
        )}

        {offers.length > 0 && (
          <div className="mt-5 space-y-3">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className={`rounded-2xl border p-4 ${
                  offer.verification_state === 'user_confirmed'
                    ? 'border-emerald-500/25 bg-cmd-black/40'
                    : 'border-dashed border-cmd-border bg-cmd-black/30'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">{offer.issuer}</p>
                    <h3 className="mt-1.5 text-lg font-semibold text-cmd-offwhite">{offer.card_name}</h3>
                    <p className="mt-1 text-sm text-cmd-muted">
                      {offer.annual_fee != null ? `${money(offer.annual_fee)} annual fee` : 'Annual fee not stated'}
                      {offer.credit_needed ? ` · ${offer.credit_needed}` : ''}
                    </p>
                  </div>
                  {offer.estimated_annual_value != null && (
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-semibold text-emerald-300">
                        {offer.estimated_annual_value >= 0 ? '+' : ''}{money(offer.estimated_annual_value)}/yr
                      </p>
                      <p className="text-[11px] text-cmd-muted">on your spending, after the fee</p>
                    </div>
                  )}
                </div>

                {offer.earn_rates.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {offer.earn_rates.map((rate, i) => (
                      <span key={i} className="rounded-lg border border-cmd-border px-2.5 py-1 text-xs text-cmd-muted">
                        <span className="text-cmd-offwhite">{rate.rate}{rate.unit}</span> {rate.category}
                      </span>
                    ))}
                  </div>
                )}

                {(offer.signup_bonus || offer.intro_apr) && (
                  <p className="mt-3 text-sm text-cmd-muted">
                    {offer.signup_bonus}
                    {offer.signup_requirement ? ` — ${offer.signup_requirement}` : ''}
                    {offer.intro_apr ? ` · ${offer.intro_apr}` : ''}
                  </p>
                )}

                {/* Provenance sits with the claim, not in a footnote. */}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-cmd-border/60 pt-3">
                  <a
                    href={offer.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-cmd-muted underline decoration-dotted underline-offset-2 transition hover:text-cmd-gold"
                  >
                    {offer.is_issuer_source ? 'Issuer page' : offer.source_title || 'Source'}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="text-[11px] text-cmd-muted">read {relativeDate(offer.retrieved_at)}</span>
                  {!offer.is_issuer_source && (
                    <span className="text-[11px] text-amber-300">not the issuer's own page</span>
                  )}
                  <span
                    className={`text-[11px] ${
                      offer.verification_state === 'user_confirmed' ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    {offer.verification_state === 'user_confirmed'
                      ? 'you checked this with the issuer'
                      : 'not verified with the issuer'}
                  </span>
                </div>

                {offer.verification_state === 'unverified' && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => verify(offer.id, 'user_confirmed')}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200 transition hover:bg-emerald-500/20"
                    >
                      <Check className="h-3 w-3" /> I checked — terms are right
                    </button>
                    <button
                      type="button"
                      onClick={() => verify(offer.id, 'user_rejected')}
                      className="inline-flex items-center gap-1 rounded-lg border border-cmd-border px-2.5 py-1 text-[11px] text-cmd-muted transition hover:border-red-500/40 hover:text-red-200"
                    >
                      <X className="h-3 w-3" /> Wrong or gone
                    </button>
                  </div>
                )}
              </div>
            ))}

            <p className="text-[11px] text-cmd-muted/70">
              The yearly figure is Command's arithmetic — the rates found, applied to your own category
              spend, less the annual fee. The rates themselves came from the page linked beside each card,
              and Command has not confirmed them with the issuer.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
