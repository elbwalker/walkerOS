import type { Meta, StoryObj } from '@storybook/react';
import { ActionButton } from './ActionButton';

const meta: Meta<typeof ActionButton> = {
  title: 'Media/Molecules/ActionButton',
  component: ActionButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    action: {
      control: { type: 'select' },
      options: ['watch', 'learn', 'activate'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WatchNow: Story = {
  args: {
    text: 'Watch Now',
    action: 'watch',
  },
};

export const LearnMore: Story = {
  args: {
    text: 'Learn More',
    action: 'learn',
  },
};