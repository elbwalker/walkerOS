import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediathekTemplate } from './MediathekTemplate';

const meta: Meta<typeof MediathekTemplate> = {
  title: 'Media/Templates/MediathekTemplate',
  component: MediathekTemplate,
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
