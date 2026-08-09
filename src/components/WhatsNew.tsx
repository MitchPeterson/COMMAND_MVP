import React, { useEffect, useState } from 'react';
import { formatReleaseDate, markReleasesSeen, unseenReleases, type ReleaseNote } from '../lib/releaseNotes';
import { Sparkles, X } from 'lucide-react';

/**
 * Shown once after sign-in when there are releases the user has not seen. It is
 * deliberately dismissible and never blocks anything — a changelog that
 * interrupts the work is worse than one that goes unread.
 */
export function WhatsNew() {
  const [releases, setReleases] = useState<ReleaseNote[]>([]);

  useEffect(() => {
    setReleases(unseenReleases());
  }, []);

  if (releases.length === 0) return null;

  const dismiss = () => {
    markReleasesSeen();
    setReleases([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-cmd-gold/30 bg-cmd-charcoal shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4 border-b border-cmd-border px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-cmd-gold/10 p-2 text-cmd-gold">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cmd-gold">What's new</p>
              <h2 className="mt-1 text-xl font-semibold text-cmd-offwhite">
                {releases.length === 1 ? releases[0].title : `${releases.length} updates since your last visit`}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg border border-cmd-border p-2 text-cmd-muted transition hover:text-cmd-offwhite"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {releases.map((release) => (
            <section key={release.version} className="mb-6 last:mb-0">
              {releases.length > 1 && (
                <p className="text-sm font-semibold text-cmd-offwhite">{release.title}</p>
              )}
              <p className="text-xs text-cmd-muted">
                v{release.version} · {formatReleaseDate(release.date)}
              </p>
              <ul className="mt-3 space-y-3">
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

        <div className="border-t border-cmd-border px-6 py-4">
          <button
            type="button"
            onClick={dismiss}
            className="w-full rounded-xl border border-cmd-gold bg-cmd-gold/15 px-5 py-2.5 text-sm font-semibold text-cmd-gold transition hover:bg-cmd-gold/25"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
