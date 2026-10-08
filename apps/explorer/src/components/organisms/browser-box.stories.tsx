import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { productCardCss, productCardHtml } from '../demos/product-card.demo';
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

/**
 * Editable HTML/CSS/JS code panel without the preview tab.
 */
export const Default: Story = {
  render: () => {
    const [html, setHtml] = useState(productCardHtml);
    const [css, setCss] = useState(productCardCss);
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
