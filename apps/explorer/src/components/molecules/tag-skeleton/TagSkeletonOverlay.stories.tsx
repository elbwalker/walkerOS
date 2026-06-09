import type { Meta, StoryObj } from '@storybook/react-vite';
import { TagCanvas } from './TagCanvas';
import type { TagTree } from './types';

/**
 * Overlay mode - the unified `Tag` model drawn onto a screenshot.
 *
 * `TagCanvas` renders any `TagTree`. When the tree carries a `src` (and the
 * tags carry explicit `rect`s) it overlays the boxes on the image: one relative
 * anchor frame sized to the image, every rectangle placed as a percentage of
 * that frame, so changing `size` scales image and grid together. The five tag
 * types teach the walkerOS vocabulary directly: an `entity` (`product`) holds a
 * nested `entity` (`price`), an `action` (`add`, triggered by `click`) for the
 * CTA, and `property` leaves for the resolved data.
 */
const meta: Meta<typeof TagCanvas> = {
  component: TagCanvas,
  title: 'Skeleton/TagSkeletonOverlay',
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TagCanvas>;

// A self-contained fake product page, 800x600, used as the "screenshot".
const screenshot =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>
      <rect width='800' height='600' fill='#f3f4f6'/>
      <rect width='800' height='64' fill='#111827'/>
      <text x='24' y='40' fill='#ffffff' font-family='sans-serif' font-size='22' font-weight='bold'>shop</text>
      <rect x='80' y='120' width='300' height='360' rx='12' fill='#ffffff' stroke='#e5e7eb' stroke-width='2'/>
      <rect x='104' y='144' width='252' height='180' rx='8' fill='#d1d5db'/>
      <text x='104' y='366' fill='#111827' font-family='sans-serif' font-size='20'>Cotton Shirt</text>
      <text x='104' y='398' fill='#6b7280' font-family='sans-serif' font-size='18'>EUR 29.99</text>
      <rect x='104' y='420' width='252' height='40' rx='8' fill='#2563eb'/>
      <text x='150' y='446' fill='#ffffff' font-family='sans-serif' font-size='16'>Add to cart</text>
    </svg>`,
  );

/**
 * The overlay tree, authored in the image's pixel space (800x600). `product` is
 * an `entity` whose tagged data lives in-place: a `name` property, a nested
 * `price` `entity` carrying its own `value`, and a `click:add` `action` for the
 * CTA. Each tag carries an explicit `rect`, so `layout()` honors it verbatim and
 * geometry mirrors hierarchy (price and the action sit inside the product box).
 */
const productPageTree: TagTree = {
  width: 800,
  height: 600,
  src: screenshot,
  roots: [
    {
      id: 'product',
      type: 'entity',
      name: 'product',
      rect: { x: 80, y: 120, w: 300, h: 360 },
      children: [
        {
          id: 'product-name',
          type: 'property',
          name: 'name',
          value: 'Cotton Shirt',
          rect: { x: 104, y: 344, w: 252, h: 32 },
        },
        {
          id: 'price',
          type: 'entity',
          name: 'price',
          rect: { x: 96, y: 384, w: 200, h: 56 },
          children: [
            {
              id: 'price-value',
              type: 'property',
              name: 'value',
              value: '29.99',
              rect: { x: 104, y: 408, w: 120, h: 24 },
            },
          ],
        },
        {
          id: 'add',
          type: 'action',
          name: 'add',
          value: 'click',
          rect: { x: 104, y: 444, w: 252, h: 28 },
        },
      ],
    },
  ],
};

/** Correct tag types overlaid on the screenshot. */
export const ProductPage: Story = {
  args: {
    tree: productPageTree,
    size: 640,
    alt: 'Product page',
  },
};

/** Same tree at a smaller size: image and rectangles scale together. */
export const Scaled: Story = {
  args: {
    tree: productPageTree,
    size: 400,
    alt: 'Product page',
  },
};

// A reading tree (no src) so the hover-caption chain reads clearly: a context
// band wraps the product entity, which holds a property, a nested price entity,
// and an action. Hovering the action reveals the whole containing chain.
const readingTree: TagTree = {
  width: 0,
  height: 0,
  roots: [
    { id: 'g-language', type: 'global', name: 'language', value: 'en' },
    {
      id: 'ctx-test',
      type: 'context',
      name: 'test',
      value: 'checkout_v2',
      children: [
        {
          id: 'product',
          type: 'entity',
          name: 'product',
          children: [
            {
              id: 'product-name',
              type: 'property',
              name: 'name',
              value: 'Shirt',
            },
            {
              id: 'price',
              type: 'entity',
              name: 'price',
              children: [
                {
                  id: 'price-value',
                  type: 'property',
                  name: 'value',
                  value: '29.99',
                },
              ],
            },
            { id: 'product-add', type: 'action', name: 'add', value: 'click' },
          ],
        },
      ],
    },
  ],
};

/**
 * Hover-caption mode: all tabs hidden until the pointer enters. Hovering a deep
 * tag (e.g. the `add` action) reveals only the laminar containing chain under
 * the pointer (`add` plus `product`, `test`), so structure is read on demand
 * without permanent chrome. Move the pointer across the boxes to explore.
 */
export const HoverCaptions: Story = {
  args: {
    tree: readingTree,
    captions: 'hover',
    size: 480,
  },
};
