import type { Meta, StoryObj } from '@storybook/react-vite';
import { sceneFrame } from '../__stories__/SceneFrame';
import { Captions } from './Captions';

const meta: Meta<typeof Captions> = {
  title: 'Design/Molecules/Captions',
  component: Captions,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [sceneFrame('bottom')],
  args: {
    lines: [
      'Add one script tag to the page,',
      'and walker.js starts tracking.',
    ],
  },
};
export default meta;

export const Default: StoryObj<typeof Captions> = {};

/** The current word, marked by weight and underline. */
export const Highlighted: StoryObj<typeof Captions> = {
  args: { highlight: { line: 1, word: 1 } },
};
