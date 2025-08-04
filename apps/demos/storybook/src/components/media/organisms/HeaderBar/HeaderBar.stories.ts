import type { Meta, StoryObj } from '@storybook/react';
import { HeaderBar } from './HeaderBar';

const meta: Meta<typeof HeaderBar> = {
  title: 'Media/Organisms/HeaderBar',
  component: HeaderBar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithActiveMenuItem: Story = {
  args: {
    activeMenuItem: 'Series',
  },
};
