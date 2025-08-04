import type { Meta, StoryObj } from '@storybook/react';
import { Typography } from './Typography';

const meta: Meta<typeof Typography> = {
  title: 'Media/Atoms/Typography',
  component: Typography,
  parameters: {
    layout: 'centered',
  },
  tags: ['media'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Heading1: Story = {
  args: {
    variant: 'h1',
    children: 'Heading 1',
  },
};

export const Heading2: Story = {
  args: {
    variant: 'h2',
    children: 'Heading 2',
  },
};

export const Heading3: Story = {
  args: {
    variant: 'h3',
    children: 'Heading 3',
  },
};

export const Body1: Story = {
  args: {
    variant: 'body1',
    children:
      'This is body text (body1). Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  },
};

export const Body2: Story = {
  args: {
    variant: 'body2',
    children:
      'This is smaller body text (body2). Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  },
};

export const Caption: Story = {
  args: {
    variant: 'caption',
    children: 'This is caption text - small and subtle.',
  },
};

export const ErrorText: Story = {
  args: {
    variant: 'body1',
    color: 'error',
    children: 'This is an error message.',
  },
};

export const SuccessText: Story = {
  args: {
    variant: 'body1',
    color: 'success',
    children: 'This is a success message.',
  },
};

export const CenteredText: Story = {
  args: {
    variant: 'h2',
    align: 'center',
    children: 'This text is centered.',
  },
};
