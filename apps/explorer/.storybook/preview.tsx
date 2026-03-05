import type { Preview, Decorator } from '@storybook/react-vite';
import '../src/styles/index.scss';
import './monaco-setup';

// Theme decorator - wraps all stories with proper theme container
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme || 'light';

  return (
    <div className="elb-explorer" data-theme={theme}>
      <Story />
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
