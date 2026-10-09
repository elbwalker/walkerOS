import type { Meta, StoryObj } from '@storybook/react-vite';
import { SectionHeading } from './SectionHeading';

const meta: Meta<typeof SectionHeading> = {
  title: 'Design/Molecules/SectionHeading',
  component: SectionHeading,
  tags: ['autodocs'],
  args: {
    eyebrow: 'Because event instrumentation is real engineering effort',
    title: "Hand-written tracking doesn't scale.",
    lead: 'Three ways the usual setup costs you, release after release.',
    level: 2,
    size: 'lg',
  },
};
export default meta;

export const Default: StoryObj<typeof SectionHeading> = {};
