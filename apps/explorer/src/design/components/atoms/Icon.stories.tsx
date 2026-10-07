import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from './Icon';

const meta: Meta<typeof Icon> = {
  title: 'Design/Atoms/Icon',
  component: Icon,
  tags: ['autodocs'],
  args: { name: 'check', size: 16 },
};
export default meta;

export const Default: StoryObj<typeof Icon> = {};
