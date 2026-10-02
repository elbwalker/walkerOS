import React from 'react';

export type SiteButtonVariant = 'primary' | 'secondary' | 'pill';

export interface SiteButtonProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  variant?: SiteButtonVariant;
  /** Renders an anchor when set, a button otherwise. */
  href?: string;
  className?: string;
}

/**
 * SiteButton - page-level call to action.
 *
 * Distinct from the Button atom, which is tool chrome inside a panel. Renders
 * an anchor when `href` is given, a button otherwise, so marketing links stay
 * real links.
 */
export function SiteButton({
  children,
  variant = 'primary',
  href,
  className = '',
  ...rest
}: SiteButtonProps) {
  const classes = `elb-oa-btn elb-oa-btn--${variant} ${className}`.trim();

  if (href) {
    return (
      <a className={classes} href={href} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} type="button" {...rest}>
      {children}
    </button>
  );
}

export interface ButtonRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * ButtonRow - horizontal group of SiteButtons that wraps on narrow screens.
 */
export function ButtonRow({
  children,
  className = '',
  ...rest
}: ButtonRowProps) {
  return (
    <div className={`elb-oa-button-row ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
