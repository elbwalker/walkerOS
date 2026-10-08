import type { Meta, StoryObj } from '@storybook/react-vite';
import { Breadcrumb } from './Breadcrumb';
import { productDetail } from '../../data';

const meta: Meta<typeof Breadcrumb> = {
  title: 'Shop/Molecules/Breadcrumb',
  component: Breadcrumb,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Category: Story = {
  args: {
    items: productDetail.category,
  },
};
