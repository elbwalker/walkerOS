import type { Meta, StoryObj } from '@storybook/react-vite';
import { NavLinks } from './NavLinks';
import { navLinks } from '../../data';

const meta: Meta<typeof NavLinks> = {
  title: 'Shop/Molecules/NavLinks',
  component: NavLinks,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    links: navLinks,
  },
};
