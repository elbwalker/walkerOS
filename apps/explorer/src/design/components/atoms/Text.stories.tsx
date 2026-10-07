import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from './Text';

const meta: Meta<typeof Text> = {
  title: 'Design/Atoms/Text',
  component: Text,
  tags: ['autodocs'],
  args: {
    size: 'lg',
    children:
      'Instead of a hand-written push or GTM listener for every feature, data attributes live in the component markup.',
  },
};
export default meta;

export const Default: StoryObj<typeof Text> = {};
