/** @type {import('tailwindcss').Config} */

const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./{docs,src}/**/*.{js,jsx,mdx,ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'], // hooks into docusaurus' dark mode settigns
  corePlugins: { preflight: false },
  blocklist: ['container'],
  theme: {
    extend: {
      colors: {
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        elbwalker: {
          DEFAULT: '#01B5E2',
          50: '#FFFFFF',
          100: '#EDFEFF',
          200: '#ABF8FF',
          300: '#69ECFE',
          400: '#27DBFE',
          500: '#01B5E2',
          600: '#01B5E2',
          700: '#015372',
          800: '#00283A',
          900: '#000203',
        },
      },
      fontFamily: {
        sans: ['Lato', ...defaultTheme.fontFamily.sans],
      },
      height: {
        128: '32rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
};
