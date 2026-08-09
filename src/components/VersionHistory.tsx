import React, { useState } from 'react';
import { APP_VERSION, RELEASE_NOTES, formatReleaseDate } from '../lib/releaseNotes';
import { X } from 'lucide-react';

/**
 * The running version, clickable, with every release behind it. This is the
 * application's history — what we shipped. The household's own change log lives
 * in <HouseholdHistory /> and answers a different question: what you changed.
 */
export function VersionHistory() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg text-left text-xl font-semibold text-cmd-offwhite underline decoration-cmd-gold/40 decoration-dotted underline-offset-4 transition hover:text-cmd-gold"
        title="See what changed in each release"
      >
        v{APP_VERSION}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Version history"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-3xl border border-cmd-gold/30 bg-cmd-charcoal shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-cmd-border px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cmd-gold">Version history</p>
                <h2 className="mt-1 text-xl font-semibold text-cmd-offwhite">
                  Command v{APP_VERSION}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-cmd-border p-2 text-cmd-muted transition hover:text-cmd-offwhite"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              {RELEASE_NOTES.map((release, index) => (
                <section key={release.version} className="mb-7 last:mb-0">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        index === 0
                          ? 'border-cmd-gold/40 bg-cmd-gold/10 text-cmd-gold'
                          : 'border-cmd-border bg-cmd-black/50 text-cmd-muted'
                      }`}
                    >
                      v{release.version}
                    </span>
                    <p className="text-sm font-semibold text-cmd-offwhite">{release.title}</p>
                    <p className="text-xs text-cmd-muted">{formatReleaseDate(release.date)}</p>
                  </div>
                  <ul className="mt-3 space-y-2.5">
                    {release.items.map((item, i) => (
                      <li key={i} className="flex gap-3 text-sm text-cmd-muted">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-cmd-gold" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
