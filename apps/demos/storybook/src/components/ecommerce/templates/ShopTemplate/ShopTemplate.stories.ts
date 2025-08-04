import type { Meta, StoryObj } from '@storybook/react';
import { ShopTemplate } from './ShopTemplate';

const meta: Meta<typeof ShopTemplate> = {
  title: 'Ecommerce/Templates/ShopTemplate',
  component: ShopTemplate,
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { height: '800px' },
    },
  },
  tags: ['ecommerce'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const LoggedInUser: Story = {
  args: {
    user: {
      name: 'Jane Smith',
      avatar: 'https://i.pravatar.cc/64?img=2',
    },
  },
};
