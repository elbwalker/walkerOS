import React from 'react';
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
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Thumbnail: Story = {
  args: {
    type: 'thumbnail',
    alt: 'Debugging Dreams',
    title: 'Debugging Dreams',
  },
};

export const Banner: Story = {
  args: {
    type: 'banner',
    alt: 'Life in Code',
    title: 'Life in Code',
  },
};