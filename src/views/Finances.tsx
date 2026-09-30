import { SectionIntro } from '../components/SectionIntro';
import { familiarityState, introFor } from '../lib/sectionIntros';
import React, { useEffect, useMemo, useState } from 'react';
import { useHousehold } from '../useHousehold';
import { UploadDropzone } from '../components/UploadDropzone';
import { UnfiledDocuments } from '../components/UnfiledDocuments';
import { FinancesHealth } from '../components/FinancesHealth';
import { LoanList } from '../components/LoanList';
import { OwnedThings } from '../components/OwnedThings';
import { TransactionImportPanel } from '../components/TransactionImportPanel';
import { PeriodView } from '../components/PeriodView';
import { ReviewQueue } from '../components/ReviewQueue';
import { UploadsPanel } from '../components/UploadsPanel';
import { RecurringPanel } from '../components/RecurringPanel';
import { computeCoverage, type SourceRef } from '../lib/transactions/coverage';
import { UNTRACKED_SECTION } from '../lib/supabase';
import { availableCategories } from '../lib/transactions/taxonomy';
import { SpendingInsights } from '../components/SpendingInsights';
import { computeCashflow } from '../lib/cashflow';
import { findRecurringCharges } from '../lib/recurring';
import { SegmentedTabs } from '../components/SegmentedTabs';
import { InvestmentsPanel } from './Investments';
import { isInvested } from '../lib/investments';
import { DocumentLinkBadge } from '../components/DocumentLinkBadge';
import {
  uploadDocumentAsset, invokeDocumentExtraction, getDocumentUrl,
  type Document as StoredDocument, type FinanceAccount,
} from '../lib/supabase';
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
  const statements = data?.creditStatements ?? [];
  // Computed once for the tab: the overview, the insights and the recurring
  // panel all read the same numbers, and three separate passes over the same
  // transactions is how two of them end up disagreeing.
  const cashflow = useMemo(() => computeCashflow(transactions, statements), [transactions, statements]);
  const recurring = useMemo(() => findRecurringCharges(transactions, statements), [transactions, statements]);

  // Command's own categories with the household's laid over the top, and every
  // row still waiting on a person. Both read from the transactions already
  // loaded rather than asking the database again -- the review queue is a
  // filter over what is on screen, not a second source of truth.
  const categories = useMemo(
    () => availableCategories(data?.transactionCategories ?? []),
    [data?.transactionCategories],
  );
  const flagged = useMemo(
    () => transactions.filter((t) => t.review_state === 'needs_review'),
    [transactions],
  );
  // ── Coverage ──────────────────────────────────────────────────────────────
  // Everything here is derived from the imports on file. The only stored part
  // is what the household asserted about a period, which cannot be derived
  // from an absence of rows -- an absence looks identical either way.
  const sources = useMemo<SourceRef[]>(() => [
    ...accounts.map((a) => ({
      id: a.id, kind: 'bank' as const, name: a.account_name,
      tracked: a.transactions_tracked !== false,
    })),
    ...(data?.creditCards ?? []).map((c) => ({
      id: c.id, kind: 'card' as const, name: c.card_name || c.issuer || 'Card',
      tracked: c.transactions_tracked !== false,
    })),
  ], [accounts, data?.creditCards]);

  const loads = useMemo(() => (data?.transactionImports ?? [])
    .map((imp) => ({
      sourceId: imp.finance_account_id ?? imp.credit_card_id ?? '',
      // The range the file's own name claimed, where it had one: it says what
      // the export was meant to cover, which is what a gap is measured
      // against. The row dates only say what happened to be in it.
      start: imp.filename_period_start ?? imp.period_start ?? '',
      end: imp.filename_period_end ?? imp.period_end ?? '',
    }))
    .filter((l) => l.sourceId && l.start && l.end),
  [data?.transactionImports]);

  const marks = useMemo(() => {
    const out: Record<string, 'complete' | 'not_needed'> = {};
    for (const m of data?.sourcePeriodMarks ?? []) {
      const id = m.finance_account_id ?? m.credit_card_id;
      if (id) out[`${id}:${m.period.slice(0, 7)}`] = m.mark;
    }
    return out;
  }, [data?.sourcePeriodMarks]);

  // Transfers naming somewhere no account on file accounts for. A paired
  // transfer has both halves loaded by definition, so it is already accounted.
  const untrackedTransfers = useMemo(() => transactions
    .filter((t) => (t.flow === 'transfer' || t.flow === 'savings') && !t.paired_with_id)
    .map((t) => ({ description: t.counterparty_name || t.merchant_description, counterpartyKey: t.counterparty_key ?? null })),
  [transactions]);

  const dismissedSourceKeys = useMemo(() => (data?.dismissedFindings ?? [])
    .filter((d) => d.section === UNTRACKED_SECTION)
    .map((d) => d.fingerprint.replace(`${UNTRACKED_SECTION}:source:`, '')),
  [data?.dismissedFindings]);

  const coverageGaps = useMemo(
    () => computeCoverage({ sources, loads, marks, now: new Date() })
      .reduce((sum, c) => sum + c.gapCount, 0),
    [sources, loads, marks],
  );

  const sourceLabel = useMemo(() => {
    const names = new Map<string, string>();
    for (const a of accounts) names.set(a.id, a.account_name);
    for (const c of (data?.creditCards ?? [])) names.set(c.id, c.card_name || c.issuer || 'Card');
    return (id: string | null) => (id && names.get(id)) || 'Not attached to an account';
  }, [accounts, data?.creditCards]);

  // A spreadsheet handed to the section's uploader. Finances has one obvious
  // place to put a file -- the card at the bottom of the page -- so that is
  // where a bank export lands, and it used to be rejected by a file picker
  // that only offered photos and PDFs.
  const [pendingImport, setPendingImport] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingImportDocId, setPendingImportDocId] = useState<string | null>(null);

  /** Send a file to the importer and put the importer in front of the user. */
  const handOffToImporter = (file: File, documentId: string | null = null) => {
    setPendingImportDocId(documentId);
    setPendingImport(file);
    setTab('spending');
    // After the tab has rendered the panel being scrolled to.
    window.setTimeout(() => {
      document.getElementById('transaction-import')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  /**
   * A spreadsheet already in the vault, sent back through the importer.
   *
   * It has to come back down from storage to be read: parsing happens in the
   * browser, and the browser no longer has the file the household picked.
   */
  const importFromVault = async (stored: StoredDocument) => {
    setImportError(null);
    try {
      if (!stored.file_path) throw new Error('That file has no path in the vault.');
      const url = await getDocumentUrl(stored.file_path);
      if (!url) throw new Error('Could not open that file from the vault.');
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Could not download that file (${response.status}).`);
      handOffToImporter(new File([await response.blob()], stored.name), stored.id);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not open that file.');
    }
  };

  // A question that named an asset lands on the tab where things get typed in.
  const [tab, setTab] = useState<string>(focusId ? 'accounts' : 'accounts');
  useEffect(() => { if (focusId) setTab('accounts'); }, [focusId]);

  const tabs = [
    { id: 'accounts', label: 'Accounts', count: cashAccounts.length + (data?.assets ?? []).length },
    { id: 'debt', label: 'Debt', count: activeLoans.length + cardsWithBalance.length },
    // Both halves of "there is work here": rows waiting on a decision, and
    // months waiting on a file.
    { id: 'spending', label: 'Spending', count: flagged.length + coverageGaps, always: true },
    { id: 'investments', label: 'Investments', count: investedCount },
    // Accounts always shows, because manual entry lives there and a household
    // with nothing on file still needs somewhere to put the first thing.
    // Spending always shows for the same reason: the importer that produces
    // the transactions lives on it, so hiding the tab until transactions
    // exist would hide the only way to get any.
  ].filter((t) => t.id === 'accounts' || t.always || (t.count ?? 0) > 0);


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
          transactionImports: data?.transactionImports,
        }}
        onChanged={refresh}
        onImportSpreadsheet={importFromVault}
      />

      {importError && (
        <p className="px-1 text-sm text-cmd-bad">{importError}</p>
      )}

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
          {/* One period, and everything on the page about that period.
              PeriodView replaces the cashflow card and the category breakdown,
              which between them showed the same month twice with two framings
              and no way to move between them. Insights and recurring stay
              until their own rebuilds land -- removing them first would take
              away something that works. */}
          {/* Items needing review come before the inventory, as they do in
              every other section. */}
          {data?.household?.id && (
            <ReviewQueue
              householdId={data.household.id}
              flagged={flagged}
              categories={categories}
              sourceLabel={sourceLabel}
              onChanged={refresh}
            />
          )}
          <PeriodView
            householdId={data?.household?.id ?? ''}
            cashflow={cashflow}
            transactions={transactions}
            accounts={accounts}
            cards={data?.creditCards ?? []}
            categories={categories}
            onChanged={refresh}
          />
          <SpendingInsights cashflow={cashflow} recurring={recurring} />
          {data?.household?.id && (
            <RecurringPanel
              householdId={data.household.id}
              recurring={recurring}
              rules={data?.counterpartyRules ?? []}
              onChanged={refresh}
            />
          )}
          {data?.household?.id && (
            <UploadsPanel
              householdId={data.household.id}
              sources={sources}
              loads={loads}
              marks={marks}
              transfers={untrackedTransfers}
              dismissedKeys={dismissedSourceKeys}
              onChanged={refresh}
            />
          )}
          {data?.household?.id && (
            <TransactionImportPanel
              householdId={data.household.id}
              cards={data?.creditCards ?? []}
              accounts={accounts}
              imports={data?.transactionImports ?? []}
              rules={data?.counterpartyRules ?? []}
              onChanged={refresh}
              incomingFile={pendingImport}
              incomingDocumentId={pendingImportDocId}
              onIncomingHandled={() => setPendingImport(null)}
            />
          )}
        </>
      )}

      {tab === 'investments' && <InvestmentsPanel />}

      {/* Demoted: still one click away, no longer the headline. */}
      <section id="section-uploader" className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <UploadDropzone
          contextLabel="Add a financial document"
          buttonLabel="Upload a statement, account summary or transaction export"
          hint="or click to browse PDFs, photos and .csv / .xlsx exports"
          accept={{
            'image/*': [],
            'application/pdf': [],
            // Spelled out rather than relying on the browser's guess: macOS
            // reports a .csv as text/csv, Windows as application/vnd.ms-excel,
            // and an export saved from Numbers as text/plain. A type that is
            // not listed is greyed out in the picker with nothing on screen
            // saying why, which is exactly how this went wrong.
            'text/csv': ['.csv'],
            'text/plain': ['.csv', '.tsv', '.txt'],
            'text/tab-separated-values': ['.tsv'],
            'application/vnd.ms-excel': ['.csv', '.xls'],
            'application/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          }}
          nativeAccept="image/*,application/pdf,.csv,.tsv,.xlsx"
          onUpload={async (file) => {
            if (!data?.household?.id) return;
            // A spreadsheet is a list of transactions, not a document to read
            // with a model. It goes to the importer, which is the only thing
            // that can ask which account it belongs to.
            if (/\.(csv|tsv|xlsx|xlsm)$/i.test(file.name)) {
              handOffToImporter(file);
              return;
            }
            const stored = await uploadDocumentAsset(data.household.id, file, 'finance');
            await invokeDocumentExtraction(stored.id);
            await refresh();
          }}
        />
      </section>
    </div>
  );
}
