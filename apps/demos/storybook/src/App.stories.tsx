import type { Meta, StoryObj } from '@storybook/react-vite';
import App from './App';
import './index.css';

const meta: Meta<typeof App> = {
  title: 'Templates/Full Application Demo',
  component: App,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Full Application Demo

This story showcases the complete application with the ability to toggle between:
- **E-commerce Demo**: A shopping interface with product grid, search, and cart functionality
- **Mediathek Demo**: A media streaming interface with video content, carousels, and recommendations

## Features
- Interactive navigation toggle in the top-right corner
- Fully styled templates with responsive design
- walkerOS tracking integration on all interactive elements
- Atomic design system components

## Usage
1. Start on the landing page with template selection
2. Click "🛍️ E-commerce Demo" or "📺 Mediathek Demo" to view templates
3. Use the floating navigation in the top-right to switch between templates
4. Click "🏠 Home" to return to the landing page

The templates demonstrate real-world usage of the component library with proper styling and interactions.
        `,
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Interactive Template Toggle',
  parameters: {
    docs: {
      description: {
        story:
          'The complete application with landing page and template toggle functionality.',
      },
    },
  },
};

export const EcommerceFocused: Story = {
  name: 'E-commerce Template Preview',
  parameters: {
    docs: {
      description: {
        story:
          'Shows the application starting directly in e-commerce mode. Use the navigation toggle to explore other sections.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    // Auto-navigate to shop template for this story
    const shopButton = canvasElement.querySelector(
      '[data-testid="shop-button"] button',
    ) as HTMLButtonElement;
    if (shopButton) {
      shopButton.click();
    }
  },
};

export const MediathekFocused: Story = {
  name: 'Mediathek Template Preview',
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
