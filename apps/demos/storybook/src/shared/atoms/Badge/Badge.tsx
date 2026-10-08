import type { HTMLAttributes } from 'react';

export type BadgeProps = HTMLAttributes<HTMLSpanElement>;

export const Badge = ({ className = '', ...rest }: BadgeProps) => (
  <span
    className={`inline-block whitespace-nowrap rounded-full border border-border bg-surface-2 px-2.5 py-1 align-middle text-label text-fg ${className}`}
    {...rest}
  />
);
