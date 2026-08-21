// Somewhere to say "this is broken" or "it should do this".
//
// Two things make a report actionable that a person should not have to supply:
// where they were when it happened, and a title that reads well in a backlog.
// The first is captured silently. The second is what Refine with AI is for —
// it rewrites the report and categorizes it, and keeps what the person actually
// typed, because the rewrite is Command's words and the original is theirs.
//
// A screenshot is pasted rather than chosen from a file dialog. Anyone
// reporting a visual bug already has the image on their clipboard.

import React, { useEffect, useRef, useState } from 'react';
import { Bug, Check, Image as ImageIcon, Lightbulb, Loader2, HelpCircle, Sparkles, Undo2, X } from 'lucide-react';
import {
  submitFeedback, uploadFeedbackScreenshot, refineFeedback,
  type FeedbackKind,
} from '../lib/supabase';

interface Props {
  householdId: string | null;
  /** The screen they were on, which is most of the triage. */
  view: string;
  onClose: () => void;
}

const KINDS: Array<{ id: FeedbackKind; label: string; icon: React.ReactNode; hint: string }> = [
  { id: 'defect', label: 'Something is broken', icon: <Bug className="h-4 w-4" />, hint: 'It did the wrong thing, or nothing at all.' },
  { id: 'idea', label: 'An idea', icon: <Lightbulb className="h-4 w-4" />, hint: 'Something Command should do that it does not.' },
  { id: 'question', label: 'A question', icon: <HelpCircle className="h-4 w-4" />, hint: 'Something that did not make sense.' },
];

const field =
  'mt-1.5 w-full rounded-xl border border-cmd-border bg-cmd-black/60 px-3 py-2.5 text-sm text-cmd-offwhite '
  + 'placeholder-cmd-muted/50 outline-none transition focus:border-cmd-gold/50';
const label = 'text-xs uppercase tracking-[0.16em] text-cmd-muted';

