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
    language: 'typescript',
  },
};
