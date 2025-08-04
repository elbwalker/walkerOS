import type { Meta, StoryObj } from '@storybook/react-vite';
import { NavigationMenu } from './NavigationMenu';

const meta: Meta<typeof NavigationMenu> = {
  title: 'Media/Molecules/NavigationMenu',
  component: NavigationMenu,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithActiveItem: Story = {
  args: {
    activeItem: 'Series',
  },
};
