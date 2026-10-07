import React, { type AnchorHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';
import type { LinkComponent } from '../types';

export interface TextLinkProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> {
  href: string;
  children: ReactNode;
  tone?: 'link' | 'muted';
  arrow?: boolean;
  /** A router link rendered instead of `<a>`, with the same props. */
  linkComponent?: LinkComponent;
}

/** An inline link in `link` (or `fg-2`) colour, underlined on hover. */
export function TextLink({
  href,
  children,
  tone = 'link',
  arrow = false,
  linkComponent: Link,
  className,
  ...rest
}: TextLinkProps) {
  const props = {
    ...rest,
    href,
    className: cx(
      'elb-text-link',
      tone === 'muted' && 'elb-text-link--muted',
      className,
    ),
  };
  const content = (
    <>
      {children}
      {arrow && <span aria-hidden="true"> →</span>}
    </>
  );
  return Link ? <Link {...props}>{content}</Link> : <a {...props}>{content}</a>;
}
