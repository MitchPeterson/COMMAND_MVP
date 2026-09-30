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
  addFinanceAccount, addCreditCardShell,
  type CreditCard, type FinanceAccount, type TransactionImportRow,
} from '../lib/supabase';
import { SECURITY_ONE_LINER } from '../lib/securityPosture';

interface Props {
  householdId: string;
  cards: CreditCard[];
  accounts: FinanceAccount[];
  imports: TransactionImportRow[];
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
  householdId, cards, accounts, imports, onChanged,
  incomingFile, incomingDocumentId, onIncomingHandled,
}: Props) {
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
  const loadFile = useCallback(async (chosen: File) => {
    setError(null); setDone(null); setBusy(true);
    try {
      const parsed = await readTransactionFile(chosen);
      if (parsed.rows.length === 0) throw new TransactionFileError('That file has no rows in it.');
      setGrid(parsed);
      setFile(chosen);
      setMapping(null); setSign(null);

      const looksLikeACard = /card|credit|amex|visa|mastercard|discover/i.test(chosen.name);
      const kind: 'bank' | 'card' = looksLikeACard ? 'card' : 'bank';
      setSourceKind(kind);

      const hint = hintFromFileName(chosen.name);
      const matchesFour = (text: string | null | undefined) =>
        !!hint.lastFour && !!text && text.includes(hint.lastFour);
      const matchesBank = (text: string | null | undefined) =>
        !!hint.institution && !!text && text.toLowerCase().includes(hint.institution.toLowerCase());

      const account = kind === 'bank'
        ? accounts.find((a) => matchesFour(a.account_name) || matchesFour(a.institution))
          ?? accounts.find((a) => matchesBank(a.institution) || matchesBank(a.account_name))
        : undefined;
      const card = kind === 'card'
        ? cards.find((c) => matchesFour(c.last_four))
          ?? cards.find((c) => matchesBank(c.issuer) || matchesBank(c.card_name))
        : undefined;
      const matched = account ?? card;

      if (matched) {
        setChoice(matched.id);
        setMatchNote(
          `Matched to ${'account_name' in matched ? matched.account_name : matched.card_name}`
          + `${hint.lastFour ? ` from the ${hint.lastFour} in the file name` : ' from the file name'}.`
          + ' Change it below if that is not right.',
        );
      } else {
        setChoice('__new__');
        setMatchNote(null);
        setDraft({
          account_name: [hint.institution, kind === 'card' ? 'card' : 'checking', hint.lastFour]
            .filter(Boolean).join(' ')
            || chosen.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 60),
          account_type: 'checking',
          institution: hint.institution ?? '',
          balance: '',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file.');
      setGrid(null); setFile(null);
    } finally {
      setBusy(false);
    }
  }, [accounts, cards]);

  const onDrop = useCallback(async (accepted: File[]) => {
    if (accepted[0]) await loadFile(accepted[0]);
  }, [loadFile]);

  // A file handed over by the section's own uploader.
  useEffect(() => {
    if (!incomingFile) return;
    setVaultDocumentId(incomingDocumentId ?? null);
    void loadFile(incomingFile);
    onIncomingHandled?.();
    // loadFile is stable enough here; re-running on a new file is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
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

  const commit = async () => {
    if (!reading || !file || reading.missing.length > 0 || !accountReady) return;
    setBusy(true); setError(null);
    try {
      // A file that came out of the vault is already stored. Uploading it
      // again would leave two copies of one statement and link the import to
      // the wrong one.
      let documentId: string | null = vaultDocumentId;
      if (keepFile && !vaultDocumentId) {
        // Stored, never sent for extraction: the rows are already read, and a
        // model pass over a CSV would cost money to learn nothing.
        const stored = await uploadDocumentAsset(householdId, file, 'finance');
        documentId = stored.id;
      }
      // The account comes first. If it cannot be created there is nothing to
      // attach the transactions to, and a half-done import that filed 400 rows
      // against no account is the state this step exists to prevent.
      let card = cards.find((c) => c.id === choice) ?? null;
      let account = accounts.find((a) => a.id === choice) ?? null;

      if (choice === '__new__') {
        if (sourceKind === 'card') {
          card = await addCreditCardShell(householdId, {
            card_name: draft.account_name.trim(),
            issuer: draft.institution,
            last_four: reading.accountHint.lastFour,
          });
        } else {
          account = await addFinanceAccount(householdId, {
            account_name: draft.account_name.trim(),
            account_type: draft.account_type,
            institution: draft.institution,
            // The closing balance off the file, where it carried one, so a new
            // account starts with a real figure rather than a blank.
            balance: draft.balance,
            as_of_date: reading.periodEnd ?? null,
          });
        }
      }

      const result = await commitTransactionImport(
        householdId,
        {
          fileName: file.name,
          fileFormat: /\.xlsx?$/i.test(file.name) ? 'xlsx' : 'csv',
          sourceKind,
          accountLabel: accountLabel || file.name,
          institution: card?.issuer ?? account?.institution ?? null,
          documentId,
          creditCardId: card?.id ?? null,
          financeAccountId: account?.id ?? null,
          signConvention: reading.signConvention,
          columnMap: { ...reading.mapping, headers: reading.headers, headerRow: reading.headerRow },
          rowCount: reading.totalRows,
          skippedCount: reading.skipped.length,
        },
        reading.transactions.map((t) => ({
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
      setDone(
        `${result.imported} transaction${result.imported === 1 ? '' : 's'} added`
        + (result.duplicates > 0 ? ` · ${result.duplicates} already on file` : '')
        + (reading.skipped.length > 0 ? ` · ${reading.skipped.length} row${reading.skipped.length === 1 ? '' : 's'} skipped` : ''),
      );
      reset();
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import those transactions.');
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
              {busy ? 'Reading the file…' : 'Drop a .csv or .xlsx export here'}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-cmd-muted">
              Most banks and card issuers offer one under Download, Export or Statements.
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
