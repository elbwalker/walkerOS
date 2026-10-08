import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { buttonVariants, type ButtonVariant } from '../Button';

export type LinkVariant = ButtonVariant | 'subtle';

const variants: Record<LinkVariant, string> = {
  ...buttonVariants,
  subtle: 'text-fg-2 transition hover:text-fg',
};

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: LinkVariant;
}

export const Link = ({
  variant = 'subtle',
  href = '#',
  className = '',
  onClick,
  ...rest
}: LinkProps) => {
  // The demo's links lead nowhere: keep the reader where they are.
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (href === '#') event.preventDefault();
    onClick?.(event);
  };

  return (
    <a
      href={href}
      className={`${variants[variant]} ${className}`}
      onClick={handleClick}
      {...rest}
    />
  );
};
