import type { Meta, StoryObj } from '@storybook/react-vite';
import { OrderComplete } from './OrderComplete';

const meta: Meta<typeof OrderComplete> = {
  title: 'Shop/Organisms/OrderComplete',
  component: OrderComplete,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
