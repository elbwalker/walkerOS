import type { Meta, StoryObj } from '@storybook/react-vite';
import { StepExample } from './step-example';

/**
 * StepExample - Event, Mapping and Out of a step example, read-only.
 *
 * Resize the canvas: the boxes stay side by side while each keeps a readable
 * width, then wrap to fewer per row and finally stack.
 */
const meta: Meta<typeof StepExample> = {
  title: 'Molecules/StepExample',
  component: StepExample,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StepExample>;

/**
 * Long code in every part: rows hit the height cap and scroll inside.
 */
export const WithMapping: Story = {
  args: {
    example: {
      in: {
        name: 'product add',
        data: {
          id: 'ers',
          name: 'Everyday Ruck Snack',
          taste: 'salty',
          size: 'l',
          price: 420,
        },
        context: { shopping: ['intent', 0] },
        globals: { pagegroup: 'shop' },
        user: { id: 'us3r', device: 'c00k13', session: 's3ss10n' },
        nested: [],
        consent: { functional: true },
        id: '1700000900-gr0up-1',
        trigger: 'click',
        entity: 'product',
        action: 'add',
        timestamp: 1700000900,
        timing: 3.14,
        group: 'gr0up',
        count: 1,
        version: { source: '4.7.0', tagging: 1 },
        source: { type: 'web', id: 'https://localhost:80', previous_id: '' },
      },
      mapping: {
        name: 'add_to_cart',
        include: ['data'],
        data: {
          map: {
            currency: { value: 'EUR', key: 'data.currency' },
            value: 'data.price',
            items: {
              loop: [
                'this',
                {
                  map: {
                    item_id: 'data.id',
                    item_variant: 'data.color',
                    quantity: { value: 1, key: 'data.quantity' },
                  },
                },
              ],
            },
          },
        },
      },
      out: [
        [
          'gtag',
          'event',
          'add_to_cart',
          {
            currency: 'EUR',
            value: 420,
            items: [{ item_id: 'ers', item_variant: 'black', quantity: 1 }],
            data_id: 'ers',
            data_name: 'Everyday Ruck Snack',
            data_color: 'black',
            data_size: 'l',
            data_price: 420,
            send_to: 'G-XXXXXX-1',
          },
        ],
      ],
    },
  },
};

/**
 * No mapping: two boxes, Event and Out.
 */
export const WithoutMapping: Story = {
  args: {
    example: {
      description: 'A page view needs no mapping.',
      in: { name: 'page view', data: { domain: 'www.example.com' } },
      out: [['gtag', 'event', 'page_view', { send_to: 'G-XXXXXX-1' }]],
    },
  },
};
