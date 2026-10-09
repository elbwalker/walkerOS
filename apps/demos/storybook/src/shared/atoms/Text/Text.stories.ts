import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from './Text';

const meta: Meta<typeof Text> = {
  title: 'Shared/Atoms/Text',
  component: Text,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'shop', 'media'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Body: Story = {
  args: {
    children:
      "Don't compromise on snack-carrying capacity with this lightweight and spacious bag.",
  },
};

export const Lead: Story = {
  args: {
    variant: 'lead',
    children: 'Open your console to see how we measure.',
  },
};

export const Small: Story = {
  args: {
    variant: 'small',
    tone: 'fg-3',
    className: 'font-normal',
    children: '1624 reviews',
  },
};
