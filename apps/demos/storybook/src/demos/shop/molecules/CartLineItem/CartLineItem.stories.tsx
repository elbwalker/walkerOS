import type { Meta, StoryObj } from '@storybook/react-vite';
import { CartLineItem } from './CartLineItem';
import { cartItems } from '../../data';

const meta: Meta<typeof CartLineItem> = {
  title: 'Shop/Molecules/CartLineItem',
  component: CartLineItem,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'shop'],
  decorators: [
    (Story) => (
      <ul className="w-(--container-md) rounded-lg border border-border bg-surface">
        <Story />
      </ul>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    item: cartItems[0],
  },
};

export const OneSize: Story = {
  args: {
    item: cartItems[1],
  },
};
