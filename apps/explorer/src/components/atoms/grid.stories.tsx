import type { Meta, StoryObj } from '@storybook/react-vite';
import { Grid } from './grid';
import { CodeBox } from '../molecules/code-box';

/**
 * Grid - Horizontal scrolling layout component
 *
 * Arranges Box components in a horizontal grid with optional scroll buttons.
 * Supports various row height modes: auto, equal, synced, or fixed pixel value.
 */
const meta: Meta<typeof Grid> = {
  title: 'Atoms/Grid',
  component: Grid,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '100%', maxWidth: '1200px' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Grid>;

/**
 * Two columns with synced row height, as LiveCode lays out its input and
 * result: both boxes take the height of the taller editor content.
 */
export const Default: Story = {
  args: {
    columns: 2,
    rowHeight: 'synced',
    children: (
      <>
        <CodeBox
          label="Event"
          code={`{
  "name": "product view",
  "data": { "id": "ers", "price": 420 }
}`}
          language="json"
        />
        <CodeBox label="Result" code={`"ers"`} language="json" disabled />
      </>
    ),
  },
};
