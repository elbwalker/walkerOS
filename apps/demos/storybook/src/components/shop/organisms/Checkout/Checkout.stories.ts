import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkout } from './Checkout';

const meta: Meta<typeof Checkout> = {
  title: 'Shop/Organisms/Checkout',
  component: Checkout,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
