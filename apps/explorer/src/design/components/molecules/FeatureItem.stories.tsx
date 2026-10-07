import type { Meta, StoryObj } from '@storybook/react-vite';
import { FeatureItem } from './FeatureItem';

const meta: Meta<typeof FeatureItem> = {
  title: 'Design/Molecules/FeatureItem',
  component: FeatureItem,
  tags: ['autodocs'],
  args: {
    title: 'Storybook addon',
    href: '#',
    children:
      "See and test a component's tracking in isolation, in the same review as its design.",
  },
};
export default meta;

export const Default: StoryObj<typeof FeatureItem> = {};
