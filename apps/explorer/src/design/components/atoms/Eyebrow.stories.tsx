import type { Meta, StoryObj } from '@storybook/react-vite';
import { Eyebrow } from './Eyebrow';

const meta: Meta<typeof Eyebrow> = {
  title: 'Design/Atoms/Eyebrow',
  component: Eyebrow,
  tags: ['autodocs'],
  args: {
    children: 'Because event instrumentation is real engineering effort',
    variant: 'eyebrow',
    tone: 'link',
  },
};
export default meta;

export const Default: StoryObj<typeof Eyebrow> = {};
