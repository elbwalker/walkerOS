import type { Meta, StoryObj } from '@storybook/react-vite';
import { CheckList } from './CheckList';

const meta: Meta<typeof CheckList> = {
  title: 'Design/Molecules/CheckList',
  component: CheckList,
  tags: ['autodocs'],
  args: {
    items: [
      'MIT-licensed',
      'Works with any framework',
      'Storybook integration',
    ],
    layout: 'inline',
    align: 'center',
  },
};
export default meta;

export const Default: StoryObj<typeof CheckList> = {};
