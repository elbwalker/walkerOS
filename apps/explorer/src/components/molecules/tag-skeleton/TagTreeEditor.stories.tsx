import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TagTreeEditor } from './TagTreeEditor';
import type { TagTree } from './types';

/**
 * TagTreeEditor - a controlled drag/resize editor for a `TagTree`.
 *
 * It owns no model state: it renders the prop `tree` and emits a new tree via
 * `onChange` on every commit. These stories wrap it in a small component that
 * holds the tree in `useState`, so you can drag the boxes (and their straddling
 * "lines") and watch the model update while every commit stays laminar.
 */
const meta: Meta<typeof TagTreeEditor> = {
  component: TagTreeEditor,
  title: 'Skeleton/TagTreeEditor',
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TagTreeEditor>;

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

const seedTree: TagTree = {
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
          name: 'click:add',
          rect: { x: 104, y: 444, w: 252, h: 28 },
        },
      ],
    },
  ],
};

/** Story-local controlled wrapper: holds the tree and feeds it back in. */
function ControlledEditor({
  initial,
  size,
}: {
  initial: TagTree;
  size?: number;
}): React.ReactElement {
  const [tree, setTree] = React.useState<TagTree>(initial);
  return <TagTreeEditor tree={tree} onChange={setTree} size={size} />;
}

/** Drag the boxes and resize handles; the model re-renders on every commit. */
export const Editable: Story = {
  render: () => <ControlledEditor initial={seedTree} size={640} />,
};
