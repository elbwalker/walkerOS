import type { Meta, StoryObj } from '@storybook/react-vite';
import { CodePanel } from './code-panel';

/**
 * CodePanel - entity/action pairs plus a static code block.
 *
 * Not syntax highlighted on purpose: highlighting would pull the editor
 * module graph into the site entry.
 */
const meta: Meta<typeof CodePanel> = {
  title: 'Site/CodePanel',
  component: CodePanel,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof CodePanel>;

const mapping = `// product view to GA4 view_item
{
  "product": {
    "view": {
      "name": "view_item",
      "data": {
        "map": {
          "currency": { "value": "EUR" },
          "value":    { "key": "data.price" }
        }
      }
    }
  }
}`;

export const Default: Story = {
  args: {
    pairs: [
      { entity: 'product', action: 'view' },
      { entity: 'order', action: 'complete' },
      { entity: 'button', action: 'click' },
    ],
    code: mapping,
    caption: 'An event name is an entity and an action, separated by a space.',
  },
};

export const CodeOnly: Story = {
  args: {
    code: mapping,
  },
};
