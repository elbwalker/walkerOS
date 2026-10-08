import type { Meta, StoryObj } from '@storybook/react-vite';
import { CarouselSection } from './CarouselSection';

const meta: Meta<typeof CarouselSection> = {
  title: 'Media/Organisms/CarouselSection',
  component: CarouselSection,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs', 'media'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleItems = [
  {
    id: '1',
    title: 'Debugging Dreams',
  },
  {
    id: '2',
    title: 'Code Wars',
  },
  {
    id: '3',
    title: 'API Chronicles',
  },
  {
    id: '4',
    title: 'Return of the Bug',
  },
  {
    id: '5',
    title: 'Sleepless in Stack Overflow',
  },
  {
    id: '6',
    title: 'The Art of Refactoring',
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
