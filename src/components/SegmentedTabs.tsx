// Sub-navigation inside a section.
//
// Finances answers four different questions -- what I hold, what I owe, where
// it goes, and how it is invested -- and a household asks them in separate
// sittings. Stacked, they were a scroll nobody read to the bottom of.
//
// Tabs rather than separate sections because the grade above them is
// cross-cutting: the best finding in Finances is that an 8.25% HELOC is running
// while cash sits idle, and that needs debt and cash inside one score. Split
// into four graded sections, that finding has nowhere to live.
//
// The count on each tab is the whole reason tabs are safe here. Content behind
// a tab goes unseen unless something says it is there.

import React from 'react';

export interface SegmentedTab {
  id: string;
  label: string;
  /** Shown beside the label. Omit rather than render a zero. */
  count?: number;
}

interface Props {
  tabs: SegmentedTab[];
  active: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}

export function SegmentedTabs({ tabs, active, onChange, ariaLabel }: Props) {
  if (tabs.length <= 1) return null;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel ?? 'Section views'}
      className="flex flex-wrap gap-1 rounded-2xl border border-cmd-border bg-cmd-black/40 p-1"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition ${
              selected
                ? 'bg-cmd-gold text-cmd-black font-semibold'
                : 'text-cmd-muted hover:bg-cmd-black/40 hover:text-cmd-offwhite'
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-mono ${
                  selected ? 'bg-cmd-black/20 text-cmd-black' : 'bg-cmd-black/50 text-cmd-muted'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
