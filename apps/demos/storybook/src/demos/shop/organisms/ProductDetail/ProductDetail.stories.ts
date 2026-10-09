import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProductDetail } from './ProductDetail';

const meta: Meta<typeof ProductDetail> = {
  title: 'Shop/Organisms/ProductDetail',
  component: ProductDetail,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs', 'shop'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