export function FeedbackDialog({ householdId, view, onClose }: Props) {
  const [kind, setKind] = useState<FeedbackKind>('defect');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [shot, setShot] = useState<{ file: File; url: string } | null>(null);
  const [busy, setBusy] = useState<'refining' | 'sending' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [question, setQuestion] = useState<string | null>(null);
  // Kept so the rewrite can be undone. The person's own words are the record.
  const [beforeRefine, setBeforeRefine] = useState<{ title: string; body: string } | null>(null);
  const [meta, setMeta] = useState<{ category: string; severity: 'low' | 'medium' | 'high' | 'critical' } | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  // Paste anywhere in the dialog, not only into a designated box.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const item = [...(event.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
      if (!item) return;
      const file = item.getAsFile();
      if (!file) return;
      event.preventDefault();
      setShot((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { file, url: URL.createObjectURL(file) };
      });
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  useEffect(() => () => { if (shot) URL.revokeObjectURL(shot.url); }, [shot]);

  const refine = async () => {
    setBusy('refining');
    setError(null);
    setQuestion(null);
    try {
      const result = await refineFeedback({
        title, body, kind, view, hasScreenshot: Boolean(shot),
      });
      setBeforeRefine({ title, body });
      setTitle(result.title);
      setBody(result.body);
      setKind(result.kind);
      setMeta({ category: result.category, severity: result.severity });
      setQuestion(result.clarifying_question?.trim() || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refine that.');
    } finally {
      setBusy(null);
    }
  };

  const undo = () => {
    if (!beforeRefine) return;
    setTitle(beforeRefine.title);
    setBody(beforeRefine.body);
    setBeforeRefine(null);
    setMeta(null);
    setQuestion(null);
  };

  const send = async () => {
    if (!householdId) { setError('No household on this account yet.'); return; }
    if (!title.trim()) { setError('A title is needed.'); return; }
    setBusy('sending');
    setError(null);
    try {
      const screenshotPath = shot ? await uploadFeedbackScreenshot(householdId, shot.file) : null;
      await submitFeedback(householdId, {
        kind, title, body,
        category: meta?.category ?? null,
        severity: meta?.severity ?? null,
        originalTitle: beforeRefine?.title ?? title,
        originalBody: beforeRefine?.body ?? body,
        refinedAt: beforeRefine ? new Date().toISOString() : null,
        screenshotPath,
        appView: view,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-auto bg-black/70 p-4 backdrop-blur-sm sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="mt-6 w-full max-w-xl rounded-3xl border border-cmd-border bg-cmd-charcoal p-6 sm:mt-16">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cmd-gold">Tell us</p>
            <h2 className="mt-2 text-xl font-semibold text-cmd-offwhite">
              {sent ? 'Thank you — that is logged' : 'What should we know?'}
            </h2>
          </div>
          <button
            type="button" onClick={onClose} aria-label="Close"
            className="shrink-0 rounded-lg border border-cmd-border p-1.5 text-cmd-muted transition hover:text-cmd-offwhite"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="mt-6">
            <p className="text-sm leading-6 text-cmd-muted">
              It went in with the screen you were on and the version you are running, so it can be
              looked at without asking you to reproduce anything.
            </p>
            <button
              type="button" onClick={onClose}
              className="mt-6 w-full rounded-xl bg-cmd-gold px-4 py-2.5 text-sm font-semibold text-cmd-black transition hover:bg-cmd-gold-hover"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {KINDS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setKind(option.id)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    kind === option.id
                      ? 'border-cmd-gold bg-cmd-gold/10 text-cmd-gold'
                      : 'border-cmd-border bg-cmd-black/40 text-cmd-muted hover:text-cmd-offwhite'
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {option.icon} {option.label}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-cmd-muted">{KINDS.find((k) => k.id === kind)?.hint}</p>

            <div className="mt-5">
              <label className={label}>
                Title
                <input
                  value={title}
                  autoFocus
                  placeholder={kind === 'defect' ? 'Saving a house adds it twice' : 'Let me export a policy comparison'}
                  className={field}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
            </div>

            <div className="mt-4">
              <label className={label}>
                What happened
                <textarea
                  ref={bodyRef}
                  value={body}
                  rows={5}
                  placeholder={kind === 'defect'
                    ? 'What you did, what you saw, and what you expected instead.'
                    : 'What you are trying to do, and why it matters.'}
                  className={`${field} resize-y`}
                  onChange={(e) => setBody(e.target.value)}
                />
              </label>
            </div>

            {/* Paste, rather than choose a file. */}
            <div className="mt-4 rounded-2xl border border-dashed border-cmd-border bg-cmd-black/30 p-4">
              {shot ? (
                <div className="flex items-start gap-3">
                  <img src={shot.url} alt="Pasted screenshot" className="max-h-28 rounded-lg border border-cmd-border" />
                  <button
                    type="button"
                    onClick={() => { URL.revokeObjectURL(shot.url); setShot(null); }}
                    className="text-xs text-cmd-muted transition hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-xs text-cmd-muted">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Take a screenshot and press {navigator.platform.includes('Mac') ? '⌘V' : 'Ctrl+V'} anywhere in this box.
                </p>
              )}
            </div>

            {question && (
              <p className="mt-4 rounded-2xl border border-cmd-gold/25 bg-cmd-gold/5 px-4 py-3 text-sm leading-6 text-cmd-muted">
                One thing that would help: {question}
              </p>
            )}

            {meta && (
              <p className="mt-3 text-xs text-cmd-muted">
                Filed under <span className="text-cmd-offwhite">{meta.category}</span> ·{' '}
                <span className="text-cmd-offwhite">{meta.severity}</span>. Your original wording is
                kept with the ticket.
              </p>
            )}

            {error && (
              <p className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={send}
                disabled={busy !== null || !title.trim()}
                className="rounded-xl bg-cmd-gold px-5 py-2.5 text-sm font-semibold text-cmd-black transition hover:bg-cmd-gold-hover disabled:opacity-40"
              >
                {busy === 'sending' ? 'Sending…' : 'Send it'}
              </button>

              {beforeRefine ? (
                <button
                  type="button"
                  onClick={undo}
                  className="inline-flex items-center gap-2 rounded-xl border border-cmd-border px-4 py-2.5 text-sm text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
                >
                  <Undo2 className="h-4 w-4" /> Use my wording
                </button>
              ) : (
                <button
                  type="button"
                  onClick={refine}
                  disabled={busy !== null || (!title.trim() && !body.trim())}
                  className="inline-flex items-center gap-2 rounded-xl border border-cmd-gold/40 bg-cmd-gold/10 px-4 py-2.5 text-sm font-medium text-cmd-gold transition hover:bg-cmd-gold/20 disabled:opacity-40"
                >
                  {busy === 'refining'
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Refining…</>
                    : <><Sparkles className="h-4 w-4" /> Refine with AI</>}
                </button>
              )}

              {beforeRefine && !error && (
                <span className="inline-flex items-center gap-1.5 text-xs text-cmd-muted">
                  <Check className="h-3.5 w-3.5 text-cmd-gold" /> Rewritten
                </span>
              )}
            </div>

            <p className="mt-4 text-xs leading-5 text-cmd-muted/70">
              The screen you are on and your app version go with it. Nothing from your documents does.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
