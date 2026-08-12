import React from 'react';
import { useHousehold } from '../useHousehold';
import { UploadDropzone } from '../components/UploadDropzone';
import { UnfiledDocuments } from '../components/UnfiledDocuments';
import { FinancesHealth } from '../components/FinancesHealth';
import { LoanList } from '../components/LoanList';
import { DocumentLinkBadge } from '../components/DocumentLinkBadge';
import { uploadDocumentAsset, invokeDocumentExtraction, type FinanceAccount } from '../lib/supabase';
import { Wallet } from 'lucide-react';

const money = (value: number | null | undefined) =>
  value == null ? '--' : `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/**
 * Accounts grouped by what they are for. account_type is free text arriving from
 * onboarding, extraction and hand entry with no shared vocabulary, so grouping
 * matches on substrings and anything unrecognized falls into "Other" rather than
 * being dropped.
 */
const GROUPS: Array<{ label: string; match: string[] }> = [
  { label: 'Cash and savings', match: ['checking', 'savings', 'money market', 'cash', 'cd', 'certificate'] },
  { label: 'Retirement', match: ['retirement', '401', '403', '457', 'ira', 'roth', 'pension', 'annuity'] },
  { label: 'Taxable investments', match: ['brokerage', 'investment', 'taxable', 'crypto'] },
  { label: 'Education and health', match: ['education', '529', 'hsa'] },
];

function groupOf(account: FinanceAccount): string {
  const type = (account.account_type ?? '').toLowerCase();
  return GROUPS.find((g) => g.match.some((m) => type.includes(m)))?.label ?? 'Other';
}

export function FinancesView() {
  const { data, refresh } = useHousehold();
  const accounts = data?.financeAccounts ?? [];
  const documents = data?.documents ?? [];

  const grouped = [...GROUPS.map((g) => g.label), 'Other']
    .map((label) => ({ label, items: accounts.filter((a) => groupOf(a) === label) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="space-y-6">
      {/* The grade leads, and carries the balance sheet — the only place the
          whole picture exists, since the mortgage lives in Home and the card
          balances in Credit. */}
      <FinancesHealth
        accounts={accounts}
        loans={data?.loans ?? []}
        cards={data?.creditCards ?? []}
        mortgage={data?.mortgage ?? null}
        assets={data?.assets ?? []}
        budget={data?.budgetSummary ?? null}
        profile={data?.profile ?? null}
      />

      <UnfiledDocuments
        section="finances"
        documents={documents}
        data={{
          legalDocuments: data?.legalDocuments, legalExtractions: data?.legalExtractions,
          insurancePolicies: data?.insurancePolicies, insuranceExtractions: data?.insuranceExtractions,
          financeAccounts: data?.financeAccounts, creditCards: data?.creditCards,
          creditStatements: data?.creditStatements, mortgageStatements: data?.mortgageStatements,
          taxDocuments: data?.taxDocuments, taxReturns: data?.taxReturns,
        }}
        onChanged={refresh}
      />

      <div className="flex items-center gap-2 px-1">
        <Wallet className="h-4 w-4 text-cmd-gold" />
        <h2 className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Your accounts</h2>
      </div>

      {accounts.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
          No accounts on file yet. Balances drive the net worth and the emergency fund reading above.
        </section>
      ) : (
        grouped.map((group) => (
          <section key={group.label} className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">{group.label}</p>
              <span className="shrink-0 font-mono text-sm text-cmd-offwhite">
                {money(group.items.reduce((sum, a) => sum + (a.balance ?? 0), 0))}
              </span>
            </div>
            <div className="space-y-4">
              {group.items.map((account) => (
                <div key={account.id} className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-5 sm:flex sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">
                      {account.account_type}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-cmd-offwhite">{account.account_name}</h3>
                    <p className="mt-1 text-sm text-cmd-muted">
                      {account.institution ?? 'Institution not recorded'}
                    </p>
                    <div className="mt-3">
                      <DocumentLinkBadge
                        sourceDocumentId={account.source_document_id}
                        documents={documents}
                      />
                    </div>
                  </div>
                  <div className="mt-4 text-right sm:mt-0">
                    <p className="text-2xl font-semibold text-cmd-offwhite">{money(account.balance)}</p>
                    <p className="mt-1 text-sm text-cmd-muted">
                      As of {account.as_of_date ?? 'a date not recorded'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {data?.household?.id && (
        <LoanList
          householdId={data.household.id}
          loans={data?.loans ?? []}
          assets={data?.assets ?? []}
          onChanged={refresh}
        />
      )}

      {/* Demoted: still one click away, no longer the headline. */}
      <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <UploadDropzone
          contextLabel="Add a financial document"
          buttonLabel="Upload a statement or account summary"
          onUpload={async (file) => {
            if (!data?.household?.id) return;
            const document = await uploadDocumentAsset(data.household.id, file, 'finance');
            await invokeDocumentExtraction(document.id);
            await refresh();
          }}
        />
      </section>
    </div>
  );
}
