import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';

/**
 * Button - Base button component for headers and controls
 *
 * Used in button groups or standalone in headers.
 * For form submissions, use SubmitButton instead.
 */
const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Click me',
  },
};

export const Active: Story = {
  args: {
    children: 'Active Button',
    active: true,
  },
};
