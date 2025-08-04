import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from './Icon';

const meta: Meta<typeof Icon> = {
  title: 'Media/Atoms/Icon',
  component: Icon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['search', 'profile'],
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Search: Story = {
  args: {
    type: 'search',
    className: 'text-primary-600',
  },
};

export const Profile: Story = {
  args: {
    type: 'profile',
    className: 'text-primary-600',
  },
};
