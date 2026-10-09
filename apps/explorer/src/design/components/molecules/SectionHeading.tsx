import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';
import { Eyebrow } from '../atoms/Eyebrow';

export interface SectionHeadingProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'title'
> {
  title: ReactNode;
  eyebrow?: ReactNode;
  lead?: ReactNode;
  /** 1 is the page's hero heading: an h1, always centred. */
  level?: 1 | 2;
  /** The h2 size: `lg` for sections, `md` beside a demo. */
  size?: 'lg' | 'md';
  /** Hero only: a phrase after the title in primary. */
  highlight?: ReactNode;
  align?: 'start' | 'center';
}

/** Eyebrow, heading and lead: the opening of a section, or the hero. */
export function SectionHeading({
  title,
  eyebrow,
  lead,
  level = 2,
  size = 'lg',
  highlight,
  align = 'start',
  className,
  ...rest
}: SectionHeadingProps) {
  const hero = level === 1;
  return (
    <div
      {...rest}
      className={cx(
        'elb-sh',
        (hero || align === 'center') && 'elb-sh--center',
        className,
      )}
    >
      {eyebrow !== undefined && <Eyebrow>{eyebrow}</Eyebrow>}
      {hero ? (
        <h1 className="elb-sh__title elb-sh__title--display">
          {title}
          {highlight !== undefined && (
            <>
              {' '}
              <span className="elb-sh__highlight">{highlight}</span>
            </>
          )}
        </h1>
      ) : (
        <h2 className={cx('elb-sh__title', `elb-sh__title--${size}`)}>
          {title}
        </h2>
      )}
      {lead !== undefined && (
        <p className={cx('elb-sh__lead', hero && 'elb-sh__lead--hero')}>
          {lead}
        </p>
      )}
    </div>
  );
}
