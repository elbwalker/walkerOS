import type { Meta, StoryObj } from '@storybook/react-vite';
import { SiteButton, ButtonRow } from './button';

/**
 * SiteButton - page-level call to action.
 *
 * Text on the primary variant is always --oa-on-signal: white on the brand
 * blue is 2.4:1 and fails contrast.
 */
const meta: Meta<typeof SiteButton> = {
  title: 'Site/Button',
  component: SiteButton,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof SiteButton>;

export const Primary: Story = {
  args: {
    children: 'Get started',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Read the docs',
    variant: 'secondary',
  },
};

export const Pill: Story = {
  args: {
    children: 'npx walkeros init',
    variant: 'pill',
  },
};

export const Row: Story = {
  render: () => (
    <ButtonRow>
      <SiteButton variant="primary">Get started</SiteButton>
      <SiteButton variant="secondary">Read the docs</SiteButton>
    </ButtonRow>
  ),
};
