import type { Meta, StoryObj } from '@storybook/react-vite';
import { CodeSnippet } from './code-snippet';

const meta: Meta<typeof CodeSnippet> = {
  title: 'Molecules/CodeSnippet',
  component: CodeSnippet,
  tags: ['autodocs'],
  argTypes: {
    language: {
      control: 'select',
      options: ['javascript', 'typescript', 'json', 'html', 'css', 'bash'],
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
 * Install command - the common docs use case (read-only shell snippet).
 */
export const Bash: Story = {
  args: {
    code: 'npm install @walkeros/web-destination-amplitude',
    language: 'bash',
  },
};
