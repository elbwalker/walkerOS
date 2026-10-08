import type { Meta, StoryObj } from '@storybook/react-vite';
import { HeaderGlobals } from './HeaderGlobals';
import { headerGlobals } from '../../data';

const meta: Meta<typeof HeaderGlobals> = {
  title: 'Shop/Molecules/HeaderGlobals',
  component: HeaderGlobals,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: headerGlobals,
};
