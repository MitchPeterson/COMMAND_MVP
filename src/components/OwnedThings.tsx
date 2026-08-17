// Typing in what you own, without a document.
//
// Finances told people to type their accounts in and then offered them a file
// uploader, and a follow-up asking "do you still own the 2022 Volvo XC90?" led
// to a page with nowhere to say yes. Plenty of what a household owns has no
// paperwork worth uploading — a car owned outright has no loan statement, and a
// savings balance is a number you know.
//
// Prefilling matters here more than it looks. Arriving from a question that
// already named the vehicle and being handed an empty form is the moment someone
// gives up, so the answer comes with the question already in it.

import React, { useEffect, useState } from 'react';
import { Car, Landmark, Plus, Trash2 } from 'lucide-react';
import {
  addAsset, deleteAsset, addFinanceAccount, deleteFinanceAccount,
  type Asset, type AssetType, type FinanceAccount,
} from '../lib/supabase';

interface Props {
  householdId: string;
  accounts: FinanceAccount[];
  assets: Asset[];
  /** Something the user was asked about, arriving already filled in. */
  prefillAsset?: { name: string; type: AssetType } | null;
  onChanged: () => Promise<void> | void;
}

const ASSET_TYPES: Array<{ code: AssetType; label: string }> = [
  { code: 'vehicle', label: 'Vehicle' },
  { code: 'real_estate', label: 'Property' },
  { code: 'investment', label: 'Investment' },
  { code: 'retirement', label: 'Retirement' },
  { code: 'business', label: 'Business' },
  { code: 'other', label: 'Something else' },
];

const ACCOUNT_TYPES = [
  'checking', 'savings', 'money market', 'brokerage', 'retirement',
  'education', 'hsa', 'certificate of deposit',
];

const money = (value: number | null) =>
  value == null ? '--' : `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const field =
  'mt-1 w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2 text-sm text-cmd-offwhite';
const label = 'text-xs uppercase tracking-[0.16em] text-cmd-muted';

export function OwnedThings({ householdId, accounts, assets, prefillAsset, onChanged }: Props) {
  const [mode, setMode] = useState<'none' | 'account' | 'asset'>('none');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState({ account_name: '', account_type: 'checking', institution: '', balance: '' });
  const [asset, setAsset] = useState({ name: '', type: 'vehicle' as AssetType, current_value: '', notes: '' });

  // A question that named something opens the form holding it.
  useEffect(() => {
    if (!prefillAsset) return;
    setAsset((prev) => ({ ...prev, name: prefillAsset.name, type: prefillAsset.type }));
    setMode('asset');
  }, [prefillAsset]);

  const save = async (what: 'account' | 'asset') => {
    setError(null);
    setBusy(true);
    try {
      if (what === 'account') {
        await addFinanceAccount(householdId, account);
        setAccount({ account_name: '', account_type: 'checking', institution: '', balance: '' });
      } else {
        await addAsset(householdId, asset);
        setAsset({ name: '', type: 'vehicle', current_value: '', notes: '' });
      }
      setMode('none');
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (kind: 'account' | 'asset', id: string) => {
    try {
      await (kind === 'account' ? deleteFinanceAccount(id) : deleteAsset(id));
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that.');
    }
  };

  return (
    <section id="section-manual-entry" className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Add it yourself</p>
      <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">No document needed</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
        A balance is a number you already know, and a car owned outright has no statement to upload.
        Type either in — it counts toward your net worth exactly the same.
      </p>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {assets.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className={label}>Things you own</p>
          {assets.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-cmd-border bg-cmd-charcoal px-4 py-3">
              <Car className="h-4 w-4 shrink-0 text-cmd-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-cmd-offwhite">{item.name}</p>
                <p className="text-xs text-cmd-muted">{item.type.replace(/_/g, ' ')}</p>
              </div>
              <span className="shrink-0 font-mono text-sm text-cmd-offwhite">{money(item.current_value)}</span>
              <button
                type="button"
                onClick={() => remove('asset', item.id)}
                aria-label={`Remove ${item.name}`}
                className="shrink-0 text-cmd-muted transition hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3 border-t border-cmd-border pt-6">
        <button
          type="button"
          onClick={() => setMode(mode === 'account' ? 'none' : 'account')}
          className="inline-flex items-center gap-2 rounded-full border border-cmd-border px-4 py-2 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
        >
          <Landmark className="h-4 w-4" /> Add an account
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'asset' ? 'none' : 'asset')}
          className="inline-flex items-center gap-2 rounded-full border border-cmd-border px-4 py-2 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
        >
          <Plus className="h-4 w-4" /> Add a vehicle or something else you own
        </button>
      </div>

      {mode === 'account' && (
        <div className="mt-4 rounded-3xl border border-cmd-border bg-cmd-charcoal p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className={label}>
              What is it
              <input value={account.account_name} placeholder="Joint checking" className={field}
                onChange={(e) => setAccount((p) => ({ ...p, account_name: e.target.value }))} />
            </label>
            <label className={label}>
              Kind
              <select value={account.account_type} className={field}
                onChange={(e) => setAccount((p) => ({ ...p, account_type: e.target.value }))}>
                {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className={label}>
              Where it is held
              <input value={account.institution} placeholder="Ally Bank" className={field}
                onChange={(e) => setAccount((p) => ({ ...p, institution: e.target.value }))} />
            </label>
            <label className={label}>
              Balance
              <input value={account.balance} inputMode="decimal" placeholder="24000" className={field}
                onChange={(e) => setAccount((p) => ({ ...p, balance: e.target.value }))} />
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => save('account')} disabled={busy}
              className="rounded-full bg-cmd-gold px-5 py-2 text-sm font-semibold text-cmd-black transition disabled:opacity-50">
              {busy ? 'Saving…' : 'Save the account'}
            </button>
            <button type="button" onClick={() => setMode('none')}
              className="rounded-full border border-cmd-border px-5 py-2 text-sm text-cmd-muted transition hover:text-cmd-offwhite">
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'asset' && (
        <div className="mt-4 rounded-3xl border border-cmd-gold/30 bg-cmd-charcoal p-5">
          {prefillAsset && (
            <p className="mb-4 rounded-xl border border-cmd-gold/25 bg-cmd-gold/5 px-3 py-2 text-sm text-cmd-muted">
              Filled in from your insurance policy. Change anything that is not right, and add its
              value if you know it.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className={label}>
              What is it
              <input value={asset.name} placeholder="2022 Volvo XC90" className={field}
                onChange={(e) => setAsset((p) => ({ ...p, name: e.target.value }))} />
            </label>
            <label className={label}>
              Kind
              <select value={asset.type} className={field}
                onChange={(e) => setAsset((p) => ({ ...p, type: e.target.value as AssetType }))}>
                {ASSET_TYPES.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
              </select>
            </label>
            <label className={label}>
              Roughly what it is worth
              <input value={asset.current_value} inputMode="decimal" placeholder="48500" className={field}
                onChange={(e) => setAsset((p) => ({ ...p, current_value: e.target.value }))} />
            </label>
          </div>
          <p className="mt-3 text-xs text-cmd-muted">
            An estimate is fine. It is there so your net worth is not missing something you own.
          </p>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => save('asset')} disabled={busy}
              className="rounded-full bg-cmd-gold px-5 py-2 text-sm font-semibold text-cmd-black transition disabled:opacity-50">
              {busy ? 'Saving…' : 'Save it'}
            </button>
            <button type="button" onClick={() => setMode('none')}
              className="rounded-full border border-cmd-border px-5 py-2 text-sm text-cmd-muted transition hover:text-cmd-offwhite">
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
