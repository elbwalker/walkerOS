import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ConsentControls } from './ConsentControls';

const meta: Meta<typeof ConsentControls> = {
  title: 'Shop/Molecules/ConsentControls',
  component: ConsentControls,
  parameters: {
    layout: 'centered',
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

export const Default: Story = {};
