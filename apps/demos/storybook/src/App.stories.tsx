import type { Meta, StoryObj } from '@storybook/react-vite';
import App from './App';
import './index.css';

const meta: Meta<typeof App> = {
  title: 'Templates/Demos',
  component: App,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '# Full Application Demo',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Mediathek',
  parameters: {
    docs: {
      description: {
        story:
          'Shows the application starting directly in mediathek mode. Use the navigation toggle to explore other sections.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    // Auto-navigate to mediathek template for this story
    const mediathekButton = canvasElement.querySelector(
      '[data-testid="mediathek-button"] button',
    ) as HTMLButtonElement;
    if (mediathekButton) {
      mediathekButton.click();
    }
  },
};
