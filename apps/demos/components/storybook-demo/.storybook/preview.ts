import type { Preview } from '@storybook/react-vite';
import '../src/index.css';

export const globalTypes = {
  domain: {
    description: 'Switch between application domains',
    toolbar: {
      title: 'Domain',
      icon: 'globe',
      items: [
        { value: 'ecommerce', title: 'E-commerce', right: '🛍️' },
        { value: 'media', title: 'Media', right: '📰' },
        { value: 'all', title: 'All Components', right: '🔧' },
      ],
      dynamicTitle: true,
    },
  },
  theme: {
    description: 'Toggle between light and dark modes',
    toolbar: {
      title: 'Mode',
      icon: 'paintbrush',
      items: [
        { value: 'light', title: 'Light Mode', right: '☀️' },
        { value: 'dark', title: 'Dark Mode', right: '🌙' },
      ],
      dynamicTitle: true,
      showName: true,
    },
  },
};

export const initialGlobals = {
  domain: 'ecommerce',
  theme: 'light',
};

const preview: Preview = {
  globalTypes,
  initialGlobals,
  parameters: {
    walkerOS: {
      autoRefresh: true,
      prefix: 'data-elb',
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true,
    },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1200px', height: '800px' },
        },
      },
    },
    options: {
      storySort: {
        order: ['Introduction', 'Atoms', 'Molecules', 'Organisms', 'Templates'],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme;

      // Apply theme class to document
      if (typeof document !== 'undefined') {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }

      return Story();
    },
  ],
};

export default preview;
