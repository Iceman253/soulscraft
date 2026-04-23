/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        stone: {
          950: '#0d0d0d',
          900: '#1a1a1a',
          800: '#242424',
          700: '#2e2e2e',
          600: '#3a3a3a',
          500: '#656565',
          400: '#909090',
          300: '#b8b8b8',
          200: '#e4e4e4',
          100: '#ffffff',
        },
        gold: '#f5c842',
        redstone: '#cc2200',
        emerald: '#17c964',
        overworld: '#2d6a2d',
        nether: '#8b2500',
        end: '#3d1a6e',
      },
      fontFamily: {
        display: ['"Press Start 2P"', 'monospace'],
        mono: ['"VT323"', 'monospace', 'ui-monospace'],
      },
    },
  },
  plugins: [],
}

