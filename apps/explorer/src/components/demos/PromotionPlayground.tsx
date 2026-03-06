import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import type { WalkerOS, Elb, Collector } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { Grid } from '../atoms/grid';
import { Preview } from '../molecules/preview';
import { BrowserBox } from '../organisms/browser-box';
import { CodeBox } from '../molecules/code-box';
import {
  createGtagDestination,
  type DestinationCode,
} from '../../helpers/destinations';

export interface PromotionPlaygroundProps {
  initialHtml?: string;
  initialCss?: string;
  initialJs?: string;
  initialMapping?: string;
  labelCode?: string;
  labelPreview?: string;
  labelEvents?: string;
  labelMapping?: string;
  labelResult?: string;
  destination?: DestinationCode;
}

const defaultHtml = `<div
  data-elb="product"
  data-elbaction="load:view"
  data-elbcontext="stage:inspire"
  class="product-card"
>
  <figure class="product-figure">
    <div class="product-badge-container">
      <div data-elb-product="badge:delicious" class="product-badge">delicious</div>
    </div>
  </figure>
  <div class="product-body">
    <h3 data-elb-product="name:#innerText" class="product-title">
      Everyday Ruck Snack
    </h3>
    <div class="form-control">
      <label class="form-label">Taste</label>
      <select
        data-elb-product="taste:#value"
        class="form-select"
      >
        <option value="sweet">Sweet</option>
        <option value="spicy">Spicy</option>
      </select>
    </div>
    <p data-elb-product="price:2.50" class="product-price">
      € 2.50 <span data-elb-product="old_price:3.14" class="product-old-price">€ 3.14</span>
    </p>
    <div data-elbcontext="stage:hooked" class="product-actions">
      <button
        data-elbaction="click:save"
        class="btn btn-secondary"
      >
        Maybe later
      </button>
      <button
        data-elbaction="click:add"
        class="btn btn-primary"
      >
        Add to Cart
      </button>
    </div>
  </div>
</div>`;

const defaultCss = `* {
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.product-card {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.product-figure {
  position: relative;
  margin: 0;
  padding: 0;
  width: 100%;
  height: 160px;
  background:
    linear-gradient(135deg, rgba(243, 244, 246, 0.9) 0%, rgba(229, 231, 235, 0.9) 100%),
    repeating-linear-gradient(
      45deg,
      #f9fafb,
      #f9fafb 10px,
      #f3f4f6 10px,
      #f3f4f6 20px
    );
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-figure::before {
  content: '🍟';
  font-size: 8rem;
  opacity: 0.8;
}

.product-badge-container {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
}

.product-badge {
  background: #01b5e2;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.product-body {
  padding: 1.5rem;
}

.product-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  color: #111827;
}

.form-control {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.form-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #111827;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.form-select:hover {
  border-color: #9ca3af;
}

.form-select:focus {
  outline: none;
  border-color: #01b5e2;
  box-shadow: 0 0 0 3px rgba(1, 181, 226, 0.1);
}

.product-price {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 1rem 0;
}

.product-old-price {
  font-size: 1rem;
  font-weight: 400;
  color: #9ca3af;
  text-decoration: line-through;
  margin-left: 0.5rem;
}

.product-actions {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.btn:active {
  transform: translateY(0);
}

.btn-primary {
  background: #01b5e2;
  color: white;
}

.btn-primary:hover {
  background: #0195b8;
}

.btn-secondary {
  background: #ffffff;
  color: #01b5e2;
  border: 1px solid #01b5e2;
}

.btn-secondary:hover {
  background: #01b5e2;
  color: #ffffff;
}`;

const defaultMapping = `{
  "product": {
    "view": {
      "name": "view_item",
      "data": {
        "map": {
          "event": "name",
          "price": "data.price",
          "stage": "context.stage.0"
        }
      }
    },
    "add": {
      "name": "add_to_cart",
      "data": {
        "map": {
          "event": "event",
          "price": "data.price",
          "user": {
            "consent": { "marketing": true },
            "key": "user.session"
          },
          "isSale": {
            "fn": "(e) => !!e.data.old_price"
          }
        }
      }
    },
    "save": {
      "data": {
        "map": {
          "event": "event",
          "data": "data"
        }
      }
    }
  }
}`;

