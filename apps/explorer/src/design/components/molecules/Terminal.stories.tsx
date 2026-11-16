import type { Meta, StoryObj } from '@storybook/react-vite';
import { sceneFrame } from '../__stories__/SceneFrame';
import { Terminal } from './Terminal';

const meta: Meta<typeof Terminal> = {
  title: 'Design/Molecules/Terminal',
  component: Terminal,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [sceneFrame('center', 'var(--container-4xl)')],
  args: {
    title: 'Terminal',
    caret: true,
    lines: [
      { kind: 'command', text: 'walkeros validate flow.json' },
      { kind: 'output', text: 'Checking 1 flow, 2 steps' },
      { kind: 'status', status: 'success', text: 'source.browser' },
      {
        kind: 'status',
        status: 'warning',
        text: 'destination.api: no mapping',
      },
      {
        kind: 'status',
        status: 'danger',
        text: 'destination.ga4: settings missing',
      },
      { kind: 'status', status: 'info', text: '1 error, 1 warning' },
    ],
  },
};
export default meta;

export const Default: StoryObj<typeof Terminal> = {};
