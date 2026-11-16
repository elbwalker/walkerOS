import type { Meta, StoryObj } from '@storybook/react-vite';
import { sceneFrame } from '../__stories__/SceneFrame';
import { StepMarker } from './StepMarker';

const meta: Meta<typeof StepMarker> = {
  title: 'Design/Molecules/StepMarker',
  component: StepMarker,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [sceneFrame('top')],
  args: { n: 2, surface: 'page', title: 'Tag the product card' },
  argTypes: {
    surface: {
      control: 'inline-radio',
      options: ['page', 'code', 'cli', 'mcp', 'app'],
    },
  },
};
export default meta;

export const Default: StoryObj<typeof StepMarker> = {};
