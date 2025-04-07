import { fontFamily } from 'tailwindcss/defaultTheme';

export const content = ['./{docs,src}/**/*.{js,jsx,mdx,ts,tsx}'];
export const darkMode = ['class', '[data-theme="dark"]'];
export const corePlugins = { preflight: false };
export const blocklist = ['container'];
export const theme = {
  extend: {
    fontFamily: {
      sans: ['Lato', ...fontFamily.sans],
    },
    height: {
      128: '32rem',
    },
  },
};

export const plugins = [
  require('@tailwindcss/forms'),
  require('@tailwindcss/typography'),
  require('@tailwindcss/aspect-ratio'),
];