/**
 * PromotionPlayground - Full walkerOS demonstration with live code editing
 *
 * Shows the complete chain:
 * 1. Code Editor - Edit HTML/CSS/JS with walkerOS data attributes
 * 2. Preview - Live rendered output that captures real events
 * 3. Events - Real events captured from preview interactions
 * 4. Mapping - Apply transformations and see destination output
 * 5. Result - Final destination function calls
 *
 * Uses a single unified collector flow:
 * - PromotionPlayground owns the collector with destinations
 * - Preview initializes browser source using parent's elb
 * - Events flow through one collector to all destinations
 */
export function PromotionPlayground({
  initialHtml = defaultHtml,
  initialCss = defaultCss,
  initialJs = '',
  initialMapping = defaultMapping,
  labelCode = 'Code',
  labelPreview = 'Preview',
  labelEvents = 'Events',
  labelMapping = 'Mapping',
  labelResult = 'Result',
  destination: destinationProp,
}: PromotionPlaygroundProps) {
  // Memoize destination to prevent useEffect re-runs on every render
  // Default prop values create new objects each render, breaking effect dependencies
  const destination = useMemo(
    () => destinationProp ?? createGtagDestination(),
    [destinationProp],
  );
  const [html, setHtml] = useState(initialHtml);
  const [css, setCss] = useState(initialCss);
  const [js, setJs] = useState(initialJs);
  const [mappingInput, setMappingInput] = useState(initialMapping);
  const [eventJson, setEventJson] = useState<string>(
    '// Click elements in the preview to see events',
  );
  const [outputString, setOutputString] = useState<string>(
    '// Click elements in the preview to see function call',
  );

  const collectorRef = useRef<Collector.Instance | null>(null);
  const elbRef = useRef<Elb.Fn | null>(null);
  const lastEventRef = useRef<WalkerOS.Event | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize collector once on mount
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const parsedMapping = JSON.parse(initialMapping);

        const { collector, elb } = await startFlow({
          destinations: {
            // Capture raw events for display in Events column
            rawCapture: {
              code: {
                type: 'rawCapture',
                config: {},
                push: async (event: WalkerOS.Event) => {
                  if (!mounted) return;
                  lastEventRef.current = event;
                  setEventJson(JSON.stringify(event, null, 2));
                },
              },
            },
            // Transform and display formatted output in Result column
            gtag: {
              code: destination,
              config: {
                mapping: parsedMapping,
              },
              env: {
                elb: (output: string) => {
                  if (!mounted) return;
                  setOutputString(output);
                },
              },
            },
          },
          consent: { functional: true, marketing: true },
          user: { session: 'playground' },
        });

        if (!mounted) return;

        collectorRef.current = collector;
        elbRef.current = elb;
        setIsReady(true);
      } catch {
        // Initialization failed - component will show placeholder
      }
    };

    init();

    return () => {
      mounted = false;
      // Cleanup collector
      if (collectorRef.current) {
        // Sources cleanup would happen here if needed
      }
    };
  }, [initialMapping, destination]);

  // Handle mapping changes - update collector destination config
  const handleMappingChange = useCallback((newMapping: string) => {
    setMappingInput(newMapping);

    // Debounced update to collector
    const timeoutId = setTimeout(() => {
      try {
        const parsed = JSON.parse(newMapping);
        // Update destination config directly
        if (collectorRef.current?.destinations?.gtag?.config) {
          collectorRef.current.destinations.gtag.config.mapping = parsed;
        }
        // Re-process last event to update Result column
        if (lastEventRef.current && collectorRef.current) {
          collectorRef.current.push(lastEventRef.current);
        }
      } catch {
        // Invalid JSON - don't update
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <Grid columns={5} rowHeight={600}>
      {/* Column 1: Code Editor with HTML/CSS/JS tabs */}
      <BrowserBox
        label={labelCode}
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

      {/* Column 2: Preview - uses parent's elb for event capture */}
      <Preview
        label={labelPreview}
        html={html}
        css={css}
        elb={isReady ? (elbRef.current ?? undefined) : undefined}
      />

      {/* Column 3: Events - raw captured events */}
      <CodeBox
        label={labelEvents}
        code={eventJson}
        onChange={setEventJson}
        language="json"
        wordWrap
      />

      {/* Column 4: Mapping - editable transformation rules */}
      <CodeBox
        label={labelMapping}
        code={mappingInput}
        onChange={handleMappingChange}
        language="json"
        wordWrap
      />

      {/* Column 5: Result - transformed destination output */}
      <CodeBox
        label={labelResult}
        code={outputString}
        language="javascript"
        disabled
        wordWrap
      />
    </Grid>
  );
}
