// A donut, hand-drawn.
//
// One ring is not worth a charting dependency, and a hand-drawn one stays on
// the same tokens as everything around it -- which matters here because the
// palette is swappable, and a library's baked-in colors would be the one thing
// on the page that did not follow the theme.
//
// Segments run from gold through progressively quieter neutrals rather than a
// rainbow. Gold is the accent, not a fill, so five gold wedges would be five
// times more gold than the brand carries anywhere else.

import React from 'react';

export interface DonutSegment {
  label: string;
  value: number;
  /** Shown beside the label in the legend. */
  display: string;
}

const TONES = [
  'text-cmd-gold',
  'text-cmd-gold/55',
  'text-cmd-muted',
  'text-cmd-muted/55',
  'text-cmd-border-hi',
  'text-cmd-border',
];

const DOTS = [
  'bg-cmd-gold',
  'bg-cmd-gold/55',
  'bg-cmd-muted',
  'bg-cmd-muted/55',
  'bg-cmd-border-hi',
  'bg-cmd-border',
];

interface Props {
  segments: DonutSegment[];
  /** The figure in the middle. */
  centerValue: string;
  centerLabel: string;
  /** Announced to a screen reader, which cannot read the ring. */
  summary?: string;
}

export function DonutChart({ segments, centerValue, centerLabel, summary }: Props) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return null;

  const r = 54;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative h-36 w-36 shrink-0" role="img" aria-label={summary ?? centerLabel}>
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="70" cy="70" r={r} fill="none" strokeWidth="16" className="stroke-cmd-black" />
          {segments.map((segment, i) => {
            const length = (segment.value / total) * circumference;
            // A hairline gap so adjacent wedges read as separate.
            const drawn = Math.max(length - 1.5, 0);
            const node = (
              <circle
                key={segment.label}
                cx="70" cy="70" r={r} fill="none" strokeWidth="16"
                strokeDasharray={`${drawn} ${circumference - drawn}`}
                strokeDashoffset={-offset}
                className={`stroke-current ${TONES[i] ?? TONES[TONES.length - 1]}`}
              />
            );
            offset += length;
            return node;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold leading-none text-cmd-offwhite">{centerValue}</span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.16em] text-cmd-muted">{centerLabel}</span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2">
        {segments.map((segment, i) => (
          <li key={segment.label} className="flex items-center gap-2.5 text-sm">
            <span className={`h-2 w-2 shrink-0 rounded-full ${DOTS[i] ?? DOTS[DOTS.length - 1]}`} />
            <span className="min-w-0 flex-1 truncate text-cmd-muted">{segment.label}</span>
            <span className="shrink-0 font-mono text-cmd-offwhite">{segment.display}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
