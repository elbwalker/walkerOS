import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tag } from './tag-atom';
import type { TagType } from './types';

/**
 * Tag - the unified visual atom.
 *
 * One rectangle with a straddling pill-tab header and a centered body, like a
 * tagged DOM element. The `type` drives color only (global, context, entity,
 * action, property); the layout layer supplies position via `style` and/or
 * nested `children`. These galleries show the color and shape language for each
 * type side by side. Purely presentational and theme-driven.
 */
const meta: Meta<typeof Tag> = {
  component: Tag,
  title: 'Skeleton/Tag',
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tag>;

// The tab shows the identifier only; color conveys the type. So a global is
// titled by its key, a context by its key, an action by its verb.
const TYPES: Array<{ type: TagType; name: string; value: string }> = [
  { type: 'global', name: 'language', value: 'en' },
  { type: 'context', name: 'test', value: 'checkout_v2' },
  { type: 'entity', name: 'product', value: 'Cotton Shirt' },
  { type: 'action', name: 'add', value: 'click' },
  { type: 'property', name: 'price', value: '29.99' },
];

/** Every type rendered once so the color and shape language is visible. */
export const Gallery: Story = {
  render: () => (
    <div
      className="elb-tag-skeleton"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2rem',
        padding: '2rem',
        alignItems: 'flex-start',
      }}
    >
      {TYPES.map(({ type, name, value }) => (
        <Tag
          key={type}
          type={type}
          name={name}
          value={value}
          style={{ width: 160, height: 72 }}
        />
      ))}
    </div>
  ),
};

/** The interaction states the editor applies: default, selected, dragging. */
export const States: Story = {
  render: () => (
    <div
      className="elb-tag-skeleton"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2rem',
        padding: '2rem',
        alignItems: 'flex-start',
      }}
    >
      <Tag
        type="entity"
        name="product"
        value="default"
        style={{ width: 160, height: 72 }}
      />
      <Tag
        type="entity"
        name="product"
        value="selected"
        selected
        style={{ width: 160, height: 72 }}
      />
      <Tag
        type="entity"
        name="product"
        value="dragging"
        dragging
        style={{ width: 160, height: 72 }}
      />
    </div>
  ),
};
