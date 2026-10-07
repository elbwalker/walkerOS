import type { Meta, StoryObj } from '@storybook/react-vite';
import { Code } from './code';

/**
 * Code - Monaco Editor atom component
 *
 * Pure Monaco editor without Box wrapper. This is the base atom that CodeBox uses.
 * Supports syntax highlighting, auto-height, and various editor configurations.
 *
 * Note: For most use cases, use CodeBox (molecule) which includes header and actions.
 */
const meta: Meta<typeof Code> = {
  component: Code,
  title: 'Atoms/Code',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          height: '300px',
          display: 'flex',
          flexDirection: 'column',
          background: '#292d3e',
          borderRadius: '8px',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Code>;

const sampleCode = `const event = {
  entity: 'product',
  action: 'view',
  data: {
    id: 'P123',
    name: 'Laptop',
    price: 999
  }
};

console.log('Event:', event);`;

/**
 * Default code editor - fills parent container height
 *
 * Code uses height="100%" by default, filling the 300px container.
 */
export const Default: Story = {
  args: {
    code: sampleCode,
    language: 'javascript',
  },
};
