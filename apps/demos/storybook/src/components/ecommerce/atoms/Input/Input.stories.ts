import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Ecommerce/Atoms/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['ecommerce'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'Enter email...',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password...',
  },
};

export const Error: Story = {
  args: {
    placeholder: 'This field has an error',
    error: true,
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
};

export const Large: Story = {
  args: {
    size: 'large',
    placeholder: 'Large input',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
    placeholder: 'Small input',
  },
};
