import type { Meta, StoryObj } from '@storybook/react-vite';
import { getMappingValue } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
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

let flow: ReturnType<typeof startFlow> | undefined;

/** One collector for the story's runs: `getMappingValue` resolves in its context. */
function mappingContext() {
  // A failed start is not kept: the next run tries again.
  flow ??= startFlow().catch((error: unknown) => {
    flow = undefined;
    throw error;
  });
  return flow;
}

/**
 * A TypeScript call evaluated live, as the mapping value docs use it: the
 * input runs with `getMappingValue` and a real `collector` in scope and the
 * result is logged. No config panel, synced row height.
 */
export const Default: Story = {
  args: {
    language: 'typescript',
    labelInput: 'Configuration',
    rowHeight: 'synced',
    input: `await getMappingValue(
  { user: { id: '12345', name: 'John' } },
  'user.id',
  { collector }
);`,
    output: `"12345"`,
    fn: async (input, _config, log) => {
      const { collector } = await mappingContext();
      const run = new Function(
        'getMappingValue',
        'collector',
        `"use strict"; return (async () => { return ${String(input)} })()`,
      );
      const result: unknown = await run(getMappingValue, collector);
      log(result);
    },
  },
};
