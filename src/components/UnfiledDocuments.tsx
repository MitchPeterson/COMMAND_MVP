// Files in the vault that this section does not count.
//
// The other half of the vault/section mismatch. A user uploads a policy, sees it
// in the Document Vault, and reasonably believes Insurance knows about it. If
// the reading was never run — or was run and never confirmed — no policy record
// exists and the section behaves as though the file does not exist. That gap was
// invisible from both screens, which is the more damaging direction of the two:
// the grade on the page is quietly computed without the document.

import React, { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { getDocumentUrl, invokeDocumentExtraction, type Document } from '../lib/supabase';
import { unfiledFor, type LinkableData } from '../lib/documentLinks';

interface Props {
  /** View key: legal, insurance, home, credit, taxes, finances. */
  section: string;
  documents: Document[];
  data: LinkableData;
  onChanged: () => Promise<void> | void;
}

export function UnfiledDocuments({ section, documents, data, onChanged }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unfiled = unfiledFor(section, documents, data);

  if (unfiled.length === 0) return null;

  const open = async (file: Document) => {
    if (!file.file_path) return;
    const url = await getDocumentUrl(file.file_path);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const read = async (file: Document) => {
    setBusyId(file.id);
    setError(null);
    try {
      await invokeDocumentExtraction(file.id);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that document.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-3xl border border-amber-500/25 bg-amber-500/5 p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">In the vault, not counted here</p>
      <h2 className="mt-2 text-2xl font-semibold text-cmd-offwhite">
        {unfiled.length} file{unfiled.length === 1 ? '' : 's'} nothing on this page depends on
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
        These are in your Document Vault but have not produced a record in this section — either the
        reading has not been run, or it was run and never confirmed. Until then the grade above is
        calculated without them.
      </p>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-5 space-y-3">
        {unfiled.map((file) => (
          <div
            key={file.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cmd-border bg-cmd-black/40 p-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <FolderOpen className="h-4 w-4 shrink-0 text-cmd-muted" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-cmd-offwhite">{file.name}</p>
                <p className="text-xs text-cmd-muted">
                  {file.status === 'processed'
                    ? 'Read, but not confirmed into this section'
                    : file.status === 'error'
                      ? 'The last reading failed'
                      : 'Not read yet'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => open(file)}
                disabled={!file.file_path}
                className="rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-1.5 text-xs text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold disabled:opacity-40"
              >
                View file
              </button>
              <button
                type="button"
                onClick={() => read(file)}
                disabled={busyId === file.id}
                className="rounded-xl border border-cmd-gold/40 bg-cmd-gold/10 px-3 py-1.5 text-xs text-cmd-gold transition hover:bg-cmd-gold/20 disabled:opacity-50"
              >
                {busyId === file.id ? 'Reading…' : 'Read it'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
