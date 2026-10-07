import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  /** `alt` grounds the band in bg-2. */
  tone?: 'default' | 'alt';
}

/** A page band: section-y padding, a top rule, a container whose children stand heading-gap apart. */
export function Section({
  children,
  tone = 'default',
  className,
  ...rest
}: SectionProps) {
  return (
    <section
      {...rest}
      className={cx(
        'elb-section',
        tone === 'alt' && 'elb-section--alt',
        className,
      )}
    >
      <div className="elb-section__inner">{children}</div>
    </section>
  );
}
