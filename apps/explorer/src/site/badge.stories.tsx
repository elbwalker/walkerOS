import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './badge';

/**
 * Badge - pill label for section eyebrows and announcements.
 */
const meta: Meta<typeof Badge> = {
  title: 'Site/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    children: { control: 'text' },
  },
};
export default meta;

type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: 'New in v4.4',
  },
};
