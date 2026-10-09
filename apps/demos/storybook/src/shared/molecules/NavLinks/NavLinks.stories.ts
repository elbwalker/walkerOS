import type { Meta, StoryObj } from '@storybook/react-vite';
import { NavLinks } from './NavLinks';

const meta: Meta<typeof NavLinks> = {
  title: 'Shared/Molecules/NavLinks',
  component: NavLinks,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'shop', 'media'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    links: [
      { label: 'Promotion', href: '#promotion' },
      { label: 'Recommendations', href: '#recommendations' },
      { label: 'Checkout', href: '#checkout' },
    ],
  },
};
