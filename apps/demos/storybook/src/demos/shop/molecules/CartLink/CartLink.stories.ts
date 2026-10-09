import type { Meta, StoryObj } from '@storybook/react-vite';
import { CartLink } from './CartLink';
import { cartValue } from '../../data';

const meta: Meta<typeof CartLink> = {
  title: 'Shop/Molecules/CartLink',
  component: CartLink,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'shop'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { cartValue },
};
