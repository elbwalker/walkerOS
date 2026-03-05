import type { Meta, StoryObj } from '@storybook/react-vite';
import { BrowserBox } from './browser-box';

/**
 * BrowserBox - Multi-tab HTML/CSS/JS editor with live preview
 *
 * Tabbed code editor that shows:
 * - Live preview of HTML
 * - HTML editor
 * - CSS editor
 * - JavaScript editor (when provided)
 *
 * Tabs are automatically hidden if content isn't provided.
 */
const meta: Meta<typeof BrowserBox> = {
  component: BrowserBox,
  title: 'Organisms/BrowserBox',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof BrowserBox>;

const sampleHtml = `<div class="product-card">
  <div class="product-header">
    <h2 class="product-title">Everyday Ruck Snack</h2>
    <span class="product-badge">New</span>
  </div>
  <p class="product-price">€ 2.50</p>
  <button class="product-button">Add to Cart</button>
</div>`;

const sampleCss = `
.product-card {
  width: 300px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  font-family: -apple-system, sans-serif;
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.product-title {
  margin: 0;
  font-size: 1.25rem;
  color: #1f2937;
}

.product-badge {
  background: #3b82f6;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.product-price {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.product-button {
  width: 100%;
  padding: 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.product-button:hover {
  background: #2563eb;
}
`;

/**
 * Default browser box with HTML and CSS
 *
 * Shows a product card with:
 * - Preview tab (live render)
 * - HTML tab (editable source)
 * - CSS tab (editable styles)
 */
export const Default: Story = {
  args: {
    html: sampleHtml,
    css: sampleCss,
    showPreview: true,
    label: 'Code',
    initialTab: 'preview',
  },
};
