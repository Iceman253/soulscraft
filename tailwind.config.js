/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm dark palette — replaces cold grey so every stone-* class reads warmer.
        // Mid-tones (500/600) bumped lighter so text- variants are actually legible
        // on the dark 800/900 backgrounds. border-* and bg-* uses just become a
        // little more visible, which is a net win — the old palette had borders
        // disappearing into the panel.
        stone: {
          950: '#070604',
          900: '#0d0b08',   // main app bg
          800: '#17140e',   // panels, cards, topbar
          700: '#2a2619',   // hover states, active backgrounds (was #221f17)
          600: '#4a4332',   // borders, low-emphasis bg (was #32301f — too dark)
          500: '#857a5e',   // tertiary text, dividers (was #524c3c — ~2.5:1 contrast → now ~5:1)
          400: '#aea18a',   // muted text (was #9e9282 — small lift)
          300: '#c4b89e',   // secondary text (was #bab09c)
          200: '#d8ccb2',   // primary text (was #d2c8b2)
          100: '#ece1c3',   // headings (was #e6dece)
        },
        gold: '#cd8f22',      // richer amber — less "emoji yellow", more aged metal
        redstone: '#bd2e14',
        emerald: '#1a9e56',
        overworld: '#295e30',
        nether: '#7a2100',
        end: '#3a1869',
        teal: {
          300: '#5ecdbb',
          400: '#2bbdaa',
          500: '#1fa898',
          600: '#178a7e',
        },
      },
      fontFamily: {
        display: ['"Press Start 2P"', 'monospace'],
        heading: ['Cinzel', 'Georgia', 'serif'],
        sans: ['"Crimson Pro"', 'Georgia', 'serif'],
        mono: ['"VT323"', 'monospace', 'ui-monospace'],
      },
      borderColor: {
        DEFAULT: '#4a4332',
      },
    },
  },
  plugins: [],
}
