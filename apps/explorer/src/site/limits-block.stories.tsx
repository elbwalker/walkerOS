import type { Meta, StoryObj } from '@storybook/react-vite';
import { LimitsBlock } from './limits-block';

/**
 * LimitsBlock - what a thing does not do.
 *
 * Stating limits plainly next to the claims is the point of the component.
 */
const meta: Meta<typeof LimitsBlock> = {
  title: 'Site/LimitsBlock',
  component: LimitsBlock,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof LimitsBlock>;

export const Default: Story = {
  args: {
    items: [
      'Verification runs on one page at a time, in one browser, when you run it.',
      'There is no scheduled job watching a site in the background.',
      'An existing tag manager can stay in place; migration is additive and gradual.',
    ],
  },
};

export const CustomHeading: Story = {
  args: {
    heading: 'Not included',
    items: [
      'No hosted dashboard.',
      'No analysis surface: events land in the tools you already use.',
    ],
  },
};
