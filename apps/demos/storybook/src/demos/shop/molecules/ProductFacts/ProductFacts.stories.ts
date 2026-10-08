import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProductFacts } from './ProductFacts';
import { cartItems } from '../../data';

const meta: Meta<typeof ProductFacts> = {
  title: 'Shop/Molecules/ProductFacts',
  component: ProductFacts,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'shop'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: cartItems[0].name,
    color: cartItems[0].color,
    size: cartItems[0].size,
  },
};
