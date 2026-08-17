// A persistent row above whichever section is open: find something, or add a
// document, from anywhere.
//
// Two gaps it closes. A document could only be uploaded from inside a pillar
// section, which meant deciding what a document was before Command had read it —
// and the Document Vault, the one screen actually about documents, had no
// uploader at all. And nothing searched anything, so finding a file meant
// remembering which section had claimed it.
//
// Deliberately not a command palette. It searches sections and document names,
// which is what exists to be found, and stops there.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Menu, Newspaper, Plus, Search, X } from 'lucide-react';
import { navItems } from '../views/components/Sidebar';
import { UploadDropzone } from './UploadDropzone';
import { uploadDocumentAsset, invokeDocumentExtraction, type Document } from '../lib/supabase';

interface AppHeaderProps {
  /** Opens the nav drawer. Only rendered below lg, where the rail is hidden. */
  onOpenNav?: () => void;
  /** Opens the brief on demand, between its weekly appearances. */
  onOpenBrief?: () => void;
  householdId?: string | null;
  documents: Document[];
  onNavigate: (view: string, focus?: string) => void;
  onUploaded: () => Promise<void> | void;
}

interface SearchHit {
  kind: 'section' | 'document';
  id: string;
  label: string;
  detail: string;
  view: string;
  focus?: string;
}

/** Prefix matches first — typing "ta" should reach Taxes before a file that merely contains it. */
function rank(label: string, query: string): number {
  const l = label.toLowerCase();
  if (l.startsWith(query)) return 0;
  if (l.includes(` ${query}`)) return 1;
  return l.includes(query) ? 2 : -1;
}

export function AppHeader({ onOpenNav, onOpenBrief, householdId, documents, onNavigate, onUploaded }: AppHeaderProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [uploading, setUploading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const sections = navItems
      .map((item) => ({ item, score: rank(item.label, q) }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => a.score - b.score)
      .map(({ item }): SearchHit => ({
        kind: 'section', id: item.id, label: item.label, detail: 'Section', view: item.id,
      }));

    const files = documents
      .map((doc) => ({ doc, score: rank(doc.name ?? '', q) }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => a.score - b.score)
      .slice(0, 6)
      .map(({ doc }): SearchHit => ({
        kind: 'document', id: doc.id, label: doc.name ?? 'Untitled',
        detail: doc.category ? `Document · ${doc.category}` : 'Document',
        view: 'documents', focus: doc.id,
      }));

    return [...sections, ...files];
  }, [query, documents]);

  useEffect(() => setCursor(0), [query]);

  // Anything can ask for the upload sheet without knowing where the button is.
  useEffect(() => {
    const open = () => setUploading(true);
    window.addEventListener('command:add-document', open);
    return () => window.removeEventListener('command:add-document', open);
  }, []);

  // Close on an outside click, so the results do not sit over the page.
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const choose = (hit: SearchHit) => {
    onNavigate(hit.view, hit.focus);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') { setOpen(false); inputRef.current?.blur(); return; }
    if (hits.length === 0) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setCursor((c) => (c + 1) % hits.length); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setCursor((c) => (c - 1 + hits.length) % hits.length); }
    if (event.key === 'Enter') { event.preventDefault(); choose(hits[cursor] ?? hits[0]); }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-cmd-border bg-cmd-black/80 px-4 py-3 backdrop-blur sm:gap-3 sm:px-6">
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="shrink-0 rounded-xl border border-cmd-border bg-cmd-black/60 p-2 text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div ref={boxRef} className="relative min-w-0 max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cmd-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search"
            title="Search sections and documents"
            className="w-full rounded-xl border border-cmd-border bg-cmd-black/60 py-2 pl-9 pr-8 text-base text-cmd-offwhite placeholder:text-cmd-muted focus:border-cmd-gold/50 focus:outline-none sm:text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-cmd-muted transition hover:text-cmd-offwhite"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {open && query.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-cmd-border bg-cmd-charcoal shadow-xl shadow-black/40">
              {hits.length === 0 ? (
                <p className="px-4 py-3 text-sm text-cmd-muted">
                  Nothing matching &ldquo;{query.trim()}&rdquo;. Search covers section names and the
                  documents in your vault.
                </p>
              ) : (
                <ul className="max-h-80 overflow-auto py-1">
                  {hits.map((hit, i) => (
                    <li key={`${hit.kind}-${hit.id}`}>
                      <button
                        type="button"
                        onMouseEnter={() => setCursor(i)}
                        onClick={() => choose(hit)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                          i === cursor ? 'bg-cmd-gold/10' : 'hover:bg-white/5'
                        }`}
                      >
                        {hit.kind === 'section'
                          ? <Search className="h-4 w-4 shrink-0 text-cmd-gold/70" />
                          : <FileText className="h-4 w-4 shrink-0 text-cmd-muted" />}
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-cmd-offwhite">{hit.label}</span>
                          <span className="block text-xs text-cmd-muted">{hit.detail}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenBrief}
          aria-label="Open your brief"
          title="What changed since you last looked"
          className="ml-auto shrink-0 rounded-xl border border-cmd-border bg-cmd-black/60 p-2 text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
        >
          <Newspaper className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setUploading(true)}
          disabled={!householdId}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-cmd-gold/40 bg-cmd-gold/10 px-3 py-2 text-sm font-medium text-cmd-gold transition hover:bg-cmd-gold/20 disabled:opacity-40 sm:px-4"
        >
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add document</span>
        </button>
      </header>

      {uploading && householdId && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-auto bg-black/70 p-4 backdrop-blur-sm sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setUploading(false); }}
        >
          <div className="mt-6 w-full max-w-xl rounded-3xl border border-cmd-border bg-cmd-charcoal p-5 sm:mt-16 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Add a document</p>
                <h2 className="mt-2 text-xl font-semibold text-cmd-offwhite">
                  Command will work out what it is
                </h2>
                <p className="mt-2 text-sm leading-6 text-cmd-muted">
                  A policy, a will, a statement, a return — it is read first and filed to the right
                  section afterwards, so you do not have to decide before uploading.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUploading(false)}
                className="shrink-0 rounded-lg p-1 text-cmd-muted transition hover:text-cmd-offwhite"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* The same component every section uses. The only difference here is
                the category: a section knows what it is receiving, this does not,
                so it goes in unclassified and the extractor decides. */}
            <UploadDropzone
              contextLabel=""
              buttonLabel="Choose a file"
              onUpload={async (file) => {
                const uploaded = await uploadDocumentAsset(householdId, file, 'general');
                await invokeDocumentExtraction(uploaded.id);
                await onUploaded();
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
