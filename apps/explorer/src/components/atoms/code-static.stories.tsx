import type { Meta, StoryObj } from '@storybook/react-vite';
import { sceneFrame } from '../../design/components/__stories__/SceneFrame';
import { CodeStatic } from './code-static';

const CODE = `<head>
  <script async src="walker.js"></script>
</head>
<body>
  <div data-elb="product">`;

/**
 * CodeStatic - read-only code highlighted by Shiki, without an editor.
 *
 * Lines can be marked (`add` for a new line, `focus` for the one a step is
 * about), numbered, and revealed character by character with a caret.
 */
const meta: Meta<typeof CodeStatic> = {
  component: CodeStatic,
  title: 'Atoms/CodeStatic',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [sceneFrame('center', 'var(--container-3xl)')],
  args: { code: CODE, language: 'html' },
};

export default meta;
type Story = StoryObj<typeof CodeStatic>;

/** An added line and a line in focus, with line numbers. */
export const Marks: Story = {
  args: {
    lineNumbers: true,
    marks: [
      { line: 2, kind: 'add' },
      { line: 5, kind: 'focus' },
    ],
  },
};

/** The first 40 characters typed, the caret after them. */
export const Reveal: Story = {
  args: { reveal: 40 },
  argTypes: {
    reveal: { control: { type: 'range', min: 0, max: CODE.length, step: 1 } },
  },
};
