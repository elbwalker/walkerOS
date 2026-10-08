import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArticleTeaserTracking } from './ArticleTeaserTracking';

const meta: Meta<typeof ArticleTeaserTracking> = {
  title: 'Design/Viz/ArticleTeaserTracking',
  component: ArticleTeaserTracking,
  tags: ['autodocs'],
  args: { autoplay: true, speed: 1, initialStep: 5 },
};
export default meta;

/** Click a step: it plays from its start and the walk stays on it. */
export const Default: StoryObj<typeof ArticleTeaserTracking> = {};
