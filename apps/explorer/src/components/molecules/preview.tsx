import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WalkerOS } from '@walkeros/core';
import { sourceBrowser } from '@walkeros/web-source-browser';
import { startFlow } from '@walkeros/collector';
import '../../styles/html-preview.css';

export interface PreviewProps {
  html: string;
  css?: string;
  theme?: 'light' | 'dark';
  onEvent?: (event: WalkerOS.Event) => void;
}

type HighlightType = 'context' | 'entity' | 'property' | 'action';

/**
 * Preview - Pure preview component
 *
 * Renders HTML in an isolated iframe with highlight buttons.
 * When onEvent is provided, initializes walkerOS to capture events.
 *
 * @example
 * // Read-only preview
 * <Preview html={html} css={css} theme="dark" />
 *
 * // Interactive preview with event capture
 * <Preview html={html} css={css} onEvent={(event) => console.log(event)} />
 */
export function Preview({
  html,
  css = '',
  theme = 'light',
  onEvent,
}: PreviewProps) {
  const [highlights, setHighlights] = useState<Set<HighlightType>>(new Set());
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const onEventRef = useRef(onEvent);
  const collectorRef = useRef<any>(null);

  // Keep onEventRef in sync
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  // Initialize walkerOS scoped to iframe content
  const initializeWalker = useCallback(async (scope: HTMLElement) => {
    if (!onEventRef.current) return;

    // Cleanup previous collector
    if (collectorRef.current) {
      try {
        await collectorRef.current.destroy?.();
      } catch (e) {
        // Ignore
      }
    }

    try {
      const { collector, elb } = await startFlow({
        sources: {
          browser: {
            code: sourceBrowser,
            config: {
              settings: {
                pageview: false,
                session: false,
                prefix: 'data-elb',
              },
            },
          },
        },
        destinations: {},
        on: {
          event: (event: WalkerOS.Event) => {
            onEventRef.current?.(event);
          },
        },
      });

      collectorRef.current = collector;
      await elb('walker init', { scope });
    } catch (error) {
      console.error('Failed to initialize walker:', error);
    }
  }, []);

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
                background: ${theme === 'dark' ? '#1f2937' : '#f9fafb'};
                color: ${theme === 'dark' ? '#e5e7eb' : '#111827'};
                min-height: 100vh;
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

      // Initialize walkerOS in parent but scoped to iframe if onEvent provided
      if (onEventRef.current && doc.body) {
        // Small delay to ensure iframe DOM is fully ready
        setTimeout(() => {
          if (doc.body) {
            initializeWalker(doc.body);
          }
        }, 50);
      }
    }, 200);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [html, css, theme, highlights, autoMarkProperties, initializeWalker]);

  return (
    <div className="elb-preview-wrapper">
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
    </div>
  );
}
