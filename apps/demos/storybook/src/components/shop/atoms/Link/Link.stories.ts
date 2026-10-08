import type { Meta, StoryObj } from '@storybook/react-vite';
import { Link } from './Link';

const meta: Meta<typeof Link> = {
  title: 'Shop/Atoms/Link',
  component: Link,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Subtle: Story = {
  args: {
    className: 'text-ui',
    children: 'Solutions',
  },
};

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Get started',
  },
};

export const Text: Story = {
  args: {
    variant: 'link',
    children: 'Learn more',
  },
};
