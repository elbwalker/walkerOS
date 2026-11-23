import type { Meta, StoryObj } from '@storybook/react-vite';
import { sceneFrame } from '../__stories__/SceneFrame';
import { EndCard } from './EndCard';

const meta: Meta<typeof EndCard> = {
  title: 'Design/Molecules/EndCard',
  component: EndCard,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [sceneFrame('fill')],
  args: {
    title: 'Try it yourself',
    url: 'https://www.walkeros.io/docs/getting-started/quickstart/walkerjs',
    command: 'npm i @walkeros/walker.js',
  },
};
export default meta;

export const Default: StoryObj<typeof EndCard> = {};

export const WithoutCommand: StoryObj<typeof EndCard> = {
  args: { command: undefined },
};
