// Bringing a spreadsheet of transactions in.
//
// The import is deliberately a two-step: read the file, show what Command
// made of it, and only then write anything. Every guess this makes -- which
// column is the merchant, which way the amounts run, what each row was for --
// is on screen before the button that commits it, because a wrong guess here
// does not look wrong afterwards. A file read with the signs backwards
// produces a clean, plausible, entirely inverted picture of the household's
// year.
//
// The preview is the whole feature. Importing is the easy part.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  ArrowLeftRight, ArrowDownLeft, ArrowUpRight, FileSpreadsheet, Loader2, PiggyBank,
  RotateCcw, Trash2, AlertTriangle, Check, Lock,
} from 'lucide-react';
import { readTransactionFile, TransactionFileError, type SheetGrid } from '../lib/transactionFile';
import {
  readTransactions, hintFromFileName,
  type ImportReading, type ColumnMapping, type SignConvention, type Flow,
} from '../lib/transactionImport';
import {
  commitTransactionImport, deleteTransactionImport, uploadDocumentAsset,
  addFinanceAccount, addCreditCardShell, applyTransferPairing, rulesToMaps,
  type CreditCard, type CounterpartyRuleRow, type FinanceAccount, type TransactionImportRow,
} from '../lib/supabase';
import { SECURITY_ONE_LINER } from '../lib/securityPosture';

interface Props {
  householdId: string;
  cards: CreditCard[];
  accounts: FinanceAccount[];
  imports: TransactionImportRow[];
  /** What the household has taught Command about a merchant. */
  rules?: CounterpartyRuleRow[];
  onChanged: () => Promise<void> | void;
  /**
   * A spreadsheet dropped on the section's own uploader rather than on this
   * panel. Finances has one obvious place to put a file and it is the card at
   * the bottom of the page, so that is where a transaction export lands --
   * it hands the file here instead of filing it as a document.
   */
  incomingFile?: File | null;
  /**
   * Set when the incoming file is one already in the vault.
   *
   * It stops the import storing a second copy of a file the household has
   * uploaded once, and links the import to the document that is already
   * there -- which is what makes that file stop reading as "nothing on this
   * page depends on it".
   */
  incomingDocumentId?: string | null;
  onIncomingHandled?: () => void;
}

/** What the household picks in the account step. */
type AccountChoice = string | '__new__' | '';

interface AccountDraft {
  account_name: string;
  account_type: string;
  institution: string;
  balance: string;
}

/** One dropped file, once Command has read it. */
interface ParsedEntry {
  id: string;
  file: File;
  documentId: string | null;
  grid: SheetGrid | null;
  reading: ImportReading | null;
  sourceKind: 'bank' | 'card';
  choice: AccountChoice;
  draft: AccountDraft;
  matchNote: string | null;
  error: string | null;
}

/** What happened to one file, for the summary afterwards. */
interface FileOutcome {
  name: string;
  account: string;
  imported: number;
  duplicates: number;
  skipped: number;
  error: string | null;
}

const EMPTY_DRAFT: AccountDraft = {
  account_name: '', account_type: 'checking', institution: '', balance: '',
};

/**
 * Which account on file this export probably came from.
 *
 * The institution and the last four are usually both in the file name, which
 * is enough to be sure often enough that most files need no attention at all.
 * When nothing matches this returns null and the household is asked, which is
 * the case worth spending someone's time on.
 */
function matchAccount(
  fileName: string,
  kind: 'bank' | 'card',
  accounts: FinanceAccount[],
  cards: CreditCard[],
) {
  const hint = hintFromFileName(fileName);
  const hasFour = (text: string | null | undefined) =>
    !!hint.lastFour && !!text && text.includes(hint.lastFour);
  const hasBank = (text: string | null | undefined) =>
    !!hint.institution && !!text && text.toLowerCase().includes(hint.institution.toLowerCase());

  const matched = kind === 'card'
    ? cards.find((c) => hasFour(c.last_four))
      ?? cards.find((c) => hasBank(c.issuer) || hasBank(c.card_name))
    : accounts.find((a) => hasFour(a.account_name) || hasFour(a.institution))
      ?? accounts.find((a) => hasBank(a.institution) || hasBank(a.account_name));

  return { hint, matched: matched ?? null };
}

/**
 * Whether this file can be imported without anyone looking at it.
 *
 * Deliberately strict. Every one of these is a question whose wrong answer is
 * invisible afterwards: a missing column loses rows, an uncertain sign inverts
 * the year, and an unmatched account files the whole export against nothing.
 * Creating an account never qualifies -- naming something is a decision.
 */
