import type { Meta, StoryObj } from '@storybook/react-vite';
import { SplitSection } from './split-section';
import { SectionHead } from './section-head';
import { CodePanel } from './code-panel';

/**
 * SplitSection - asymmetric prose column beside a panel.
 *
 * The composite story is the one that matters: it is the shape a real section
 * takes, and it exercises the min-width: 0 fix that keeps a pre element from
 * pushing the grid past the viewport.
 */
const meta: Meta<typeof SplitSection> = {
  title: 'Site/SplitSection',
  component: SplitSection,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof SplitSection>;

export const WithCodePanel: Story = {
  args: {
    text: (
      <SectionHead
        kicker="Mapping"
        headline="One definition, many destinations."
        sub="An event name is an entity and an action. The same product view becomes view_item in GA4 and a row in your warehouse."
      />
    ),
    panel: (
      <CodePanel
        pairs={[
          { entity: 'product', action: 'view' },
          { entity: 'order', action: 'complete' },
        ]}
        code={'{\n  "product": {\n    "view": { "name": "view_item" }\n  }\n}'}
        caption="Mapping config lives in the repository it instruments."
      />
    ),
  },
};
