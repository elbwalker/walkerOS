import type { Meta, StoryObj } from '@storybook/react';
import { Image } from './Image';

const meta: Meta<typeof Image> = {
  title: 'Media/Atoms/Image',
  component: Image,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['thumbnail', 'banner'],
    },
    style: {
      control: { type: 'number', min: 1, max: 8 },
      description: 'Color style variant (1-8)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Thumbnail: Story = {
  args: {
    type: 'thumbnail',
    style: 1,
    alt: 'Debugging Dreams',
    title: 'Debugging Dreams',
  },
};

export const ColorfulBanner: Story = {
  args: {
    type: 'banner',
    style: 5,
    alt: 'Life in Code',
    title: 'Life in Code',
  },
};
