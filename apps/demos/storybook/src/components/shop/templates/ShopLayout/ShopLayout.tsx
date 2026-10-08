import type { ReactNode } from 'react';

export interface ShopLayoutProps {
  header: ReactNode;
  footer: ReactNode;
  /** Pinned to the bottom of the viewport, above the page. */
  consent?: ReactNode;
  children: ReactNode;
}

export const ShopLayout = ({
  header,
  footer,
  consent,
  children,
}: ShopLayoutProps) => (
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
