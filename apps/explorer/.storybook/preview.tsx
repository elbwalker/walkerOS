import React from 'react';
import type { Preview, Decorator } from '@storybook/react-vite';
// Layer order follows first appearance: tokens, then the base layer, then the
// component styles, so the base layer never beats a component rule.
import '@walkeros/explorer/design/tokens.css';
import '@walkeros/explorer/design/base.css';
import '../src/styles/index.scss';
import './monaco-setup';

// The theme sits on <html>, as on every product page. Every story renders
// bare: each component's own root carries what it needs, and code surfaces
// stay dark in both themes.
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  return <Story />;
};

const preview: Preview = {
  decorators: [withTheme],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'dark',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['dark', 'light'],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
