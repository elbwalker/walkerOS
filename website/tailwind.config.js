import { fontFamily } from 'tailwindcss/defaultTheme';
import daisyTheme from 'daisyui/src/theming/themes';

const elbwalker = {
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
};

export const content = ['./{docs,src}/**/*.{js,jsx,mdx,ts,tsx}'];
export const darkMode = ['class', '[data-theme="dark"]'];
export const corePlugins = { preflight: false };
export const blocklist = ['container'];
export const theme = {
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
      elbwalker,
    },
    fontFamily: {
      sans: ['Lato', ...fontFamily.sans],
    },
    height: {
      128: '32rem',
    },
    keyframes: {
      blink: {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0 },
      },
      fadeIn: {
        from: {
          opacity: 0,
          transform: 'translateY(-4px)',
        },
        to: {
          opacity: 1,
          transform: 'translateY(0)',
        },
      },
    },
    animation: {
      blink: 'blink 1s ease-in-out infinite',
      fadeIn: 'fadeIn 1s ease-out forwards',
    },
  },
};
export const daisyui = {
  base: false,
  logs: false,
  prefix: 'dui-',
  themes: [
    {
      light: {
        ...daisyTheme['light'],
        primary: elbwalker.DEFAULT,
      },
      dark: {
        ...daisyTheme['dark'],
        primary: elbwalker.DEFAULT,
      },
    },
  ],
};
export const plugins = [
  require('@tailwindcss/forms'),
  require('@tailwindcss/typography'),
  require('@tailwindcss/aspect-ratio'),
  require('daisyui'),
];
