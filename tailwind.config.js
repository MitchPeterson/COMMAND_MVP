/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cmd-black': '#0F0F10',
        'cmd-charcoal': '#1A1B1F',
        'cmd-border': '#2E2F34',
        'cmd-border-hi': '#484950',
        'cmd-dim': '#606068',
        'cmd-muted': '#9A9AA4',
        'cmd-offwhite': '#F0F0EE',
        'cmd-gold': '#C9A24D',
        'cmd-gold-hover': '#D4AE5A',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
