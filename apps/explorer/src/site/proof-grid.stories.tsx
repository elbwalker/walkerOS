import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProofGrid } from './proof-grid';

/**
 * ProofGrid - each claim paired with its evidence, one card each.
 */
const meta: Meta<typeof ProofGrid> = {
  title: 'Site/ProofGrid',
  component: ProofGrid,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof ProofGrid>;

export const Default: Story = {
  args: {
    items: [
      {
        claim: 'Config lives in your repository',
        witness:
          'flow.json sits next to the app it instruments and goes through the same review as the rest of the code.',
      },
      {
        claim: 'Tagging lives on the component',
        witness:
          'data-elb attributes sit on the element that renders the data, so both change together.',
      },
      {
        claim: 'Consent is part of the rule',
        witness:
          'A mapping rule carries its own consent requirement, checked before the event reaches a destination.',
      },
      {
        claim: 'Destinations are interchangeable',
        witness:
          'Swapping one is a config entry, not a change to every page that emits the event.',
      },
    ],
  },
};

export const TwoItems: Story = {
  args: {
    items: [
      {
        claim: 'Runs where you run it',
        witness: 'Self-hosted, MIT licensed, no per-event pricing.',
      },
      {
        claim: 'Typed end to end',
        witness: 'The event model is TypeScript, so a rename is a build error.',
      },
    ],
  },
};
