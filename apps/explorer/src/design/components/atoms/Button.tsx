import React, {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { cx } from '../cx';
import type { LinkComponent } from '../types';

interface ButtonOwnProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  arrow?: boolean;
  block?: boolean;
  className?: string;
}

type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement>;

/** With `href`: a link, rendered by `linkComponent` when given, else `<a>`. */
export interface ButtonLinkProps
  extends ButtonOwnProps, Omit<AnchorProps, keyof ButtonOwnProps | 'href'> {
  href: string;
  /**
   * A client-side router link (a Docusaurus or Next `Link` taking `href`),
   * rendered instead of `<a>` with the same `href`, `className`, children and
   * every other attribute.
   */
  linkComponent?: LinkComponent;
}

/** Without `href`: a `<button>`, `type="button"` unless `type` says otherwise. */
export interface ButtonElementProps
  extends
    ButtonOwnProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> {
  href?: undefined;
  linkComponent?: undefined;
}

/**
 * Every attribute Button does not own (`data-elb*` tagging, `aria-*`,
 * `onClick`, ...) reaches the rendered element.
 */
export type ButtonProps = ButtonLinkProps | ButtonElementProps;

function classes({
  variant = 'primary',
  block = false,
  className,
}: Pick<ButtonOwnProps, 'variant' | 'block' | 'className'>): string {
  return cx(
    'elb-btn',
    `elb-btn--${variant}`,
    block && 'elb-btn--block',
    className,
  );
}

function LinkButton({
  children,
  variant,
  arrow,
  block,
  className,
  linkComponent: Link,
  ...anchor
}: ButtonLinkProps) {
  const props = {
    ...anchor,
    className: classes({ variant, block, className }),
  };
  const content = (
    <>
      {children}
      {arrow && <span aria-hidden="true"> →</span>}
    </>
  );
  return Link ? <Link {...props}>{content}</Link> : <a {...props}>{content}</a>;
}

function ButtonElement({
  children,
  variant,
  arrow,
  block,
  className,
  type = 'button',
  ...rest
}: ButtonElementProps) {
  return (
    <button
      {...rest}
      type={type}
      className={classes({ variant, block, className })}
    >
      {children}
      {arrow && <span aria-hidden="true"> →</span>}
    </button>
  );
}

/**
 * The walkerOS call-to-action: a `primary` fill with `on-primary` text, or a
 * flat `surface` secondary. Renders a link with `href`, a button otherwise.
 * Use at most one primary per group.
 */
export function Button(props: ButtonProps) {
  return props.href === undefined ? (
    <ButtonElement {...props} />
  ) : (
    <LinkButton {...props} />
  );
}
