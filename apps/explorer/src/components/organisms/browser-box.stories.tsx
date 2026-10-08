import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { border, fg, onPrimary, primary, surface } from '../../design';
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
  background: ${surface.light};
  border: 1px solid ${border.light};
  border-radius: 8px;
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
  color: ${fg.light};
}

.product-badge {
  background: ${primary.light};
  color: ${onPrimary.light};
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.product-price {
  font-size: 1.5rem;
  font-weight: 700;
  color: ${fg.light};
  margin: 0 0 16px 0;
}

.product-button {
  width: 100%;
  padding: 12px;
  background: ${primary.light};
  color: ${onPrimary.light};
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.product-button:hover {
  filter: brightness(1.08);
}
`;

/**
 * Editable HTML/CSS/JS code panel without the preview tab, as the
 * PromotionPlayground uses it next to a separate Preview.
 */
export const Default: Story = {
  render: () => {
    const [html, setHtml] = useState(sampleHtml);
    const [css, setCss] = useState(sampleCss);
    const [js, setJs] = useState('');
    return (
      <BrowserBox
        label="Code"
        html={html}
        css={css}
        js={js}
        onHtmlChange={setHtml}
        onCssChange={setCss}
        onJsChange={setJs}
        showPreview={false}
        initialTab="html"
        lineNumbers={false}
        wordWrap
      />
    );
  },
};
