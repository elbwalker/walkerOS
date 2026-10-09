import type { Meta, StoryObj } from '@storybook/react-vite';
import { OrderItem } from './OrderItem';
import { orderItems } from '../../data';

const meta: Meta<typeof OrderItem> = {
  title: 'Shop/Molecules/OrderItem',
  component: OrderItem,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'shop'],
  decorators: [
    (Story) => (
      <ul className="w-(--container-md)">
        <Story />
      </ul>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    item: orderItems[0],
  },
};
