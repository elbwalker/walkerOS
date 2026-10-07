import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from './box';

/**
 * Box - Container component with header
 *
 * Basic container atom used throughout the explorer for consistent styling.
 * Provides header, optional header actions, footer, and content area.
 */
const meta: Meta<typeof Box> = {
  component: Box,
  title: 'Atoms/Box',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof Box>;

/**
 * Box as a plain container, the way the website wraps a FlowMap: no header,
 * a max width and content-driven height.
 */
export const Default: Story = {
  args: {
    style: { maxWidth: '700px', height: 'auto' },
    children: (
      <div style={{ padding: '24px' }}>
        <p>This is the content area of the Box component.</p>
      </div>
    ),
  },
};
