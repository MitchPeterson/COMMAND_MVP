/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'command-black': '#0F0F10',
        'command-gold': '#C9A24D',
        'command-charcoal': '#1C1D20',
        'command-offwhite': '#F6F6F4',
      },
    },
  },
  plugins: [],
}
