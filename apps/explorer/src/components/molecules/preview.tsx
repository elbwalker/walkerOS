import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WalkerOS, Elb, Collector, Source } from '@walkeros/core';
import { sourceBrowser } from '@walkeros/web-source-browser';

export interface PreviewProps {
  html: string;
  css?: string;
  onEvent?: (event: WalkerOS.Event) => void;
}

type HighlightType = 'context' | 'entity' | 'property' | 'action';

/**
 * Preview - Pure preview component
 *
 * Renders HTML in an isolated iframe with highlight buttons.
 * When onEvent is provided, initializes walkerOS browser source in iframe.
 *
 * @example
 * // Read-only preview
 * <Preview html={html} css={css} />
 *
 * // Interactive preview with event capture
 * <Preview html={html} css={css} onEvent={(event) => console.log(event)} />
 */
export function Preview({ html, css = '', onEvent }: PreviewProps) {
  const [highlights, setHighlights] = useState<Set<HighlightType>>(new Set());
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const onEventRef = useRef(onEvent);
  const sourceInstanceRef = useRef<Source.Instance | null>(null);

  // Keep onEventRef in sync
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const toggleHighlight = (type: HighlightType) => {
    setHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const autoMarkProperties = useCallback(
    (container: HTMLElement | Document) => {
      const entities = container.querySelectorAll('[data-elb]');
      entities.forEach((entity) => {
        const entityName = entity.getAttribute('data-elb');
        if (!entityName) return;

        const propertySelector = `[data-elb-${entityName}]`;
        entity.querySelectorAll(propertySelector).forEach((el) => {
          el.setAttribute('data-elbproperty', '');
        });
      });
    },
    [],
  );

  useEffect(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentDocument) return;

      const doc = iframe.contentDocument;
      const highlightClasses = Array.from(highlights)
        .map((type) => `highlight-${type}`)
        .join(' ');

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              /* Reset */
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                padding: 1.5rem;
                background: #f9fafb;
                color: #111827;
                min-height: 100vh;
              }

              @media (prefers-color-scheme: dark) {
                body {
                  background: #1f2937;
                  color: #e5e7eb;
                }
              }

              /* User CSS */
              ${css}

              /* Highlight CSS - imported from highlight styles */
              :root {
                --highlight-globals: #4fc3f7cc;
                --highlight-context: #ffbd44cc;
                --highlight-entity: #00ca4ecc;
                --highlight-property: #ff605ccc;
                --highlight-action: #9900ffcc;
              }

              body.elb-highlight.highlight-entity [data-elb] {
                box-shadow: 0 0 0 2px var(--highlight-entity);
              }

              body.elb-highlight.highlight-context [data-elbcontext] {
                box-shadow: 0 0 0 2px var(--highlight-context);
              }

              body.elb-highlight.highlight-property [data-elbproperty] {
                box-shadow: 0 0 0 2px var(--highlight-property);
              }

              body.elb-highlight.highlight-action [data-elbaction] {
                box-shadow: 0 0 0 2px var(--highlight-action);
              }

              /* Combined highlights */
              body.elb-highlight.highlight-entity.highlight-action [data-elb][data-elbaction] {
                box-shadow: 0 0 0 2px var(--highlight-action), 0 0 0 4px var(--highlight-entity);
              }

              body.elb-highlight.highlight-entity.highlight-context [data-elb][data-elbcontext] {
                box-shadow: 0 0 0 2px var(--highlight-entity), 0 0 0 4px var(--highlight-context);
              }

              body.elb-highlight.highlight-action.highlight-context [data-elbaction][data-elbcontext] {
                box-shadow: 0 0 0 2px var(--highlight-action), 0 0 0 4px var(--highlight-context);
              }
            </style>
          </head>
          <body class="elb-highlight ${highlightClasses}">
            ${html}
          </body>
        </html>
      `);
      doc.close();

      autoMarkProperties(doc);

      // Initialize browser source in iframe
      if (
        onEventRef.current &&
        iframe.contentWindow &&
        iframe.contentDocument
      ) {
        setTimeout(async () => {
          // Cleanup previous source instance
          if (sourceInstanceRef.current) {
            try {
              await sourceInstanceRef.current.destroy?.();
            } catch (e) {
              // Ignore cleanup errors
            }
          }

          try {
            if (!iframe.contentWindow || !iframe.contentDocument) return;

            // Create elb function that satisfies Elb.Fn interface
            const elbFn: Elb.Fn = ((...args: unknown[]) => {
              // Handle event push - first arg is the event or command
              const [first] = args;
              if (onEventRef.current && first && typeof first === 'object') {
                onEventRef.current(first as WalkerOS.Event);
              }
              return Promise.resolve({ ok: true });
            }) as Elb.Fn;

            // Initialize browser source directly in iframe
            // Note: contentWindow type doesn't match `Window & typeof globalThis` exactly,
            // but it has all the required properties for the browser source to work
            const sourceInstance = await sourceBrowser(
              {
                settings: {
                  pageview: true,
                  session: false,
                  prefix: 'data-elb',
                  elb: 'elb',
                  elbLayer: 'elbLayer',
                },
              },
              {
                elb: elbFn,
                // Required by Source.BaseEnv but not used in preview context
                push: elbFn,
                command: (() =>
                  Promise.resolve({
                    ok: true,
                    successful: [],
                    queued: [],
                    failed: [],
                  })) as Collector.CommandFn,
                window: iframe.contentWindow as Window & typeof globalThis,
                document: iframe.contentDocument,
              },
            );

            sourceInstanceRef.current = sourceInstance;
          } catch (error) {
            // Browser source initialization failed - silently ignore in preview context
            // Error is expected in test/iframe environments
          }
        }, 50);
      }
    }, 200);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      // Cleanup source instance
      if (sourceInstanceRef.current) {
        sourceInstanceRef.current.destroy?.();
      }
    };
  }, [html, css, highlights, autoMarkProperties]);

  return (
    <>
      <div className="elb-preview-content">
        <iframe
          ref={iframeRef}
          className="elb-preview-iframe"
          title="HTML Preview"
        />
      </div>
      <div className="elb-highlight-buttons">
        <button
          className={`btn-context ${highlights.has('context') ? 'highlight-context' : ''}`}
          onClick={() => toggleHighlight('context')}
          type="button"
        >
          Context
        </button>
        <button
          className={`btn-entity ${highlights.has('entity') ? 'highlight-entity' : ''}`}
          onClick={() => toggleHighlight('entity')}
          type="button"
        >
          Entity
        </button>
        <button
          className={`btn-property ${highlights.has('property') ? 'highlight-property' : ''}`}
          onClick={() => toggleHighlight('property')}
          type="button"
        >
          Property
        </button>
        <button
          className={`btn-action ${highlights.has('action') ? 'highlight-action' : ''}`}
          onClick={() => toggleHighlight('action')}
          type="button"
        >
          Action
        </button>
      </div>
    </>
  );
}
