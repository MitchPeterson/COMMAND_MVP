/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Read from CSS variables rather than fixed hex, so a palette can be
      // swapped by redefining eight values instead of editing 70 files. The
      // rgb(... / <alpha-value>) form is what keeps bg-cmd-black/40 working.
      //
      // The names still describe the dark palette they were born in. They are
      // really roles: cmd-black is the page, cmd-charcoal a raised card,
      // cmd-offwhite the primary text. Renaming them is a separate pass.
      colors: {
        'cmd-black': 'rgb(var(--cmd-black) / <alpha-value>)',
        'cmd-charcoal': 'rgb(var(--cmd-charcoal) / <alpha-value>)',
        'cmd-border': 'rgb(var(--cmd-border) / <alpha-value>)',
        'cmd-border-hi': 'rgb(var(--cmd-border-hi) / <alpha-value>)',
        'cmd-dim': 'rgb(var(--cmd-dim) / <alpha-value>)',
        'cmd-muted': 'rgb(var(--cmd-muted) / <alpha-value>)',
        'cmd-offwhite': 'rgb(var(--cmd-offwhite) / <alpha-value>)',
        'cmd-gold': 'rgb(var(--cmd-gold) / <alpha-value>)',
        'cmd-gold-hover': 'rgb(var(--cmd-gold-hover) / <alpha-value>)',
        // The second series in a chart. See the note in index.css: it is not
        // cmd-muted because cmd-muted does not separate from gold well enough
        // to carry a second series.
        'cmd-series-2': 'rgb(var(--cmd-series-2) / <alpha-value>)',
        // Status, theme-aware. See the note in index.css: the Tailwind tints
        // these replace were chosen against the dark palette and measure
        // under 2:1 on the light one.
        'cmd-good': 'rgb(var(--cmd-good) / <alpha-value>)',
        'cmd-warn': 'rgb(var(--cmd-warn) / <alpha-value>)',
        'cmd-bad': 'rgb(var(--cmd-bad) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
