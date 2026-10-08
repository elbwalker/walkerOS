import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  bg,
  border,
  borderStrong,
  fg,
  fg2,
  fg3,
  onPrimary,
  primary,
  surface,
  surface2,
} from '../../design';
import { Preview } from './preview';

/**
 * Preview - HTML preview component with data attribute highlighting
 *
 * Renders HTML in an isolated iframe with buttons to highlight different
 * walkerOS data attributes (context, entity, property, action).
 * Optionally captures events when onEvent callback is provided.
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

const sampleHtml = `<div
  data-elb="product"
  data-elbaction="load:view"
  data-elbcontext="stage:inspire"
  class="product-card">
  <figure class="product-image">
    <div class="product-badge-container">
      <div data-elb-product="badge:delicious" class="product-badge">delicious</div>
    </div>
  </figure>
  <div class="product-body">
    <h3 data-elb-product="name:#innerText" class="product-title">
      Everyday Ruck Snack
    </h3>
    <div class="product-form-control">
      <label class="product-label">Taste</label>
      <select
        data-elb-product="taste:#value"
        class="product-select">
        <option value="sweet">Sweet</option>
        <option value="spicy">Spicy</option>
      </select>
    </div>
    <p data-elb-product="price:2.50" class="product-price">
      € 2.50 <span data-elb-product="old_price:3.14" class="product-old-price">€ 3.14</span>
    </p>
    <div data-elbcontext="stage:hooked" class="product-actions">
      <button data-elbaction="click:save" class="product-button product-button-secondary">
        Add to Wishlist
      </button>
      <button data-elbaction="click:add" class="product-button product-button-primary">
        Add to Cart
      </button>
    </div>
  </div>
</div>`;

const sampleCss = `
* {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.product-card {
  width: 288px;
  background: ${surface.light};
  border: 1px solid ${border.light};
  border-radius: 8px;
  overflow: hidden;
  margin: 0 auto;
}

.product-image {
  position: relative;
  height: 200px;
  background: ${surface2.light};
  margin: 0;
}

.product-badge-container {
  position: absolute;
  top: 8px;
  right: 8px;
}

.product-badge {
  background: ${primary.light};
  color: ${onPrimary.light};
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.product-body {
  padding: 16px;
}

.product-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: ${fg.light};
}

.product-form-control {
  margin-bottom: 16px;
}

.product-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 4px;
  color: ${fg2.light};
}

.product-select {
  width: 100%;
  padding: 8px;
  border: 1px solid ${borderStrong.light};
  border-radius: 4px;
  font-size: 0.875rem;
  color: ${fg.light};
  background: ${bg.light};
}

.product-price {
  font-size: 1.25rem;
  font-weight: 700;
  color: ${fg.light};
  margin: 0 0 16px 0;
}

.product-old-price {
  font-size: 0.875rem;
  color: ${fg3.light};
  text-decoration: line-through;
  font-weight: 400;
  margin-left: 8px;
}

.product-actions {
  display: flex;
  gap: 8px;
}

.product-button {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.product-button-secondary {
  background: ${surface2.light};
  color: ${fg2.light};
}

.product-button-secondary:hover {
  color: ${fg.light};
}

.product-button-primary {
  background: ${primary.light};
  color: ${onPrimary.light};
}

.product-button-primary:hover {
  filter: brightness(1.08);
}
`;

/**
 * Default preview with product card HTML and styling
 *
 * Features highlight buttons to show walkerOS data attributes, each in its
 * event colour: globals, context, entity, property and action.
 */
export const Default: Story = {
  args: {
    label: 'Preview',
    html: sampleHtml,
    css: sampleCss,
  },
};
