import type { Decorator, Preview } from '@storybook/react-vite';
import '../src/index.css';

// The theme sits on <html>, as on every walkerOS surface: dark by default,
// light from the toolbar.
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  return <Story />;
};

const preview: Preview = {
  decorators: [withTheme],
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      toc: {
        contentsSelector: '.sbdocs-content',
        headingSelector: 'h1, h2, h3',
        ignoreSelector: '#primary',
        title: 'Table of Contents',
        disable: false,
        unsafeTocbotOptions: {
          orderedList: false,
        },
      },
    },
    walkerOS: {
      prefix: 'data-elb',
      autoRefresh: true,
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
