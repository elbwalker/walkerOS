import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Shared/Atoms/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'shop', 'media'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Confirm order',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Add to cart',
  },
};

export const LinkStyle: Story = {
  name: 'Link',
  args: {
    variant: 'link',
    children: 'Continue Shopping',
  },
};
