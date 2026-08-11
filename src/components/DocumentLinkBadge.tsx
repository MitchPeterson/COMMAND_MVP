// Whether a record has a file behind it, said the same way in every section.
//
// "No document on file" is a legitimate state, not a failure — Command knows a
// directive exists because the user said so. But it has to be visible, or five
// records and one PDF look like the same five things, which is exactly how the
// Legal section came to contradict the vault.

import React, { useState } from 'react';
import { FileWarning, Paperclip } from 'lucide-react';
import { getDocumentUrl, type Document } from '../lib/supabase';
import { linkFor, type RecordLink } from '../lib/documentLinks';

interface Props {
  /** The record's `source_document_id`, whatever the section calls it. */
  sourceDocumentId: string | null | undefined;
  documents: Document[];
  /** Set where the caller knows the record came from an extraction. */
  everHadDocument?: boolean;
  className?: string;
}

export function DocumentLinkBadge({
  sourceDocumentId, documents, everHadDocument = false, className = '',
}: Props) {
  const [busy, setBusy] = useState(false);
  const link: RecordLink = linkFor(sourceDocumentId, documents, everHadDocument);

  if (link.state === 'linked' && link.document?.file_path) {
    const open = async () => {
      setBusy(true);
      try {
        const url = await getDocumentUrl(link.document!.file_path!);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
      } finally {
        setBusy(false);
      }
    };
    return (
      <button
        type="button"
        onClick={open}
        disabled={busy}
        title={link.document.name}
        className={`inline-flex items-center gap-1.5 rounded-full border border-cmd-border bg-cmd-black/60 px-3 py-1 text-xs text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold disabled:opacity-50 ${className}`}
      >
        <Paperclip className="h-3 w-3" /> {busy ? 'Opening…' : 'View document'}
      </button>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
      link.state === 'document_removed'
        ? 'border-amber-500/30 bg-amber-500/5 text-amber-200'
        : 'border-cmd-border bg-cmd-black/60 text-cmd-muted'
    } ${className}`}>
      <FileWarning className="h-3 w-3" /> {link.label}
    </span>
  );
}
