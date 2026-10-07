import type { Preview, Decorator } from '@storybook/react-vite';
import '../src/styles/index.scss';
import './monaco-setup';

// Theme decorator - wraps all stories with proper theme container
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme || 'light';

  // data-theme must sit on an ancestor of .elb-explorer: the dark rules are
  // `[data-theme='dark'] .elb-explorer`, so theme vars only flip when the
  // attribute is on a parent (this mirrors how the app/website apply it).
  return (
    <div data-theme={theme}>
      <div
        className="elb-explorer"
        style={{
          background: 'var(--bg-header)',
          minHeight: '100vh',
          padding: 24,
        }}
      >
        <Story />
      </div>
    </div>
  );
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
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
