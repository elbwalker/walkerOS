import type { Meta, StoryObj } from '@storybook/react-vite';
import { CollectorBox } from './collector-box';
import { createGtagDestination } from '../../helpers/destinations';

/**
 * CollectorBox - Event pipeline processor with collector
 *
 * Processes events through the walkerOS collector pipeline with a destination,
 * showing the final formatted output. Perfect for demonstrating how events
 * are transformed and sent to analytics tools.
 */
const meta: Meta<typeof CollectorBox> = {
  component: CollectorBox,
  title: 'Organisms/CollectorBox',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof CollectorBox>;

const sampleEvent = JSON.stringify(
  {
    entity: 'product',
    action: 'view',
    data: {
      id: 'P123',
      name: 'Laptop',
      price: 999,
    },
  },
  null,
  2,
);

const sampleMapping = JSON.stringify(
  {
    product: {
      view: {
        name: 'view_item',
        data: {
          map: {
            item_id: 'data.id',
            item_name: 'data.name',
            value: 'data.price',
          },
        },
      },
    },
  },
  null,
  2,
);

/**
 * Default collector box with product view event
 *
 * Shows how a product view event is:
 * 1. Processed by the collector
 * 2. Transformed by mapping rules
 * 3. Formatted as gtag() call
 */
export const Default: Story = {
  args: {
    event: sampleEvent,
    mapping: sampleMapping,
    destination: createGtagDestination(),
    label: 'Collector Output',
    wordWrap: false,
  },
};
