import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusMessage } from './StatusMessage';

const meta: Meta<typeof StatusMessage> = {
  title: 'Shared/Molecules/StatusMessage',
  component: StatusMessage,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'shop', 'media'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: {
    tone: 'success',
    children: 'In stock and ready to ship',
  },
};

export const Info: Story = {
  args: {
    tone: 'info',
    children: 'Status: unknown',
  },
};

export const Danger: Story = {
  args: {
    tone: 'danger',
    children: 'Status: denied',
  },
};

export const Warning: Story = {
  args: {
    tone: 'warning',
    children: 'Not sent: walkerOS is not running in this preview.',
  },
};