const canImportUnattended = (entry: ParsedEntry) =>
  !entry.error
  && entry.reading != null
  && entry.reading.missing.length === 0
  && !entry.reading.signUncertain
  && entry.reading.transactions.length > 0
  && entry.choice !== '' && entry.choice !== '__new__';

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const exact = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const FLOW_STYLE: Record<Flow, { label: string; className: string; icon: React.ReactNode }> = {
  expense: { label: 'Spent', className: 'text-cmd-offwhite', icon: <ArrowUpRight className="h-3 w-3" /> },
  income: { label: 'Income', className: 'text-cmd-gold', icon: <ArrowDownLeft className="h-3 w-3" /> },
  savings: { label: 'Saved', className: 'text-cmd-gold', icon: <PiggyBank className="h-3 w-3" /> },
  transfer: { label: 'Transfer', className: 'text-cmd-muted', icon: <ArrowLeftRight className="h-3 w-3" /> },
};

/** The roles a household can reassign. Balance and cardholder are read but not used. */
const EDITABLE: Array<{ key: keyof ColumnMapping; label: string; required: boolean }> = [
  { key: 'date', label: 'Date', required: true },
  { key: 'description', label: 'Description', required: true },
  { key: 'amount', label: 'Amount', required: false },
  { key: 'debit', label: 'Debit', required: false },
  { key: 'credit', label: 'Credit', required: false },
  { key: 'category', label: 'Category', required: false },
];

const SIGN_LABEL: Record<SignConvention, string> = {
  negative_is_spending: 'A negative amount is money leaving',
  positive_is_spending: 'A positive amount is money leaving',
  debit_credit_columns: 'Separate Debit and Credit columns',
};

const ACCOUNT_TYPES = [
  'checking', 'savings', 'money market', 'brokerage', 'retirement',
  'education', 'hsa', 'certificate of deposit',
];

