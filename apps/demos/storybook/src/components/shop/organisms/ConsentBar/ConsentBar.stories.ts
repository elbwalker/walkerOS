import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ConsentBar } from './ConsentBar';

const meta: Meta<typeof ConsentBar> = {
  title: 'Shop/Organisms/ConsentBar',
  component: ConsentBar,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    onAccept: fn(),
    onDeny: fn(),
    onReset: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Unknown: Story = {
  args: {
    state: 'unknown',
  },
};

export const Accepted: Story = {
  args: {
    state: 'accepted',
  },
};

export const Denied: Story = {
  args: {
    state: 'denied',
  },
};

export const NotSent: Story = {
  args: {
    state: 'accepted',
    notice: 'Not sent: walkerOS is not running in this preview.',
  },
};
