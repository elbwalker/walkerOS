import type { Meta, StoryObj } from '@storybook/react-vite';
import { LiveCode } from './live-code';

/**
 * LiveCode - Generic live code execution component
 *
 * Three-panel interactive component with:
 * - Input panel (editable JSON)
 * - Config panel (editable JSON)
 * - Output panel (function result)
 *
 * Executes a custom transformation function with debounced updates.
 * Perfect for demonstrating data transformations and API interactions.
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
 * Default live code with simple data transformation
 *
 * Shows a transformation that combines input data with config,
 * demonstrating how the component executes and displays results.
 */
export const Default: Story = {
  args: {
    input: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    config: {
      includeTimestamp: true,
      prefix: 'User:',
    },
    labelInput: 'User Data',
    labelConfig: 'Options',
    labelOutput: 'Transformed',
    fn: async (input, config, log) => {
      const inputData = JSON.parse(input as string);
      const configData = JSON.parse(config as string);

      const result = {
        ...inputData,
        displayName: `${configData.prefix} ${inputData.name}`,
        ...(configData.includeTimestamp && {
          timestamp: new Date().toISOString(),
        }),
      };

      log(result);
    },
  },
};
