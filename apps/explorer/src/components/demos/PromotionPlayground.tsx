import React, { useState, useCallback } from 'react';
import type { WalkerOS, Destination } from '@walkeros/core';
import { Box } from '../atoms/box';
import { Preview } from '../molecules/preview';
import { CodePanel } from '../molecules/code-panel';
import { CollectorBox } from '../molecules/collector-box';
import { createGtagDestination } from '../../helpers/destinations';
import '../../styles/mapping-demo.css';

export interface PromotionPlaygroundProps {
  initialHtml?: string;
  initialMapping?: string;
  labelHtml?: string;
  labelPreview?: string;
  labelEvents?: string;
  labelMapping?: string;
  labelResult?: string;
  theme?: 'light' | 'dark';
  destination?: Destination.Code;
}

const defaultContent = `<style>
* {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.hero-section {
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  max-width: 500px;
  margin: 0 auto;
}

.hero-content {
  text-align: center;
}

.hero-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0 0 1rem 0;
}

.hero-text {
  margin: 0 0 1.5rem 0;
  opacity: 0.9;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  margin: 0.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-primary {
  background: #10b981;
  color: white;
}

.btn-secondary {
  background: white;
  color: #667eea;
}
</style>

<div
  data-elb="promotion"
  data-elbaction="visible"
  data-elb-promotion="category:analytics"
  data-elbcontext="test:live_demo"
  class="hero-section"
>
  <div class="hero-content">
    <h2 data-elb-promotion="name:#innerText" class="hero-title">
      Setting up tracking easily
    </h2>
    <p class="hero-text">
      Click a button to trigger more events.
    </p>
    <button data-elbaction="click:start" class="btn btn-primary">
      Get Started
    </button>
    <button data-elbaction="click:more" class="btn btn-secondary">
      Learn more
    </button>
  </div>
</div>`;

const defaultMapping = `{
  "promotion": {
    "visible": {
      "name": "view_promotion",
      "data": {
        "map": {
          "promotion_id": "data.category",
          "promotion_name": "data.name"
        }
      }
    },
    "click": {
      "name": "select_promotion",
      "data": {
        "map": {
          "promotion_id": "data.category",
          "promotion_name": "data.name",
          "creative_slot": "trigger"
        }
      }
    }
  }
}`;

/**
 * Parse HTML content to extract styles and body HTML
 */
function parseHtmlContent(content: string): { html: string; css: string } {
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let css = '';
  let match;

  while ((match = styleRegex.exec(content)) !== null) {
    css += match[1] + '\n';
  }

  // Remove style tags from HTML
  const html = content.replace(styleRegex, '').trim();

  return { html, css };
}

/**
 * PromotionPlayground - Full walkerOS demonstration with live HTML editing
 *
 * Shows the complete chain:
 * 1. HTML Editor - Edit HTML with walkerOS data attributes (includes <style> tags)
 * 2. Preview - Live rendered HTML that captures real events
 * 3. Events - Real events captured from preview interactions
 * 4. Mapping - Apply transformations and see destination output
 */
export function PromotionPlayground({
  initialHtml = defaultContent,
  initialMapping = defaultMapping,
  labelHtml = 'HTML',
  labelPreview = 'Preview',
  labelEvents = 'Events',
  labelMapping = 'Mapping',
  labelResult = 'Result',
  theme = 'light',
  destination = createGtagDestination(),
}: PromotionPlaygroundProps) {
  const [content, setContent] = useState(initialHtml);
  const [mappingInput, setMappingInput] = useState(initialMapping);
  const [capturedEvent, setCapturedEvent] = useState<WalkerOS.Event | null>(
    null,
  );

  const { html, css } = parseHtmlContent(content);

  // Handle events from preview
  const handleEvent = useCallback((event: WalkerOS.Event) => {
    setCapturedEvent(event);
  }, []);

  const eventDisplay = capturedEvent
    ? JSON.stringify(capturedEvent, null, 2)
    : '// Click elements in the preview to see events';

  return (
    <div className="elb-explorer-mapping">
      <div
        className="elb-explorer-mapping-grid"
        style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}
      >
        {/* Column 1: HTML Editor */}
        <CodePanel
          label={labelHtml}
          value={content}
          onChange={setContent}
          language="html"
          theme={theme}
        />

        {/* Column 2: Preview */}
        <Box header={labelPreview}>
          <Preview html={html} css={css} theme={theme} onEvent={handleEvent} />
        </Box>

        {/* Column 3: Events */}
        <CodePanel
          label={labelEvents}
          value={eventDisplay}
          disabled
          language="json"
          theme={theme}
        />

        {/* Column 4: Mapping */}
        <CodePanel
          label={labelMapping}
          value={mappingInput}
          onChange={setMappingInput}
          language="json"
          theme={theme}
        />

        {/* Column 5: Result */}
        <CollectorBox
          event={capturedEvent ? JSON.stringify(capturedEvent) : '{}'}
          mapping={mappingInput}
          destination={destination}
          label={labelResult}
          theme={theme}
        />
      </div>
    </div>
  );
}
