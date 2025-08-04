import type { Meta, StoryObj } from '@storybook/react-vite';
import { CarouselItem } from './CarouselItem';

const meta: Meta<typeof CarouselItem> = {
  title: 'Media/Molecules/CarouselItem',
  component: CarouselItem,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
  args: {
    title: 'Debugging Dreams',
    alt: 'A mysterious debugging scene',
  },
};

export const WithPlaceholder: Story = {
  args: {
    title: 'Return of the Bug',
  },
};
