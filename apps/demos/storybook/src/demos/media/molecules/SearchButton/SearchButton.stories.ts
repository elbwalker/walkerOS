import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SearchButton } from './SearchButton';

const meta: Meta<typeof SearchButton> = {
  title: 'Media/Molecules/SearchButton',
  component: SearchButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'media'],
  args: {
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
