import type { Meta, StoryObj } from '@storybook/react-vite';
import { Split } from './Split';

const meta: Meta<typeof Split> = {
  title: 'Design/Layout/Split',
  component: Split,
  tags: ['autodocs'],
  args: {
    variant: 'even',
    start: 'Tag the component, not the page.',
    end: 'Tracking becomes part of your design system API.',
  },
};
export default meta;

export const Default: StoryObj<typeof Split> = {};
