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

import React, { useCallback, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  ArrowLeftRight, ArrowDownLeft, ArrowUpRight, FileSpreadsheet, Loader2,
  RotateCcw, Trash2, AlertTriangle, Check, Lock,
} from 'lucide-react';
import { readTransactionFile, TransactionFileError, type SheetGrid } from '../lib/transactionFile';
import {
  readTransactions, type ImportReading, type ColumnMapping, type SignConvention, type Flow,
} from '../lib/transactionImport';
import {
  commitTransactionImport, deleteTransactionImport, uploadDocumentAsset,
  type CreditCard, type FinanceAccount, type TransactionImportRow,
} from '../lib/supabase';
import { SECURITY_ONE_LINER } from '../lib/securityPosture';

interface Props {
  householdId: string;
  cards: CreditCard[];
  accounts: FinanceAccount[];
  imports: TransactionImportRow[];
  onChanged: () => Promise<void> | void;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const exact = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const FLOW_STYLE: Record<Flow, { label: string; className: string; icon: React.ReactNode }> = {
  expense: { label: 'Spent', className: 'text-cmd-offwhite', icon: <ArrowUpRight className="h-3 w-3" /> },
  income: { label: 'Income', className: 'text-cmd-gold', icon: <ArrowDownLeft className="h-3 w-3" /> },
  transfer: { label: 'Transfer', className: 'text-cmd-muted', icon: <ArrowLeftRight className="h-3 w-3" /> },
  refund: { label: 'Refund', className: 'text-cmd-muted', icon: <ArrowDownLeft className="h-3 w-3" /> },
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

export function TransactionImportPanel({ householdId, cards, accounts, imports, onChanged }: Props) {
  const [grid, setGrid] = useState<SheetGrid | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  // Corrections. Null means "whatever Command worked out".
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [sign, setSign] = useState<SignConvention | null>(null);
  const [sourceKind, setSourceKind] = useState<'bank' | 'card'>('bank');
  const [label, setLabel] = useState('');
  const [linkId, setLinkId] = useState('');
  const [keepFile, setKeepFile] = useState(true);
  const [showSkipped, setShowSkipped] = useState(false);

  const reading: ImportReading | null = useMemo(() => {
    if (!grid) return null;
    return readTransactions(grid, {
      accountLabel: label || file?.name || 'Imported',
      sourceKind,
      mapping: mapping ?? undefined,
      signConvention: sign ?? undefined,
    });
  }, [grid, label, file, sourceKind, mapping, sign]);

  const reset = () => {
    setGrid(null); setFile(null); setMapping(null); setSign(null);
    setLabel(''); setLinkId(''); setError(null); setShowSkipped(false);
  };

  const onDrop = useCallback(async (accepted: File[]) => {
    const chosen = accepted[0];
    if (!chosen) return;
    setError(null); setDone(null); setBusy(true);
    try {
      const parsed = await readTransactionFile(chosen);
      if (parsed.rows.length === 0) throw new TransactionFileError('That file has no rows in it.');
      setGrid(parsed);
      setFile(chosen);
      setMapping(null); setSign(null);
      // A sensible name to start from: the file, minus its extension.
      setLabel(chosen.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 60));
      // A file whose amounts are mostly positive is usually a card export.
      setSourceKind(/card|credit|amex|visa|mastercard|discover/i.test(chosen.name) ? 'card' : 'bank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file.');
      setGrid(null); setFile(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'text/csv': ['.csv'],
      'text/tab-separated-values': ['.tsv'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
  });

  const totals = useMemo(() => {
    const sum = { expense: 0, income: 0, transfer: 0, refund: 0 };
    for (const t of reading?.transactions ?? []) sum[t.flow] += Math.abs(t.amount);
    return sum;
  }, [reading]);

  const commit = async () => {
    if (!reading || !file || reading.missing.length > 0) return;
    setBusy(true); setError(null);
    try {
      let documentId: string | null = null;
      if (keepFile) {
        // Stored, never sent for extraction: the rows are already read, and a
        // model pass over a CSV would cost money to learn nothing.
        const stored = await uploadDocumentAsset(householdId, file, 'finance');
        documentId = stored.id;
      }
      const card = cards.find((c) => c.id === linkId);
      const account = accounts.find((a) => a.id === linkId);
      const result = await commitTransactionImport(
        householdId,
        {
          fileName: file.name,
          fileFormat: /\.xlsx?$/i.test(file.name) ? 'xlsx' : 'csv',
          sourceKind,
          accountLabel: label.trim() || file.name,
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
          categorySource: t.categorySource,
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
    <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
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
              ['Transfers', totals.transfer, 'not counted as spending'],
              ['Refunds', totals.refund, `${reading.transactions.filter((t) => t.flow === 'refund').length} items`],
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

          {/* What to call it */}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block sm:col-span-2">
              <span className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">
                What to call this account
              </span>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Wells Fargo checking"
                className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black px-3 py-2 text-sm text-cmd-offwhite placeholder:text-cmd-muted/60 focus:border-cmd-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Kind of account</span>
              <select
                value={sourceKind}
                onChange={(e) => setSourceKind(e.target.value as 'bank' | 'card')}
                className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black px-3 py-2 text-sm text-cmd-offwhite focus:border-cmd-gold focus:outline-none"
              >
                <option value="bank">Bank or checking</option>
                <option value="card">Credit card</option>
              </select>
            </label>
          </div>

          {(cards.length > 0 || accounts.length > 0) && (
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">
                Attach to an account already on file (optional)
              </span>
              <select
                value={linkId}
                onChange={(e) => setLinkId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black px-3 py-2 text-sm text-cmd-offwhite focus:border-cmd-gold focus:outline-none"
              >
                <option value="">Not attached</option>
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
              </select>
            </label>
          )}

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

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={commit}
              disabled={busy || reading.missing.length > 0 || reading.transactions.length === 0}
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
