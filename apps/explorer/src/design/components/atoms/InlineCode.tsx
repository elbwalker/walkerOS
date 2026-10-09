import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';

export interface InlineCodeProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

/** Mono code token inside prose: attribute names, function calls, event names. */
export function InlineCode({ children, className, ...rest }: InlineCodeProps) {
  return (
    <code {...rest} className={cx('elb-code-inline', className)}>
      {children}
    </code>
  );
}
