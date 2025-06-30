import type { Meta, StoryObj } from '@storybook/react';
import { PublisherHome } from './PublisherHome';

const meta: Meta<typeof PublisherHome> = {
  title: 'Templates/PublisherHome',
  component: PublisherHome,
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { height: '800px' }
    }
  },
  tags: ['media'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const LoggedInUser: Story = {
  args: {
    user: {
      name: 'Alice Johnson',
      avatar: 'https://i.pravatar.cc/64?img=3',
    },
  },
};