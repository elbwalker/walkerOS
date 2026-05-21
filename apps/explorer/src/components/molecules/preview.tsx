import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
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
import { ButtonGroup } from '../atoms/button-group';
import { Code } from '../atoms/code';

/**
 * Minimal "product add" example shown when a browser-source step provides no
 * HTML of its own. Demonstrates an entity with a click:add action.
 */
export const DEFAULT_FALLBACK_HTML =
  '<div data-elb="product" data-elbaction="click:add"><button data-elb-product="name:Example;price:9.99">Add to cart</button></div>';

export interface PreviewProps {
  html?: string;
  css?: string;
  js?: string;
  elb?: Elb.Fn;
  label?: string;
  /**
   * Opt-in editor tabs. When true, the header shows a `tabs` ButtonGroup to
   * switch between the live Preview and editable HTML/CSS/JS (matching the
   * playground BrowserBox). When false (default), only the static preview
   * renders so existing plain `Preview` usage is unaffected.
   */
  editable?: boolean;
  /** Tab selected first when `editable` is true. Defaults to `preview`. */
  initialTab?: 'preview' | 'html' | 'css' | 'js';
  onHtmlChange?: (value: string) => void;
  onCssChange?: (value: string) => void;
  onJsChange?: (value: string) => void;
  lineNumbers?: boolean;
  wordWrap?: boolean;
}

