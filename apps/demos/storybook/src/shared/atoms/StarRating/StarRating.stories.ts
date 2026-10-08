import type { Meta, StoryObj } from '@storybook/react-vite';
import { StarRating } from './StarRating';

const meta: Meta<typeof StarRating> = {
  title: 'Shared/Atoms/StarRating',
  component: StarRating,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'shop', 'media'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const FourOfFive: Story = {
  args: {
    rating: 4,
  },
};

export const Full: Story = {
  args: {
    rating: 5,
  },
};
