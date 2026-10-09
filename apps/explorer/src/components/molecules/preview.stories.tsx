import type { Meta, StoryObj } from '@storybook/react-vite';
import { productCardCss, productCardHtml } from '../demos/product-card.demo';
import { Preview } from './preview';

/**
 * Preview - HTML preview component with data attribute highlighting
 *
 * Renders HTML in an isolated iframe with buttons to highlight different
 * walkerOS data attributes (context, entity, property, action).
 * With a `collector`, it captures the page's events into it.
 */
const meta: Meta<typeof Preview> = {
  component: Preview,
  title: 'Molecules/Preview',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof Preview>;

/**
 * Default preview with product card HTML and styling
 *
 * Features highlight buttons to show walkerOS data attributes, each in its
 * event colour: globals, context, entity, property and action.
 */
export const Default: Story = {
  args: {
    label: 'Preview',
    html: productCardHtml,
    css: productCardCss,
  },
};
