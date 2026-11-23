import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { sceneFrame } from '../__stories__/SceneFrame';
import { CheckList } from './CheckList';
import { Slide } from './Slide';
import { Terminal } from './Terminal';

const meta: Meta<typeof Slide> = {
  title: 'Design/Molecules/Slide',
  component: Slide,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [sceneFrame('fill')],
  args: {
    eyebrow: 'Data contracts',
    headline: 'Check every event before it leaves',
    body: 'A contract names the events you expect and the fields each one carries.',
  },
};
export default meta;

export const Default: StoryObj<typeof Slide> = {};

/** A list for a body, and a part beside it. */
export const WithVisual: StoryObj<typeof Slide> = {
  args: {
    body: (
      <CheckList
        items={[
          'Events named as entity and action',
          'Required fields checked',
          'Failures reported, never dropped',
        ]}
      />
    ),
    visual: (
      <Terminal
        title="Terminal"
        lines={[
          { kind: 'command', text: 'walkeros validate flow.json' },
          { kind: 'status', status: 'success', text: 'flow.json is valid' },
        ]}
      />
    ),
  },
};
