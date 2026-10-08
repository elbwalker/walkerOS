import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  getErrorMessage,
  type Collector,
  type Lifecycle,
  type Source,
} from '@walkeros/core';
import { initSource } from '@walkeros/collector';
import {
  sourceBrowser,
  type SourceBrowser,
} from '@walkeros/web-source-browser';
import {
  eventAction,
  eventContext,
  eventEntity,
  eventGlobals,
  eventProperty,
  vizBg,
  vizFg,
} from '../../design';
import { previewDesignCss } from '../../design/preview-css';
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

/**
 * Highlight rings, one per event part, innermost first. Each ring is edged
 * with the visualisation ground, so it reads on any page colour.
 */
function rings(...colors: string[]): string {
  return colors
    .map(
      (color, index) =>
        `0 0 0 ${2 + index * 3}px ${color}, 0 0 0 ${3 + index * 3}px ${vizBg}`,
    )
    .join(', ');
}

/**
 * The stylesheet of the preview document. The design system comes first (its
 * tokens in their dark values, a preview being a dark island, the base rules
 * and the design atoms), so a page can be built from the design components.
 * The page paints the visualisation ground, the page's own CSS follows, and
 * the highlights mark tagged elements in the event colours.
 */
export function previewStyles(css: string): string {
  return `
    /* The reset sits below the design system's layers */
    @layer reset, base, components;

    ${previewDesignCss}

    /* Reset */
    @layer reset {
      * { margin: 0; padding: 0; box-sizing: border-box; }
    }
    body {
      padding: 24px;
      background: ${vizBg};
      color: ${vizFg};
      min-height: 100vh;
    }

    /* User CSS */
    ${css}

    /* Highlights */
    body.elb-highlight.highlight-globals [data-elbglobals] {
      box-shadow: ${rings(eventGlobals)};
    }

    body.elb-highlight.highlight-entity [data-elb] {
      box-shadow: ${rings(eventEntity)};
    }

    body.elb-highlight.highlight-context [data-elbcontext] {
      box-shadow: ${rings(eventContext)};
    }

    body.elb-highlight.highlight-property [data-elbproperty] {
      box-shadow: ${rings(eventProperty)};
    }

    body.elb-highlight.highlight-action [data-elbaction] {
      box-shadow: ${rings(eventAction)};
    }

    /* Combined highlights */
    body.elb-highlight.highlight-entity.highlight-action [data-elb][data-elbaction] {
      box-shadow: ${rings(eventAction, eventEntity)};
    }

    body.elb-highlight.highlight-entity.highlight-context [data-elb][data-elbcontext] {
      box-shadow: ${rings(eventEntity, eventContext)};
    }

    body.elb-highlight.highlight-action.highlight-context [data-elbaction][data-elbcontext] {
      box-shadow: ${rings(eventAction, eventContext)};
    }
  `;
}

/** The id the preview's browser source carries in the collector. */
const PREVIEW_SOURCE_ID = 'preview';

/** A browser source bound to the preview document, with what its destroy needs. */
interface BoundSource {
  instance: Source.Instance;
  context: Lifecycle.DestroyContext<Source.Config, Source.Env>;
}

