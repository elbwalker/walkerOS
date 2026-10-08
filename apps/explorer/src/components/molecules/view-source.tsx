import React, {
  type AriaAttributes,
  type CSSProperties,
  type ReactElement,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { SourceBrowser } from '@walkeros/web-source-browser';
import { Code } from '../atoms/code';
import { ToggleButton } from '../atoms/toggle-button';
import { formatCode } from '../../utils/format-code';

export interface ViewSourceProps extends AriaAttributes {
  /** Exactly one element: the component whose HTML is shown. */
  children: ReactElement;
  /**
   * The page's elb (the browser source's push). After an edit is applied, and
   * after Reset brings the original back, ViewSource calls
   * `elb('walker init', element)` so the new nodes get their triggers.
   */
  elb?: SourceBrowser.Push;
  /**
   * Lets the wrapped element fill a stretched grid or flex cell as it does
   * unwrapped (cards in a grid row). The root and its content become
   * one-column grids: an auto-height element fills the cell, its margins,
   * own self-alignment and explicit height still apply, and its vertical
   * margins stay inside the wrapper. Leave it off for an element centered
   * with auto margins (a section with `mx-auto`), which a grid shrinks to
   * fit.
   */
  stretch?: boolean;
  className?: string;
  id?: string;
  [dataAttribute: `data-${string}`]: string | undefined;
}

type Mode = 'visual' | 'code';
type Refresh = 'pending' | 'done' | 'failed';
type Parsed = { element: Element } | { found: string };
// The code panel's size: the element's border box when Code opens.
type Box = { width: number; height: number };
// What the code covers inside that box: the padding left free (top, right,
// bottom, left) and the corner radius of the dark surface.
type Frame = { inset: [number, number, number, number]; radius: string };

const FULL_BOX: Frame = { inset: [0, 0, 0, 0], radius: '0px' };

// Every ViewSource root carries `data-view-source`, so an outer one finds
// nested ones.
const WRAPPER = '[data-view-source]';

const MODES = [
  { label: 'Visual', value: 'visual' },
  { label: 'Code', value: 'code' },
];

const ICON = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const WARNING = (
  <svg {...ICON}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const RESET = (
  <svg {...ICON}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

/** The one element some HTML holds, or what it holds instead. */
function parseElement(html: string, doc: Document): Parsed {
  const template = doc.createElement('template');
  template.innerHTML = html;
  const elements = Array.from(template.content.children);
  const text = Array.from(template.content.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim(),
  );
  if (elements.length === 1 && !text) return { element: elements[0] };

  const found =
    elements.length > 1
      ? `${elements.length} elements`
      : elements.length === 1
        ? 'an element and text'
        : text
          ? 'text'
          : 'nothing';
  return { found };
}

// A computed colour is transparent when its alpha, the colour function's last
// component (after "," or "/"), is zero.
const ZERO_ALPHA = /[,/]\s*0(?:\.0+)?%?\s*\)$/;

/** Whether the element paints a box: a background or a visible border. */
function paintsBox(style: CSSStyleDeclaration): boolean {
  const color = style.backgroundColor;
  const image = style.backgroundImage;
  const border = [
    style.borderTopWidth,
    style.borderRightWidth,
    style.borderBottomWidth,
    style.borderLeftWidth,
  ].some((width) => parseFloat(width) > 0);
  return (
    (!!color && color !== 'transparent' && !ZERO_ALPHA.test(color)) ||
    (!!image && image !== 'none') ||
    border
  );
}

/**
 * The code covers the element's visible box: the whole border box, with the
 * element's radius, when it paints one; else its content box, its padding
 * left free, with the design radius.
 */
function frameOf(element: Element | null): Frame {
  const style = element?.ownerDocument.defaultView?.getComputedStyle(element);
  if (!style) return FULL_BOX;
  if (paintsBox(style))
    return { inset: [0, 0, 0, 0], radius: style.borderRadius || '0px' };
  const px = (value: string) => parseFloat(value) || 0;
  return {
    inset: [
      px(style.paddingTop),
      px(style.paddingRight),
      px(style.paddingBottom),
      px(style.paddingLeft),
    ],
    radius: 'var(--radius-md)',
  };
}

function sameFrame(a: Frame, b: Frame): boolean {
  return (
    a.radius === b.radius && a.inset.every((value, i) => value === b.inset[i])
  );
}

/** The one element the content holds, or null. */
function wrappedElement(content: Element | null): Element | null {
  return content?.children.length === 1 ? content.children[0] : null;
}

/**
 * The content's live HTML with every nested ViewSource replaced by the
 * element it wraps, so the snapshot holds the page's markup only.
 */
function sourceOf(content: Element): string {
  // Parsed in an inert template: no image fetch, no custom element upgrade.
  const template = content.ownerDocument.createElement('template');
  template.innerHTML = content.innerHTML;
  template.content.querySelectorAll(WRAPPER).forEach((wrapper) => {
    const inner = wrapper.querySelector(':scope > .elb-view-source__content');
    wrapper.replaceWith(...(inner ? Array.from(inner.childNodes) : []));
  });
  return template.innerHTML;
}

/**
 * ViewSource - shows a component's live HTML in place and lets you edit it.
 *
 * Wraps exactly one element and adds no frame of its own. A toggle at the
 * top right switches between Visual and Code. Code shows the element's live
 * HTML, formatted and editable, on a dark code surface; the code covers the
 * element's visible box (its border box when it paints a background or
 * border, else its content box inside the padding), and the toggle sits at
 * that box's top right. Escape leaves the editor for the toggle.
 * Back in Visual, a changed edit replaces the element as plain HTML (React
 * handlers inside it are inactive) and `elb('walker init', element)`
 * registers its triggers. Reset, an icon beside the toggle, mounts the
 * original children again and registers theirs the same way.
 *
 * ViewSources nest: an outer snapshot shows the inner wrapped elements
 * without their wrappers, and only the innermost hovered toolbar shows. An
 * applied outer edit is plain HTML, so it has no inner wrappers until Reset.
 *
 * Wrap the outermost tagged element of a section, never an element inside one
 * with a click action: a click on the toolbar bubbles to the wrapper's
 * ancestors.
 *
 * @example
 * <ViewSource elb={elb}>
 *   <PromotionHero />
 * </ViewSource>
 */
export function ViewSource({
  children,
  elb,
  stretch = false,
  className,
  ...rest
}: ViewSourceProps) {
  const [mode, setMode] = useState<Mode>('visual');
  const [snapshot, setSnapshot] = useState('');
  const [draft, setDraft] = useState('');
  const [box, setBox] = useState<Box>({ width: 0, height: 0 });
  const [frame, setFrame] = useState<Frame>(FULL_BOX);
  const [problem, setProblem] = useState<string>();
  const [edited, setEdited] = useState<Element | null>(null);
  const [refresh, setRefresh] = useState<Refresh>('pending');
  const [resets, setResets] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  // The latest Code request and walker init call: a late answer to an older
  // one is dropped.
  const openRef = useRef(0);
  const initRef = useRef(0);
  // What was last handed to walker init: the applied element, or the Reset
  // count for the restored original. 0 is the first mount, which the page's
  // own walker run covers.
  const initializedRef = useRef<Element | number>(0);
  const elbRef = useRef(elb);
  elbRef.current = elb;

  // Nodes React did not render for the page's walker run need walker init:
  // an applied edit, which sits in a host React leaves empty and never
  // reconciles, and the original remounted by Reset. Placing the edit before
  // paint keeps the box from collapsing for a frame.
  useLayoutEffect(() => {
    const host = contentRef.current;
    if (!host) return;
    if (edited && host.firstElementChild !== edited)
      host.replaceChildren(edited);

    const token = edited ?? resets;
    if (token === initializedRef.current) return;
    initializedRef.current = token;

    const restored = Array.from(host.children);
    const scope = edited ?? (restored.length === 1 ? restored[0] : restored);
    const attempt = ++initRef.current;
    const settle = (ok: boolean) => {
      if (attempt === initRef.current) setRefresh(ok ? 'done' : 'failed');
    };
    const pageElb = elbRef.current;
    if (!pageElb) {
      settle(false);
      return;
    }
    try {
      pageElb('walker init', scope).then(
        (result) => settle(result.ok),
        () => settle(false),
      );
    } catch {
      settle(false);
    }
  }, [edited, resets]);

  // The toolbar sits at the visible box's top right in Visual too: measured
  // when the shown element changes and whenever it resizes.
  useLayoutEffect(() => {
    const element = wrappedElement(contentRef.current);
    const update = () =>
      setFrame((current) => {
        const next = frameOf(element);
        return sameFrame(current, next) ? current : next;
      });
    update();
    const win = element?.ownerDocument.defaultView;
    if (!element || !win || typeof win.ResizeObserver === 'undefined') return;
    const observer = new win.ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [edited, resets]);

  const focusToggle = () => {
    const toggle = toolbarRef.current?.querySelector('.elb-explorer-toggle');
    if (toggle instanceof HTMLElement) toggle.focus();
  };

  const showCode = async () => {
    const content = contentRef.current;
    if (mode === 'code' || !content) return;
    const open = ++openRef.current;
    const html = sourceOf(content);
    const parsed = parseElement(html, content.ownerDocument);
    // The code takes the element's own box; for anything else, the wrapper's.
    const element = 'element' in parsed ? wrappedElement(content) : null;
    const rect = (element ?? content).getBoundingClientRect();
    const nextFrame = frameOf(element);
    const formatted = await formatCode(html, 'html');
    if (open !== openRef.current) return;
    setBox({ width: rect.width, height: rect.height });
    setFrame(nextFrame);
    setSnapshot(formatted);
    setDraft(formatted);
    setProblem(
      'found' in parsed
        ? `ViewSource needs one element, found ${parsed.found}`
        : undefined,
    );
    setMode('code');
  };

  const showVisual = () => {
    openRef.current += 1;
    const content = contentRef.current;
    if (mode === 'visual' || !content) return;
    if (draft !== snapshot) {
      const parsed = parseElement(draft, content.ownerDocument);
      if ('found' in parsed) {
        setProblem(
          `Not applied: needs one root element, found ${parsed.found}`,
        );
        return;
      }
      setEdited(parsed.element);
      setRefresh('pending');
    }
    setProblem(undefined);
    setMode('visual');
  };

  const reset = () => {
    openRef.current += 1;
    if (edited) {
      setEdited(null);
      setRefresh('pending');
      setResets((count) => count + 1);
    }
    setProblem(undefined);
    setMode('visual');
    // Reset leaves the toolbar; keep keyboard focus in it.
    focusToggle();
  };

  const isCode = mode === 'code';
  const canReset = edited !== null || (isCode && draft !== snapshot);
  const status =
    refresh === 'failed' && (edited || resets > 0)
      ? 'Triggers not refreshed'
      : undefined;
  const rootClassName = [
    'elb-view-source',
    stretch && 'elb-view-source--stretch',
    isCode && 'elb-view-source--code',
    edited && 'elb-view-source--edited',
    (status || problem) && 'elb-view-source--notice',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const [top, right, bottom, left] = frame.inset;
  const rootStyle: CSSProperties & Record<`--${string}`, string> = {
    '--elb-view-source-inset': `${top}px ${right}px ${bottom}px ${left}px`,
    '--elb-view-source-inset-top': `${top}px`,
    '--elb-view-source-inset-right': `${right}px`,
    '--elb-view-source-radius': frame.radius,
    '--elb-view-source-width': `${box.width}px`,
    '--elb-view-source-height': `${box.height}px`,
  };

  return (
    <div
      {...rest}
      data-view-source=""
      className={rootClassName}
      style={rootStyle}
    >
      <div
        ref={toolbarRef}
        className="elb-view-source__toolbar"
        role="group"
        aria-label="View source"
      >
        {/* Mounted before its text, so screen readers announce changes */}
        <span className="elb-view-source__notice" role="status">
          {status && (
            <>
              {WARNING}
              {status}
            </>
          )}
        </span>
        {problem && (
          <span className="elb-view-source__notice" role="alert">
            {WARNING}
            {problem}
          </span>
        )}
        {canReset && (
          <button
            type="button"
            className="elb-view-source__reset"
            aria-label="Reset"
            title="Reset"
            onClick={reset}
          >
            {RESET}
          </button>
        )}
        <ToggleButton
          options={MODES}
          value={mode}
          onChange={(value) => {
            if (value === 'code') void showCode();
            else showVisual();
          }}
          aria-label={isCode ? 'Show visual' : 'Show code'}
          aria-keyshortcuts={isCode ? 'Escape' : undefined}
        />
      </div>
      {edited ? (
        <div
          key="edited"
          ref={contentRef}
          className="elb-view-source__content"
          hidden={isCode}
        />
      ) : (
        <div
          key={`original-${resets}`}
          ref={contentRef}
          className="elb-view-source__content"
          hidden={isCode}
        >
          {children}
        </div>
      )}
      {isCode && (
        <div
          className="elb-view-source__code"
          data-theme="dark"
          onKeyDown={(event) => {
            if (event.key === 'Escape') focusToggle();
          }}
        >
          <div className="elb-view-source__surface">
            <Code
              code={snapshot}
              language="html"
              onChange={setDraft}
              wordWrap
              isolateScroll
            />
          </div>
        </div>
      )}
    </div>
  );
}
