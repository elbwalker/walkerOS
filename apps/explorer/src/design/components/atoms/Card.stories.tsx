import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Design/Atoms/Card',
  component: Card,
  tags: ['autodocs'],
  args: {
    padding: 'md',
    hover: true,
    children: 'Everything on this page. Clone it, read it, run it.',
  },
};
export default meta;

export const Default: StoryObj<typeof Card> = {};
