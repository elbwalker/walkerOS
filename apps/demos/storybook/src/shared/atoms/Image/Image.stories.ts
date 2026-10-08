import type { Meta, StoryObj } from '@storybook/react-vite';
import { Image } from './Image';

const meta: Meta<typeof Image> = {
  title: 'Shared/Atoms/Image',
  component: Image,
  parameters: {
    layout: 'centered',
  },
  // The placeholder fills the box; the story gives it a width.
  args: {
    className: 'w-96',
  },
  tags: ['autodocs', 'shop', 'media'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['thumbnail', 'banner'],
    },
    style: {
      control: { type: 'number', min: 1, max: 8 },
      description: 'Image id in the tag (img:id-<style>)',
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

export const Banner: Story = {
  args: {
    type: 'banner',
    style: 5,
    alt: 'Life in Code',
    title: 'Life in Code',
  },
};
