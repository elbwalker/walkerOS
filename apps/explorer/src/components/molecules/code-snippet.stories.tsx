import type { Meta, StoryObj } from '@storybook/react-vite';
import { CodeSnippet } from './code-snippet';

const meta: Meta<typeof CodeSnippet> = {
  title: 'Molecules/CodeSnippet',
  component: CodeSnippet,
  tags: ['autodocs'],
  argTypes: {
    language: {
      control: 'select',
      options: ['javascript', 'typescript', 'json', 'html', 'css'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof CodeSnippet>;

export const OneLine: Story = {
  args: {
    code: "import { getAttribute, sendWeb, sessionStart } from '@walkeros/web-core';",
    language: 'javascript',
  },
};

export const MultiLine: Story = {
  args: {
    code: `export async function setupGA4Complete() {
  const { collector, elb } = await startFlow({
    destinations: {
      gtag: {
        ...destinationGtag,
        config: {
          settings: {
            ga4: { measurementId: 'G-XXXXXXXXXX' },
          },
        },
      },
    },
  });
  return { collector, elb };
}`,
    language: 'javascript',
  },
};

/**
 * Auto-Formatting Demo - Badly formatted code gets auto-formatted on mount
 */
export const AutoFormatEnabled: Story = {
  args: {
    code: `function example(){const x={a:1,b:2,c:3};if(x.a===1){return x.b+x.c;}return 0;}`,
    language: 'javascript',
  },
};

/**
 * JSON Auto-Formatting - Badly formatted JSON gets auto-formatted
 */
export const JSONFormatting: Story = {
  args: {
    code: `{"entity":"product","action":"view","data":{"id":"P123","name":"Laptop","price":999},"context":{"stage":["shopping",1]}}`,
    language: 'json',
  },
};

/**
 * Bare Object Formatting - JS object literals without assignment
 *
 * This is common in docs where event results are shown as plain objects.
 * Previously these were not indented because Prettier couldn't parse them.
 */
export const BareObjectFormatting: Story = {
  args: {
    code: `{
name: 'promotion view',
data: {
name: 'Setting up tracking easily',
category: 'analytics',
},
context: {
test: ['engagement', 0]
},
globals: {
language: 'en'
},
nested: [],
consent: { functional: true },
trigger: 'visible',
entity: 'promotion',
action: 'view',
}`,
    language: 'javascript',
  },
};
