import React from 'react';
import { useHousehold } from '../useHousehold';
import { UploadDropzone } from '../components/UploadDropzone';
import { CreditHealth } from '../components/CreditHealth';
import { CreditStatementReview } from '../components/CreditStatementReview';
import { uploadDocumentAsset, invokeDocumentExtraction, type CreditCard as CreditCardRow } from '../lib/supabase';
import { CreditCard } from 'lucide-react';

const money = (value: number | null | undefined) =>
  value == null ? '--' : `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/** Recorded utilization if there is one, otherwise derived from the balance. */
function utilizationOf(card: CreditCardRow): number | null {
  if (card.utilization_pct != null) return card.utilization_pct;
  if (card.credit_limit && card.credit_limit > 0 && card.current_balance != null) {
    return (card.current_balance / card.credit_limit) * 100;
  }
  return null;
}

function utilizationTone(value: number | null): string {
  if (value == null) return 'text-cmd-muted';
  if (value >= 80) return 'text-red-300';
  if (value >= 50) return 'text-amber-300';
  if (value >= 30) return 'text-cmd-gold';
  return 'text-emerald-300';
}

export function CreditView() {
  const { data, refresh } = useHousehold();
  const cards = data?.creditCards ?? [];
  const statements = data?.creditStatements ?? [];
  const [openStatement, setOpenStatement] = React.useState<string | null>(null);

  const pending = statements.filter(
    (s) => s.review_status === 'pending_review' || s.review_status === 'partially_confirmed',
  );

  // Worst utilization first: the card closest to its limit is the one that
  // matters, and it is rarely the one that happens to sort first by name.
  const sorted = cards
    .slice()
    .sort((a, b) => (utilizationOf(b) ?? -1) - (utilizationOf(a) ?? -1));

  return (
    <div className="space-y-6">
      {/* The grade leads, as coverage does on Insurance. */}
      <CreditHealth cards={cards} profile={data?.profile ?? null} />

      {pending.length > 0 && (
        <section className="rounded-3xl border border-cmd-gold/25 bg-cmd-charcoal p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Statements to review</p>
          <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">
            {pending.length} statement{pending.length === 1 ? '' : 's'} read, nothing added yet
          </h2>
          <div className="mt-5 space-y-4">
            {pending.map((statement) => (
              <div key={statement.id} className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">
                      {statement.institution ?? 'Institution not read'}
                      {statement.last_four ? ` · ••••${statement.last_four}` : ''}
                    </p>
                    <h3 className="mt-1.5 text-xl font-semibold text-cmd-offwhite">
                      {statement.card_product ?? 'Credit card statement'}
                    </h3>
                    <p className="mt-1 text-sm text-cmd-muted">
                      {statement.statement_closing_date
                        ? `Period ending ${statement.statement_closing_date}`
                        : 'Closing date not read'}
                      {statement.statement_balance != null ? ` · ${money(statement.statement_balance)} statement balance` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenStatement((id) => (id === statement.id ? null : statement.id))}
                    className="rounded-xl border border-cmd-border px-3.5 py-2 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
                  >
                    {openStatement === statement.id ? 'Hide' : 'Review'}
                  </button>
                </div>
                {openStatement === statement.id && (
                  <CreditStatementReview statement={statement} cards={cards} onConfirmed={refresh} />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center gap-2 px-1">
        <CreditCard className="h-4 w-4 text-cmd-gold" />
        <h2 className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Your cards</h2>
      </div>

      {cards.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center">
          <CreditCard className="mx-auto h-6 w-6 text-cmd-muted" />
          <p className="mt-4 text-cmd-muted">
            No cards on file yet. Upload a statement below and Command will read the issuer, limit,
            balance and APR, then track utilization against your limits and your income.
          </p>
        </section>
      ) : (
        <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
          <div className="space-y-4">
            {sorted.map((card) => {
              const utilization = utilizationOf(card);
              return (
                <div
                  key={card.id}
                  className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-5 sm:flex sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">
                      {card.issuer ?? 'Issuer not recorded'}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-cmd-offwhite">{card.card_name}</h3>
                    <p className="mt-2 text-sm text-cmd-muted">
                      Limit {money(card.credit_limit)} · Balance {money(card.current_balance)}
                      {card.annual_fee ? ` · ${money(card.annual_fee)} annual fee` : ''}
                    </p>
                    {card.rewards_type && (
                      <p className="mt-1 text-sm text-cmd-muted">
                        {card.rewards_type}
                        {card.rewards_value_ytd != null ? ` · ${money(card.rewards_value_ytd)} earned this year` : ''}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 shrink-0 text-right sm:mt-0">
                    <p className="text-sm text-cmd-muted">Utilization</p>
                    <p className={`mt-1 text-2xl font-semibold ${utilizationTone(utilization)}`}>
                      {utilization == null ? '--' : `${Math.round(utilization)}%`}
                    </p>
                    {utilization == null && (
                      <p className="mt-1 text-xs text-cmd-muted/70">Needs a limit and balance</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Demoted: still one click away, no longer the headline. */}
      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <UploadDropzone
          contextLabel="Add a card"
          buttonLabel="Upload a credit card statement"
          onUpload={async (file) => {
            if (!data?.household?.id) return;
            const document = await uploadDocumentAsset(data.household.id, file, 'credit');
            await invokeDocumentExtraction(document.id);
            await refresh();
          }}
        />
      </section>
    </div>
  );
}
