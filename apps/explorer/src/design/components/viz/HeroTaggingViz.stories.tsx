import type { Meta, StoryObj } from '@storybook/react-vite';
import { HeroTaggingViz } from './HeroTaggingViz';

const meta: Meta<typeof HeroTaggingViz> = {
  title: 'Design/Viz/HeroTaggingViz',
  component: HeroTaggingViz,
  tags: ['autodocs'],
  args: { playing: true, speed: 1, startAt: 9000 },
};
export default meta;

export const Default: StoryObj<typeof HeroTaggingViz> = {};
