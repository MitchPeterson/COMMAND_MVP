// A crash in one section should cost you that section, not the application.
//
// Written after a single bad JSONB shape threw during render in the Legal view
// and took the whole SPA to a blank white page — sidebar included, so the only
// way out was a reload. React unmounts the entire tree when an error escapes to
// the root, which is the correct default and a terrible experience.
//
// What this does not catch, stated so it is not mistaken for total cover:
// event handlers, anything asynchronous, and errors thrown inside the fallback
// itself. Most failures in this app are async Supabase calls, which the views
// already catch and surface themselves. This is for the other kind — the one
// that happened.

import React from 'react';
import { AlertOctagon, ArrowLeft, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Named in the log so a console entry says which section died. */
  viewName?: string;
  /** Sends the user somewhere known to work. */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
  componentStack: string | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? null });

    // Logged loudly and completely. A safety net that quietly hid its own
    // failures would make the next bug harder to find than no net at all —
    // grouped so the stack is one click away rather than a wall of text.
    /* eslint-disable no-console */
    console.error(
      `[Command] ${this.props.viewName ?? 'view'} crashed during render:`,
      error.message,
    );
    console.groupCollapsed(`[Command] crash detail · ${this.props.viewName ?? 'view'}`);
    console.error('view:', this.props.viewName ?? '(unnamed)');
    console.error('time:', new Date().toISOString());
    console.error('error:', error);
    console.error('component stack:', info.componentStack);
    console.groupEnd();
    /* eslint-enable no-console */
  }

  private reset = () => {
    this.setState({ error: null, componentStack: null });
  };

  private goHome = () => {
    // Cleared before navigating, because a crash in the Dashboard would
    // otherwise navigate to the view it is already on, leaving the boundary
    // holding an error nothing would clear.
    this.reset();
    this.props.onReset?.();
  };

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-3xl border border-cmd-border bg-cmd-charcoal p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cmd-gold/30 bg-cmd-gold/10">
            <AlertOctagon className="h-6 w-6 text-cmd-gold" />
          </div>

          <h1 className="mt-5 text-2xl font-semibold text-cmd-offwhite">
            Something went wrong loading this section
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-cmd-muted">
            The rest of Command is unaffected and your data is untouched — nothing here writes
            anything. Try this section again, or go back to the dashboard.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.reset}
              className="inline-flex items-center gap-2 rounded-xl border border-cmd-border bg-cmd-black/60 px-4 py-2 text-sm font-medium text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
            >
              <RotateCcw className="h-4 w-4" /> Try again
            </button>
            <button
              type="button"
              onClick={this.goHome}
              className="inline-flex items-center gap-2 rounded-xl border border-cmd-gold bg-cmd-gold px-4 py-2 text-sm font-semibold text-cmd-black transition hover:bg-cmd-gold/85"
            >
              <ArrowLeft className="h-4 w-4" /> Back to the dashboard
            </button>
          </div>

          {/* Shown, not hidden. This is a personal app whose QA happens in
              production, and making someone open devtools to learn anything at
              all is how a crash becomes unreportable. */}
          <details className="mt-7 text-left">
            <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-cmd-muted">
              Technical detail
            </summary>
            <div className="mt-3 space-y-3 rounded-2xl border border-cmd-border bg-cmd-black/50 p-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Error</p>
                <p className="mt-1 break-words font-mono text-xs text-cmd-offwhite">
                  {error.name}: {error.message}
                </p>
              </div>
              {componentStack && (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-cmd-muted">Component stack</p>
                  <pre className="mt-1 max-h-52 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-cmd-muted">
                    {componentStack.trim()}
                  </pre>
                </div>
              )}
              <p className="text-[11px] text-cmd-muted/70">
                The same detail is in the browser console under &ldquo;crash detail&rdquo;.
              </p>
            </div>
          </details>
        </div>
      </div>
    );
  }
}
