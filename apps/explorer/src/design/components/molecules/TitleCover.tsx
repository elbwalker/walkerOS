import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';
import { SectionHeading } from './SectionHeading';

export interface TitleCoverProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'title'
> {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** The brand mark above the heading, rendered by the caller. */
  logo?: ReactNode;
}

/** The opening card of a video or a post: logo, eyebrow, title and subtitle, centred in the frame it fills. */
export function TitleCover({
  eyebrow,
  title,
  subtitle,
  logo,
  className,
  ...rest
}: TitleCoverProps) {
  return (
    <div
      {...rest}
      className={cx('elb-full-frame', 'elb-title-cover', className)}
    >
      {logo !== undefined && logo !== null && (
        <div className="elb-title-cover__logo">{logo}</div>
      )}
      <SectionHeading
        level={1}
        eyebrow={eyebrow}
        title={title}
        lead={subtitle}
      />
    </div>
  );
}
