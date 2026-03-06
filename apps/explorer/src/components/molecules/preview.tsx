import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Elb, Source, Logger, Collector, Lifecycle } from '@walkeros/core';
import {
  sourceBrowser,
  type SourceBrowser,
} from '@walkeros/web-source-browser';

interface SourceHandle {
  instance: Source.Instance<SourceBrowser.Types>;
  destroyContext: Lifecycle.DestroyContext<
    SourceBrowser.Config,
    SourceBrowser.Env
  >;
}
import { Box } from '../atoms/box';
import { PreviewFooter } from '../atoms/preview-footer';

export interface PreviewProps {
  html: string;
  css?: string;
  elb?: Elb.Fn;
  label?: string;
}

/**
 * Preview - HTML preview wrapped in a Box with highlight buttons
 *
 * Renders HTML in an isolated iframe with highlight buttons footer.
 * When elb is provided, initializes walkerOS browser source in iframe
 * that pushes events to the parent collector.
 *
 * @example
 * // Read-only preview
 * <Preview html={html} css={css} label="Preview" />
 *
 * // Interactive preview with event capture (elb from parent collector)
 * <Preview html={html} css={css} elb={elb} label="Preview" />
 */
export function Preview({
  html,
  css = '',
  elb,
  label = 'Preview',
}: PreviewProps) {
  const [highlights, setHighlights] = useState<Set<string>>(new Set());
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const elbRef = useRef(elb);
  const sourceRef = useRef<SourceHandle | null>(null);

  // Keep elbRef in sync
  useEffect(() => {
    elbRef.current = elb;
  }, [elb]);

  const toggleHighlight = (type: string) => {
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

      // Initialize browser source in iframe with parent's elb
      if (elbRef.current && iframe.contentWindow && iframe.contentDocument) {
        setTimeout(async () => {
          // Cleanup previous source instance
          if (sourceRef.current) {
            try {
              await sourceRef.current.instance.destroy?.(
                sourceRef.current.destroyContext,
              );
            } catch {
              // Ignore cleanup errors
            }
          }

          try {
            if (
              !iframe.contentWindow ||
              !iframe.contentDocument ||
              !elbRef.current
            ) {
              return;
            }

            // Create a noop logger that satisfies the Logger.Instance interface
            const createNoopLogger = (): Logger.Instance => ({
              error: () => {},
              warn: () => {},
              info: () => {},
              debug: () => {},
              json: () => {},
              throw: (msg: string | Error): never => {
                throw msg instanceof Error ? msg : new Error(msg);
              },
              scope: () => createNoopLogger(),
            });
            const noopLogger = createNoopLogger();

            // Create a noop push function for env
            const noopPush: Collector.PushFn = async () => ({
              ok: true,
              destination: {},
            });

            // Initialize browser source directly with parent's elb
            // This connects the iframe's DOM events to the parent collector
            const config: SourceBrowser.Config = {
              settings: {
                pageview: false,
                prefix: 'data-elb',
                elb: 'elb',
                elbLayer: 'elbLayer',
                // Use body as scope - trigger.ts compares `scope !== document` against
                // main page's document, so iframe.contentDocument fails the Element cast
                scope: iframe.contentDocument.body,
              },
            };
            const env: SourceBrowser.Env = {
              elb: elbRef.current,
              push: noopPush,
              command: async () => ({ ok: true, destination: {} }),
              logger: noopLogger,
              window: iframe.contentWindow as Window & typeof globalThis,
              document: iframe.contentDocument,
            };

            const instance = await sourceBrowser({
              id: 'preview',
              collector: {} as Collector.Instance, // Not used when elb is provided directly
              logger: noopLogger,
              setIngest: async () => {},
              setRespond: () => {},
              config,
              env,
            });

            sourceRef.current = {
              instance,
              destroyContext: {
                id: 'preview',
                config,
                env,
                logger: noopLogger,
              },
            };
          } catch {
            // sourceBrowser init failed - events won't be captured
          }
        }, 50);
      }
    }, 200);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      // Cleanup source
      if (sourceRef.current) {
        sourceRef.current.instance.destroy?.(sourceRef.current.destroyContext);
      }
    };
  }, [html, css, highlights, autoMarkProperties, elb]);

  return (
    <Box
      header={label}
      footer={
        <PreviewFooter highlights={highlights} onToggle={toggleHighlight} />
      }
    >
      <div className="elb-preview-content">
        <iframe
          ref={iframeRef}
          className="elb-preview-iframe"
          title="HTML Preview"
        />
      </div>
    </Box>
  );
}
