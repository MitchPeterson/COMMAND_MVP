import { SectionIntro } from '../components/SectionIntro';
import { familiarityState, introFor } from '../lib/sectionIntros';
import React, { useEffect, useState } from 'react';
import { useHousehold } from '../useHousehold';
import { UploadDropzone } from '../components/UploadDropzone';
import { UnfiledDocuments } from '../components/UnfiledDocuments';
import { FinancesHealth } from '../components/FinancesHealth';
import { LoanList } from '../components/LoanList';
import { OwnedThings } from '../components/OwnedThings';
import { MonthlySpending } from '../components/MonthlySpending';
import { RecurringCharges } from '../components/RecurringCharges';
import { SegmentedTabs } from '../components/SegmentedTabs';
import { InvestmentsPanel } from './Investments';
import { isInvested } from '../lib/investments';
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
];

function groupOf(account: FinanceAccount): string {
  const type = (account.account_type ?? '').toLowerCase();
  return GROUPS.find((g) => g.match.some((m) => type.includes(m)))?.label ?? 'Other';
}

export function FinancesView({ focusId = null }: { focusId?: string | null } = {}) {
  const { data, refresh } = useHousehold();
  const accounts = data?.financeAccounts ?? [];
  const documents = data?.documents ?? [];

  // Anything invested belongs to the Investments tab, so the two never report
  // the same balance twice.
  const cashAccounts = accounts.filter((a) => !isInvested(a));
  const investedCount = accounts.filter(isInvested).length;

  const grouped = [...GROUPS.map((g) => g.label), 'Other']
    .map((label) => ({ label, items: cashAccounts.filter((a) => groupOf(a) === label) }))
    .filter((group) => group.items.length > 0);

  const activeLoans = (data?.loans ?? []).filter((l) => l.status === 'active');
  const cardsWithBalance = (data?.creditCards ?? []).filter((c) => (c.current_balance ?? 0) > 0);
  const transactions = data?.creditTransactions ?? [];

  // A question that named an asset lands on the tab where things get typed in.
  const [tab, setTab] = useState<string>(focusId ? 'accounts' : 'accounts');
  useEffect(() => { if (focusId) setTab('accounts'); }, [focusId]);

  const tabs = [
    { id: 'accounts', label: 'Accounts', count: cashAccounts.length + (data?.assets ?? []).length },
    { id: 'debt', label: 'Debt', count: activeLoans.length + cardsWithBalance.length },
    { id: 'spending', label: 'Spending', count: transactions.length },
    { id: 'investments', label: 'Investments', count: investedCount },
  // Accounts always shows, because manual entry lives there and a household
  // with nothing on file still needs somewhere to put the first thing.
  ].filter((t) => t.id === 'accounts' || (t.count ?? 0) > 0);


  const familiarity = familiarityState(accounts.length, (data?.loans ?? []).length);
  // The uploader stays on the page; the intro's action takes you to it.
  // Finances is typed in, not uploaded — the intro says so, so it must lead
  // somewhere you can type.
  const goToUploader = () =>
    document.getElementById('section-manual-entry')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return (
    <div className="space-y-6">
      {/* The grade leads, and carries the balance sheet — the only place the
          whole picture exists, since the mortgage lives in Home and the card
          balances in Credit. */}
      {familiarity === 'unstarted' ? (
        <SectionIntro
          intro={introFor('finances')!}
          icon={<Wallet className="h-5 w-5" />}
          onAction={goToUploader}
        />
      ) : (
        <FinancesHealth
          accounts={accounts}
          loans={data?.loans ?? []}
          cards={data?.creditCards ?? []}
          mortgage={data?.mortgage ?? null}
          assets={data?.assets ?? []}
          budget={data?.budgetSummary ?? null}
          profile={data?.profile ?? null}
          transactions={data?.creditTransactions ?? []}
        />
      )}

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

      <SegmentedTabs tabs={tabs} active={tab} onChange={setTab} ariaLabel="Finances views" />

      {tab === 'accounts' && (
        <>
          <div className="flex items-center gap-2 px-1">
            <Wallet className="h-4 w-4 text-cmd-gold" />
            <h2 className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Cash and savings</h2>
          </div>

          {cashAccounts.length === 0 ? (
            <section className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
              No cash accounts on file yet. Balances drive the net worth and the emergency fund
              reading above.
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
                      <div className="mt-4 text-left sm:mt-0 sm:text-right">
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
            <OwnedThings
              householdId={data.household.id}
              accounts={accounts}
              assets={data?.assets ?? []}
              prefillAsset={focusId ? { name: focusId, type: focusId.match(/^\d{4}\s/) ? 'vehicle' : 'real_estate' } : null}
              onChanged={refresh}
            />
          )}
        </>
      )}

      {tab === 'debt' && data?.household?.id && (
        <LoanList
          householdId={data.household.id}
          loans={data?.loans ?? []}
          assets={data?.assets ?? []}
          onChanged={refresh}
        />
      )}

      {tab === 'spending' && (
        <>
          <MonthlySpending
            transactions={transactions}
            cards={data?.creditCards ?? []}
            statements={data?.creditStatements ?? []}
            budget={data?.budgetSummary ?? null}
          />
          {/* Moved out of Credit Cards. A household has one set of spending,
              not card spending and account spending. */}
          <RecurringCharges
            transactions={transactions}
            statements={data?.creditStatements ?? []}
          />
        </>
      )}

      {tab === 'investments' && <InvestmentsPanel />}

      {/* Demoted: still one click away, no longer the headline. */}
      <section id="section-uploader" className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
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
