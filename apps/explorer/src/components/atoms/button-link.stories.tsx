import type { Meta, StoryObj } from '@storybook/react-vite';
import { ButtonLink } from './button-link';

const meta: Meta<typeof ButtonLink> = {
  component: ButtonLink,
  title: 'Atoms/ButtonLink',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary'],
    },
    size: {
      control: 'select',
      options: ['md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ButtonLink>;

export const Default: Story = {
  args: {
    children: 'Button Link',
    variant: 'default',
  },
};

export const Primary: Story = {
  args: {
    children: 'Get Started',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Learn More',
    variant: 'secondary',
  },
};

export const AsLink: Story = {
  args: {
    children: 'Visit Documentation',
    variant: 'primary',
    href: 'https://example.com',
  },
};

export const GroupedLayout: Story = {
  render: () => (
    <div className="elb-button-group">
      <ButtonLink variant="primary">Primary Action</ButtonLink>
      <ButtonLink variant="secondary">Secondary Action</ButtonLink>
    </div>
  ),
};