export function TransactionImportPanel({
  householdId, cards, accounts, imports, rules = [], onChanged,
  incomingFile, incomingDocumentId, onIncomingHandled,
}: Props) {
  // Taught rules, in the shape the classifier reads them. Recomputed only when
  // the rules change, because every row of every file consults them.
  const ruleMaps = useMemo(() => rulesToMaps(rules), [rules]);
  const [grid, setGrid] = useState<SheetGrid | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [vaultDocumentId, setVaultDocumentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  // Corrections. Null means "whatever Command worked out".
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [sign, setSign] = useState<SignConvention | null>(null);
  const [sourceKind, setSourceKind] = useState<'bank' | 'card'>('bank');
  // Which account these transactions belong to. Empty until the household
  // says, because a pile of transactions attached to nothing is the state
  // this panel exists to avoid.
  const [choice, setChoice] = useState<AccountChoice>('');
  const [draft, setDraft] = useState({
    account_name: '', account_type: 'checking', institution: '', balance: '',
  });
  const [matchNote, setMatchNote] = useState<string | null>(null);
  const [keepFile, setKeepFile] = useState(true);
  const [showSkipped, setShowSkipped] = useState(false);

  // Files waiting for someone to look at them, and what happened to the ones
  // that did not need it.
  const [queue, setQueue] = useState<ParsedEntry[]>([]);
  const [outcomes, setOutcomes] = useState<FileOutcome[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  /**
   * The name these transactions are filed under, and part of every
   * fingerprint. Always the account's name rather than its id: a new account
   * has no id until the moment it is created, and a label that changed
   * between the first import and the second would re-import every row.
   */
  const accountLabel = choice === '__new__'
    ? draft.account_name.trim()
    : (accounts.find((a) => a.id === choice)?.account_name
      ?? cards.find((c) => c.id === choice)?.card_name
      ?? '');

  const reading: ImportReading | null = useMemo(() => {
    if (!grid) return null;
    return readTransactions(grid, {
      accountLabel: accountLabel || file?.name || 'Imported',
      fileName: file?.name,
      sourceKind,
      mapping: mapping ?? undefined,
      signConvention: sign ?? undefined,
    });
  }, [grid, accountLabel, file, sourceKind, mapping, sign]);

  const reset = () => {
    setGrid(null); setFile(null); setVaultDocumentId(null); setMapping(null); setSign(null);
    setChoice(''); setMatchNote(null); setError(null); setShowSkipped(false);
    setQueue([]); setActiveId(null);
    setDraft({ account_name: '', account_type: 'checking', institution: '', balance: '' });
  };

  /**
   * Read a file and work out which account it probably belongs to.
   *
   * Offering a blank dropdown when the file is called Chase8841_Activity.csv
   * is a worse guess than no guess: the institution and the last four are
   * right there in the name, and one of the accounts on file usually matches
   * them. When nothing matches, the new-account form is opened already filled
   * in, because that is the case where the household has to do the work.
   */
  /** Read one file and work out everything Command can without asking. */
  const parseOne = useCallback(async (chosen: File, documentId: string | null): Promise<ParsedEntry> => {
    const id = `${chosen.name}:${chosen.size}:${chosen.lastModified}`;
    const blank: ParsedEntry = {
      id, file: chosen, documentId, grid: null, reading: null,
      sourceKind: 'bank', choice: '', draft: EMPTY_DRAFT, matchNote: null, error: null,
    };
    try {
      const parsed = await readTransactionFile(chosen);
      if (parsed.rows.length === 0) throw new TransactionFileError('That file has no rows in it.');

      // The adapter knows what kind of account its format belongs to, which
      // beats guessing from the file name.
      const reading = readTransactions(parsed, {
        accountLabel: chosen.name, fileName: chosen.name, rules: ruleMaps.categories, aliases: ruleMaps.names,
      });
      const kind: 'bank' | 'card' = reading.adapter?.sourceKind
        ?? (/card|credit|amex|visa|mastercard|discover/i.test(chosen.name) ? 'card' : 'bank');

      const { hint, matched } = matchAccount(chosen.name, kind, accounts, cards);

      if (matched) {
        const name = 'account_name' in matched ? matched.account_name : matched.card_name;
        return {
          ...blank, grid: parsed, reading, sourceKind: kind, choice: matched.id,
          matchNote: `Matched to ${name}`
            + `${hint.lastFour ? ` from the ${hint.lastFour} in the file name` : ' from the file name'}.`,
        };
      }
      return {
        ...blank,
        grid: parsed,
        reading,
        sourceKind: kind,
        choice: '__new__',
        draft: {
          ...EMPTY_DRAFT,
          account_name: [hint.institution, kind === 'card' ? 'card' : 'checking', hint.lastFour]
            .filter(Boolean).join(' ')
            || chosen.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 60),
          institution: hint.institution ?? '',
        },
      };
    } catch (err) {
      return { ...blank, error: err instanceof Error ? err.message : 'Could not read that file.' };
    }
  }, [accounts, cards, ruleMaps]);

  /**
   * Write one file's transactions.
   *
   * Takes everything explicitly rather than reading component state, because
   * the same path serves a file nobody looked at and a file someone just
   * corrected. Two implementations of this would be two chances for the
   * unattended one to write something the reviewed one would not.
   */
  const importEntry = useCallback(async (
    entry: ParsedEntry,
    override?: { choice: AccountChoice; draft: AccountDraft; sourceKind: 'bank' | 'card'; keepFile: boolean; reading: ImportReading },
  ): Promise<FileOutcome> => {
    const chosen = override?.choice ?? entry.choice;
    const asDraft = override?.draft ?? entry.draft;
    const kind = override?.sourceKind ?? entry.sourceKind;
    const view = override?.reading ?? entry.reading!;
    const store = override?.keepFile ?? true;

    const label = chosen === '__new__'
      ? asDraft.account_name.trim()
      : (accounts.find((a) => a.id === chosen)?.account_name
        ?? cards.find((c) => c.id === chosen)?.card_name
        ?? entry.file.name);

    const outcome: FileOutcome = {
      name: entry.file.name, account: label, imported: 0, duplicates: 0,
      skipped: view?.skipped.length ?? 0, error: null,
    };

    try {
      // A file that came out of the vault is already stored. Uploading it
      // again would leave two copies and link the import to the wrong one.
      let documentId: string | null = entry.documentId;
      if (store && !documentId) {
        // Stored, never sent for extraction: the rows are already read, and a
        // model pass over a CSV would cost money to learn nothing.
        const stored = await uploadDocumentAsset(householdId, entry.file, 'finance');
        documentId = stored.id;
      }

      // The account comes first. If it cannot be created there is nothing to
      // attach the transactions to, and a half-done import that filed 400 rows
      // against no account is the state this step exists to prevent.
      let card = cards.find((c) => c.id === chosen) ?? null;
      let account = accounts.find((a) => a.id === chosen) ?? null;

      if (chosen === '__new__') {
        if (kind === 'card') {
          card = await addCreditCardShell(householdId, {
            card_name: asDraft.account_name.trim(),
            issuer: asDraft.institution,
            last_four: view.accountHint.lastFour,
          });
        } else {
          account = await addFinanceAccount(householdId, {
            account_name: asDraft.account_name.trim(),
            account_type: asDraft.account_type,
            institution: asDraft.institution,
            balance: asDraft.balance,
            as_of_date: view.periodEnd ?? null,
          });
        }
      }

      const result = await commitTransactionImport(
        householdId,
        {
          fileName: entry.file.name,
          fileFormat: /\.xlsx?$/i.test(entry.file.name) ? 'xlsx' : 'csv',
          sourceKind: kind,
          accountLabel: label || entry.file.name,
          institution: card?.issuer ?? account?.institution ?? null,
          documentId,
          creditCardId: card?.id ?? null,
          financeAccountId: account?.id ?? null,
          signConvention: view.signConvention,
          columnMap: {
            ...view.mapping,
            headers: view.headers,
            headerRow: view.headerRow,
            adapter: view.adapter?.id ?? null,
          },
          adapterId: view.adapter?.id ?? null,
          rowCount: view.totalRows,
          skippedCount: view.skipped.length,
        },
        view.transactions.map((t) => ({
          date: t.date,
          postedDate: t.postedDate,
          description: t.description,
          amount: t.amount,
          flow: t.flow,
          category: t.category,
          categoryCode: t.categoryCode,
          categorySource: t.categorySource,
          counterpartyKey: t.counterpartyKey,
          counterpartyName: t.counterpartyName,
          sourceRecordId: t.sourceRecordId,
          reviewState: t.reviewState,
          reviewReason: t.reviewReason,
          fingerprint: t.fingerprint,
        })),
      );

      // Both halves of an internal move can only be linked once both are on
      // file, and the file that completes a pair is usually the one that just
      // arrived.
      await applyTransferPairing(householdId);

      return { ...outcome, imported: result.imported, duplicates: result.duplicates };
    } catch (err) {
      return { ...outcome, error: err instanceof Error ? err.message : 'Could not import that file.' };
    }
  }, [householdId, accounts, cards]);

  /** Put one parsed file in front of the household. */
  const activate = useCallback((entry: ParsedEntry) => {
    setActiveId(entry.id);
    setFile(entry.file);
    setGrid(entry.grid);
    setVaultDocumentId(entry.documentId);
    setSourceKind(entry.sourceKind);
    setChoice(entry.choice);
    setDraft(entry.draft);
    setMatchNote(entry.matchNote);
    setMapping(null);
    setSign(null);
    setShowSkipped(false);
    setError(entry.error);
  }, []);

  const onDrop = useCallback(async (accepted: File[]) => {
    if (accepted.length === 0) return;
    setError(null); setDone(null); setOutcomes([]); setBusy(true);
    try {
      const parsed = await Promise.all(accepted.map((f) => parseOne(f, null)));

      // Anything Command is sure about goes straight in. Sequentially rather
      // than in parallel: two files for the same account have to see each
      // other's rows, or both will think the overlap is new.
      const settled: FileOutcome[] = [];
      const needsAttention: ParsedEntry[] = [];
      for (const entry of parsed) {
        if (canImportUnattended(entry)) settled.push(await importEntry(entry));
        else needsAttention.push(entry);
      }

      setOutcomes(settled);
      setQueue(needsAttention);
      if (settled.length > 0) await onChanged();
      if (needsAttention.length > 0) activate(needsAttention[0]);
    } finally {
      setBusy(false);
    }
  }, [parseOne, activate, importEntry, onChanged]);

  // A file handed over by the section's own uploader.
  useEffect(() => {
    if (!incomingFile) return;
    const handOff = async () => {
      setBusy(true);
      try {
        const entry = await parseOne(incomingFile, incomingDocumentId ?? null);
        setQueue([entry]);
        activate(entry);
      } finally {
        setBusy(false);
      }
    };
    void handOff();
    onIncomingHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    // Spelled out rather than trusting the browser's guess: macOS reports a
    // .csv as text/csv, Windows as application/vnd.ms-excel, and one saved
    // out of Numbers as text/plain. An unlisted type is greyed out in the
    // picker with nothing saying why.
    accept: {
      'text/csv': ['.csv'],
      'application/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
      'text/plain': ['.csv', '.tsv', '.txt'],
      'text/tab-separated-values': ['.tsv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
  });

  const totals = useMemo(() => {
    const sum: Record<Flow, number> = { expense: 0, income: 0, savings: 0, transfer: 0 };
    for (const t of reading?.transactions ?? []) sum[t.flow] += Math.abs(t.amount);
    return sum;
  }, [reading]);

  // An account has to be settled before anything is written: either one on
  // file, or a new one with a name to create it under.
  const accountReady = choice === '__new__'
    ? draft.account_name.trim().length > 0
    : choice !== '';

  /** Import the file currently on screen, then move to the next one waiting. */
  const commit = async () => {
    const entry = queue.find((q) => q.id === activeId);
    if (!reading || !file || !entry || reading.missing.length > 0 || !accountReady) return;
    setBusy(true); setError(null);
    try {
      const outcome = await importEntry(entry, {
        choice, draft, sourceKind, keepFile, reading,
      });
      if (outcome.error) { setError(outcome.error); return; }

      const remaining = queue.filter((q) => q.id !== entry.id);
      setOutcomes((prev: FileOutcome[]) => [...prev, outcome]);
      setQueue(remaining);
      await onChanged();

      if (remaining.length > 0) activate(remaining[0]);
      else reset();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: TransactionImportRow) => {
    setBusy(true); setError(null);
    try {
      await deleteTransactionImport(row.id);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that import.');
    } finally {
      setBusy(false);
    }
  };

  const setColumn = (key: keyof ColumnMapping, index: number) => {
    const base = reading?.mapping ?? null;
    if (!base) return;
    setMapping({ ...base, [key]: index });
  };

  return (
    <section id="transaction-import" className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Import transactions</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-cmd-muted">
            A CSV or XLSX export from a bank or card account. Command reads the file in your
            browser and shows you what it made of it before anything is saved — no model reads
            it, so importing a year of transactions costs nothing.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {done && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-cmd-gold/30 bg-cmd-gold/5 p-4 text-sm text-cmd-offwhite">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-cmd-gold" />
          <span>{done}</span>
        </div>
      )}

      {/* What happened to the files nobody had to look at. Stated per file
          rather than as one total: "412 added" across four exports tells the
          household nothing about which account is now short. */}
      {outcomes.length > 0 && (
        <div className="mt-4 rounded-2xl border border-cmd-gold/25 bg-cmd-gold/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">
            {outcomes.length === 1 ? 'Imported' : `${outcomes.length} files imported`}
          </p>
          <ul className="mt-2 space-y-1.5">
            {outcomes.map((o) => (
              <li key={o.name} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                {o.error ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                    <span className="text-cmd-offwhite">{o.name}</span>
                    <span className="text-red-500">{o.error}</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 shrink-0 text-cmd-gold" />
                    <span className="text-cmd-offwhite">{o.account}</span>
                    <span className="text-cmd-muted">
                      {o.imported} new
                      {o.duplicates > 0 ? ` · ${o.duplicates} already loaded` : ''}
                      {o.skipped > 0 ? ` · ${o.skipped} skipped` : ''}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Which file is on screen, when several arrived together. */}
      {queue.length > 1 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-cmd-muted">
            {queue.length} files need a look
          </span>
          {queue.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => activate(q)}
              className={`rounded-xl border px-3 py-1.5 text-xs transition ${
                q.id === activeId
                  ? 'border-cmd-gold bg-cmd-gold/10 text-cmd-gold'
                  : 'border-cmd-border text-cmd-muted hover:text-cmd-offwhite'
              }`}
            >
              {i + 1}. {q.file.name.length > 26 ? `${q.file.name.slice(0, 24)}…` : q.file.name}
            </button>
          ))}
        </div>
      )}

      {!reading && (
        <>
          <div
            {...getRootProps()}
            className={`mt-5 cursor-pointer rounded-3xl border border-dashed p-8 text-center transition ${
              isDragActive ? 'border-cmd-gold bg-cmd-gold/5' : 'border-cmd-border bg-cmd-black/50 hover:border-cmd-gold/50'
            }`}
          >
            <input {...getInputProps()} />
            {busy ? (
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-cmd-gold" />
            ) : (
              <FileSpreadsheet className="mx-auto h-6 w-6 text-cmd-muted" />
            )}
            <p className="mt-3 text-sm text-cmd-offwhite">
              {busy ? 'Reading…' : 'Drop .csv or .xlsx exports here — as many as you like'}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-cmd-muted">
              Most banks and card issuers offer one under Download, Export or Statements.
              Anything Command recognises the account for goes straight in; the rest stop
              here for a look.
            </p>
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-cmd-muted">
            <Lock className="h-3 w-3" /> {SECURITY_ONE_LINER}
          </p>
        </>
      )}

      {reading && file && (
        <div className="mt-5 space-y-5">
          {/* What this file is */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cmd-border bg-cmd-charcoal p-4">
            <div className="min-w-0">
              <p className="truncate text-sm text-cmd-offwhite">{file.name}</p>
              <p className="mt-1 text-xs text-cmd-muted">
                {grid?.sheetName ? `Sheet "${grid.sheetName}" · ` : ''}
                {reading.totalRows} row{reading.totalRows === 1 ? '' : 's'} below the header
                {reading.headerRow > 0 ? ` (header on line ${reading.headerRow + 1})` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-cmd-border px-3 py-1.5 text-xs text-cmd-muted transition hover:text-cmd-gold"
            >
              <RotateCcw className="h-3 w-3" /> Choose another file
            </button>
          </div>

          {reading.missing.length > 0 ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
              Command could not find a {reading.missing.join(' or a ')} column in this file. Pick
              the right columns below, or export it again with headers.
            </div>
          ) : null}

          {/* How it was read. The sign convention leads, because it is the one
              guess that inverts the whole picture when it is wrong. */}
          <div className="rounded-2xl border border-cmd-border bg-cmd-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">How Command read this</p>

            <div className={`mt-3 rounded-xl border p-3 ${
              reading.signUncertain ? 'border-cmd-gold/40 bg-cmd-gold/5' : 'border-cmd-border bg-cmd-black/40'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-cmd-offwhite">{SIGN_LABEL[reading.signConvention]}</p>
                {reading.signConvention !== 'debit_credit_columns' && (
                  <button
                    type="button"
                    onClick={() => setSign(
                      reading.signConvention === 'negative_is_spending' ? 'positive_is_spending' : 'negative_is_spending',
                    )}
                    className="flex items-center gap-1.5 rounded-xl border border-cmd-border px-3 py-1.5 text-xs text-cmd-muted transition hover:border-cmd-gold/50 hover:text-cmd-gold"
                  >
                    <ArrowLeftRight className="h-3 w-3" /> It is the other way round
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs leading-5 text-cmd-muted">{reading.signBasis}</p>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {EDITABLE.map(({ key, label: roleLabel, required }) => (
                <label key={key} className="block">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">
                    {roleLabel}{required ? '' : ' (optional)'}
                  </span>
                  <select
                    value={reading.mapping[key]}
                    onChange={(e) => setColumn(key, Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black px-3 py-2 text-sm text-cmd-offwhite focus:border-cmd-gold focus:outline-none"
                  >
                    <option value={-1}>Not in this file</option>
                    {reading.headers.map((header, index) => (
                      <option key={`${header}-${index}`} value={index}>
                        {header || `Column ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <p className="mt-3 text-xs text-cmd-muted">
              Dates read as{' '}
              {reading.dateOrder === 'dmy' ? 'day first (31/12/2026)'
                : reading.dateOrder === 'iso' ? 'year first (2026-12-31)'
                  : 'month first (12/31/2026)'}.
            </p>
          </div>

          {/* What it found */}
          <div className="grid gap-3 sm:grid-cols-4">
            {([
              ['Spending', totals.expense, `${reading.transactions.filter((t) => t.flow === 'expense').length} items`],
              ['Income', totals.income, `${reading.transactions.filter((t) => t.flow === 'income').length} items`],
              ['Saved', totals.savings, 'moved somewhere it is kept'],
              ['Transfers', totals.transfer, 'not counted as spending'],
            ] as Array<[string, number, string]>).map(([name, value, note]) => (
              <div key={name} className="rounded-2xl border border-cmd-border bg-cmd-charcoal p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">{name}</p>
                <p className="mt-2 font-mono text-lg text-cmd-offwhite">{money(value)}</p>
                <p className="mt-1 text-[11px] text-cmd-muted">{note}</p>
              </div>
            ))}
          </div>

          {/* The rows themselves. Reading the first few is the only way anyone
              can tell a good import from a bad one. */}
          {reading.transactions.length > 0 && (
            <div className="rounded-2xl border border-cmd-border bg-cmd-black/30 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">
                  First rows, as Command read them
                </p>
                <p className="text-xs text-cmd-muted">
                  {reading.transactions.length} transactions
                  {reading.periodStart ? ` · ${reading.periodStart} to ${reading.periodEnd}` : ''}
                </p>
              </div>
              <div className="mt-3 -mx-4 overflow-x-auto px-4">
                <table className="w-full min-w-[34rem] text-sm">
                  <tbody>
                    {reading.transactions.slice(0, 8).map((t) => {
                      const style = FLOW_STYLE[t.flow];
                      return (
                        <tr key={t.fingerprint} className="border-t border-cmd-border/60">
                          <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs text-cmd-muted">{t.date}</td>
                          <td className="max-w-[16rem] truncate py-2 pr-3 text-cmd-offwhite">{t.description}</td>
                          <td className="whitespace-nowrap py-2 pr-3 text-xs text-cmd-muted">{t.category}</td>
                          <td className="whitespace-nowrap py-2 pr-3 text-xs">
                            <span className={`inline-flex items-center gap-1 ${style.className}`}>
                              {style.icon}{style.label}
                            </span>
                          </td>
                          <td className={`whitespace-nowrap py-2 text-right font-mono ${t.amount < 0 ? 'text-cmd-offwhite' : 'text-cmd-gold'}`}>
                            {exact(t.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reading.skipped.length > 0 && (
            <div className="rounded-2xl border border-cmd-border bg-cmd-black/30 p-4">
              <button
                type="button"
                onClick={() => setShowSkipped(!showSkipped)}
                className="text-xs text-cmd-muted transition hover:text-cmd-gold"
              >
                {reading.skipped.length} row{reading.skipped.length === 1 ? '' : 's'} will be skipped
                {showSkipped ? ' — hide' : ' — show which'}
              </button>
              {showSkipped && (
                <ul className="mt-3 space-y-1.5 text-xs text-cmd-muted">
                  {reading.skipped.slice(0, 12).map((row) => (
                    <li key={row.rowNumber}>
                      <span className="font-mono">Line {row.rowNumber}</span> · {row.reason} · {row.preview}
                    </li>
                  ))}
                  {reading.skipped.length > 12 && <li>…and {reading.skipped.length - 12} more.</li>}
                </ul>
              )}
            </div>
          )}

          {/* Which account. Required, and the reason is the whole panel: a
              file of transactions that belongs to nothing cannot be reconciled
              against a balance, cannot be told apart from the next file, and
              leaves the household looking at a number with no idea what it
              covers. Either it matches something on file or it creates the
              thing it should have matched. */}
          <div className="rounded-2xl border border-cmd-border bg-cmd-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">
              Which account are these from?
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">
                  Kind of account
                </span>
                <select
                  value={sourceKind}
                  onChange={(e) => {
                    setSourceKind(e.target.value as 'bank' | 'card');
                    // The lists are different, so a selection made against one
                    // of them cannot carry over to the other.
                    setChoice('__new__');
                    setMatchNote(null);
                  }}
                  className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black px-3 py-2 text-sm text-cmd-offwhite focus:border-cmd-gold focus:outline-none"
                >
                  <option value="bank">Bank or checking</option>
                  <option value="card">Credit card</option>
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">
                  Account
                </span>
                <select
                  value={choice}
                  onChange={(e) => { setChoice(e.target.value); setMatchNote(null); }}
                  className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black px-3 py-2 text-sm text-cmd-offwhite focus:border-cmd-gold focus:outline-none"
                >
                  <option value="">Choose an account…</option>
                  {sourceKind === 'card'
                    ? cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.card_name || c.issuer || 'Card'}{c.last_four ? ` ····${c.last_four}` : ''}
                      </option>
                    ))
                    : accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_name}{a.institution ? ` · ${a.institution}` : ''}
                      </option>
                    ))}
                  <option value="__new__">
                    {sourceKind === 'card' ? 'Add a new card…' : 'Add a new account…'}
                  </option>
                </select>
              </label>
            </div>

            {matchNote && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-cmd-gold">
                <Check className="mt-0.5 h-3 w-3 shrink-0" /> {matchNote}
              </p>
            )}

            {choice === '__new__' && (
              <div className="mt-3 grid gap-3 border-t border-cmd-border pt-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">
                    {sourceKind === 'card' ? 'What to call the card' : 'What to call the account'}
                  </span>
                  <input
                    value={draft.account_name}
                    onChange={(e) => setDraft((p) => ({ ...p, account_name: e.target.value }))}
                    placeholder={sourceKind === 'card' ? 'Chase Sapphire' : 'Joint checking'}
                    className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black px-3 py-2 text-sm text-cmd-offwhite placeholder:text-cmd-muted/60 focus:border-cmd-gold focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">
                    Where it is held
                  </span>
                  <input
                    value={draft.institution}
                    onChange={(e) => setDraft((p) => ({ ...p, institution: e.target.value }))}
                    placeholder="Chase"
                    className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black px-3 py-2 text-sm text-cmd-offwhite placeholder:text-cmd-muted/60 focus:border-cmd-gold focus:outline-none"
                  />
                </label>
                {sourceKind === 'bank' && (
                  <>
                    <label className="block">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Kind</span>
                      <select
                        value={draft.account_type}
                        onChange={(e) => setDraft((p) => ({ ...p, account_type: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black px-3 py-2 text-sm text-cmd-offwhite focus:border-cmd-gold focus:outline-none"
                      >
                        {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">
                        Balance{reading.closingBalance != null ? ' (from the file)' : ' (optional)'}
                      </span>
                      <input
                        value={draft.balance}
                        onChange={(e) => setDraft((p) => ({ ...p, balance: e.target.value }))}
                        inputMode="decimal"
                        placeholder={reading.closingBalance != null ? String(reading.closingBalance) : '24000'}
                        className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black px-3 py-2 text-sm text-cmd-offwhite placeholder:text-cmd-muted/60 focus:border-cmd-gold focus:outline-none"
                      />
                    </label>
                  </>
                )}
                {reading.closingBalance != null && sourceKind === 'bank' && !draft.balance && (
                  <p className="text-xs text-cmd-muted sm:col-span-2">
                    The file shows a balance of{' '}
                    <button
                      type="button"
                      onClick={() => setDraft((p) => ({ ...p, balance: String(reading.closingBalance) }))}
                      className="font-mono text-cmd-gold underline decoration-dotted"
                    >
                      {exact(reading.closingBalance)}
                    </button>{' '}
                    on {reading.periodEnd}. Command does not fill it in for you — a running balance
                    column is not always the one you would call the balance.
                  </p>
                )}
              </div>
            )}
          </div>

          {vaultDocumentId ? (
            <p className="text-sm text-cmd-muted">
              This file is already in your vault. Importing links it to the transactions rather
              than storing a second copy.
            </p>
          ) : (
          <label className="flex items-start gap-2.5 text-sm text-cmd-muted">
            <input
              type="checkbox"
              checked={keepFile}
              onChange={(e) => setKeepFile(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-cmd-border bg-cmd-black accent-cmd-gold"
            />
            <span>
              Keep the file in the vault. The transactions are saved either way — this only
              decides whether the original spreadsheet is kept alongside them.
            </span>
          </label>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={commit}
              disabled={busy || reading.missing.length > 0 || reading.transactions.length === 0 || !accountReady}
              className="flex items-center gap-2 rounded-xl bg-cmd-gold px-5 py-2.5 text-sm font-medium text-cmd-black transition hover:bg-cmd-gold/90 disabled:opacity-40"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Import {reading.transactions.length} transaction{reading.transactions.length === 1 ? '' : 's'}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="text-sm text-cmd-muted transition hover:text-cmd-offwhite disabled:opacity-40"
            >
              Cancel
            </button>
            {!accountReady && (
              <p className="text-xs text-cmd-muted">
                {choice === '__new__'
                  ? `Name the ${sourceKind === 'card' ? 'card' : 'account'} above to import.`
                  : 'Choose which account these belong to above.'}
              </p>
            )}
          </div>
        </div>
      )}

      {imports.length > 0 && !reading && (
        <div className="mt-6 border-t border-cmd-border pt-5">
          <p className="text-xs uppercase tracking-[0.2em] text-cmd-muted">Files imported</p>
          <div className="mt-3 space-y-2">
            {imports.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cmd-border bg-cmd-charcoal p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-cmd-offwhite">{row.account_label}</p>
                  <p className="mt-1 text-xs text-cmd-muted">
                    {row.imported_count} transaction{row.imported_count === 1 ? '' : 's'}
                    {row.period_start ? ` · ${row.period_start} to ${row.period_end}` : ''}
                    {row.duplicate_count > 0 ? ` · ${row.duplicate_count} were already on file` : ''}
                    {row.skipped_count > 0 ? ` · ${row.skipped_count} skipped` : ''}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-cmd-muted/70">{row.file_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(row)}
                  disabled={busy}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-cmd-border px-3 py-1.5 text-xs text-cmd-muted transition hover:border-red-500/40 hover:text-red-300 disabled:opacity-40"
                  title="Remove this import and every transaction that came with it"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