/**
 * Preview - HTML preview wrapped in a Box with highlight buttons
 *
 * Renders HTML in an isolated iframe with highlight buttons footer.
 * When elb is provided, initializes walkerOS browser source in iframe
 * that pushes events to the parent collector.
 *
 * Load semantics mirror a real browser: `load` triggers (and pageview) fire
 * once on the initial load and again only when the user clicks Reload. Editing
 * the HTML/CSS re-renders the preview and keeps click capture working but does
 * NOT re-fire load; toggling highlights only flips body classes.
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
  js = '',
  elb,
  label = 'Preview',
  editable = false,
  initialTab = 'preview',
  onHtmlChange,
  onCssChange,
  onJsChange,
  lineNumbers = false,
  wordWrap = false,
}: PreviewProps) {
  // Fall back to a minimal product/click:add example when no HTML is provided.
  const resolvedHtml =
    html && html.trim().length > 0 ? html : DEFAULT_FALLBACK_HTML;
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [highlights, setHighlights] = useState<Set<string>>(new Set());
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const elbRef = useRef(elb);
  const htmlRef = useRef(html);
  const cssRef = useRef(css);
  const highlightsRef = useRef(highlights);
  const sourceRef = useRef<SourceHandle | null>(null);
  // `load` triggers (and pageview) fire only on the first load and on explicit
  // Reload — never on edits or highlight toggles. This ref gates the initial fire.
  const hasFiredInitialLoadRef = useRef(false);

  // Mirror latest props/state into refs so the stable render routine and the
  // Reload handler always read current values without re-subscribing effects.
  elbRef.current = elb;
  htmlRef.current = resolvedHtml;
  cssRef.current = css;
  highlightsRef.current = highlights;

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

  // Render the iframe document and (re)attach the browser source. init() wires
  // click/submit listeners; on('run') (which fires load triggers + pageview)
  // runs only when fireLoad is set or the initial load hasn't fired yet.
  const renderPreview = useCallback(
    async ({ fireLoad }: { fireLoad: boolean }) => {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentDocument) return;

      const doc = iframe.contentDocument;
      const highlightClasses = Array.from(highlightsRef.current)
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
              ${cssRef.current}

              /* Highlight CSS - imported from highlight styles */
              :root {
                --highlight-globals: #4fc3f7cc;
                --highlight-context: #ffbd44cc;
                --highlight-entity: #00ca4ecc;
                --highlight-property: #ff605ccc;
                --highlight-action: #9900ffcc;
              }

              body.elb-highlight.highlight-globals [data-elbglobals] {
                box-shadow: 0 0 0 2px var(--highlight-globals);
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
            ${htmlRef.current}
          </body>
        </html>
      `);
      doc.close();

      autoMarkProperties(doc);

      // Tear down any previous source bound to the old document
      if (sourceRef.current) {
        try {
          await sourceRef.current.instance.destroy?.(
            sourceRef.current.destroyContext,
          );
        } catch {
          // Ignore cleanup errors
        }
        sourceRef.current = null;
      }

      if (!elbRef.current || !iframe.contentWindow || !iframe.contentDocument) {
        return;
      }

      // Let the freshly written document settle before binding listeners
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (!iframe.contentWindow || !iframe.contentDocument || !elbRef.current) {
        return;
      }

      try {
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
          withScope: async (_r, _resp, body) => body({} as never),
          config,
          env,
        });

        // init() attaches click/submit listeners. on('run') processes load
        // triggers (e.g. data-elbaction="load:view") and pageview — fire it only
        // on the first load or an explicit Reload, not on every edit.
        await instance.init?.();
        if (fireLoad || !hasFiredInitialLoadRef.current) {
          await instance.on?.('run');
          hasFiredInitialLoadRef.current = true;
        }

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
    },
    [autoMarkProperties],
  );

  // Re-render the preview and rebind the source on content/elb changes
  // (debounced). Edits never re-fire load (except the gated initial load).
  useEffect(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      void renderPreview({ fireLoad: false });
    }, 200);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.instance.destroy?.(sourceRef.current.destroyContext);
        sourceRef.current = null;
      }
    };
  }, [resolvedHtml, css, elb, renderPreview]);

  // Highlight toggles only flip body classes on the live document — no
  // re-render and no source rebind, so they never re-fire load triggers.
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.body) return;
    const highlightClasses = Array.from(highlights)
      .map((type) => `highlight-${type}`)
      .join(' ');
    doc.body.className = `elb-highlight ${highlightClasses}`.trim();
  }, [highlights]);

  // Reload acts like a browser reload: re-render and re-fire the load lifecycle.
  const handleReload = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    void renderPreview({ fireLoad: true });
  }, [renderPreview]);

  const isPreviewTab = !editable || activeTab === 'preview';

  // Reuse the playground BrowserBox tab pattern: a `tabs` ButtonGroup to switch
  // between the live preview and editable HTML/CSS/JS.
  const tabs = useMemo(
    () => [
      { label: 'Preview', value: 'preview' },
      { label: 'HTML', value: 'html' },
      { label: 'CSS', value: 'css' },
      { label: 'JS', value: 'js' },
    ],
    [],
  );

  const reloadButton = (
    <button
      type="button"
      className="elb-explorer-btn"
      onClick={handleReload}
      title="Reload preview"
      aria-label="Reload preview"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    </button>
  );

  const tabBar = (
    <ButtonGroup
      buttons={tabs.map((tab) => ({
        label: tab.label,
        value: tab.value,
        active: activeTab === tab.value,
      }))}
      onButtonClick={setActiveTab}
      variant="tabs"
    />
  );

  return (
    <Box
      header={label}
      headerActions={
        editable ? (
          <>
            {tabBar}
            {isPreviewTab ? reloadButton : null}
          </>
        ) : (
          reloadButton
        )
      }
      footer={
        isPreviewTab ? (
          <PreviewFooter highlights={highlights} onToggle={toggleHighlight} />
        ) : null
      }
    >
      {/* The iframe stays mounted to preserve the live source binding; editor
          tabs sit on top and the preview is hidden, not unmounted. */}
      <div
        className="elb-preview-content"
        style={isPreviewTab ? undefined : { display: 'none' }}
      >
        <iframe
          ref={iframeRef}
          className="elb-preview-iframe"
          title="HTML Preview"
        />
      </div>
      {editable && activeTab === 'html' ? (
        <Code
          code={resolvedHtml}
          language="html"
          onChange={onHtmlChange}
          disabled={!onHtmlChange}
          lineNumbers={lineNumbers}
          wordWrap={wordWrap}
        />
      ) : null}
      {editable && activeTab === 'css' ? (
        <Code
          code={css}
          language="css"
          onChange={onCssChange}
          disabled={!onCssChange}
          lineNumbers={lineNumbers}
          wordWrap={wordWrap}
        />
      ) : null}
      {editable && activeTab === 'js' ? (
        <Code
          code={js}
          language="javascript"
          onChange={onJsChange}
          disabled={!onJsChange}
          lineNumbers={lineNumbers}
          wordWrap={wordWrap}
        />
      ) : null}
    </Box>
  );
}
