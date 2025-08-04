import type { Meta, StoryObj } from '@storybook/react';
import { CarouselSection } from './CarouselSection';

const meta: Meta<typeof CarouselSection> = {
  title: 'Media/Organisms/CarouselSection',
  component: CarouselSection,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleItems = [
  {
    id: '1',
    title: 'Debugging Dreams',
    src: 'https://picsum.photos/400/225?random=1',
  },
  {
    id: '2',
    title: 'Code Wars',
    src: 'https://picsum.photos/400/225?random=2',
  },
  {
    id: '3',
    title: 'API Chronicles',
    src: 'https://picsum.photos/400/225?random=3',
  },
  {
    id: '4',
    title: 'Return of the Bug',
  },
  {
    id: '5',
    title: 'Sleepless in Stack Overflow',
    src: 'https://picsum.photos/400/225?random=5',
  },
  {
    id: '6',
    title: 'The Art of Refactoring',
    src: 'https://picsum.photos/400/225?random=6',
  },
];

export const RecommendedForYou: Story = {
  args: {
    title: 'Recommended for You',
    items: sampleItems,
  },
};

export const TopSeries: Story = {
  args: {
    title: 'Our Top Series',
    items: sampleItems.slice(0, 4),
  },
};
