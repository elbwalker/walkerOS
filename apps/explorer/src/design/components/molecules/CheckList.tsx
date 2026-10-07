import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';
import { Icon } from '../atoms/Icon';

export interface CheckListProps extends HTMLAttributes<HTMLUListElement> {
  items: ReactNode[];
  /** `inline` wraps in a row (16px checks); `stack` is a column (14px checks). */
  layout?: 'inline' | 'stack';
  align?: 'start' | 'center';
}

/** Short claims, each led by a primary check. */
export function CheckList({
  items,
  layout = 'inline',
  align = 'start',
  className,
  ...rest
}: CheckListProps) {
  const stack = layout === 'stack';
  return (
    <ul
      {...rest}
      className={cx(
        'elb-checklist',
        stack && 'elb-checklist--stack',
        align === 'center' && 'elb-checklist--center',
        className,
      )}
    >
      {items.map((item, index) => (
        <li key={index} className="elb-checklist__item">
          <Icon name="check" size={stack ? 14 : 16} />
          {item}
        </li>
      ))}
    </ul>
  );
}
