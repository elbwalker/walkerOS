import type { Meta, StoryObj } from '@storybook/react-vite';
import { sceneFrame } from '../__stories__/SceneFrame';
import { TitleCover } from './TitleCover';

const meta: Meta<typeof TitleCover> = {
  title: 'Design/Molecules/TitleCover',
  component: TitleCover,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [sceneFrame('fill')],
  args: {
    eyebrow: 'Quickstart',
    title: 'Tag a page with walker.js',
    subtitle: 'One script tag and a few attributes turn a click into an event.',
  },
};
export default meta;

export const Default: StoryObj<typeof TitleCover> = {};
