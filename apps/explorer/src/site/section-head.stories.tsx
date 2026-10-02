import type { Meta, StoryObj } from '@storybook/react-vite';
import { SectionHead } from './section-head';

/**
 * SectionHead - the kicker, headline and sub trio that opens a section.
 */
const meta: Meta<typeof SectionHead> = {
  title: 'Site/SectionHead',
  component: SectionHead,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof SectionHead>;

export const Default: Story = {
  args: {
    kicker: 'Destinations',
    headline: 'Send the same event anywhere.',
    sub: 'One event definition, many destinations. Adding a destination is a config entry rather than a change to the pages that emit the event.',
  },
};

export const HeadlineOnly: Story = {
  args: {
    headline: 'Send the same event anywhere.',
  },
};

export const AsPageTitle: Story = {
  args: {
    as: 'h1',
    kicker: 'Getting started',
    headline: 'Your first event in five minutes.',
  },
};
