import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { UserSwitch } from './UserSwitch';

// In a story the switch only calls back; on the demo site it reloads the page
// with ?user=.
const meta: Meta<typeof UserSwitch> = {
  title: 'Shared/Molecules/UserSwitch',
  component: UserSwitch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'shop', 'media'],
  args: {
    onSwitch: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Anonymous: Story = {
  args: { persona: 'anonymous' },
};

export const LisaLoyal: Story = {
  args: { persona: 'lisa' },
};

export const SamSales: Story = {
  args: { persona: 'sam' },
};
