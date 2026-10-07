import type { Meta, StoryObj } from '@storybook/react-vite';
import { getMappingValue } from '@walkeros/core';
import { LiveCode } from './live-code';

/**
 * LiveCode - Generic live code execution component
 *
 * Interactive panels with:
 * - Input panel (editable code)
 * - Config panel (optional, editable JSON)
 * - Output panel (function result)
 *
 * Executes a custom function with debounced updates.
 */
const meta: Meta<typeof LiveCode> = {
  component: LiveCode,
  title: 'Organisms/LiveCode',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof LiveCode>;

/**
 * A TypeScript call evaluated live, as the mapping value docs use it: the
 * input runs with `getMappingValue` in scope and the result is logged.
 * No config panel, synced row height.
 */
export const Default: Story = {
  args: {
    language: 'typescript',
    labelInput: 'Configuration',
    rowHeight: 'synced',
    input: `await getMappingValue(
  { user: { id: '12345', name: 'John' } },
  'user.id'
);`,
    output: `"12345"`,
    fn: async (input, _config, log) => {
      const run = new Function(
        'getMappingValue',
        `"use strict"; return (async () => { return ${String(input)} })()`,
      );
      const result: unknown = await run(getMappingValue);
      log(result);
    },
  },
};
