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
 * The dashed border shows the parent container bounds.
 * Code uses height="100%" by default, filling the available space.
 */
export const Default: Story = {
  args: {
    code: sampleCode,
    language: 'javascript',
  },
};

/**
 * With line numbers enabled
 */
export const WithLineNumbers: Story = {
  args: {
    code: sampleCode,
    language: 'javascript',
    lineNumbers: true,
  },
};

/**
 * Auto-height mode - sizes to content
 *
 * Instead of filling the container, the editor sizes to fit its content.
 * Useful for documentation and standalone code displays.
 */
export const AutoHeight: Story = {
  args: {
    code: `import { elb } from '@walkeros/core';

elb('product view', { id: 'abc' });`,
    language: 'typescript',
    autoHeight: { min: 50, max: 400 },
  },
  decorators: [
    (Story) => (
      <div
        style={{
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

const nestedCode = `{
  "flows": {
    "default": {
      "sources": {
        "browser": {
          "package": "@walkeros/web-source-browser",
          "config": {
            "settings": {
              "pageview": true,
              "session": true,
              "globals": {
                "language": "en",
                "currency": "USD"
              }
            }
          }
        }
      },
      "destinations": {
        "ga4": {
          "package": "@walkeros/web-destination-gtag",
          "config": {
            "settings": {
              "measurementId": "G-XXXXXXXXXX"
            }
          }
        }
      }
    }
  }
}`;

/**
 * Sticky scroll disabled
 *
 * When sticky={false}, the nested context headers won't stick to the top when scrolling.
 * Compare with default (sticky=true) to see the difference.
 */
export const NoStickyScroll: Story = {
  args: {
    code: nestedCode,
    language: 'json',
    sticky: false,
  },
};

const typescriptCode = `import { tagger } from '../walker';

function ProductDetail({ product }) {
  return (
    <div
      {...tagger()
        .entity('product')
        .action('load', 'view')
        .get()}
    >
      <h1>{product.name}</h1>
    </div>
  );
}`;

/**
 * IDE mode ON - Full Monaco features
 *
 * Enable hover tooltips, validation decorations, and other IDE features.
 * Use for interactive editors like playgrounds where feedback is useful.
 */
export const IdeOn: Story = {
  args: {
    code: typescriptCode,
    language: 'typescript',
    ide: true,
  },
};
