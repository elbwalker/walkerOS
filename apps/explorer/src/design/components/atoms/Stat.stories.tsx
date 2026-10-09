import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stat } from './Stat';

const meta: Meta<typeof Stat> = {
  title: 'Design/Atoms/Stat',
  component: Stat,
  tags: ['autodocs'],
  args: { value: '~50', children: 'components tagged once' },
};
export default meta;

export const Default: StoryObj<typeof Stat> = {};
