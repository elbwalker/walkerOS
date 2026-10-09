import { useRef, type MouseEvent, type ReactNode } from 'react';

export interface OnePagerProps {
  header: ReactNode;
  footer: ReactNode;
  /** Pinned to the bottom of the viewport, above the page. */
  consent?: ReactNode;
  /** The page's sections, each with the id its anchor link points at. */
  children: ReactNode;
}

/**
 * A demo site's one page: a header that sticks to the top, sections, footer
 * and the consent bar.
 *
 * In-page anchor links (`#section`, `#` for the top) scroll this page's own
 * window, the target just below the sticky header, and put the hash in the
 * URL with `pushState`. Default hash navigation and `scrollIntoView` would
 * also scroll the page around a framed demo, so the page handles every
 * anchor here and its components stay unaware. A link whose click is already
 * handled (the demo's links that lead nowhere) stays where it is.
 */
export const OnePager = ({
  header,
  footer,
  consent,
  children,
}: OnePagerProps) => {
  const headerRef = useRef<HTMLDivElement>(null);

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !(event.target instanceof Element)
    )
      return;
    const link = event.target.closest('a[href^="#"]');
    const href = link?.getAttribute('href');
    const view = link?.ownerDocument.defaultView;
    if (!link || !href || !view) return;

    event.preventDefault();
    const id = href.slice(1);
    const target = id ? link.ownerDocument.getElementById(id) : null;
    if (id && !target) return;

    const offset = headerRef.current?.getBoundingClientRect().height ?? 0;
    const top = target
      ? target.getBoundingClientRect().top + view.scrollY - offset
      : 0;
    const reduceMotion = view.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    view.scrollTo({
      top: Math.max(0, top),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
    view.history.pushState(view.history.state, '', href);
  };

  return (
    // Room below the footer, so the pinned consent bar never covers it.
    <div
      onClick={onClick}
      className={`min-h-screen bg-bg text-fg ${consent ? 'pb-40' : ''}`}
    >
      <div ref={headerRef} className="sticky top-0 z-(--z-sticky)">
        {header}
      </div>
      <main>{children}</main>
      {footer}
      {consent && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-(--z-sticky) flex justify-center p-4">
          <div className="pointer-events-auto max-w-full">{consent}</div>
        </div>
      )}
    </div>
  );
};
