import type { Meta, StoryObj } from '@storybook/react-vite';
import { FaqItem } from './FaqItem';

const meta: Meta<typeof FaqItem> = {
  title: 'Design/Molecules/FaqItem',
  component: FaqItem,
  tags: ['autodocs'],
  args: {
    question: 'Does it work with our framework?',
    open: true,
    children:
      'Yes. Tagging is plain data attributes, so it works with React, Vue, Svelte, web components or server-rendered HTML. A typed tagger helper keeps attributes consistent in TypeScript.',
  },
};
export default meta;

export const Default: StoryObj<typeof FaqItem> = {};
