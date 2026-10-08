import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import type { WalkerOS, Elb, Collector } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import {
  bg,
  bg2,
  border,
  borderStrong,
  fg,
  fg2,
  fg3,
  focus,
  link,
  onPrimary,
  primary,
  surface,
  surface2,
} from '../../design';
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
</div>
<span data-elbglobals="language:en"></span>`;

// The demo page's own CSS: a light product card, its colours taken from the
// design system's light values.
const defaultCss = `* {
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.product-card {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  background: ${surface.light};
  border: 1px solid ${border.light};
  border-radius: 16px;
  overflow: hidden;
}

.product-figure {
  position: relative;
  margin: 0;
  padding: 0;
  width: 100%;
  height: 160px;
  background: repeating-linear-gradient(
    45deg,
    ${bg2.light},
    ${bg2.light} 10px,
    ${surface2.light} 10px,
    ${surface2.light} 20px
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
  background: ${primary.light};
  color: ${onPrimary.light};
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
  color: ${fg.light};
}

.form-control {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${fg2.light};
  margin-bottom: 0.5rem;
}

.form-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${borderStrong.light};
  border-radius: 8px;
  font-size: 0.875rem;
  color: ${fg.light};
  background: ${bg.light};
  cursor: pointer;
  transition: border-color 0.2s;
}

.form-select:hover {
  border-color: ${fg3.light};
}

.form-select:focus {
  outline: 2px solid ${focus.light};
  outline-offset: 2px;
}

.product-price {
  font-size: 1.25rem;
  font-weight: 700;
  color: ${fg.light};
  margin: 0 0 1rem 0;
}

.product-old-price {
  font-size: 1rem;
  font-weight: 400;
  color: ${fg3.light};
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
}

.btn:active {
  transform: translateY(0);
}

.btn-primary {
  background: ${primary.light};
  color: ${onPrimary.light};
}

.btn-primary:hover {
  filter: brightness(1.08);
}

.btn-secondary {
  background: ${surface.light};
  color: ${link.light};
  border: 1px solid ${link.light};
}

.btn-secondary:hover {
  background: ${primary.light};
  border-color: ${primary.light};
  color: ${onPrimary.light};
}`;

const defaultMapping = `{
  "product": {
    "view": {
      "name": "view_item",
      "data": {
        "map": {
          "currency": { "value": "EUR" },
          "value": "data.price",
          "items": {
            "set": [
              {
                "map": {
                  "item_name": "data.name",
                  "item_variant": "data.taste",
                  "price": "data.price",
                  "quantity": { "value": 1 }
                }
              }
            ]
          }
        }
      }
    },
    "add": {
      "name": "add_to_cart",
      "data": {
        "map": {
          "currency": { "value": "EUR" },
          "value": "data.price",
          "items": {
            "set": [
              {
                "map": {
                  "item_name": "data.name",
                  "item_variant": "data.taste",
                  "price": "data.price",
                  "quantity": { "value": 1 }
                }
              }
            ]
          }
        }
      }
    },
    "save": {
      "name": "add_to_wishlist",
      "data": {
        "map": {
          "currency": { "value": "EUR" },
          "value": "data.price",
          "items": {
            "set": [
              {
                "map": {
                  "item_name": "data.name",
                  "item_variant": "data.taste",
                  "price": "data.price",
                  "quantity": { "value": 1 }
                }
              }
            ]
          }
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
        folding
        sticky
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