export interface PreviewProps {
  html?: string;
  css?: string;
  js?: string;
  /**
   * The collector that captures the preview's events. Preview binds a browser
   * source to its document through the collector's own source wiring, so
   * every click and load event runs the collector's pipeline. Without it the
   * preview only renders. The source is the preview's own, not one of the
   * collector's `sources`: `walker consent` and `walker user` do not reach
   * it, and the collector's status does not list it.
   */
  collector?: Collector.Instance;
  /** The box's name; with `editable`, the name of its first tab. */
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
 * With a collector, a walkerOS browser source captures the iframe's events
 * into it; a source that fails to start says so in the box.
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
 * // Interactive preview that captures events into a collector
 * <Preview html={html} css={css} collector={collector} label="Preview" />
 */
export function Preview({
  html,
  css = '',
  js = '',
  collector,
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
  const [error, setError] = useState<string>();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const collectorRef = useRef(collector);
  const htmlRef = useRef(html);
  const cssRef = useRef(css);
  const highlightsRef = useRef(highlights);
  const sourceRef = useRef<BoundSource | null>(null);
  // Each render of the document takes a number; a render that a newer one
  // overtook while it waited binds nothing.
  const renderRunRef = useRef(0);
  // `load` triggers (and pageview) fire only on the first load and on explicit
  // Reload, never on edits or highlight toggles. This ref gates the initial fire.
  const hasFiredInitialLoadRef = useRef(false);

  // Mirror latest props/state into refs so the stable render routine and the
  // Reload handler always read current values without re-subscribing effects.
  collectorRef.current = collector;
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

  // Destroy the source bound to the previous document, if any.
  const destroySource = useCallback(async () => {
    const bound = sourceRef.current;
    sourceRef.current = null;
    await bound?.instance.destroy?.(bound.context);
  }, []);

  // Render the iframe document and (re)attach the browser source. init() wires
  // click/submit listeners; on('run') (which fires load triggers + pageview)
  // runs only when fireLoad is set or the initial load hasn't fired yet.
  const renderPreview = useCallback(
    async ({ fireLoad }: { fireLoad: boolean }) => {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentDocument) return;
      const run = ++renderRunRef.current;
      const current = () => run === renderRunRef.current;

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
            <style>${previewStyles(cssRef.current)}</style>
          </head>
          <body class="elb-highlight ${highlightClasses}">
            ${htmlRef.current}
          </body>
        </html>
      `);
      doc.close();

      autoMarkProperties(doc);

      const target = collectorRef.current;
      try {
        await destroySource();
        if (!target) {
          setError(undefined);
          return;
        }

        // Let the freshly written document settle before binding listeners
        await new Promise((resolve) => setTimeout(resolve, 50));
        // `window` of the frame's own window is its global, typed as one.
        const win = iframe.contentWindow?.window;
        if (!current() || !win || collectorRef.current !== target) return;

        // The collector wires the source, as for a flow's `sources`: its
        // events run the collector's source pipeline, its commands reach the
        // collector. The same env goes to its destroy.
        const env: Source.Env = {
          push: target.push,
          command: target.command,
          elb: target.elb,
          logger: target.logger,
          window: win,
          document: doc,
        };
        const entry: Source.InitSourceEntry<SourceBrowser.Types> = {
          code: sourceBrowser,
          config: {
            settings: {
              pageview: false,
              prefix: 'data-elb',
              elb: 'elb',
              elbLayer: 'elbLayer',
              // The frame's body: the source compares a document scope with
              // the page's own document, which the frame's is not.
              scope: doc.body,
            },
          },
          env,
        };
        const sources: Source.InitSources = { [PREVIEW_SOURCE_ID]: entry };
        const instance = await initSource(
          target,
          PREVIEW_SOURCE_ID,
          sources[PREVIEW_SOURCE_ID],
        );
        if (!instance) {
          throw new Error(
            'the browser source did not start; the collector logged why',
          );
        }
        const bound: BoundSource = {
          instance,
          context: {
            id: PREVIEW_SOURCE_ID,
            config: instance.config,
            env,
            logger: target.logger,
          },
        };
        if (!current()) {
          await bound.instance.destroy?.(bound.context);
          return;
        }
        sourceRef.current = bound;

        // init() attaches click/submit listeners. on('run') processes load
        // triggers (e.g. data-elbaction="load:view") and pageview, fired only
        // on the first load or an explicit Reload, not on every edit.
        await instance.init?.();
        // A newer render took over while this one set up: hand back what it holds.
        if (!current()) {
          if (sourceRef.current === bound) sourceRef.current = null;
          await bound.instance.destroy?.(bound.context);
          return;
        }
        if (fireLoad || !hasFiredInitialLoadRef.current) {
          await instance.on?.('run');
          hasFiredInitialLoadRef.current = true;
        }
        if (current()) setError(undefined);
      } catch (thrown) {
        if (current())
          setError(`Events are not captured: ${getErrorMessage(thrown)}`);
      }
    },
    [autoMarkProperties, destroySource],
  );

  // Re-render the preview and rebind the source on content/collector changes
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
    };
  }, [resolvedHtml, css, collector, renderPreview]);

  // The source outlives edits and goes with the preview.
  useEffect(
    () => () => {
      // A render still in flight binds nothing after this.
      renderRunRef.current++;
      const target = collectorRef.current;
      destroySource().catch((thrown: unknown) => {
        target?.logger.error('preview source destroy failed', {
          error: getErrorMessage(thrown),
        });
      });
    },
    [destroySource],
  );

  // Highlight toggles only flip body classes on the live document: no
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
      { label, value: 'preview' },
      { label: 'HTML', value: 'html' },
      { label: 'CSS', value: 'css' },
      { label: 'JS', value: 'js' },
    ],
    [label],
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
      // Editable, the first tab names the preview: no second label beside it.
      header={editable ? '' : label}
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
      theme="dark"
      error={error}
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
