import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProductImage } from './ProductImage';

const meta: Meta<typeof ProductImage> = {
  title: 'Shop/Atoms/ProductImage',
  component: ProductImage,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'shop'],
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Square: Story = {
  args: {
    name: 'Everyday Ruck Snack',
  },
};

export const Wide: Story = {
  args: {
    name: 'Everyday Ruck Snack',
    aspect: 'wide',
  },
};

export const Small: Story = {
  args: {
    name: 'Cool Cap',
    className: 'w-20',
  },
};
