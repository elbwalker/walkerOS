import type { ReactNode } from 'react';

export interface OnePagerProps {
  header: ReactNode;
  footer: ReactNode;
  /** Pinned to the bottom of the viewport, above the page. */
  consent?: ReactNode;
  /** The page's sections, each with the id its anchor link points at. */
  children: ReactNode;
}

/** A demo site's one page: header, sections, footer and the consent bar. */
export const OnePager = ({
  header,
  footer,
  consent,
  children,
}: OnePagerProps) => (
  // Room below the footer, so the pinned consent bar never covers it.
  <div className={`min-h-screen bg-bg text-fg ${consent ? 'pb-40' : ''}`}>
    {header}
    <main>{children}</main>
    {footer}
    {consent && (
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-(--z-sticky) flex justify-center p-4">
        <div className="pointer-events-auto max-w-full">{consent}</div>
      </div>
    )}
  </div>
);
