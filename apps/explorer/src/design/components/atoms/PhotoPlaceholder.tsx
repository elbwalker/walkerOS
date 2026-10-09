import React, { type HTMLAttributes } from 'react';
import { cx } from '../cx';

export interface PhotoPlaceholderProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> {
  /** The word in the middle. */
  label?: string;
  /** `theme` follows dark and light; `viz` is the demos' look, dark in both. */
  tone?: 'theme' | 'viz';
}

/** A striped stand-in for a photo, sized by the caller. */
export function PhotoPlaceholder({
  label = 'photo',
  tone = 'theme',
  className,
  ...rest
}: PhotoPlaceholderProps) {
  // Decorative unless the caller names it (`role`, `aria-label`, `aria-labelledby`).
  const named =
    rest.role !== undefined ||
    rest['aria-label'] !== undefined ||
    rest['aria-labelledby'] !== undefined;
  return (
    <div
      aria-hidden={named ? undefined : true}
      {...rest}
      className={cx('elb-photo', tone === 'viz' && 'elb-photo--viz', className)}
      {...(tone === 'viz' ? { 'data-theme': 'dark' } : {})}
    >
      {label}
    </div>
  );
}
