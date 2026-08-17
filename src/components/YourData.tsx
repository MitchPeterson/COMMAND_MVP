// Taking your data, and leaving.
//
// A household hands Command its insurance, its will, its tax return and its
// balances. Being able to take all of it and go is the least a product holding
// that should offer, and neither half existed until now.
//
// Deletion is typed to confirm rather than clicked twice. A second click is a
// reflex; typing the word is a decision, and this is the one action in the app
// that nothing can undo.

import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Download, Shield, Trash2 } from 'lucide-react';
import { exportHouseholdData, deleteAllHouseholdData, signOut } from '../lib/supabase';

const CONFIRM_WORD = 'DELETE';

export function YourData() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [armed, setArmed] = useState(false);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await exportHouseholdData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `command-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build your export.');
    } finally {
      setBusy(false);
    }
  };

  const destroy = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAllHouseholdData();
      await signOut();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete your data.');
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="flex items-center gap-3">
          <Shield className="h-4 w-4 text-cmd-muted" />
          <span>
            <span className="block text-sm font-semibold text-cmd-offwhite">Your data</span>
            <span className="block text-xs text-cmd-muted">Download everything, or delete all of it</span>
          </span>
        </span>
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-cmd-muted" />
          : <ChevronRight className="h-4 w-4 shrink-0 text-cmd-muted" />}
      </button>

      {open && (
        <div className="mt-6 space-y-6">
          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="rounded-2xl border border-cmd-border bg-cmd-charcoal p-5">
            <p className="text-sm font-semibold text-cmd-offwhite">Download everything</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
              One file with every record Command holds for your household — policies, documents read,
              legal papers, accounts, loans, tax figures and the history of what changed. Your uploaded
              files are listed by name; download those from the Document Vault, which is the only
              place they exist.
            </p>
            <button
              type="button"
              onClick={download}
              disabled={busy}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cmd-border bg-cmd-black/60 px-4 py-2 text-sm font-medium text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> {busy ? 'Preparing…' : 'Download my data'}
            </button>
          </div>

          <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-cmd-offwhite">
              <AlertTriangle className="h-4 w-4 text-red-300" /> Delete everything
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
              Removes every document, every reading and every record, and deletes the uploaded files
              themselves. This cannot be undone and there is no copy kept — download your data first
              if you might want it.
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
              Your sign-in remains, so the email stays registered. To remove the login itself, ask and
              it will be deleted for you.
            </p>

            {!armed ? (
              <button
                type="button"
                onClick={() => setArmed(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-500/40 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" /> Delete all of my data
              </button>
            ) : (
              <div className="mt-4">
                {/* Typed, not double-clicked. A second click is a reflex. */}
                <label className="text-xs uppercase tracking-[0.16em] text-cmd-muted">
                  Type {CONFIRM_WORD} to confirm
                  <input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    autoFocus
                    className="mt-1 w-full max-w-xs rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2 text-sm text-cmd-offwhite"
                  />
                </label>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={destroy}
                    disabled={busy || confirmText !== CONFIRM_WORD}
                    className="rounded-xl border border-red-500 bg-red-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy ? 'Deleting…' : 'Delete permanently'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setArmed(false); setConfirmText(''); }}
                    className="rounded-xl border border-cmd-border px-4 py-2 text-sm text-cmd-muted transition hover:text-cmd-offwhite"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Said plainly rather than left to be inferred. */}
          <div className="rounded-2xl border border-cmd-border bg-cmd-black/30 p-5">
            <p className="text-sm font-semibold text-cmd-offwhite">How your documents are read</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-cmd-muted">
              <li>
                Your files are stored privately. They are reachable only through your own account,
                using links that expire within minutes.
              </li>
              <li>
                To read a document, Command sends it to Anthropic&rsquo;s API. That is the only third
                party involved, and it is how the reading is done at all.
              </li>
              <li>
                Social Security and tax ID numbers, bank and card account numbers and driver&rsquo;s
                licence numbers are stripped from everything Command records, and the database
                refuses to store them. The original file keeps whatever it always had.
              </li>
              <li>
                Nothing extracted reaches your profile until you confirm it, and no reading is shared
                with anyone.
              </li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
