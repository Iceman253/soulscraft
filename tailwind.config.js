/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm dark palette — replaces cold grey so every stone-* class reads warmer
        stone: {
          950: '#070604',
          900: '#0d0b08',   // main app bg
          800: '#17140e',   // panels, cards, topbar
          700: '#221f17',   // hover states, active backgrounds
          600: '#32301f', // will not work as expected - just adjust
          500: '#524c3c',   // subtle dividers, disabled
          400: '#9e9282',   // muted text
          300: '#bab09c',   // secondary text
          200: '#d2c8b2',   // primary text
          100: '#e6dece',   // headings
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
        DEFAULT: '#32301f',
      },
    },
  },
  plugins: [],
}
