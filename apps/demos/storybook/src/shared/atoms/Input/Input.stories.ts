import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Shared/Atoms/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'shop', 'media'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Email: Story = {
  args: {
    type: 'email',
    name: 'email-address',
    autoComplete: 'email',
    placeholder: 'you@example.com',
    'aria-label': 'Email address',
  },
};
