import type { Meta, StoryObj } from '@storybook/react-vite';
import { TagSkeleton } from './TagSkeleton';

/**
 * TagSkeleton - a tagging skeleton drawn as nested rectangles.
 *
 * Describe walkerOS data-elb tagging as a simple tree (entities, properties,
 * actions, nesting) and it draws the boxes. A PM reads the grouping at a
 * glance; a dev sees what belongs to what and in which order. Purely
 * presentational and fully theme-driven.
 */
const meta: Meta<typeof TagSkeleton> = {
  component: TagSkeleton,
  title: 'Skeleton/TagSkeleton',
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TagSkeleton>;

/** One entity with a couple of properties and a click action. */
export const Single: Story = {
  args: {
    nodes: [
      {
        entity: 'product',
        properties: [
          { key: 'name', value: 'Shirt' },
          { key: 'price', value: '29.99' },
        ],
        actions: ['click:add'],
      },
    ],
  },
};

/** A product box with a nested price entity inside it. */
export const Nested: Story = {
  args: {
    nodes: [
      {
        entity: 'product',
        properties: [{ key: 'name', value: 'Shirt' }],
        actions: ['load:view', 'click:add'],
        children: [
          {
            entity: 'price',
            properties: [
              { key: 'value', value: '29.99' },
              { key: 'currency', value: 'EUR' },
            ],
          },
        ],
      },
    ],
  },
};

/** The full vocabulary: page globals, a context band, nesting, and actions. */
export const FullScope: Story = {
  args: {
    globals: [
      { key: 'language', value: 'en' },
      { key: 'plan', value: 'premium' },
    ],
    nodes: [
      {
        entity: 'order',
        context: [{ key: 'test', value: 'checkout_v2' }],
        properties: [{ key: 'id', value: 'A-1001' }],
        actions: ['load:view'],
        children: [
          {
            entity: 'product',
            properties: [
              { key: 'name', value: 'Shirt' },
              { key: 'size', value: 'M' },
            ],
            actions: ['click:add'],
            children: [
              {
                entity: 'price',
                properties: [{ key: 'value', value: '29.99' }],
              },
            ],
          },
        ],
      },
    ],
  },
};

/** Shape-only: keys without values, for agreeing on structure before data. */
export const ShapeOnly: Story = {
  args: {
    nodes: [
      {
        entity: 'product',
        label: 'one card per product',
        properties: [{ key: 'name' }, { key: 'price' }, { key: 'category' }],
        actions: ['click:add'],
      },
    ],
  },
};
