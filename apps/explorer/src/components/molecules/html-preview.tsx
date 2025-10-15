import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PanelHeader } from '../atoms/panel-header';
import '../../styles/mapping-demo.css';
import '../../styles/html-preview.css';

export interface HtmlPreviewProps {
  html: string;
  css?: string;
  theme?: 'light' | 'dark';
  label?: string;
  className?: string;
}

type HighlightType = 'context' | 'entity' | 'property' | 'action';

export function HtmlPreview({
  html,
  css = '',
  theme = 'light',
  label = 'Preview',
  className = '',
}: HtmlPreviewProps) {
  const [highlights, setHighlights] = useState<Set<HighlightType>>(new Set());
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

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
    }, 200);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [html, css, theme, highlights, autoMarkProperties]);

  return (
    <div className={`elb-explorer-mapping-box ${className}`}>
      <PanelHeader label={label} />
      <div className="elb-explorer-mapping-editor elb-preview-wrapper">
        <iframe
          ref={iframeRef}
          className="elb-preview-iframe"
          title="HTML Preview"
        />
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
    </div>
  );
}
