/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        wine: {
          50:  '#fdf2f4',
          100: '#f9e0e5',
          200: '#f1bdc8',
          300: '#e48fa2',
          400: '#c45c74',
          500: '#a83858',
          600: '#8f2347',
          700: '#7a1a38',
          800: '#641530',
          900: '#4f1026',
          950: '#2d0814',
        },
        blush: '#f5e6ea',
        cork:  '#c9a96e',
      },
    },
  },
  plugins: [],
};
