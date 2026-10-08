import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProductCard } from './ProductCard';
import { createDemoProduct, recommendations } from '../../data';

const meta: Meta<typeof ProductCard> = {
  title: 'Shop/Molecules/ProductCard',
  component: ProductCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    product: recommendations[0],
  },
};

export const WithFlag: Story = {
  args: {
    product: recommendations[2],
  },
};

export const AddedProduct: Story = {
  args: {
    product: createDemoProduct(1),
  },
};
